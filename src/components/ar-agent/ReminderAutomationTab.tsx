import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Mail, MessageSquare, Printer, Zap, Clock, CheckCircle, AlertTriangle, Phone, Brain } from "lucide-react";
import { toast } from "sonner";
import type { ARInvoice, CustomerProfile } from "./ARAgent";
import { ComingSoonButton } from "@/components/ui/ComingSoonButton";

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

interface Step { day: number;
  label: string;
  description: string;
  tone: "neutral" | "friendly" | "firm" | "serious" | "legal" | "final";
  channel: string;
  enabled: boolean;
  fee?: string;
}

const DEFAULT_STEPS: Step[] = [
  { day: 0, label: "Faktura skickad", description: "Faktura levereras till kund via e-post", tone: "neutral", channel: "E-post", enabled: true },
  { day: 1, label: "Vänlig påminnelse", description: "Automatisk e-post: 'Vi noterar att faktura förfallit. Troligen ett förbiseende.'", tone: "friendly", channel: "E-post", enabled: true },
  { day: 8, label: "Formell påminnelse", description: "E-post med tydlig deadline. SMS om aktiverat.", tone: "firm", channel: "E-post + SMS", enabled: true, fee: "Ränta + 60 kr avgift" },
  { day: 15, label: "Ring-mig alert", description: "Notifikation till dig att ringa kunden. AI forbereder samtalsunderlag.", tone: "serious", channel: "Notifikation", enabled: true },
  { day: 22, label: "Inkassokrav", description: "Formellt inkassokrav med legal text och inkassoavgift 180 kr.", tone: "legal", channel: "E-post + Brev", enabled: true, fee: "180 kr inkassoavgift" },
  { day: 30, label: "Extern inkasso", description: "Automatisk overlamning till inkassobolag.", tone: "final", channel: "API", enabled: true },
];

const TONE_COLORS: Record<string, string> = { neutral: "bg-muted text-muted-foreground",
  friendly: "bg-[#E1F5EE] text-[#085041] dark:bg-green-900/30 dark:text-[#1D9E75]",
  firm: "bg-[#FAEEDA] text-[#7A5417] dark:bg-yellow-900/30 dark:text-[#C28A2B]",
  serious: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  legal: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  final: "bg-[#FCE8E8] text-[#7A1A1A] dark:bg-red-900/30 dark:text-[#C73838]",
};

const CHANNEL_ICON: Record<string, typeof Mail> = { "E-post": Mail,
  "SMS": MessageSquare,
  "E-post + SMS": MessageSquare,
  "E-post + Brev": Printer,
  "Notifikation": Phone,
  "API": Zap,
};

interface Props { openInvoices: ARInvoice[];
  customers: CustomerProfile[];
}

