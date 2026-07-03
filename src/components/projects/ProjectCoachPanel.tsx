import { Project, useProjectTransactions } from "@/hooks/useProjects";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingDown, Clock, FileCheck, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n) + " kr";

interface Props { project: Project;
  totalRevenue: number;
  totalCost: number;
  unbilledHours?: number;
  hourlyRate?: number;
}

interface Insight { type: "warning" | "opportunity" | "info";
  icon: typeof Sparkles;
  title: string;
  description: string;
  action?: string;
}

export function ProjectCoachPanel({ project, totalRevenue, totalCost, unbilledHours = 0, hourlyRate = 1500 }: Props) { const margin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;
  const unbilledValue = unbilledHours * hourlyRate;

  const insights: Insight[] = [];

  // Trigger 1: Margin declining
  if (totalRevenue > 0 && margin < 50 && totalCost > 0) { insights.push({ type: "warning",
      icon: TrendingDown,
      title: "Marginalen är lagre an forvantat",
      description: `Projektets marginal är ${margin.toFixed(0)}%. Granska kostnaderna för att identifiera mojliga besparingar.`,
      action: "Granska kostnader",
    });
  }

  // Trigger 2: Unbilled hours gap
  if (unbilledHours > 5) { insights.push({ type: "opportunity",
      icon: Clock,
      title: `${unbilledHours.toFixed(1)} ofakturerade timmar`,
      description: `Du har loggat tid som inte fakturerats — potentiell intakt ${fmt(unbilledValue)}. Bor detta faktureras?`,
      action: "Skapa faktura",
    });
  }

  // Trigger 3: Budget overrun
  if (project.budget_cost && project.budget_cost > 0 && totalCost > project.budget_cost) { const overrun = totalCost - project.budget_cost;
    insights.push({ type: "warning",
      icon: AlertTriangle,
      title: "Kostnadsbudgeten overskriden",
      description: `Kostnaderna overstiger budget med ${fmt(overrun)}. Overväg att omforhandla scope eller höja priset.`,
    });
  }

  // Trigger 4: Project inactivity
  if (project.status === "active") { const lastActivity = project.updated_at ? new Date(project.updated_at) : null;
    if (lastActivity) { const daysSince = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince > 30) { insights.push({ type: "info",
          icon: FileCheck,
          title: "Projektet verkar vara inaktivt",
          description: `Inga nya transaktioner på ${daysSince} dagar. Vill du stanga projektet och generera slutrapport?`,
          action: "Stang projekt",
        });
      }
    }
  }

  // Default positive insight
  if (insights.length === 0 && totalRevenue > 0) { insights.push({ type: "info",
      icon: Sparkles,
      title: "Projektet gar bra",
      description: `Aktuell marginal: ${margin.toFixed(0)}%. Fortsatt i samma takt.`,
    });
  }

  if (insights.length === 0) return null;

  const borderColor = { warning: "border-l-amber-500",
    opportunity: "border-l-[#3b82f6]",
    info: "border-l-muted-foreground/30",
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">AI Projektcoach</p>
      {insights.map((insight, i) => { const Icon = insight.icon;
        return (
          <Card key={i} className={cn("border-l-4", borderColor[insight.type])}>
            <CardContent className="py-3 px-4">
              <div className="flex items-start gap-3">
                <Icon className={cn("h-4 w-4 flex-shrink-0 mt-0.5",
                  insight.type === "warning" ? "text-[#7A5417]" :
                  insight.type === "opportunity" ? "text-[#3b82f6]" :
                  "text-muted-foreground"
                )} />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">{insight.title}</p>
                  <p className="text-xs text-muted-foreground">{insight.description}</p>
                  {insight.action && (
                    <Button size="sm" variant="outline" className="h-6 text-[10px] mt-1">
                      {insight.action}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
