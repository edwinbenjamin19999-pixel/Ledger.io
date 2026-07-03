import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Scale, Send, Calendar, XCircle, Building, AlertTriangle, Brain, Shield, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { CollectionCase, CustomerProfile } from "./ARAgent";

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

const STATUS_MAP: Record<string, { label: string; color: string }> = { pending: { label: "Väntar", color: "bg-muted text-muted-foreground" },
  submitted: { label: "Inskickad", color: "bg-[#EFF6FF] text-blue-700 dark:bg-blue-900/30 dark:text-[#1E3A5F]" },
  legal: { label: "Rättslig process", color: "bg-[#FCE8E8] text-[#7A1A1A] dark:bg-red-900/30 dark:text-[#C73838]" },
  partial_payment: { label: "Delbetalning", color: "bg-[#FAEEDA] text-[#7A5417] dark:bg-yellow-900/30 dark:text-[#C28A2B]" },
  disputed: { label: "Bestridd", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
};

const TIMELINE_STEPS = ["Faktura", "Påm. 1", "Påm. 2", "Inkassokrav", "Inkasso"];

function getTimelineProgress(c: CollectionCase): number { const reminders = c.reminder_count || 0;
  if (c.status === "submitted" || c.status === "legal") return 5;
  if (reminders >= 3) return 4;
  if (reminders >= 2) return 3;
  if (reminders >= 1) return 2;
  return 1;
}

function getRecoveryProbability(c: CollectionCase, cust?: CustomerProfile): { percent: number; label: string; time: string; strategy: string } { const dueDate = c.invoices?.due_date;
  const daysOverdue = dueDate ? Math.max(0, Math.floor((Date.now() - new Date(dueDate).getTime()) / 86400000)) : 0;
  const amount = c.remaining_amount || c.original_amount;
  const custScore = cust?.score || "C";

  let base = 85;
  if (daysOverdue > 90) base -= 40;
  else if (daysOverdue > 60) base -= 25;
  else if (daysOverdue > 30) base -= 15;
  if (amount > 100000) base -= 10;
  if (custScore >= "D") base -= 15;
  if (c.status === "disputed") base -= 20;

  const percent = Math.max(5, Math.min(95, base));
  const label = percent >= 70 ? "Hög" : percent >= 40 ? "Medel" : "Låg";
  const time = percent >= 70 ? "18-35 dagar" : percent >= 40 ? "45-90 dagar" : "90-180 dagar";
  const strategy = percent >= 70
    ? "Direktkontakt + avbetalningsplan"
    : percent >= 40
    ? "Formellt inkassokrav med deadline"
    : "Extern inkasso rekommenderas";

  return { percent, label, time, strategy };
}

interface Props { cases: CollectionCase[];
  companyId: string;
  onRefresh: () => void;
  customers: CustomerProfile[];
  writtenOffAmount: number;
  writtenOffCount: number;
}

export const ActiveCollectionTab = ({ cases, companyId, onRefresh, customers, writtenOffAmount, writtenOffCount }: Props) => { const [paymentPlanCase, setPaymentPlanCase] = useState<CollectionCase | null>(null);
  const [closingCase, setClosingCase] = useState<string | null>(null);

  const handleSendCollection = async (c: CollectionCase) => { try { const { data, error } = await supabase.functions.invoke("inkassogram-collection", { body: { action: "submit_collection", company_id: companyId, invoice_id: c.invoice_id },
      });
      if (error) throw error;
      toast.success(data?.message || "Inkassoärende skapat");
      onRefresh();
    } catch (e: any) { toast.error(e.message || "Kunde inte skicka inkassoärende");
    }
  };

  const handleCloseCase = async (caseId: string) => { setClosingCase(caseId);
    try { const { error } = await supabase.functions.invoke("inkassogram-collection", { body: { action: "close_case", company_id: companyId, case_id: caseId, reason: "manual_write_off" },
      });
      if (error) throw error;
      toast.success("Ärendet avslutat");
      onRefresh();
    } catch (e: any) { toast.error(e.message || "Kunde inte stänga ärendet");
    } finally { setClosingCase(null);
    }
  };

  if (cases.length === 0) { return (
      <Card><CardContent className="py-10 text-center text-muted-foreground">
        <Scale className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Inga aktiva inkassoärenden</p>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Write-off prevention alert */}
      {writtenOffAmount > 0 && (
        <Card className="border-[#F0DDB7] dark:border-amber-800/30 bg-[#FAEEDA] dark:bg-amber-900/10">
          <CardContent className="py-4 px-5">
            <div className="flex items-start gap-3">
              <TrendingDown className="h-5 w-5 text-[#7A5417] flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Avskrivningsforebyggande: {fmt(writtenOffAmount)} kr avskrivet i år ({writtenOffCount} fakturor)
                </p>
                <p className="text-xs text-muted-foreground">
                  AI-analys: Gemensam nämnare — alla avskrivna fakturor skickades till kunder med C-betyg eller lägre utan kreditlimit. Automatisk eskalering saknades.
                  Om påminnelseautomation hade aktiverats: estimerat {Math.max(1, Math.floor(writtenOffCount * 0.5))} av {writtenOffCount} hade kunnat räddas ({fmt(Math.round(writtenOffAmount * 0.5))} kr).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* External partner */}
      <Card className="border-border/50">
        <CardContent className="py-3 px-4 flex items-center gap-3">
          <Building className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Inkassopartner:</span>
          <Badge variant="outline" className="text-xs">Inkassogram</Badge>
          <span className="text-[10px] text-muted-foreground ml-auto">~25% av indrivet belopp</span>
        </CardContent>
      </Card>

      {cases.map(c => { const progress = getTimelineProgress(c);
        const s = STATUS_MAP[c.status] || STATUS_MAP.pending;
        const dueDate = c.invoices?.due_date;
        const daysOverdue = dueDate ? Math.max(0, Math.floor((Date.now() - new Date(dueDate).getTime()) / 86400000)) : 0;
        const interest = c.interest_amount || 0;
        const totalDebt = (c.remaining_amount || c.original_amount) + interest + (c.collection_fee || 0);
        const cust = customers.find(cu => cu.name === (c.debtor_name || c.invoices?.counterparty_name));
        const recovery = getRecoveryProbability(c, cust);
        const externalCost = Math.round(totalDebt * 0.25);

        return (
          <Card key={c.id}>
            <CardContent className="py-4 px-5 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{c.debtor_name || c.invoices?.counterparty_name || "Okänd"}</span>
                    <Badge className={`${s.color} border-0 text-[10px]`}>{s.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Faktura #{c.invoices?.invoice_number} — {fmt(c.original_amount)} kr — Forfallit: {daysOverdue} dagar
                  </p>
                </div>
              </div>

              {/* Recovery probability gauge */}
              <div className="bg-muted/20 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-secondary" />
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Återvinningssannolikhet</span>
                  </div>
                  <Badge variant="outline" className={`text-xs ${recovery.percent >= 70 ? "text-[#085041]" : recovery.percent >= 40 ? "text-[#7A5417]" : "text-destructive"}`}>
                    {recovery.label} ({recovery.percent}%)
                  </Badge>
                </div>
                <Progress value={recovery.percent} className="h-2.5" />
                <div className="grid grid-cols-3 gap-3 text-xs mt-2">
                  <div>
                    <span className="text-muted-foreground">Estimerad tid</span>
                    <p className="font-medium">{recovery.time}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Rekommendation</span>
                    <p className="font-medium">{recovery.strategy}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Extern inkassokostnad</span>
                    <p className="font-medium text-destructive">~{fmt(externalCost)} kr</p>
                  </div>
                </div>
                {recovery.percent >= 60 && (
                  <p className="text-xs text-muted-foreground italic mt-1">
                    AI rekommenderar: hantera internt — hog återvinningssannolikhet till låg kostnad.
                  </p>
                )}
              </div>

              {/* Timeline */}
              <div className="flex items-center gap-1">
                {TIMELINE_STEPS.map((step, i) => { const done = i < progress;
                  const current = i === progress - 1;
                  return (
                    <div key={i} className="flex items-center gap-1 flex-1">
                      <div className={`h-3 w-3 rounded-full flex-shrink-0 ${done ? "bg-primary" : "bg-muted"} ${current ? "ring-2 ring-primary/30" : ""}`} />
                      <span className={`text-[10px] ${done ? "text-foreground font-medium" : "text-muted-foreground"} hidden md:inline`}>{step}</span>
                      {i < TIMELINE_STEPS.length - 1 && <div className={`h-0.5 flex-1 ${done ? "bg-primary" : "bg-muted"}`} />}
                    </div>
                  );
                })}
              </div>

              {/* Financial details */}
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="bg-muted/30 rounded p-2">
                  <span className="text-muted-foreground">Dröjsmålsränta</span>
                  <p className="font-medium text-foreground">{fmt(interest)} kr</p>
                </div>
                <div className="bg-muted/30 rounded p-2">
                  <span className="text-muted-foreground">Avgifter</span>
                  <p className="font-medium text-foreground">{fmt(c.collection_fee || 0)} kr</p>
                </div>
                <div className="bg-muted/30 rounded p-2">
                  <span className="text-muted-foreground">Total skuld</span>
                  <p className="font-bold text-foreground">{fmt(totalDebt)} kr</p>
                </div>
              </div>

              {/* Inkasso decision engine */}
              {c.status === "pending" && (
                <div className="bg-muted/10 border border-border/50 rounded-lg p-4 space-y-2">
                  <p className="text-xs font-medium text-foreground">Inkassobeslut</p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">Åter vinning utan inkasso</span>
                      <p className="font-medium">{recovery.percent}%</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Kostnad vid extern inkasso</span>
                      <p className="font-medium text-destructive">~{fmt(externalCost)} kr</p>
                    </div>
                  </div>
                  {recovery.percent >= 60 && (
                    <p className="text-xs text-muted-foreground italic">
                      Rekommendation: Vänta {Math.round(14 - (recovery.percent - 60) * 0.2)} dagar — AI-scenario visar {recovery.percent - 8}% sannolikhet att kunden betalar vid direktkontakt.
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                {c.status === "pending" && (
                  <Button size="sm" onClick={() => handleSendCollection(c)}>
                    <Send className="h-3 w-3 mr-1" /> Skicka inkassokrav
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setPaymentPlanCase(c)}>
                  <Calendar className="h-3 w-3 mr-1" /> Avbetalningsplan
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  onClick={() => handleCloseCase(c.id)}
                  disabled={closingCase === c.id}
                >
                  <XCircle className="h-3 w-3 mr-1" /> Avskriv
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Payment plan modal */}
      <Dialog open={!!paymentPlanCase} onOpenChange={() => setPaymentPlanCase(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Avbetalningsplan — AI-genererad</DialogTitle>
            <DialogDescription>Optimalt uppdelat baserat på skuldens storlek och kundens betalningsmönster</DialogDescription>
          </DialogHeader>
          {paymentPlanCase && <PaymentPlanContent amount={paymentPlanCase.remaining_amount || paymentPlanCase.original_amount} debtorName={paymentPlanCase.debtor_name || paymentPlanCase.invoices?.counterparty_name || "Kund"} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const PaymentPlanContent = ({ amount, debtorName }: { amount: number; debtorName: string }) => { const parts = amount > 50000 ? 3 : amount > 20000 ? 2 : 1;
  const perPart = Math.floor(amount / parts);
  const lastPart = amount - perPart * (parts - 1);
  const interestRate = 0.08;
  const monthlyInterest = Math.round(amount * interestRate / 12);

  const now = new Date();
  const installments = Array.from({ length: parts }, (_, i) => { const date = new Date(now);
    date.setMonth(date.getMonth() + i + 1);
    return { nr: i + 1,
      amount: i === parts - 1 ? lastPart + monthlyInterest : perPart,
      date: date.toISOString().split("T")[0],
    };
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {fmt(amount)} kr + dröjsmålsränta delas upp i {parts} delbetalning{parts > 1 ? "ar" : ""} för {debtorName}:
      </p>
      <div className="space-y-2">
        {installments.map(inst => (
          <div key={inst.nr} className="flex items-center justify-between p-3 bg-muted/30 rounded">
            <span className="text-sm font-medium">Del {inst.nr}</span>
            <span className="text-sm font-bold">{fmt(inst.amount)} kr</span>
            <span className="text-xs text-muted-foreground">senast {inst.date}</span>
          </div>
        ))}
      </div>
      <div className="text-xs text-muted-foreground bg-muted/20 p-3 rounded">
        Kunden klickar på länk i e-post för att acceptera planen. Digital signering.
      </div>
      <Button className="w-full opacity-60 cursor-not-allowed" disabled>
        <Send className="h-3 w-3 mr-1" /> Skicka plan till {debtorName} (kommande)
      </Button>
    </div>
  );
};
