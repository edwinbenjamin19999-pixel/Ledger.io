import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { FileText, Plus, TrendingUp, RefreshCw, Calendar, Search, Sparkles, Radar, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useContracts, ServiceContract } from "@/hooks/useContracts";
import { getStoredActiveCompanyId } from "@/lib/company-selection";
import { ContractList } from "@/components/contracts/ContractList";
import { ContractForm } from "@/components/contracts/ContractForm";
import { ContractDetail } from "@/components/contracts/ContractDetail";
import { RevenueTimeline } from "@/components/contracts/RevenueTimeline";
import { RecurringRevenueOverview } from "@/components/contracts/RecurringRevenueOverview";
import { ChurnRadarCard } from "@/components/contracts/ChurnRadarCard";
import { RevenueForecastPanel } from "@/components/contracts/RevenueForecastPanel";
import { format, differenceInDays, parseISO } from "date-fns";
import { sv } from "date-fns/locale";

const ContractsPage = () => { const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  useEffect(() => { setActiveCompanyId(getStoredActiveCompanyId()); }, []);
  const { contracts, loading, stats, createContract, updateContract, deleteContract, reload } = useContracts(activeCompanyId || undefined);
  const [showForm, setShowForm] = useState(false);
  const [selectedContract, setSelectedContract] = useState<ServiceContract | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [showExamples, setShowExamples] = useState(false);

  // Compute monthly amount per contract
  const monthlyOf = (c: ServiceContract) => {
    const a = c.total_amount || 0;
    return c.billing_interval === 'monthly' ? a
      : c.billing_interval === 'quarterly' ? a / 3
      : c.billing_interval === 'semi_annually' ? a / 6
      : a / 12;
  };

  const upcomingRenewals = useMemo(() => {
    const now = new Date();
    return contracts
      .filter(c => c.end_date && c.status === 'active')
      .map(c => ({ c, days: differenceInDays(parseISO(c.end_date!), now) }))
      .filter(x => x.days >= 0 && x.days <= 90)
      .sort((a, b) => a.days - b.days);
  }, [contracts]);


  if (!activeCompanyId) { return (
      <div className="p-6">
        <Card><CardContent className="py-12 text-center text-muted-foreground">Välj ett företag för att hantera avtal.</CardContent></Card>
      </div>
    );
  }

  if (selectedContract) { return (
      <ContractDetail
        contract={selectedContract}
        companyId={activeCompanyId}
        onBack={() => { setSelectedContract(null); reload(); }}
        onUpdate={updateContract}
      />
    );
  }

  const filteredContracts = contracts.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.contract_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.customer?.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const upcomingInvoices = contracts.filter(c => c.status === 'active' && c.next_invoice_date);
  const highChurnRisk = contracts.filter(c => (c.churn_risk_score || 0) > 70);
  const isEmpty = !loading && stats.total === 0;

  return (
    <div className="relative">
      {/* Subtle depth band behind hero/page */}
      <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-slate-50/50 to-transparent dark:from-slate-900/40 pointer-events-none" />

      <PageHeader
        icon={FileText}
        title="Avtal & Återkommande intäkter"
        subtitle="Hantera avtal, prenumerationer och automatisk fakturering"
        actions={ <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={reload}><RefreshCw className="h-4 w-4 mr-1" />Uppdatera</Button>
            <Button size="sm" onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" />Lägg till intäktsström</Button>
          </div>
        }
      />
      <div className="px-8 space-y-6 relative">

      {isEmpty ? (
        // ============ EMPTY STATE HERO ============
        <div className="relative overflow-hidden rounded-2xl bg-[#0F1F3D] border border-slate-800 p-10 md:p-14 shadow-[0_8px_40px_-12px_rgba(37,99,235,0.25)]">
          {/* Cyan glow accent */}
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#EFF6FF] blur-3xl pointer-events-none" />
          <div className="absolute top-0 left-0 w-1 h-full bg-[#0F1F3D]" />

          <div className="relative max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFF6FF] border border-[#C8DDF5] mb-5">
              <Sparkles className="h-3.5 w-3.5 text-[#1E3A5F]" />
              <span className="text-xs font-medium text-[#3b82f6] tracking-wide">REVENUE INTELLIGENCE</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">
              Lägg till din första återkommande intäktsström
            </h2>
            <p className="text-base md:text-lg text-slate-300 mb-7 leading-relaxed">
              AI genererar fakturor, intäkter och prognoser automatiskt — du gör inget.
            </p>
            <div className="flex flex-wrap gap-3 mb-10">
              <Button size="lg" onClick={() => setShowForm(true)} className="bg-[#3b82f6] hover:bg-[#3b82f6] text-slate-950 font-semibold shadow-lg shadow-[#3b82f6]/20">
                <Plus className="h-4 w-4 mr-1.5" />Lägg till återkommande intäktsström
              </Button>
              <Button size="lg" variant="outline" onClick={() => setShowExamples(true)} className="border-slate-700 bg-slate-900/50 text-slate-200 hover:bg-slate-800 hover:text-white">
                Se exempel →
              </Button>
            </div>

            <ExamplesDialog open={showExamples} onOpenChange={setShowExamples} onCreate={() => { setShowExamples(false); setShowForm(true); }} />

            <div className="h-px w-full bg-slate-800 mb-6" />

            <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-4 font-medium">Vad händer när du har avtal</p>
            <div className="grid md:grid-cols-3 gap-4">
              <FeatureRow icon={RefreshCw} title="Automatisk fakturering" sub="varje månad" />
              <FeatureRow icon={TrendingUp} title="MRR/ARR-prognos" sub="12 månader framåt" />
              <FeatureRow icon={Radar} title="Churn-radar" sub="varnar 30 dagar i förväg" />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <RecurringRevenueOverview contracts={contracts} stats={stats} />

          <ChurnRadarCard
            contracts={contracts}
            onSelect={setSelectedContract}
            onMarkSafe={(id) => updateContract(id, { churn_risk_score: 0 })}
          />

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-slate-100/60 dark:bg-slate-900/60 p-1 rounded-full">
              <TabsTrigger value="overview" className="rounded-full data-[state=active]:bg-[#3b82f6] data-[state=active]:text-white data-[state=active]:shadow-sm">Översikt</TabsTrigger>
              <TabsTrigger value="contracts" className="rounded-full data-[state=active]:bg-[#3b82f6] data-[state=active]:text-white data-[state=active]:shadow-sm">Avtal</TabsTrigger>
              <TabsTrigger value="timeline" className="rounded-full data-[state=active]:bg-[#3b82f6] data-[state=active]:text-white data-[state=active]:shadow-sm">Tidslinje</TabsTrigger>
              <TabsTrigger value="forecast" className="rounded-full data-[state=active]:bg-[#3b82f6] data-[state=active]:text-white data-[state=active]:shadow-sm">Prognos</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 pt-4">
              <RevenueForecastPanel contracts={contracts} mrr={stats.mrr} />
              <Card className="border-slate-200/60 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <CardHeader><CardTitle className="text-base">Senaste avtalen</CardTitle><CardDescription>Klicka för att öppna detaljer</CardDescription></CardHeader>
                <CardContent>
                  <ContractList contracts={contracts.slice(0, 5)} loading={loading} onSelect={setSelectedContract} onDelete={deleteContract} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contracts" className="space-y-4 pt-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Sök avtal..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
                </div>
              </div>
              <ContractList contracts={filteredContracts} loading={loading} onSelect={setSelectedContract} onDelete={deleteContract} />
            </TabsContent>

            <TabsContent value="timeline" className="space-y-6 pt-4">
              <Card className="border-slate-200/60 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <CardHeader>
                  <CardTitle className="text-base">Förnyelser & kommande fakturor</CardTitle>
                  <CardDescription>{upcomingRenewals.length} förnyelser inom 90d · {upcomingInvoices.length} kommande fakturor</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-3">Förnyelser (90d)</h4>
                      {upcomingRenewals.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Inga förnyelser inom 90 dagar</p>
                      ) : (
                        <div className="space-y-2">
                          {upcomingRenewals.map(({ c, days }) => (
                            <button key={c.id} onClick={() => setSelectedContract(c)} className="w-full text-left p-2.5 rounded-lg border border-slate-200/60 hover:bg-[#3b82f6]/[0.04] transition-colors flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{c.title}</p>
                                <p className="text-[11px] text-muted-foreground truncate">{c.customer?.name || "—"}</p>
                              </div>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${days <= 14 ? 'bg-[#FCE8E8] text-[#7A1A1A] dark:bg-rose-950/30 dark:text-rose-300' : days <= 30 ? 'bg-[#FAEEDA] text-[#7A5417] dark:bg-amber-950/30 dark:text-amber-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                                {days}d
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-3">Kommande fakturor</h4>
                      {upcomingInvoices.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Inga kommande fakturor</p>
                      ) : (
                        <div className="space-y-2">
                          {upcomingInvoices.slice(0, 8).map(c => (
                            <div key={c.id} className="p-2.5 rounded-lg border border-slate-200/60 flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{c.title}</p>
                                <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />{c.next_invoice_date ? format(new Date(c.next_invoice_date), "d MMM yyyy", { locale: sv }) : "—"}</p>
                              </div>
                              <p className="text-sm font-semibold tabular-nums shrink-0">{c.total_amount.toLocaleString("sv-SE")} {c.currency}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              <RevenueTimeline contracts={contracts.filter(c => c.status === 'active')} />
            </TabsContent>

            <TabsContent value="forecast" className="pt-4">
              <RevenueForecastPanel contracts={contracts} mrr={stats.mrr} />
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Contract Form Dialog */}
      {showForm && (
        <ContractForm
          companyId={activeCompanyId}
          onClose={() => setShowForm(false)}
          onCreate={async (data) => { await createContract(data);
            setShowForm(false);
          }}
        />
      )}
      </div>
    </div>
  );
};

function FeatureRow({ icon: Icon, title, sub }: { icon: any; title: string; sub: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-8 w-8 rounded-lg bg-[#EFF6FF] border border-[#C8DDF5] flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-[#1E3A5F]" />
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-xs text-slate-400">{sub}</p>
      </div>
    </div>
  );
}

const EXAMPLE_CONTRACTS = [
  { title: "Acme AB — SaaS Pro", customer: "Acme AB", interval: "Månadsvis", mrr: 12500, arr: 150000, churn: 8, status: "Aktiv", next: "2026-07-01" },
  { title: "Nordic Retail — Enterprise", customer: "Nordic Retail AB", interval: "Årsvis", mrr: 24000, arr: 288000, churn: 35, status: "Aktiv", next: "2027-01-15" },
  { title: "Studio Lab — Starter", customer: "Studio Lab", interval: "Kvartalsvis", mrr: 3200, arr: 38400, churn: 72, status: "Risk", next: "2026-09-01" },
];

const fmtSek = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 }) + " kr";

function ExamplesDialog({ open, onOpenChange, onCreate }: { open: boolean; onOpenChange: (v: boolean) => void; onCreate: () => void }) {
  const totalMRR = EXAMPLE_CONTRACTS.reduce((s, c) => s + c.mrr, 0);
  const totalARR = EXAMPLE_CONTRACTS.reduce((s, c) => s + c.arr, 0);
  const highChurn = EXAMPLE_CONTRACTS.filter(c => c.churn >= 70);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>Exempel: Återkommande intäktsströmmar</DialogTitle>
            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[10px]">EXEMPELDATA</Badge>
          </div>
          <DialogDescription>
            Så här ser vyn ut med 3 avtal. Inga riktiga avtal skapas — stäng dialogen för att gå tillbaka till tomt läge.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-200 p-3"><p className="text-[11px] uppercase text-slate-500">MRR</p><p className="text-xl font-bold tabular-nums">{fmtSek(totalMRR)}</p></div>
          <div className="rounded-xl border border-slate-200 p-3"><p className="text-[11px] uppercase text-slate-500">ARR</p><p className="text-xl font-bold tabular-nums">{fmtSek(totalARR)}</p></div>
          <div className="rounded-xl border border-slate-200 p-3"><p className="text-[11px] uppercase text-slate-500">Churn-risk</p><p className="text-xl font-bold tabular-nums text-rose-700">{highChurn.length} avtal</p></div>
        </div>

        <div className="space-y-2">
          {EXAMPLE_CONTRACTS.map((c, i) => (
            <div key={i} className="rounded-xl border border-slate-200 p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold truncate">{c.title}</p>
                  {c.churn >= 70 && <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px]"><AlertTriangle className="h-3 w-3 mr-1" />Churn {c.churn}%</Badge>}
                </div>
                <p className="text-xs text-slate-500">{c.customer} · {c.interval} · Nästa faktura {c.next}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">MRR</p>
                <p className="text-sm font-semibold tabular-nums">{fmtSek(c.mrr)}</p>
              </div>
            </div>
          ))}
        </div>

        {highChurn.length > 0 && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 text-xs text-rose-900">
            <strong>Churn-radar:</strong> {highChurn.length} avtal har förhöjd churn-risk. Systemet varnar dig automatiskt 30 dagar innan förnyelse.
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Tillbaka till tomt läge</Button>
          <Button onClick={onCreate}>Skapa mitt första avtal</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


export default ContractsPage;
