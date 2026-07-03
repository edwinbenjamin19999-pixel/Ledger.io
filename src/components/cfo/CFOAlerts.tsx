import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle, Lightbulb, Info, X, ArrowUpRight, ArrowDownRight,
  Clock, Shield, Send, ChevronRight, TrendingUp, TrendingDown,
} from "lucide-react";
import { toast } from "sonner";
import type { FinancialSnapshot } from "./CFODashboard";

interface CFOAlertsProps { snapshot: FinancialSnapshot | null;
  companyId: string;
}

type AlertPriority = "critical" | "high" | "medium" | "info";
type AlertType = "risk" | "opportunity" | "action" | "info";

interface Alert { id: string;
  type: AlertType;
  priority: AlertPriority;
  title: string;
  message: string;
  actionSteps: string[];
  resolved?: boolean;
  resolvedReason?: string;
  snoozedUntil?: string;
}

const PRIORITY_CONFIG: Record<AlertPriority, { label: string; className: string; icon: typeof AlertTriangle }> = { critical: { label: "Kritisk", className: "border-destructive/40 bg-destructive/5", icon: AlertTriangle },
  high: { label: "Hög", className: "border-orange-500/40 bg-orange-500/5", icon: AlertTriangle },
  medium: { label: "Medium", className: "border-[#F0DDB7] bg-[#FAEEDA]", icon: Info },
  info: { label: "Info", className: "border-[#C8DDF5] bg-[#EFF6FF]", icon: Lightbulb },
};

const PRIORITY_BADGE: Record<AlertPriority, string> = { critical: "bg-destructive text-destructive-foreground",
  high: "bg-orange-500 text-white",
  medium: "bg-amber-500 text-white",
  info: "bg-blue-500 text-white",
};

function buildAlerts(snapshot: FinancialSnapshot | null): Alert[] { if (!snapshot) return [];
  const alerts: Alert[] = [];

  // Critical: Low runway
  if (snapshot.runwayDays < 30) { alerts.push({ id: "runway-critical",
      priority: "critical",
      type: "risk",
      title: "Kritiskt låg kassareserv",
      message: `Runway är bara ${snapshot.runwayDays} dagar. Akut likviditetsbrist riskeras.`,
      actionSteps: [
        "Identifiera alla utestående fordringar och skicka betalningspåminnelser",
        "Skjut upp icke-kritiska leverantörsbetalningar",
        "Överväg kortfristig bankkredit eller factoring",
        "Gör en detaljerad kassaflödesprognos för kommande 30 dagar",
      ],
    });
  } else if (snapshot.runwayDays < 60) { alerts.push({ id: "runway-high",
      priority: "high",
      type: "risk",
      title: "Låg kassaflödesreserv",
      message: `Runway är ${snapshot.runwayDays} dagar. Prioritera inkommande betalningar.`,
      actionSteps: [
        "Granska alla förfallna fakturor och prioritera inkassering",
        "Analysera kommande utgifter och identifiera vad som kan senareläggas",
        "Överväg att erbjuda snabbbetalningsrabatt till kunder (t.ex. 2% vid 10 dagar)",
      ],
    });
  }

  // Overdue invoices
  for (const inv of snapshot.overdueInvoices.slice(0, 5)) { const priority: AlertPriority = inv.daysOverdue > 60 ? "critical" : inv.daysOverdue > 30 ? "high" : "medium";
    alerts.push({ id: `overdue-${inv.customer}-${inv.daysOverdue}`,
      priority,
      type: "risk",
      title: `Förfallen faktura: ${inv.customer}`,
      message: `${inv.amount.toLocaleString("sv-SE")} kr, ${inv.daysOverdue} dagar förfallen.`,
      actionSteps: [
        inv.daysOverdue > 60 ? "Överväg att skicka inkassokrav via Inkassogram" : "Skicka betalningspåminnelse",
        "Ring kontaktperson hos kunden",
        inv.daysOverdue > 30 ? "Kräv dröjsmålsränta enligt räntelagen (referensränta + 8%)" : "Kontrollera att fakturan nått rätt mottagare",
        "Dokumentera all kommunikation för eventuellt inkassokrav",
      ],
    });
  }

  // Margin anomaly
  if (snapshot.ebitdaMargin > 60) { alerts.push({ id: "margin-high",
      priority: "info",
      type: "opportunity",
      title: "Ovanligt hög EBITDA-marginal",
      message: `${snapshot.ebitdaMargin}%. Branschsnittet för konsultbolag är ~22%. Verifiera att alla kostnader är bokförda.`,
      actionSteps: [
        "Kontrollera att alla leverantörsfakturor är bokförda",
        "Verifiera att upplupna kostnader är periodiserade",
        "Om marginalen är korrekt — analysera möjligheten till löneutdelning via 3:12",
      ],
    });
  }

  // Tax optimization
  if (snapshot.yearResult > 200000) { const fond = Math.round(snapshot.yearResult * 0.25);
    const taxSaving = Math.round(fond * 0.206);
    alerts.push({ id: "tax-opt",
      priority: "medium",
      type: "opportunity",
      title: "Skatteoptimering möjlig",
      message: `Periodiseringsfond (25%) = ${fond.toLocaleString("sv-SE")} kr kan spara ${taxSaving.toLocaleString("sv-SE")} kr i skatt.`,
      actionSteps: [
        `Avsätt ${fond.toLocaleString("sv-SE")} kr till periodiseringsfond (max 25% av överskott)`,
        "Fondet måste återföras inom 6 år",
        "Bokför: Dr 8811 Avsättning periodiseringsfond / Kr 2128 Periodiseringsfond",
        "Överväg även överavskrivningar på inventarier",
      ],
    });
  }

  // Sort by priority
  const priorityOrder: AlertPriority[] = ["critical", "high", "medium", "info"];
  return alerts.sort((a, b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority));
}

