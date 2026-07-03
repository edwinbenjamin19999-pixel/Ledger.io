import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Wallet, TrendingUp, AlertTriangle, ArrowRight, Banknote,
  CreditCard, History, Brain, Shield, CheckCircle, ExternalLink,
  CircleDollarSign, Building,
} from "lucide-react";
import { toast } from "sonner";
import { ComingSoonBadge } from "@/components/ui/ComingSoonBadge";
import type { ARInvoice, CustomerProfile } from "./ARAgent";
import { ComingSoonButton } from "@/components/ui/ComingSoonButton";

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

interface Props { openInvoices: ARInvoice[];
  paidInvoices: ARInvoice[];
  customers: CustomerProfile[];
  companyId: string;
}

// --- Liquidity Status Card ---
const LiquidityCard = ({ openInvoices }: { openInvoices: ARInvoice[] }) => { const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 86400000);

  const incoming30 = openInvoices
    .filter(i => new Date(i.due_date) <= in30 && new Date(i.due_date) >= now)
    .reduce((s, i) => s + i.total_amount, 0);
  const incomingCount = openInvoices.filter(i => new Date(i.due_date) <= in30 && new Date(i.due_date) >= now).length;

  // Simulated outgoing (would come from AP in real system)
  const outgoing30 = Math.round(incoming30 * 0.65);
  const cashToday = Math.round(incoming30 * 0.3);
  const net30 = incoming30 - outgoing30;

  // Find biggest risk customer
  const overdueInvoices = openInvoices.filter(i => new Date(i.due_date) < now);
  const biggestRisk = overdueInvoices.sort((a, b) => b.total_amount - a.total_amount)[0];
  const netWithoutBiggest = biggestRisk ? net30 - biggestRisk.total_amount : net30;

  const health = net30 > 0 ? "good" : net30 > -20000 ? "warning" : "critical";
  const healthLabel = health === "good" ? "God likviditet" : health === "warning" ? "Stram likviditet" : "Likviditetsbrist";
  const healthColor = health === "good" ? "text-[#085041]" : health === "warning" ? "text-[#7A5417]" : "text-destructive";
  const dotColor = health === "good" ? "bg-green-500" : health === "warning" ? "bg-amber-500" : "bg-red-500";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" /> Ditt likviditetsläge
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground text-xs">Kassa idag</span>
            <p className="font-bold text-foreground">{fmt(cashToday)} kr</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Inkommande 30 dagar</span>
            <p className="font-bold text-[#085041]">{fmt(incoming30)} kr <span className="font-normal text-muted-foreground">({incomingCount} fakturor)</span></p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Utgående 30 dagar</span>
            <p className="font-bold text-foreground">{fmt(outgoing30)} kr</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Netto 30 dagar</span>
            <p className={`font-bold ${net30 >= 0 ? "text-[#085041]" : "text-destructive"}`}>{net30 >= 0 ? "+" : ""}{fmt(net30)} kr</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
          <span className={`text-sm font-medium ${healthColor}`}>{healthLabel}</span>
        </div>

        {biggestRisk && (
          <div className="bg-[#FAEEDA] dark:bg-amber-900/10 border border-[#F0DDB7] dark:border-amber-800/30 rounded-lg p-3 space-y-1">
            <p className="text-xs text-[#7A5417] dark:text-[#C28A2B] font-medium">
              Om {biggestRisk.counterparty_name} inte betalar:
            </p>
            <p className={`text-sm font-bold ${netWithoutBiggest >= 0 ? "text-foreground" : "text-destructive"}`}>
              Netto 30 dagar: {netWithoutBiggest >= 0 ? "+" : ""}{fmt(netWithoutBiggest)} kr
              {netWithoutBiggest < 0 && <AlertTriangle className="inline h-3.5 w-3.5 ml-1" />}
            </p>
            <Button size="sm" variant="outline" disabled className="opacity-60 cursor-not-allowed mt-1 text-xs">
              Finansiera fakturan nu (kommande) <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// --- Score badge helper ---
const SCORE_COLOR: Record<string, string> = { A: "text-[#085041] bg-[#E1F5EE] dark:text-[#1D9E75] dark:bg-green-900/30",
  B: "text-blue-700 bg-[#EFF6FF] dark:text-[#1E3A5F] dark:bg-blue-900/30",
  C: "text-[#7A5417] bg-[#FAEEDA] dark:text-[#C28A2B] dark:bg-yellow-900/30",
  D: "text-orange-700 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30",
  E: "text-[#7A1A1A] bg-[#FCE8E8] dark:text-[#C73838] dark:bg-red-900/30",
};

// --- Factoring Section ---
const FactoringSection = ({ openInvoices, customers }: { openInvoices: ARInvoice[]; customers: CustomerProfile[] }) => { const [selectedInvoice, setSelectedInvoice] = useState<ARInvoice | null>(null);

  const eligible = openInvoices.filter(i => i.total_amount >= 5000);
  const getScore = (name: string) => customers.find(c => c.name === name)?.score || "C";

  const getFeeRate = (score: string) => { if (score === "A") return 0.021;
    if (score === "B") return 0.028;
    if (score === "C") return 0.035;
    if (score === "D") return 0.052;
    return 0.07;
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Banknote className="h-4 w-4 text-primary" /> Fakturaköp / Factoring
          </CardTitle>
          <CardDescription>Sälj fakturor för omedelbar likviditet. Betalning inom 24 timmar.</CardDescription>
        </CardHeader>
        <CardContent>
          {eligible.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Inga fakturor tillgängliga för finansiering (krav: obetald, ej bestridd, &gt;5 000 kr)</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Faktura</th>
                    <th className="px-3 py-2 font-medium">Kund</th>
                    <th className="px-3 py-2 font-medium text-right">Belopp</th>
                    <th className="px-3 py-2 font-medium">Förfaller</th>
                    <th className="px-3 py-2 font-medium text-center">Kundbetyg</th>
                    <th className="px-3 py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {eligible.map(inv => { const score = getScore(inv.counterparty_name);
                    const isOverdue = new Date(inv.due_date) < new Date();
                    const daysLeft = Math.ceil((new Date(inv.due_date).getTime() - Date.now()) / 86400000);
                    return (
                      <tr key={inv.id} className="border-b border-border/50 last:border-0">
                        <td className="px-3 py-2.5 font-medium text-foreground">{inv.invoice_number}</td>
                        <td className="px-3 py-2.5 text-foreground">{inv.counterparty_name}</td>
                        <td className="px-3 py-2.5 text-right font-medium text-foreground">{fmt(inv.total_amount)} kr</td>
                        <td className="px-3 py-2.5">
                          {isOverdue ? (
                            <Badge variant="destructive" className="text-[10px]">Förfallen</Badge>
                          ) : (
                            <span className="text-muted-foreground">{daysLeft} dagar</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <Badge className={`border-0 ${SCORE_COLOR[score] || ""}`}>{score}</Badge>
                        </td>
                        <td className="px-3 py-2.5">
                          <Button size="sm" variant="outline" onClick={() => setSelectedInvoice(inv)}>
                            {isOverdue ? "Finansiera" : "Sälj faktura"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Factoring modal */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">Fakturaköp — omedelbar utbetalning <ComingSoonBadge label="Beta" /></DialogTitle>
            <DialogDescription>Välj finansieringspartner och få betalt inom 24 timmar. Partnerintegrationer aktiveras under H2 2026.</DialogDescription>
          </DialogHeader>
          {selectedInvoice && (() => { const score = getScore(selectedInvoice.counterparty_name);
            const rate = getFeeRate(score);
            const fee = Math.round(selectedInvoice.total_amount * rate);
            const payout = selectedInvoice.total_amount - fee;
            return (
              <div className="space-y-4">
                <div className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Faktura:</span> <span className="font-medium">{selectedInvoice.invoice_number}</span></p>
                  <p><span className="text-muted-foreground">Kund:</span> <span className="font-medium">{selectedInvoice.counterparty_name}</span> <Badge className={`border-0 text-[10px] ml-1 ${SCORE_COLOR[score]}`}>{score}</Badge></p>
                </div>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Välj partner</p>
                  <div className="grid grid-cols-2 gap-2">
                    {["Svea Ekonomi", "Collector", "Factoringgruppen", "Norion Bank"].map(p => (
                      <Button key={p} variant="outline" size="sm" className="justify-start text-xs opacity-60" onClick={() => toast.info(`${p} — partnerintegration ej aktiverad`)}>
                        <Building className="h-3 w-3 mr-1.5" /> {p}
                      </Button>
                    ))}
                  </div>
                </div>
                <Separator />
                <div className="bg-muted/30 rounded-lg p-3 space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Belopp</span><span className="font-medium">{fmt(selectedInvoice.total_amount)} kr</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Finansieringsavgift ({(rate * 100).toFixed(1)}%)</span><span className="text-destructive">{fmt(fee)} kr</span></div>
                  <Separator className="my-1" />
                  <div className="flex justify-between"><span className="font-medium">Du får</span><span className="font-bold text-[#085041]">{fmt(payout)} kr</span></div>
                  <p className="text-[10px] text-muted-foreground mt-1">Utbetalas inom 24 timmar</p>
                </div>
                <Button className="w-full opacity-60" onClick={() => { toast.info("Fakturaköp kräver aktiv partnerintegration"); setSelectedInvoice(null); }}>
                  <Banknote className="h-3.5 w-3.5 mr-1.5" /> Genomför fakturaköp (demo)
                </Button>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
};

// --- Credit Line Section ---
const CreditLineSection = () => { const limit = 250000;
  const used = 0;
  const available = limit - used;
  const utilization = (used / limit) * 100;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-primary" /> Rörelsekredit
        </CardTitle>
        <CardDescription>Baserat på din omsättning och betalningshistorik</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted/20 rounded-lg p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Utnyttjat</span>
            <span className="font-medium text-foreground">{fmt(used)} kr</span>
          </div>
          <Progress value={utilization} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0 kr</span>
            <span>{fmt(limit)} kr</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Tillgängligt: <span className="font-medium text-foreground">{fmt(available)} kr</span>
          </p>
        </div>

        <div className="bg-muted/10 border border-border/50 rounded-lg p-3 text-xs text-muted-foreground">
          Räntekostnad: 0,08%/dag (ca 29% årsränta vid fullt utnyttjande). Ränta beräknas dagligen på utnyttjat belopp.
        </div>

        <div className="flex gap-2">
          <ComingSoonButton tooltipText="Kontakta din bank för att aktivera rörelsekrediten">
            Aktivera kredit
          </ComingSoonButton>
          <ComingSoonButton tooltipText="Kräver bankintegration för att utnyttja kredit">
            Utnyttja kredit
          </ComingSoonButton>
        </div>
      </CardContent>
    </Card>
  );
};

// --- Financing History ---
const FinancingHistory = () => { // Placeholder — in production this would come from a financing_transactions table
  const transactions: { date: string; type: string; amount: number; fee: number; status: string; repaid: boolean }[] = [];
  const totalFees = transactions.reduce((s, t) => s + t.fee, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4 text-primary" /> Finansieringshistorik
        </CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            <CircleDollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Ingen finansieringshistorik ännu</p>
            <p className="text-xs mt-1">Genomförda fakturaköp och kredituttag visas här</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Datum</th>
                  <th className="px-3 py-2 font-medium">Typ</th>
                  <th className="px-3 py-2 font-medium text-right">Belopp</th>
                  <th className="px-3 py-2 font-medium text-right">Avgift/Ränta</th>
                  <th className="px-3 py-2 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="px-3 py-2 text-foreground">{t.date}</td>
                    <td className="px-3 py-2 text-foreground">{t.type}</td>
                    <td className="px-3 py-2 text-right font-medium">{fmt(t.amount)} kr</td>
                    <td className="px-3 py-2 text-right text-destructive">{fmt(t.fee)} kr</td>
                    <td className="px-3 py-2 text-center"><Badge variant="outline" className="text-[10px]">{t.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-muted-foreground mt-3">Totala finansieringskostnader i år: <span className="font-medium text-foreground">{fmt(totalFees)} kr</span></p>
          </>
        )}
      </CardContent>
    </Card>
  );
};

// --- AI Liquidity Coach ---
const AILiquidityCoach = ({ openInvoices, customers }: { openInvoices: ARInvoice[]; customers: CustomerProfile[] }) => { const now = new Date();

  const totalOutstanding = openInvoices.reduce((s, i) => s + i.total_amount, 0);
  const avgOnTimeRate = customers.length > 0
    ? customers.reduce((s, c) => s + c.onTimeRate, 0) / customers.length
    : 0.5;

  const best = Math.round(totalOutstanding * 0.95);
  const base = Math.round(totalOutstanding * avgOnTimeRate * 0.8);
  const worst = Math.round(totalOutstanding * 0.5 * 0.6);

  const cashBase = Math.round(totalOutstanding * 0.3);
  const in30 = new Date(now.getTime() + 30 * 86400000);
  const monthLabel = in30.toLocaleDateString("sv-SE", { day: "numeric", month: "long" });

  const scenarios = [
    { label: "Bästa fall", sublabel: "Alla betalar", amount: cashBase + best, color: "border-[#BFE6D6] dark:border-green-800/30 bg-[#E1F5EE] dark:bg-green-900/10", textColor: "text-[#085041] dark:text-[#1D9E75]", rec: "Inget behov av extern finansiering. Överväg att placera överskottet." },
    { label: "Basfall", sublabel: `${Math.round(avgOnTimeRate * 100)}% betalar`, amount: cashBase + base, color: "border-border bg-muted/20", textColor: "text-foreground", rec: "Normal nivå. Bevaka förfallna fakturor aktivt." },
    { label: "Sämsta fall", sublabel: "50% betalar", amount: cashBase + worst, color: "border-[#F4C8C8] dark:border-red-800/30 bg-[#FCE8E8] dark:bg-red-900/10", textColor: "text-destructive", rec: cashBase + worst < 20000 ? "Under rekommenderat minimum. Överväg fakturaköp eller rörelsekredit." : "Kassa täcker basala kostnader, men utan marginal." },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="h-4 w-4 text-secondary" /> AI Likviditetscoach
        </CardTitle>
        <CardDescription>Scenarioanalys: Vad händer om kunderna inte betalar?</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">Prognos den {monthLabel}:</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {scenarios.map((s, i) => (
            <div key={i} className={`rounded-lg border p-4 space-y-2 ${s.color}`}>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{s.label}</p>
              <p className="text-[10px] text-muted-foreground">{s.sublabel}</p>
              <p className={`text-xl font-bold ${s.textColor}`}>{fmt(s.amount)} kr</p>
              <p className="text-[10px] text-muted-foreground italic">{s.rec}</p>
            </div>
          ))}
        </div>

        {/* Early warning */}
        {cashBase + worst < 20000 && (
          <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-destructive">Tidig varning</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Prognosen visar potentiell likviditetsbrist i sämsta fallet. Rekommenderade åtgärder:
                (1) Skicka påminnelser till förfallna fakturor, (2) Överväg fakturaköp för största fordringen, (3) Aktivera rörelsekrediten som buffert.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// --- Integration Cards ---
const INTEGRATIONS = [
  { name: "Creditsafe", desc: "Kreditupplysning i realtid", connected: false, icon: Shield },
  { name: "UC (Upplysningscentralen)", desc: "Alternativ kreditbyrå", connected: false, icon: Shield },
  { name: "PostNord", desc: "Fysiska brev för inkassokrav", connected: false, icon: ExternalLink },
  { name: "Intrum / Sergel", desc: "Automatisk ärendeöverföring", connected: false, icon: Building },
  { name: "Svea Ekonomi", desc: "Factoring-offerter i realtid", connected: false, icon: Banknote },
];

const IntegrationCards = () => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-base flex items-center gap-2">
        <ExternalLink className="h-4 w-4 text-primary" /> Integrationer
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {INTEGRATIONS.map(intg => (
          <div key={intg.name} className="flex items-center gap-3 border border-border/50 rounded-lg p-3">
            <intg.icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{intg.name}</p>
              <p className="text-[10px] text-muted-foreground">{intg.desc}</p>
            </div>
            {intg.connected ? (
              <Badge className="bg-[#E1F5EE] text-[#085041] dark:bg-green-900/30 dark:text-[#1D9E75] border-0 text-[10px]">
                <CheckCircle className="h-3 w-3 mr-0.5" /> Ansluten
              </Badge>
            ) : (
              <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => toast.info(`Kontakta ${intg.name} för API-integration`)}>
                Anslut
              </Button>
            )}
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

// --- Main Component ---
export const FinancingTab = ({ openInvoices, paidInvoices, customers, companyId }: Props) => { return (
    <div className="space-y-4">
      <LiquidityCard openInvoices={openInvoices} />
      <FactoringSection openInvoices={openInvoices} customers={customers} />
      <CreditLineSection />
      <AILiquidityCoach openInvoices={openInvoices} customers={customers} />
      <FinancingHistory />
      <IntegrationCards />
    </div>
  );
};
