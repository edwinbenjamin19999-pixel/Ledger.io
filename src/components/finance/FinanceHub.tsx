import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShieldAlert, Loader2, RefreshCw, Eye, XCircle,
  Clock, CheckCircle2, Gavel,
} from "lucide-react";

interface Props { companyId: string;
}

interface CollectionCase { id: string;
  invoice_id: string;
  status: string;
  debtor_name: string | null;
  debtor_org_number: string | null;
  original_amount: number;
  remaining_amount: number | null;
  interest_amount: number | null;
  collection_fee: number | null;
  inkassogram_reference: string | null;
  submitted_at: string | null;
  created_at: string;
  closed_at: string | null;
  paid_at: string | null;
  close_reason: string | null;
  invoices?: { invoice_number: string; counterparty_name: string } | null;
}

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = { pending: { label: "Vantar", variant: "secondary" },
  submitted: { label: "Skickad", variant: "default" },
  approved: { label: "Godkand", variant: "default" },
  paid: { label: "Betald", variant: "default" },
  partial_payment: { label: "Delbetalning", variant: "secondary" },
  legal: { label: "Rättslig åtgärd", variant: "destructive" },
  disputed: { label: "Bestridd", variant: "destructive" },
  closed: { label: "Stängd", variant: "outline" },
  cancelled: { label: "Avbruten", variant: "outline" },
  completed: { label: "Slutford", variant: "default" },
};