export function CFOAlerts({ snapshot, companyId }: CFOAlertsProps) { const initialAlerts = buildAlerts(snapshot);
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [dismissReason, setDismissReason] = useState<string>("resolved");
  const [filter, setFilter] = useState<AlertPriority | "all">("all");

  const dismissAlert = (alertId: string, reason: string) => { setAlerts(prev => prev.map(a =>
      a.id === alertId ? { ...a, resolved: true, resolvedReason: reason, snoozedUntil: reason === "snoozed" ? new Date(Date.now() + 7 * 86400000).toISOString() : undefined } : a
    ));
    setSelectedAlert(null);
    toast.success(reason === "snoozed" ? "Snoozad i 7 dagar" : "Varning stängd");
  };

  const filteredAlerts = alerts.filter(a => { if (a.resolved) return false;
    if (filter === "all") return true;
    return a.priority === filter;
  });

  const resolvedCount = alerts.filter(a => a.resolved).length;
  const activeCount = alerts.filter(a => !a.resolved).length;

  const sendWarningReport = () => { const criticalAlerts = alerts.filter(a => !a.resolved && (a.priority === "critical" || a.priority === "high"));
    if (criticalAlerts.length === 0) { toast.info("Inga kritiska varningar att rapportera");
      return;
    }
    const subject = `Bokfy Varningsrapport — ${criticalAlerts.length} aktiva varningar`;
    const body = [
      "LEDGER.IO VARNINGSRAPPORT",
      `Datum: ${new Date().toLocaleDateString("sv-SE")}`,
      `Aktiva varningar: ${criticalAlerts.length}`,
      "",
      ...criticalAlerts.map((a, i) => [
        `${i + 1}. [${PRIORITY_CONFIG[a.priority].label}] ${a.title}`,
        `   ${a.message}`,
        "",
      ]).flat(),
      "— Bokfy CFO",
    ].join("\n");
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank");
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-primary" />
                Proaktiva varningar & möjligheter
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <span>{activeCount} aktiva</span>
                {resolvedCount > 0 && <span className="text-muted-foreground">| {resolvedCount} lösta</span>}
              </CardDescription>
            </div>
            <div className="flex gap-2 items-center">
              <Select value={filter} onValueChange={(v) => setFilter(v as AlertPriority | "all")}>
                <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla</SelectItem>
                  <SelectItem value="critical">Kritisk</SelectItem>
                  <SelectItem value="high">Hög</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={sendWarningReport} size="sm" variant="outline" className="gap-1.5 text-xs">
                <Send className="h-3.5 w-3.5" /> Skicka rapport
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-[#22c55e]" />
              <p className="text-sm">Inga aktiva varningar — allt ser bra ut!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map(alert => { const config = PRIORITY_CONFIG[alert.priority];
                const Icon = config.icon;
                return (
                  <div key={alert.id} className={cn(
                    "border rounded-lg p-4 transition-all",
                    config.className,
                    alert.priority === "critical" && "border-l-4 border-l-destructive animate-pulse",
                    alert.type === "opportunity" && "border-emerald-200/50 bg-emerald-50/30"
                  )}>
                    <div className="flex items-start gap-3">
                      <Icon className={cn("h-5 w-5 flex-shrink-0 mt-0.5",
                        alert.type === "opportunity" ? "text-[#085041]" :
                        alert.priority === "critical" ? "text-destructive" :
                        alert.priority === "high" ? "text-orange-500" :
                        alert.priority === "medium" ? "text-[#7A5417]" : "text-blue-500"
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium">{alert.title}</p>
                          <Badge className={`text-[10px] ${PRIORITY_BADGE[alert.priority]}`}>
                            {config.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{alert.message}</p>
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={() => setSelectedAlert(alert)}>
                            Åtgärda <ChevronRight className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => dismissAlert(alert.id, "not_relevant")}>
                            Inte relevant
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => dismissAlert(alert.id, "snoozed")}>
                            <Clock className="h-3 w-3 mr-1" /> Snooze 7d
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action panel */}
      <Sheet open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
        <SheetContent className="sm:max-w-md">
          {selectedAlert && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-4 w-4 text-primary" />
                  Åtgärda: {selectedAlert.title}
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-4">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm">{selectedAlert.message}</p>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Rekommenderade steg
                  </h4>
                  <div className="space-y-2">
                    {selectedAlert.actionSteps.map((step, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 border rounded-lg bg-background">
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                          {i + 1}
                        </div>
                        <p className="text-sm">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Stäng varning
                  </h4>
                  <Select value={dismissReason} onValueChange={setDismissReason}>
                    <SelectTrigger className="w-full h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="resolved">Löst</SelectItem>
                      <SelectItem value="not_relevant">Inte relevant</SelectItem>
                      <SelectItem value="snoozed">Snooze 7 dagar</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button className="w-full" onClick={() => dismissAlert(selectedAlert.id, dismissReason)}>
                    <CheckCircle className="h-4 w-4 mr-1.5" />
                    {dismissReason === "snoozed" ? "Snooze i 7 dagar" : "Markera som löst"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
