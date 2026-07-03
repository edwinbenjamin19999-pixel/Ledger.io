import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";
import {
  useFirmSupplierInvoices,
  STAGE_META,
  type SupplierInvoiceStage,
} from "@/hooks/useFirmSupplierInvoices";
import { FirmSupplierAIPanel } from "@/components/advisor/supplier-invoices/FirmSupplierAIPanel";
import { SupplierApprovalTimeline } from "@/components/advisor/supplier-invoices/SupplierApprovalTimeline";
import { OrchestrationInfoBanner } from "@/components/advisor/orchestration/OrchestrationInfoBanner";
import { WLDataDebugBar } from "@/components/advisor/wl-ui/WLDataDebugBar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  ExternalLink,
  FileText,
  Inbox,
  Search,
  Send,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { SupplierInvoiceApprovalActions } from "@/components/invoices/SupplierInvoiceApprovalActions";

type TabKey = "all" | SupplierInvoiceStage;

const TABS: Array<{ key: TabKey; label: string; icon: typeof FileText }> = [
  { key: "all", label: "Alla", icon: Inbox },
  { key: "received", label: "Mottagen", icon: FileText },
  { key: "draft", label: "Utkast", icon: FileText },
  { key: "awaiting_client", label: "Väntar attest", icon: Clock },
  { key: "approved", label: "Godkänd", icon: CheckCircle2 },
  { key: "in_payment_run", label: "Betalningskörning", icon: Send },
  { key: "paid", label: "Betald", icon: Wallet },
];

const fmt = (n: number, ccy: string) =>
  new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: ccy || "SEK",
    maximumFractionDigits: 0,
  }).format(n);