export const FinanceHub = ({ companyId }: Props) => { const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState<CollectionCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<CollectionCase | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [integrationStatus, setIntegrationStatus] = useState<Record<string, boolean>>({});

  useEffect(() => { loadAll();
  }, [companyId]);

  const loadAll = async () => { setLoading(true);
    try { const session = (await supabase.auth.getSession()).data.session;
      if (!session) return;

      const headers = { Authorization: `Bearer ${session.access_token}` };

      const [collRes, credRes] = await Promise.all([
        supabase.functions.invoke("inkassogram-collection", { body: { action: "list_cases", company_id: companyId },
          headers,
        }),
        supabase
          .from("integration_credentials")
          .select("provider, is_active")
          .eq("company_id", companyId)
          .in("provider", ["inkassogram"]),
      ]);

      setCases(collRes.data?.cases || []);

      const statusMap: Record<string, boolean> = {};
      (credRes.data || []).forEach((c: any) => { statusMap[c.provider] = c.is_active; });
      setIntegrationStatus(statusMap);
    } finally { setLoading(false);
    }
  };

  const syncInkassogram = async () => { setSyncing(true);
    try { const session = (await supabase.auth.getSession()).data.session;
      if (!session) return;
      const res = await supabase.functions.invoke("inkassogram-collection", { body: { action: "sync_status", company_id: companyId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.data?.error) throw new Error(res.data.error);
      toast.success(`${res.data?.synced || 0} ärenden synkade`);
      loadAll();
    } catch (err: any) { toast.error(err.message);
    } finally { setSyncing(false);
    }
  };

  const closeCase = async (caseId: string, reason: string) => { try { const session = (await supabase.auth.getSession()).data.session;
      if (!session) return;
      const res = await supabase.functions.invoke("inkassogram-collection", { body: { action: "close_case", company_id: companyId, case_id: caseId, reason },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.data?.error) throw new Error(res.data.error);
      toast.success("Arende stangt");
      setSelectedCase(null);
      loadAll();
    } catch (err: any) { toast.error(err.message);
    }
  };

  const activeCases = cases.filter(c => !["closed", "cancelled", "paid"].includes(c.status));
  const totalInCollection = activeCases.reduce((s, c) => s + (c.remaining_amount || c.original_amount), 0);

  if (loading) { return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <Gavel className="h-4 w-4 text-destructive" />
              <span className="text-xs text-muted-foreground">Aktiva inkassoärenden</span>
            </div>
            <p className="text-lg font-bold">{activeCases.length}</p>
            <p className="text-xs text-muted-foreground">{fmt(totalInCollection)} kr utstaende</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className={`h-4 w-4 ${integrationStatus.inkassogram ? "text-primary" : "text-muted-foreground"}`} />
              <span className="text-xs text-muted-foreground">Inkassogram</span>
            </div>
            <p className="text-sm font-medium">{integrationStatus.inkassogram ? "Kopplad" : "Ej kopplad"}</p>
            <p className="text-xs text-muted-foreground">{integrationStatus.inkassogram ? "API aktiv" : "Manuellt lage"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Totalt slutforda</span>
            </div>
            <p className="text-lg font-bold">{cases.filter(c => ["closed", "paid", "completed"].includes(c.status)).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Header with sync */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" />
          Inkassoärenden
          {activeCases.length > 0 && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{activeCases.length}</Badge>}
        </h3>
        <Button variant="outline" size="sm" onClick={syncInkassogram} disabled={syncing} className="text-xs gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
          Synka status
        </Button>
      </div>

      {/* Cases list */}
      {cases.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShieldAlert className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Inga inkassoärenden. Skicka förfallna fakturor till inkasso från fakturavyn.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {cases.map(c => (
            <Card key={c.id} className={`cursor-pointer hover:border-primary/30 transition-colors ${c.status === "legal" || c.status === "disputed" ? "border-destructive/30" : ""}`} onClick={() => setSelectedCase(c)}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm font-medium">{c.debtor_name || "Okand"}</p>
                      <p className="text-xs text-muted-foreground">
                        #{c.invoices?.invoice_number || "—"} — {new Date(c.created_at).toLocaleDateString("sv-SE")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <p className="text-sm font-medium">{fmt(c.remaining_amount || c.original_amount)} kr</p>
                      {c.inkassogram_reference && <p className="text-[10px] text-muted-foreground">Ref: {c.inkassogram_reference}</p>}
                    </div>
                    <Badge variant={statusLabels[c.status]?.variant || "secondary"}>
                      {statusLabels[c.status]?.label || c.status}
                    </Badge>
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* COLLECTION CASE DETAIL DRAWER */}
      <Sheet open={!!selectedCase} onOpenChange={() => setSelectedCase(null)}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-auto">
          {selectedCase && (
            <div className="space-y-4">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-destructive" />
                  Inkassoarende
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-3">
                <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
                  <Row label="Galdenar" value={selectedCase.debtor_name || "—"} />
                  <Row label="Org.nr" value={selectedCase.debtor_org_number || "—"} />
                  <Row label="Faktura" value={`#${selectedCase.invoices?.invoice_number || "—"}`} />
                  <Row label="Inkassogram-ref" value={selectedCase.inkassogram_reference || "Ej kopplad"} />
                </div>

                <div className="border rounded-lg p-3 space-y-2 text-sm">
                  <Row label="Kapitalbelopp" value={`${fmt(selectedCase.original_amount)} kr`} />
                  <Row label="Dröjsmålsränta" value={`${fmt(selectedCase.interest_amount || 0)} kr`} />
                  <Row label="Inkassoavgift" value={`${fmt(selectedCase.collection_fee || 0)} kr`} />
                  <div className="border-t pt-2">
                    <Row label="Aterstaende fordran" value={`${fmt(selectedCase.remaining_amount || 0)} kr`} bold />
                  </div>
                </div>

                <div className="border rounded-lg p-3 space-y-2 text-sm">
                  <Row label="Status" value={statusLabels[selectedCase.status]?.label || selectedCase.status} />
                  <Row label="Skapat" value={new Date(selectedCase.created_at).toLocaleDateString("sv-SE")} />
                  {selectedCase.submitted_at && <Row label="Skickat" value={new Date(selectedCase.submitted_at).toLocaleDateString("sv-SE")} />}
                  {selectedCase.paid_at && <Row label="Betalt" value={new Date(selectedCase.paid_at).toLocaleDateString("sv-SE")} />}
                  {selectedCase.closed_at && <Row label="Stangt" value={new Date(selectedCase.closed_at).toLocaleDateString("sv-SE")} />}
                  {selectedCase.close_reason && <Row label="Orsak" value={selectedCase.close_reason} />}
                </div>

                {!["closed", "cancelled", "paid"].includes(selectedCase.status) && (
                  <div className="space-y-2 pt-2">
                    <CloseAction caseId={selectedCase.id} onClose={closeCase} />
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) { return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? "font-semibold" : ""}>{value}</span>
    </div>
  );
}

function CloseAction({ caseId, onClose }: { caseId: string; onClose: (id: string, reason: string) => void }) { const [reason, setReason] = useState("manual_close");
  return (
    <div className="flex items-center gap-2">
      <Select value={reason} onValueChange={setReason}>
        <SelectTrigger className="h-8 text-xs flex-1">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="manual_close">Manuellt stangd</SelectItem>
          <SelectItem value="paid_directly">Betald direkt</SelectItem>
          <SelectItem value="agreement">Uppgorelse traffad</SelectItem>
          <SelectItem value="write_off">Nedskriven</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="destructive" size="sm" className="text-xs gap-1.5" onClick={() => onClose(caseId, reason)}>
        <XCircle className="h-3.5 w-3.5" />Stang ärende
      </Button>
    </div>
  );
}
