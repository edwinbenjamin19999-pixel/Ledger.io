import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Landmark, Building2, Calculator, FileSpreadsheet, FileUp, CreditCard, ShoppingBag, Receipt,
  CheckCircle2, AlertTriangle, XCircle, Settings as SettingsIcon, Plug, Clock, Lock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";

type Status = "connected" | "disconnected" | "error" | "always_on" | "coming_soon";

interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  status: Status;
  meta?: string; // status sub-line (last sync, etc.)
  action?: () => void;
  connectRoute?: string;
  settingsRoute?: string;
  showLog?: boolean;
}

interface Props { companyId: string }

const CATEGORIES = [
  { id: "bank", label: "Bank & betalningar" },
  { id: "skv", label: "Skatt & myndigheter" },
  { id: "lon", label: "Lönesystem" },
  { id: "filer", label: "Filimport / export" },
  { id: "kommande", label: "Kommande" },
];

export function IntegrationsHub({ companyId }: Props) {
  const navigate = useNavigate();
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [lastBankSync, setLastBankSync] = useState<string | null>(null);
  const [skvLast, setSkvLast] = useState<string | null>(null);
  const [skvNext, setSkvNext] = useState<string | null>(null);
  const [payrollLast, setPayrollLast] = useState<string | null>(null);
  const [logFor, setLogFor] = useState<string | null>(null);
  const [logRows, setLogRows] = useState<any[]>([]);
  const [logLoading, setLogLoading] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      const [{ data: accs }, { data: vp }, { data: pr }] = await Promise.all([
        (supabase as any).from("bank_accounts").select("id, last_synced_at, sync_status, bank_name").eq("company_id", companyId),
        (supabase as any).from("vat_periods").select("submitted_at, due_date").eq("company_id", companyId).order("due_date", { ascending: false }).limit(5),
        (supabase as any).from("payroll_runs").select("created_at").eq("company_id", companyId).order("created_at", { ascending: false }).limit(1),
      ]);
      setBankAccounts(accs ?? []);
      const last = (accs ?? []).map((a: any) => a.last_synced_at).filter(Boolean).sort().reverse()[0];
      setLastBankSync(last ?? null);
      const submitted = (vp ?? []).find((v: any) => v.submitted_at);
      const next = (vp ?? []).find((v: any) => !v.submitted_at);
      setSkvLast(submitted?.submitted_at ?? null);
      setSkvNext(next?.due_date ?? null);
      setPayrollLast(pr?.[0]?.created_at ?? null);
    })();
  }, [companyId]);

  const bankStatus: Status = bankAccounts.length === 0 ? "disconnected" : (bankAccounts.some(a => a.sync_status === "error") ? "error" : "connected");
  const bankSyncStale = lastBankSync && (Date.now() - new Date(lastBankSync).getTime()) > 24 * 3600 * 1000;

  const integrations: Integration[] = [
    // BANK
    { id: "open-banking", name: "Open Banking (PSD2)", description: "Swedbank, SEB, Handelsbanken, Nordea, Danske, LF, ICA, Revolut", category: "bank", icon: Landmark,
      status: bankStatus,
      meta: bankAccounts.length
        ? `${bankAccounts.length} konto${bankAccounts.length === 1 ? "" : "n"} · Senast synkad: ${lastBankSync ? formatDistanceToNow(new Date(lastBankSync), { addSuffix: true, locale: sv }) : "—"}`
        : "Ej anslutet",
      connectRoute: "/bank-integration", settingsRoute: "/bank-integration", showLog: true },
    { id: "swish", name: "Swish Business", description: "Realtidsavstämning av Swish-betalningar", category: "bank", icon: CreditCard,
      status: "disconnected", connectRoute: "/swish", showLog: true },

    // SKV & MYNDIGHETER
    { id: "skv", name: "Skatteverket", description: "Momsdeklaration, AGI och INK2 via mTLS", category: "skv", icon: Calculator,
      status: skvLast ? "connected" : "disconnected",
      meta: skvLast
        ? `Senast inlämnad: ${new Date(skvLast).toLocaleDateString("sv-SE")}${skvNext ? ` · Nästa förfaller ${new Date(skvNext).toLocaleDateString("sv-SE")}` : ""}`
        : skvNext ? `Nästa förfaller ${new Date(skvNext).toLocaleDateString("sv-SE")}` : undefined,
      connectRoute: "/settings/skatteverket", settingsRoute: "/settings/skatteverket", showLog: true },
    { id: "bolagsverket", name: "Bolagsverket", description: "Företagsuppslag, styrelse, verklig huvudman", category: "skv", icon: Building2,
      status: "always_on" },

    // LÖN
    { id: "visma-lon", name: "Visma Lön", description: "Synka lönekörningar och bokföringsunderlag", category: "lon", icon: Calculator,
      status: "disconnected", meta: payrollLast ? `Senaste lönekörning: ${new Date(payrollLast).toLocaleDateString("sv-SE")}` : undefined, showLog: true },
    { id: "fortnox-lon", name: "Fortnox Lön", description: "Importera lönekörningar via API-nyckel", category: "lon", icon: Calculator, status: "disconnected", showLog: true },
    { id: "hogia-lon", name: "Hogia Lön", description: "Importera lönekörningar via API-nyckel", category: "lon", icon: Calculator, status: "disconnected", showLog: true },
    { id: "quinyx", name: "Quinyx", description: "Schemaläggning och tidrapportering", category: "lon", icon: Calculator, status: "disconnected", showLog: true },

    // FILER
    { id: "sie4", name: "SIE4 import/export", description: "Standardformat för bokföringsdata", category: "filer", icon: FileSpreadsheet, status: "always_on", connectRoute: "/migration" },
    { id: "fortnox-import", name: "Fortnox migrering", description: "Engångsimport av historisk data", category: "filer", icon: FileUp, status: "disconnected", connectRoute: "/migration" },
    { id: "excel-ib", name: "Excel ingående balans", description: "Importera IB från Excel-mall", category: "filer", icon: FileSpreadsheet, status: "always_on", connectRoute: "/migration" },

    // KOMMANDE
    { id: "klarna", name: "Klarna", description: "Avstämning av utbetalningar", category: "kommande", icon: ShoppingBag, status: "coming_soon" },
    { id: "stripe", name: "Stripe", description: "Avstämning av kortbetalningar", category: "kommande", icon: CreditCard, status: "coming_soon" },
    { id: "zettle", name: "Zettle", description: "POS-avstämning", category: "kommande", icon: Receipt, status: "coming_soon" },
    { id: "peppol", name: "PEPPOL e-faktura", description: "Skicka och ta emot e-fakturor", category: "kommande", icon: FileUp, status: "coming_soon" },
  ];

  const openLog = async (id: string) => {
    setLogFor(id);
    setLogLoading(true);
    setLogRows([]);
    // Generic log lookup — try integration_sync_logs, fall back to ai_actions
    let { data } = await (supabase as any)
      .from("integration_sync_logs")
      .select("*")
      .eq("company_id", companyId)
      .eq("integration_id", id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (!data || data.length === 0) {
      const { data: alt } = await (supabase as any)
        .from("ai_actions")
        .select("created_at, action_type, description, status")
        .eq("company_id", companyId)
        .ilike("action_type", `%${id}%`)
        .order("created_at", { ascending: false })
        .limit(50);
      data = alt ?? [];
    }
    setLogRows(data ?? []);
    setLogLoading(false);
  };

  const renderStatus = (i: Integration) => {
    if (i.status === "connected") {
      return (
        <Badge className="bg-emerald-600 gap-1">
          <CheckCircle2 className="h-3 w-3" />Ansluten
        </Badge>
      );
    }
    if (i.status === "error") return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Fel</Badge>;
    if (i.status === "always_on") return <Badge className="bg-blue-600 gap-1"><CheckCircle2 className="h-3 w-3" />Aktiv</Badge>;
    if (i.status === "coming_soon") return <Badge variant="secondary">Snart tillgänglig</Badge>;
    return <Badge variant="outline">Ej ansluten</Badge>;
  };

  const renderActions = (i: Integration) => {
    if (i.status === "coming_soon") return <Button size="sm" variant="outline" disabled>Snart</Button>;
    if (i.status === "always_on") return <Button size="sm" variant="ghost" onClick={() => i.connectRoute && navigate(i.connectRoute)}>Öppna</Button>;
    if (i.status === "connected" || i.status === "error") {
      return (
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => i.settingsRoute ? navigate(i.settingsRoute) : toast.info("Inställningar kommer snart")}>
            <SettingsIcon className="h-3 w-3 mr-1" />Inställningar
          </Button>
        </div>
      );
    }
    return (
      <Button size="sm" onClick={() => i.connectRoute ? navigate(i.connectRoute) : toast.info("Kontakta support för anslutning")}>
        <Plug className="h-3 w-3 mr-1" />Anslut
      </Button>
    );
  };

  return (
    <div className="space-y-6">
      {CATEGORIES.map(cat => {
        const items = integrations.filter(i => i.category === cat.id);
        if (items.length === 0) return null;
        return (
          <div key={cat.id} className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{cat.label}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {items.map(i => {
                const Icon = i.icon;
                const isStaleBank = i.id === "open-banking" && bankSyncStale && i.status === "connected";
                return (
                  <Card key={i.id} className={i.status === "coming_soon" ? "opacity-60" : ""}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                            <Icon className="h-5 w-5 text-foreground" />
                          </div>
                          <div>
                            <div className="font-medium text-sm">{i.name}</div>
                            <div className="text-xs text-muted-foreground line-clamp-1">{i.description}</div>
                          </div>
                        </div>
                        {renderStatus(i)}
                      </div>

                      {i.meta && (
                        <div className={`text-xs flex items-center gap-1 ${isStaleBank ? "text-amber-600" : "text-muted-foreground"}`}>
                          {isStaleBank ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                          {i.meta}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        {renderActions(i)}
                        {i.showLog && i.status !== "disconnected" && (
                          <button onClick={() => openLog(i.id)} className="text-xs text-primary hover:underline">Visa logg</button>
                        )}
                      </div>

                      {(i.status === "connected" || i.status === "always_on") && (
                        <div className="flex items-start gap-1 text-[10px] text-muted-foreground/80 pt-1 border-t">
                          <Lock className="h-2.5 w-2.5 mt-0.5 shrink-0" />
                          <span>Data från denna integration lagras krypterat och används endast för bokföring inom ditt konto.</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      <Dialog open={!!logFor} onOpenChange={(o) => !o && setLogFor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Synkroniseringslogg — {logFor}</DialogTitle></DialogHeader>
          {logLoading ? (
            <p className="text-sm text-muted-foreground">Laddar…</p>
          ) : logRows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Inga loggposter ännu.</p>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto space-y-1">
              {logRows.map((r, i) => (
                <div key={i} className="text-xs border rounded p-2 flex items-start gap-2">
                  <Badge variant={r.status === "error" || r.status === "failed" ? "destructive" : "outline"} className="shrink-0">
                    {r.status ?? r.action_type ?? "info"}
                  </Badge>
                  <div className="flex-1">
                    <div className="text-muted-foreground">{new Date(r.created_at).toLocaleString("sv-SE")}</div>
                    <div>{r.description ?? r.message ?? r.action_type}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