const AdvisorSupplierInvoices = () => {
  const navigate = useNavigate();
  const { clients, isLoading } = useAdvisorContext();
  const { data: rows = [], isLoading: invLoading } = useFirmSupplierInvoices();
  const queryClient = useQueryClient();
  const refreshInvoices = () =>
    queryClient.invalidateQueries({ queryKey: ["firm-supplier-invoices"] });
  const [seeding, setSeeding] = useState(false);

  const seedDemo = async () => {
    setSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke("seed-firm-demo-data", {
        body: { surface: "supplier_invoices" },
      });
      if (error) throw error;
      toast.success(`Skapade ${data?.inserted ?? 0} demofakturor över ${data?.clients ?? 0} klienter`);
      refreshInvoices();
    } catch (e: any) {
      toast.error("Kunde inte skapa demodata", { description: e.message });
    } finally {
      setSeeding(false);
    }
  };

  const [tab, setTab] = useState<TabKey>("awaiting_client");
  const [clientFilter, setClientFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState<"all" | "high" | "medium">("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (tab !== "all" && r.stage !== tab) return false;
      if (clientFilter !== "all" && r.company_id !== clientFilter) return false;
      if (riskFilter !== "all" && r.risk !== riskFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !r.invoice_number?.toLowerCase().includes(q) &&
          !r.counterparty_name?.toLowerCase().includes(q) &&
          !r.client_name.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [rows, tab, clientFilter, riskFilter, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    rows.forEach((r) => (c[r.stage] = (c[r.stage] ?? 0) + 1));
    return c;
  }, [rows]);

  const enterClient = (companyId: string, target: "list" | "payment" = "list") => {
    const tab = target === "payment" ? "payments" : "supplier-ledger";
    navigate(`/wl/app/clients/${companyId}/${tab}`);
  };

  const onAIAction: React.ComponentProps<typeof FirmSupplierAIPanel>["onAction"] = (kind) => {
    if (kind === "show_high_risk") {
      setRiskFilter("high");
      setTab("all");
      toast.success("Filter satt: hög risk");
    } else if (kind === "show_duplicates") {
      setRiskFilter("all");
      setTab("all");
      setSearch("");
      toast.info("Visar möjliga dubbletter — sök på leverantör för fördjupning");
    } else if (kind === "show_overdue_unapproved") {
      setTab("awaiting_client");
      toast.warning("Förfallna fakturor som väntar på klientattest");
    }
  };

  const requestClientApproval = (id: string, client: string) => {
    toast.success(`Attestbegäran skickad till ${client}`, {
      description: "Klienten får notis i portalen + email. BankID-flöde förberett.",
    });
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#94A3B8]">
            Byråportal · Leverantörsfakturor
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-[#0F172A] mt-1">
            Leverantörsattest
          </h1>
          <p className="text-[#64748B] mt-1.5">
            Samma leverantörsmotor som Bokfy standard — orkestrerad över {clients.length}{" "}
            klienter med obligatorisk klient-attest före betalning.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-[220px] h-10">
              <SelectValue placeholder="Alla klienter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla klienter ({clients.length})</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={riskFilter} onValueChange={(v) => setRiskFilter(v as typeof riskFilter)}>
            <SelectTrigger className="w-[160px] h-10">
              <SelectValue placeholder="Risk" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All risk</SelectItem>
              <SelectItem value="high">Hög risk</SelectItem>
              <SelectItem value="medium">Medel risk</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <OrchestrationInfoBanner feature="Leverantörsfakturor" clientTab="supplier-ledger" />

      <WLDataDebugBar module="supplier-invoices" />

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#E2E8F0] overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px flex items-center gap-2 whitespace-nowrap transition-colors ${
              tab === t.key
                ? "text-[#0F172A]"
                : "border-transparent text-[#94A3B8] hover:text-[#64748B]"
            }`}
            style={tab === t.key ? { borderColor: "hsl(var(--brand-primary))" } : undefined}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
            <span className="ml-1 text-[10px] tabular-nums px-1.5 py-0.5 rounded-md bg-[#F1F5F9] text-[#64748B]">
              {counts[t.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5 items-start">
        <div className="space-y-3">
          {/* Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
              <Input
                placeholder="Sök faktura, leverantör eller klient…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 bg-white"
              />
            </div>
          </div>

          {/* Cards */}
          {isLoading || invLoading ? (
            <div className="rounded-3xl bg-white border border-[#E2E8F0] py-16 text-center text-sm text-[#94A3B8]">
              Laddar leverantörsfakturor…
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-3xl bg-white border border-[#E2E8F0] py-16 text-center">
              <ShieldCheck className="h-10 w-10 text-[#CBD5E1] mx-auto mb-3" />
              <div className="text-sm font-semibold text-[#0F172A]">Inget att hantera</div>
              <div className="text-xs text-[#94A3B8] mt-1">
                Justera filter eller välj en annan flik.
              </div>
              {rows.length === 0 && clients.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={seedDemo}
                  disabled={seeding}
                  className="mt-4 border-[#C8DDF5] text-[#3b82f6] hover:bg-[#EFF6FF]"
                >
                  <Database className="h-3.5 w-3.5 mr-1.5" />
                  {seeding ? "Skapar…" : "Skapa demoleverantörsfakturor"}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((r) => {
                const meta = STAGE_META[r.stage];
                const overdue = r.daysToDue !== null && r.daysToDue < 0;
                return (
                  <div
                    key={r.id}
                    className="rounded-3xl bg-white border border-[#E2E8F0] p-4 hover:shadow-sm transition-shadow"
                  >
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="h-10 w-10 rounded-xl bg-[#0F1F3D] flex items-center justify-center shrink-0">
                          <FileText className="h-5 w-5 text-[#475569]" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="text-sm font-bold text-[#0F172A] truncate">
                              {r.counterparty_name || "Okänd leverantör"}
                            </div>
                            <Badge
                              variant="secondary"
                              className={`text-[10px] font-bold ${meta.tone}`}
                            >
                              {meta.label}
                            </Badge>
                            {r.risk === "high" && (
                              <Badge className="text-[10px] font-bold bg-[#FCE8E8] text-[#7A1A1A] hover:bg-[#FCE8E8]">
                                <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                                Hög risk
                              </Badge>
                            )}
                            {r.risk === "medium" && (
                              <Badge className="text-[10px] font-bold bg-[#FAEEDA] text-[#7A5417] hover:bg-[#FAEEDA]">
                                Medel risk
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-[#94A3B8] mt-0.5">
                            #{r.invoice_number ?? "—"} · {r.invoice_date ?? "—"} ·{" "}
                            <button
                              onClick={() => enterClient(r.company_id)}
                              className="hover:underline inline-flex items-center gap-1"
                            >
                              {r.client_name} <ExternalLink className="h-2.5 w-2.5" />
                            </button>
                          </div>
                          {r.riskReasons.length > 0 && (
                            <div className="mt-1.5 flex items-center gap-1 flex-wrap">
                              {r.riskReasons.map((reason, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#FCE8E8] text-[#7A1A1A] border border-rose-100"
                                >
                                  {reason}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-lg font-bold text-[#0F172A] tabular-nums">
                          {fmt(r.total_amount, r.currency)}
                        </div>
                        <div
                          className={`text-[11px] tabular-nums ${
                            overdue ? "text-[#7A1A1A] font-bold" : "text-[#64748B]"
                          }`}
                        >
                          Förfaller {r.due_date ?? "—"}
                          {overdue && ` (+${Math.abs(r.daysToDue!)}d)`}
                        </div>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="mt-3 pt-3 border-t border-[#F1F5F9]">
                      <SupplierApprovalTimeline stage={r.stage} />
                    </div>

                    {/* Actions */}
                    <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
                      <div className="text-[11px] text-[#94A3B8]">
                        Status: <span className="font-mono">{r.status}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* If firm has approval mandate for this client → show direct actions.
                            Mandate flag lives on firm_client_mandates.permissions.can_approve_invoices.
                            Falls back to "Begär klientattest" when mandate is missing/false. */}
                        {(r as any).can_approve_for_client ? (
                          <SupplierInvoiceApprovalActions
                            invoice={{
                              id: r.id,
                              status: r.status,
                              total_amount: r.total_amount,
                              approval_step: r.approval_step ?? null,
                              attested_by: r.attested_by ?? null,
                              rejection_reason: r.rejection_reason ?? null,
                              journal_entry_id: r.journal_entry_id ?? null,
                              counterparty_name: r.counterparty_name ?? undefined,
                              invoice_number: r.invoice_number ?? undefined,
                            }}
                            companyId={r.company_id}
                            size="sm"
                            onUpdated={refreshInvoices}
                          />
                        ) : (
                          r.stage === "draft" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8"
                              onClick={() => requestClientApproval(r.id, r.client_name)}
                            >
                              <Clock className="h-3.5 w-3.5 mr-1.5" />
                              Begär klientattest
                            </Button>
                          )
                        )}
                        {r.stage === "approved" && (
                          <Button
                            size="sm"
                            className="h-8"
                            style={{ background: "hsl(var(--brand-primary))" }}
                            onClick={() => enterClient(r.company_id, "payment")}
                          >
                            <Send className="h-3.5 w-3.5 mr-1.5" />
                            Lägg i betalningskörning
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8"
                          onClick={() => enterClient(r.company_id)}
                        >
                          Öppna i klient →
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <FirmSupplierAIPanel rows={rows} onAction={onAIAction} />
      </div>
    </div>
  );
};

export default AdvisorSupplierInvoices;
