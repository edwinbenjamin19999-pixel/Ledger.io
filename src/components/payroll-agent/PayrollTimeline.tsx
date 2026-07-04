import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, FileText, AlertTriangle, Calendar } from "lucide-react";

interface PayrollTimelineProps { payrollRuns: any[];
}

export const PayrollTimeline = ({ payrollRuns }: PayrollTimelineProps) => { const fmt = (n: number) => n?.toLocaleString("sv-SE", { maximumFractionDigits: 0 }) || "0";

  const statusConfig: Record<string, { icon: any; color: string; label: string }> = { approved: { icon: CheckCircle, color: "text-[#085041]", label: "Godkänd" },
    draft: { icon: Clock, color: "text-[#7A5417]", label: "Utkast" },
    pending: { icon: FileText, color: "text-blue-500", label: "Väntar" },
  };

  // Show upcoming deadlines
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const deadlines = [
    { day: 20, label: "Löneunderlag klart", icon: FileText },
    { day: 25, label: "Utbetalning", icon: Calendar },
    { day: 12, label: "AGI-inlämning (nästa mån)", icon: FileText },
  ];

  return (
    <div className="space-y-4">
      {/* Upcoming deadlines */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Kommande deadlines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {deadlines.map((d, i) => { const deadlineDate = new Date(currentYear, d.day <= 12 ? currentMonth + 1 : currentMonth, d.day);
              const isPast = deadlineDate < now;
              const Icon = d.icon;
              return (
                <div
                  key={i}
                  className={`flex-shrink-0 border rounded-lg p-3 min-w-[160px] ${ isPast ? "bg-[#E1F5EE] border-[#BFE6D6] dark:bg-green-950/20 dark:border-green-800" : "bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {isPast ? (
                      <CheckCircle className="h-4 w-4 text-[#085041]" />
                    ) : (
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-xs font-medium">Den {d.day}:e</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{d.label}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lönehistorik</CardTitle>
        </CardHeader>
        <CardContent>
          {payrollRuns.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Inga lönekörningar ännu</p>
          ) : (
            <div className="space-y-3">
              {payrollRuns.map((run) => { const cfg = statusConfig[run.status] || statusConfig.draft;
                const Icon = cfg.icon;
                return (
                  <div key={run.id} className="flex items-center justify-between border rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <Icon className={`h-5 w-5 ${cfg.color}`} />
                      <div>
                        <p className="text-sm font-medium">
                          {run.period_start} — {run.period_end}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Utbetalning: {run.payment_date}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{fmt(run.total_employer_cost)} kr</p>
                      <Badge variant={run.status === "approved" ? "default" : "secondary"} className="text-xs">
                        {cfg.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