export const ReminderAutomationTab = ({ openInvoices, customers }: Props) => { const [steps, setSteps] = useState<Step[]>(DEFAULT_STEPS);
  const [aiTiming, setAiTiming] = useState(true);

  const toggleStep = (i: number) => { setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, enabled: !s.enabled } : s));
  };

  const now = new Date();

  // Build per-invoice AI action recommendations
  const invoiceActions = openInvoices.map(inv => { const dueDate = new Date(inv.due_date);
    const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / 86400000);
    const daysUntilDue = -daysOverdue;
    const cust = customers.find(c => c.name === inv.counterparty_name);
    const score = cust?.score || "C";

    let action: "none" | "watch" | "remind" | "urgent" | "escalate" = "none";
    let message = "";
    let urgency: "low" | "medium" | "high" | "critical" = "low";

    if (daysOverdue < 0) { action = "none";
      message = `Inga åtgärder behövs ännu. Förfallodag om ${-daysOverdue} dagar. AI bevakar — automatisk påminnelse skickas dag 1 efter förfall om ej betald.`;
      urgency = "low";
    } else if (daysOverdue <= 5) { action = "remind";
      message = `Forfallit ${daysOverdue} dagar sedan. Vänlig påminnelse rekommenderas. ${cust ? `${cust.name} svarar bäst via ${cust.communicationProfile.bestChannel} ${cust.communicationProfile.bestDay} ${cust.communicationProfile.bestTime}.` : ""}`;
      urgency = "medium";
    } else if (daysOverdue <= 15) { action = "remind";
      message = `Formell påminnelse krävs. ${daysOverdue} dagar förfallit. Dröjsmålsränta tillkommer.`;
      urgency = "medium";
    } else if (daysOverdue <= 30) { action = "urgent";
      message = `ÅTGÄRD KRÄVS: ${daysOverdue} dagar förfallit. AI föreslår: personligt telefonsamtal + formell e-post idag.`;
      urgency = "high";
    } else { action = "escalate";
      message = `KRITISKT: ${daysOverdue} dagar förfallit. Inkassokrav bör skickas omgående. Sannolikhet för betalning sjunker för varje dag.`;
      urgency = "critical";
    }

    // Personalized template based on score
    let template = "";
    if (score <= "B") { template = `Hej, vi noterar att faktura #${inv.invoice_number} på ${fmt(inv.total_amount)} kr ännu inte registrerats. Troligen ett förbiseende — betalningsinfo bifogas.`;
    } else if (score === "C") { template = `Vi hänvisar till faktura #${inv.invoice_number} på ${fmt(inv.total_amount)} kr som förfallit. Vänligen betala snarast för att undvika påminnelseavgift.`;
    } else { template = `Vi refererar till faktura #${inv.invoice_number}. Betalning om ${fmt(inv.total_amount)} kr är nu förfallit sedan ${daysOverdue} dagar. Vi begär omgående betalning senast ${new Date(now.getTime() + 3 * 86400000).toISOString().split("T")[0]}.`;
    }

    return { inv, daysOverdue, daysUntilDue, action, message, urgency, template, score, cust };
  }).sort((a, b) => b.daysOverdue - a.daysOverdue);

  const urgentCount = invoiceActions.filter(a => a.urgency === "high" || a.urgency === "critical").length;

  return (
    <div className="space-y-4">
      {/* Urgent actions banner */}
      {urgentCount > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-xs text-foreground font-medium">
              {urgentCount} fakturor kräver omedelbar åtgärd — totalt {fmt(invoiceActions.filter(a => a.urgency === "high" || a.urgency === "critical").reduce((s, a) => s + a.inv.total_amount, 0))} kr
            </p>
            <ComingSoonButton tooltipText="Automatisk utskick av påminnelser till alla förfallna fakturor">
              Skicka alla påminnelser
            </ComingSoonButton>
          </CardContent>
        </Card>
      )}

      {/* Per-invoice AI communication plan */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4 text-secondary" /> AI-kommunikationsplan per faktura
          </CardTitle>
          <CardDescription>{invoiceActions.length} aktiva fakturor bevakas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {invoiceActions.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-[#085041]" />
              Inga utestående fakturor att bevaka
            </div>
          ) : (
            invoiceActions.map(({ inv, daysOverdue, daysUntilDue, message, urgency, template, score, cust }) => { const urgencyColors = { low: "border-l-green-500",
                medium: "border-l-yellow-500",
                high: "border-l-orange-500",
                critical: "border-l-red-500",
              };
              return (
                <div key={inv.id} className={`border border-border/50 rounded-lg p-4 border-l-4 ${urgencyColors[urgency]} space-y-2`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-foreground">{inv.counterparty_name}</span>
                      <Badge variant="outline" className="text-[10px]">#{inv.invoice_number}</Badge>
                      <Badge variant="outline" className="text-[10px]">{score}</Badge>
                    </div>
                    <span className="text-sm font-bold text-foreground">{fmt(inv.total_amount)} kr</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {daysOverdue > 0 ? (
                      <span className="text-destructive font-medium">{daysOverdue} dagar förfallit</span>
                    ) : (
                      <span>{-daysOverdue} dagar till förfall</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{message}</p>

                  {/* Personalized template preview */}
                  {daysOverdue > 0 && (
                    <div className="bg-muted/20 rounded p-3 text-xs italic text-muted-foreground border border-border/30">
                      <span className="text-[10px] uppercase tracking-wide font-medium not-italic block mb-1">Anpassad mall ({score <= "B" ? "vänlig ton" : score === "C" ? "formell ton" : "strikt ton"}):</span>
                      "{template}"
                    </div>
                  )}

                  {/* Optimal timing */}
                  {cust && daysOverdue > 0 && (
                    <p className="text-[10px] text-muted-foreground">
                      Optimal tid: {cust.communicationProfile.bestChannel} {cust.communicationProfile.bestDay} {cust.communicationProfile.bestTime} (svarsfrekvens {Math.round(cust.communicationProfile.responseRate * 100)}%)
                    </p>
                  )}

                  {daysOverdue > 0 && (
                    <div className="flex gap-2 pt-1">
                      <ComingSoonButton tooltipText="Skicka AI-anpassad påminnelse till kunden">
                        Skicka nu
                      </ComingSoonButton>
                      {daysOverdue > 15 && (
                        <ComingSoonButton tooltipText="AI-genererat samtalsunderlag med betalningsmönster">
                          Samtalsunderlag
                        </ComingSoonButton>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* AI timing toggle */}
      <Card className="border-secondary/30">
        <CardContent className="py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-secondary" />
            <div>
              <p className="text-sm font-medium text-foreground">AI-optimerad timing</p>
              <p className="text-xs text-muted-foreground">AI lär sig när varje kund är mest mottaglig för påminnelser</p>
            </div>
          </div>
          <Switch checked={aiTiming} onCheckedChange={setAiTiming} />
        </CardContent>
      </Card>

      {/* Escalation ladder */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" /> Eskaleringsstege
          </CardTitle>
          <CardDescription>Automatisk eskaleringskedja — aktivera/inaktivera varje steg</CardDescription>
        </CardHeader>
        <CardContent className="space-y-0">
          {steps.map((step, i) => { const ChannelIcon = CHANNEL_ICON[step.channel] || Mail;
            const isLast = i === steps.length - 1;
            return (
              <div key={i} className="relative">
                {!isLast && (
                  <div className="absolute left-[19px] top-[44px] bottom-0 w-0.5 bg-border" />
                )}
                <div className={`flex items-start gap-4 py-4 ${!step.enabled ? "opacity-40" : ""}`}>
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${TONE_COLORS[step.tone]}`}>
                    {step.day === 0 ? "0" : `+${step.day}`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">{step.label}</span>
                      {step.fee && <Badge variant="outline" className="text-[10px]">{step.fee}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                    <div className="flex items-center gap-1 mt-1.5">
                      <ChannelIcon className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">{step.channel}</span>
                    </div>
                  </div>
                  <Switch checked={step.enabled} onCheckedChange={() => toggleStep(i)} disabled={i === 0} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};
