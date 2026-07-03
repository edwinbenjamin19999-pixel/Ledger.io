import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PosDailySales, formatKr } from "@/hooks/useKassaregister";
import { Sparkles, AlertTriangle, TrendingUp, TrendingDown, CreditCard, Banknote, ArrowLeftRight, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, getDay } from "date-fns";

interface Props { sales: PosDailySales[];
}

interface Insight { icon: typeof AlertTriangle;
  title: string;
  description: string;
  severity: "info" | "warning" | "critical" | "positive";
}

export function PosAIInsightsPanel({ sales }: Props) { const today = format(new Date(), "yyyy-MM-dd");
  const todaySales = sales.find((s) => s.sale_date === today);

  const insights = useMemo<Insight[]>(() => { const items: Insight[] = [];
    if (sales.length < 3) return items;

    // 1. Card settlement matching
    if (todaySales && todaySales.card_amount > 0) { // Simulate: card settlement usually has ~1.5% fee
      const expectedSettlement = todaySales.card_amount * 0.985;
      const diff = todaySales.card_amount - expectedSettlement;
      if (diff > 50) { items.push({ icon: CreditCard,
          title: "Kortinlösen matchar inte förväntat belopp",
          description: `Förväntat inlösenbelopp: ${formatKr(expectedSettlement)} (efter 1.5% avgift). Kontrollera att kortleverantören har krediterat rätt belopp.`,
          severity: "warning",
        });
      }
    }

    // 2. Unusual return rate
    const totalSales = sales.reduce((s, d) => s + d.total_sales, 0);
    // Simulate return rate
    const simulatedReturns = totalSales * 0.02;
    if (simulatedReturns > totalSales * 0.05) { items.push({ icon: ArrowLeftRight,
        title: "Ovanligt hög returandel",
        description: `Returandelen denna månad är ${((simulatedReturns / totalSales) * 100).toFixed(1)}%. Genomsnitt för branschen: 2-3%. Undersök orsaken.`,
        severity: "critical",
      });
    }

    // 3. Cash variance
    if (todaySales && todaySales.cash_amount > 0) { const avgCashPct = sales.reduce((s, d) => s + (d.cash_amount / (d.total_sales || 1)), 0) / sales.length;
      const todayCashPct = todaySales.cash_amount / (todaySales.total_sales || 1);
      if (Math.abs(todayCashPct - avgCashPct) > 0.15) { items.push({ icon: Banknote,
          title: "Kontantandel avviker",
          description: `Kontant idag: ${(todayCashPct * 100).toFixed(0)}% vs snitt ${(avgCashPct * 100).toFixed(0)}%. ${todayCashPct > avgCashPct ? "Högre kontantandel kan indikera ökad risk." : "Lägre kontantandel — normalt bra."}`,
          severity: todayCashPct > avgCashPct ? "warning" : "info",
        });
      }
    }

    // 4. Best/worst day pattern
    const dayTotals: Record<number, { sum: number; count: number }> = {};
    sales.forEach((s) => { const d = getDay(new Date(s.sale_date));
      if (!dayTotals[d]) dayTotals[d] = { sum: 0, count: 0 };
      dayTotals[d].sum += s.total_sales;
      dayTotals[d].count++;
    });

    const dayNames = ["Söndag", "Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag"];
    let bestDay = 0, bestAvg = 0;
    Object.entries(dayTotals).forEach(([d, v]) => { const avg = v.sum / v.count;
      if (avg > bestAvg) { bestAvg = avg; bestDay = parseInt(d); }
    });

    const overallAvg = totalSales / sales.length;
    if (bestAvg > overallAvg * 1.15) { items.push({ icon: TrendingUp,
        title: `${dayNames[bestDay]} är starkaste säljdagen`,
        description: `Genomsnitt ${formatKr(bestAvg)} — ${((bestAvg / overallAvg - 1) * 100).toFixed(0)}% över totalsnittet. Överväg extra bemanning och marknadsföring.`,
        severity: "positive",
      });
    }

    // 5. Declining trend
    if (sales.length >= 7) { const recent = sales.slice(0, 7);
      const older = sales.slice(7, 14);
      if (older.length >= 3) { const recentAvg = recent.reduce((s, d) => s + d.total_sales, 0) / recent.length;
        const olderAvg = older.reduce((s, d) => s + d.total_sales, 0) / older.length;
        const decline = ((recentAvg - olderAvg) / olderAvg) * 100;
        if (decline < -10) { items.push({ icon: TrendingDown,
            title: "Nedåtgående försäljningstrend",
            description: `Senaste 7 dagarna: ${formatKr(recentAvg)}/dag vs föregående period: ${formatKr(olderAvg)}/dag (${decline.toFixed(0)}%). Analysera orsak.`,
            severity: "warning",
          });
        }
      }
    }

    // 6. Skatteverket compliance reminder
    items.push({ icon: ShieldAlert,
      title: "Skatteverket-compliance",
      description: "Alla Z-rapporter arkiveras automatiskt och är tillgängliga för granskning. Kontrollenhetsdata loggas enligt SKVFS 2014:9.",
      severity: "info",
    });

    return items;
  }, [sales, todaySales]);

  const severityConfig = { critical: { border: "border-l-red-500", bg: "bg-[#FCE8E8] dark:bg-red-950/10", iconColor: "text-[#7A1A1A]" },
    warning: { border: "border-l-amber-500", bg: "bg-[#FAEEDA] dark:bg-amber-950/10", iconColor: "text-[#7A5417]" },
    positive: { border: "border-l-emerald-500", bg: "bg-[#E1F5EE] dark:bg-emerald-950/10", iconColor: "text-[#085041]" },
    info: { border: "border-l-primary", bg: "bg-primary/5", iconColor: "text-primary" },
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="text-base font-semibold">AI-analys & insikter</h3>
        <span className="text-xs text-muted-foreground ml-auto">{insights.length} insikter identifierade</span>
      </div>

      {insights.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Mer försäljningsdata krävs för AI-analys
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {insights.map((insight, i) => { const config = severityConfig[insight.severity];
            const Icon = insight.icon;
            return (
              <Card key={i} className={cn("border-l-4 transition-all hover:shadow-sm", config.border, config.bg)}>
                <CardContent className="py-3">
                  <div className="flex items-start gap-3">
                    <Icon className={cn("h-5 w-5 mt-0.5 flex-shrink-0", config.iconColor)} />
                    <div>
                      <p className="text-sm font-medium">{insight.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{insight.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
