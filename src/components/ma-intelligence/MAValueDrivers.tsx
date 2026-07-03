import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Target, TrendingUp, Users, FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";

const formatSEK = (v: number) => { if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} MSEK`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)} TSEK`;
  return `${v.toFixed(0)} kr`;
};

interface Props { revenue: number;
  ebitda: number;
  customerCount: number;
  topCustomerShare: number;
  recurringRevenueShare: number;
  mostLikely: number;
}

interface ValueAction { title: string;
  description: string;
  impact: number;
  impactLabel: string;
  how: string;
  icon: typeof Target;
  priority: "high" | "medium" | "low";
}

export function MAValueDrivers({ revenue, ebitda, customerCount, topCustomerShare, recurringRevenueShare, mostLikely }: Props) { const actions = useMemo((): ValueAction[] => { const items: ValueAction[] = [];

    // ARR premium
    if (recurringRevenueShare < 50) { const arrPotential = revenue * 0.3 * 8; // 30% ARR at 8x multiple
      items.push({ title: "Öka ARR (återkommande intäkter)",
        description: `Om 30% av din omsättning blir ARR: Värdeökning ${formatSEK(arrPotential)} (SaaS-premium 8x ARR)`,
        impact: arrPotential,
        impactLabel: formatSEK(arrPotential),
        how: "Skapa prenumerationstjänster eller SaaS-modell",
        icon: TrendingUp,
        priority: "high",
      });
    }

    // Customer concentration
    if (topCustomerShare > 30) { const riskReduction = mostLikely * 0.15;
      items.push({ title: "Minska kundkoncentration",
        description: `Nuläge: Top 1 kund = ${topCustomerShare.toFixed(0)}% av omsättning. Risk: Om kunden lämnar → värde -40%. Mål: <30% per kund.`,
        impact: riskReduction,
        impactLabel: formatSEK(riskReduction),
        how: "Diversifiera kundbasen genom aktiv kundanskaffning",
        icon: Users,
        priority: "high",
      });
    }

    // Process documentation
    const processBonus = mostLikely * 0.15;
    items.push({ title: "Dokumentera processer",
      description: "Köpare betalar premium för bolag som inte är personberoende",
      impact: processBonus,
      impactLabel: formatSEK(processBonus),
      how: "Dokumentera alla nyckelprocesser och skapa standard operating procedures",
      icon: FileText,
      priority: "medium",
    });

    // Revenue growth
    if (revenue > 0) { const growthImpact = ebitda * 0.5 * 5; // 50% more EBITDA at 5x
      items.push({ title: "Accelerera tillväxten",
        description: `En 50% omsättningsökning vid bibehållen marginal ger EBITDA +${formatSEK(ebitda * 0.5)}`,
        impact: growthImpact,
        impactLabel: formatSEK(growthImpact),
        how: "Investera i sälj och marknadsföring (branschsnitt 5-15% av omsättning)",
        icon: TrendingUp,
        priority: "medium",
      });
    }

    // Few customers
    if (customerCount <= 3 && customerCount > 0) { items.push({ title: "Bredda kundbasen",
        description: `Bara ${customerCount} kunder — extrem koncentrationsrisk. Köpare diskonterar med 20-40%.`,
        impact: mostLikely * 0.25,
        impactLabel: formatSEK(mostLikely * 0.25),
        how: "Minst 10 aktiva kunder för att eliminera koncentrationsrabatt",
        icon: Users,
        priority: "high",
      });
    }

    return items.sort((a, b) => b.impact - a.impact);
  }, [revenue, ebitda, customerCount, topCustomerShare, recurringRevenueShare, mostLikely]);

  const totalPotential = actions.reduce((s, a) => s + a.impact, 0);
  const potentialValue = mostLikely + totalPotential;

  const priorityColor = { high: "border-l-emerald-500",
    medium: "border-l-primary",
    low: "border-l-muted",
  };

  const priorityBadge = { high: "text-[#085041] border-[#BFE6D6]",
    medium: "text-primary border-primary/30",
    low: "text-muted-foreground",
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card className="border-2 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Nuvarande värde</p>
              <p className="text-2xl font-bold">{formatSEK(mostLikely)}</p>
            </div>
            <div className="text-center">
              <ArrowUpRight className="h-6 w-6 text-[#085041] mx-auto" />
              <p className="text-xs text-muted-foreground">Potential</p>
              <p className="text-lg font-bold text-[#085041]">+{formatSEK(totalPotential)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Potentiellt värde</p>
              <p className="text-2xl font-bold text-primary">{formatSEK(potentialValue)}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            TOTAL POTENTIAL: {formatSEK(mostLikely)} → {formatSEK(potentialValue)} (+{totalPotential > 0 ? Math.round((totalPotential / mostLikely) * 100) : 0}%)
          </p>
        </CardContent>
      </Card>

      {/* Action cards */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Värdeökande åtgärder (rangordnade efter impact)
          </CardTitle>
          <CardDescription>AI-analys av vad som ökar ditt bolagsvärde mest</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {actions.map((action, i) => (
            <Card key={i} className={`border-l-4 ${priorityColor[action.priority]}`}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-muted-foreground font-medium">{i + 1}.</span>
                      <action.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{action.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground ml-7">{action.description}</p>
                    <p className="text-xs text-muted-foreground ml-7 mt-1 italic">Hur: {action.how}</p>
                    <div className="flex items-center gap-3 mt-2 ml-7">
                      <div className="flex items-center gap-1 text-xs">
                        <ArrowUpRight className="h-3 w-3 text-[#085041]" />
                        <span className="text-[#085041] font-medium">+{action.impactLabel}</span>
                      </div>
                      <Badge variant="outline" className={`text-[10px] ${priorityBadge[action.priority]}`}>
                        {action.priority === "high" ? "Hög impact" : action.priority === "medium" ? "Medel impact" : "Låg impact"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
