import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Play, Pause, XCircle, RefreshCw, Calendar, Plus, FileText, Brain } from "lucide-react";
import { ServiceContract, useContracts, ContractItem, ContractInvoice } from "@/hooks/useContracts";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

const statusActions: Record<string, { label: string; nextStatus: string; icon: any; variant: any }[]> = { draft: [{ label: "Aktivera", nextStatus: "active", icon: Play, variant: "default" }],
  active: [
    { label: "Pausa", nextStatus: "paused", icon: Pause, variant: "outline" },
    { label: "Avsluta", nextStatus: "cancelled", icon: XCircle, variant: "destructive" },
  ],
  paused: [{ label: "Återaktivera", nextStatus: "active", icon: Play, variant: "default" }],
  pending_renewal: [
    { label: "Förnya", nextStatus: "active", icon: RefreshCw, variant: "default" },
    { label: "Avsluta", nextStatus: "cancelled", icon: XCircle, variant: "destructive" },
  ],
};

interface Props { contract: ServiceContract;
  companyId: string;
  onBack: () => void;
  onUpdate: (id: string, updates: Partial<ServiceContract>) => Promise<boolean>;
}

export const ContractDetail = ({ contract, companyId, onBack, onUpdate }: Props) => { const { loadItems, addItem, loadInvoices } = useContracts(companyId);
  const [items, setItems] = useState<ContractItem[]>([]);
  const [invoices, setInvoices] = useState<ContractInvoice[]>([]);
  const [tab, setTab] = useState("details");

  useEffect(() => { loadItems(contract.id).then(setItems);
    loadInvoices(contract.id).then(setInvoices);
  }, [contract.id]);

  const actions = statusActions[contract.status] || [];

  const intervalLabel: Record<string, string> = { monthly: "Månadsvis", quarterly: "Kvartalsvis", semi_annually: "Halvårsvis", annually: "Årsvis"
  };
  const renewalLabel: Record<string, string> = { auto: "Automatisk", manual: "Manuell", none: "Ingen"
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" />Tillbaka</Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{contract.title}</h1>
          <p className="text-sm text-muted-foreground">{contract.contract_number} · {contract.customer?.name || "Ingen kund"}</p>
        </div>
        <div className="flex items-center gap-2">
          {actions.map(a => (
            <Button key={a.nextStatus} variant={(a.variant as "default" | "secondary" | "destructive" | "outline")} size="sm" onClick={() => onUpdate(contract.id, { status: a.nextStatus })}>
              <a.icon className="h-4 w-4 mr-1" />{a.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Belopp" value={`${contract.total_amount.toLocaleString("sv-SE")} ${contract.currency}`} />
        <SummaryCard label="Intervall" value={intervalLabel[contract.billing_interval] || contract.billing_interval} />
        <SummaryCard label="Förnyelse" value={renewalLabel[contract.renewal_type] || contract.renewal_type} />
        <SummaryCard label="Nästa faktura" value={contract.next_invoice_date ? format(new Date(contract.next_invoice_date), "d MMM yyyy", { locale: sv }) : "—"} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="details">Detaljer</TabsTrigger>
          <TabsTrigger value="items">Rader ({items.length})</TabsTrigger>
          <TabsTrigger value="invoices">Fakturor ({invoices.length})</TabsTrigger>
          <TabsTrigger value="ai">AI-analys</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <DetailRow label="Start" value={format(new Date(contract.start_date), "d MMMM yyyy", { locale: sv })} />
              {contract.end_date && <DetailRow label="Slut" value={format(new Date(contract.end_date), "d MMMM yyyy", { locale: sv })} />}
              <DetailRow label="Uppsägningstid" value={`${contract.notice_period_days || 30} dagar`} />
              {contract.indexation_enabled && (
                <>
                  <DetailRow label="Indexering" value={contract.indexation_type === 'cpi' ? 'KPI' : contract.indexation_type === 'fixed_percent' ? `${contract.indexation_percent}% / år` : 'Anpassad'} />
                  {contract.indexation_applied_at && <DetailRow label="Senast indexerad" value={format(new Date(contract.indexation_applied_at), "d MMM yyyy", { locale: sv })} />}
                </>
              )}
              {contract.notes && <DetailRow label="Anteckningar" value={contract.notes} />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items" className="space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Avtalsrader</CardTitle>
                <Button size="sm" variant="outline" onClick={() => { addItem(contract.id, { description: "Ny rad", unit_price: 0, quantity: 1 }).then(() => loadItems(contract.id).then(setItems));
                }}><Plus className="h-3 w-3 mr-1" />Lägg till rad</Button>
              </div>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Inga rader. Lägg till avtalsrader för detaljerad fakturering.</p>
              ) : (
                <div className="divide-y">
                  {items.map(item => (
                    <div key={item.id} className="py-2 flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium">{item.description}</p>
                        <p className="text-xs text-muted-foreground">{item.quantity} × {item.unit_price.toLocaleString("sv-SE")} kr {item.discount_percent ? `(-${item.discount_percent}%)` : ""}</p>
                      </div>
                      <p className="font-semibold">{item.line_total.toLocaleString("sv-SE")} kr</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-3">
          <Card>
            <CardHeader><CardTitle className="text-base">Genererade fakturor</CardTitle></CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Inga fakturor genererade ännu</p>
              ) : (
                <div className="divide-y">
                  {invoices.map(inv => (
                    <div key={inv.id} className="py-2 flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium">{format(new Date(inv.period_start), "MMM yyyy", { locale: sv })} – {format(new Date(inv.period_end), "MMM yyyy", { locale: sv })}</p>
                        <p className="text-xs text-muted-foreground">{inv.generated_at ? `Genererad ${format(new Date(inv.generated_at), "d MMM", { locale: sv })}` : "Väntar"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{inv.amount.toLocaleString("sv-SE")} kr</span>
                        <Badge variant={inv.status === 'paid' ? 'default' : inv.status === 'sent' ? 'secondary' : 'outline'} className="text-[10px]">
                          {inv.status === 'paid' ? 'Betald' : inv.status === 'sent' ? 'Skickad' : inv.status === 'generated' ? 'Genererad' : 'Väntande'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <Card>
            <CardContent className="p-6 text-center space-y-3">
              <Brain className="h-10 w-10 mx-auto text-primary" />
              <h3 className="font-semibold">AI-analys för {contract.title}</h3>
              {contract.churn_risk_score != null ? (
                <div className="space-y-2">
                  <p className="text-sm">Churn-risk: <Badge variant={contract.churn_risk_score > 70 ? "destructive" : contract.churn_risk_score > 40 ? "secondary" : "default"}>{Math.round(contract.churn_risk_score)}%</Badge></p>
                  {contract.ai_pricing_suggestion && (
                    <div className="p-3 rounded-lg bg-muted/50 text-left text-sm">
                      <p className="font-medium mb-1">Prisförslag</p>
                      <p className="text-muted-foreground">{JSON.stringify(contract.ai_pricing_suggestion)}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">AI-analysen körs automatiskt och uppdaterar churn-risk och prisförslag baserat på avtalsdata och kundbeteende.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

function SummaryCard({ label, value }: { label: string; value: string }) { return (
    <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="font-semibold text-sm">{value}</p></CardContent></Card>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) { return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
