import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, Users, Shield, SlidersHorizontal } from "lucide-react";

interface ActionItem { id: string;
  title: string;
  icon: typeof Target;
  impact: "high" | "medium" | "low";
  current: string;
  potential: string;
  concrete: string;
  roiEstimate: string;
  risk: string;
  actions: { label: string; path: string }[];
}

interface ActionPlanProps { financials: { revenue: number;
    costs: number;
    personnelCosts: number;
    marketingCosts: number;
    totalEquity: number;
    totalAssets: number;
  } | null;
  benchmarks: Record<string, { p25: number; p50: number; p75: number }>;
}

const impactColors = { high: "border-l-emerald-500",
  medium: "border-l-primary",
  low: "border-l-muted-foreground",
};

const impactBadgeVariants: Record<string, "default" | "secondary" | "outline"> = { high: "default",
  medium: "secondary",
  low: "outline",
};

export function ActionPlan({ financials, benchmarks }: ActionPlanProps) { const [personnelAdjust, setPersonnelAdjust] = useState(0);
  const [marketingAdjust, setMarketingAdjust] = useState(0);
  const [revenueAdjust, setRevenueAdjust] = useState(0);

  const actions: ActionItem[] = useMemo(() => { if (!financials || financials.revenue === 0) return [];
    const items: ActionItem[] = [];

    const marketingRatio = (financials.marketingCosts / financials.revenue) * 100;
    if (marketingRatio < benchmarks.marketingRatio.p25) { const targetSpend = financials.revenue * (benchmarks.marketingRatio.p50 / 100);
      items.push({ id: "marketing",
        title: "Investera i marknadsföring",
        icon: Target,
        impact: "high",
        current: `${marketingRatio.toFixed(1)}% av omsättning (branschsnitt ${benchmarks.marketingRatio.p50}%)`,
        potential: "+15-25% omsättningstillväxt inom 12 månader",
        concrete: `Allokera ${Math.round(targetSpend).toLocaleString("sv-SE")} kr/år till digital marknadsföring`,
        roiEstimate: `Om branschsnittet stämmer: ${Math.round(financials.revenue * 0.15).toLocaleString("sv-SE")}-${Math.round(financials.revenue * 0.25).toLocaleString("sv-SE")} kr extra intäkt`,
        risk: "Låg (undre kvartil spenderar 1% och presterar ok)",
        actions: [
          { label: "Lägg till som mål", path: "#" },
          { label: "Skapa budget för detta", path: "/budget" },
        ],
      });
    }

    const personnelRatio = (financials.personnelCosts / financials.revenue) * 100;
    if (personnelRatio < benchmarks.personnelRatio.p25) { const monthlyCost = 52500;
      const breakeven = Math.round(monthlyCost * 12 / (financials.revenue > 0 ? (financials.revenue - financials.costs) / financials.revenue : 0.2));
      items.push({ id: "hiring",
        title: "Anställ för tillväxt",
        icon: Users,
        impact: "high",
        current: `${personnelRatio.toFixed(1)}% personalkostnadsandel (branschsnitt ${benchmarks.personnelRatio.p50}%)`,
        potential: "Skalning kräver kapacitet",
        concrete: `Nästa anställning: junior konsult 35 000 kr/mån = 52 500 kr/mån total kostnad`,
        roiEstimate: `Behöver generera ${breakeven.toLocaleString("sv-SE")} kr i ny fakturering för att vara neutral`,
        risk: "Medel (kräver tillräckligt orderinflöde)",
        actions: [
          { label: "Beräkna i Lön & Personal", path: "/lon-personal" },
        ],
      });
    }

    const soliditet = financials.totalAssets > 0 ? (financials.totalEquity / financials.totalAssets) * 100 : 0;
    if (soliditet < benchmarks.soliditet.p25) { const targetEquity = financials.totalAssets * (benchmarks.soliditet.p25 / 100);
      const needed = Math.max(0, targetEquity - financials.totalEquity);
      items.push({ id: "soliditet",
        title: "Förbättra soliditet",
        icon: Shield,
        impact: "medium",
        current: `${soliditet.toFixed(0)}% (branschsnitt ${benchmarks.soliditet.p50}%)`,
        potential: "Starkare kreditvärdighet och finansiell motståndskraft",
        concrete: `Behåll vinst i bolaget istället för att ta utdelning — bygg eget kapital till ${Math.round(targetEquity).toLocaleString("sv-SE")} kr (P25-nivå)`,
        roiEstimate: `Behöver ackumulera ${Math.round(needed).toLocaleString("sv-SE")} kr i eget kapital`,
        risk: "Låg (kräver tålamod, inte risk)",
        actions: [
          { label: "Beräkna i Utdelning-modulen", path: "/utdelning" },
        ],
      });
    }

    if (items.length === 0) { items.push({ id: "maintain",
        title: "Bibehåll nuvarande kurs",
        icon: TrendingUp,
        impact: "low",
        current: "Alla nyckeltal inom normalt intervall",
        potential: "Fokusera på organisk tillväxt",
        concrete: "Inga akuta åtgärder krävs — övervaka kvartalsvis",
        roiEstimate: "N/A",
        risk: "Låg",
        actions: [],
      });
    }

    return items;
  }, [financials, benchmarks]);

  const scenarioResults = useMemo(() => { if (!financials || financials.revenue === 0) return null;

    const newPersonnel = financials.personnelCosts + personnelAdjust * 1000;
    const newMarketing = financials.marketingCosts + marketingAdjust * 1000;
    const newRevenue = financials.revenue + revenueAdjust * 1000;
    const newCosts = financials.costs + personnelAdjust * 1000 + marketingAdjust * 1000;

    const newEbitda = newRevenue > 0 ? ((newRevenue - newCosts) / newRevenue) * 100 : 0;
    const newPersonnelRatio = newRevenue > 0 ? (newPersonnel / newRevenue) * 100 : 0;
    const newMarketingRatio = newRevenue > 0 ? (newMarketing / newRevenue) * 100 : 0;

    const calcP = (val: number, b: { p25: number; p50: number; p75: number }) => { if (val <= b.p25) return Math.round((val / b.p25) * 25);
      if (val <= b.p50) return 25 + Math.round(((val - b.p25) / (b.p50 - b.p25)) * 25);
      if (val <= b.p75) return 50 + Math.round(((val - b.p50) / (b.p75 - b.p50)) * 25);
      return Math.min(99, 75 + Math.round(((val - b.p75) / (b.p75 * 0.5)) * 25));
    };

    return { ebitda: { value: newEbitda, percentile: calcP(newEbitda, benchmarks.ebitda) },
      personnel: { value: newPersonnelRatio, percentile: calcP(newPersonnelRatio, benchmarks.personnelRatio) },
      marketing: { value: newMarketingRatio, percentile: calcP(newMarketingRatio, benchmarks.marketingRatio) },
    };
  }, [financials, benchmarks, personnelAdjust, marketingAdjust, revenueAdjust]);

  const totalSavings = actions.reduce((sum, a) => { if (a.impact === "high") return sum + 1;
    return sum;
  }, 0);

  return (
    <div className="space-y-6">
      {actions.length > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Baserat på din branschjämförelse har AI identifierat {actions.length} prioriterade åtgärder:
            </p>
          </CardContent>
        </Card>
      )}

      {actions.map((action, i) => { const Icon = action.icon;
        return (
          <Card key={action.id} className={`border-l-4 ${impactColors[action.impact]}`}>
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <p className="font-semibold">Åtgärd {i + 1}: {action.title}</p>
                </div>
                <Badge variant={impactBadgeVariants[action.impact]}>
                  {action.impact === "high" ? "Hög påverkan" : action.impact === "medium" ? "Medel" : "Information"}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Nuläge:</p>
                  <p>{action.current}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Potential:</p>
                  <p>{action.potential}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Konkret:</p>
                  <p>{action.concrete}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">ROI-estimat:</p>
                  <p>{action.roiEstimate}</p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">Risk: {action.risk}</p>

              {action.actions.length > 0 && (
                <div className="flex gap-2 pt-1">
                  {action.actions.map(a => (
                    <Button key={a.label} variant="outline" size="sm">{a.label}</Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Scenario Simulator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5" />
            Scenariosimulator
          </CardTitle>
          <CardDescription>
            Vad händer med din branschrankning om du justerar kostnaderna?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Personalkostnader</span>
                <span className="font-semibold">
                  {personnelAdjust >= 0 ? "+" : ""}{(personnelAdjust * 1000).toLocaleString("sv-SE")} kr
                </span>
              </div>
              <Slider
                value={[personnelAdjust]}
                onValueChange={([v]) => setPersonnelAdjust(v)}
                min={-200}
                max={500}
                step={10}
              />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Marknadsföringskostnader</span>
                <span className="font-semibold">
                  {marketingAdjust >= 0 ? "+" : ""}{(marketingAdjust * 1000).toLocaleString("sv-SE")} kr
                </span>
              </div>
              <Slider
                value={[marketingAdjust]}
                onValueChange={([v]) => setMarketingAdjust(v)}
                min={0}
                max={200}
                step={5}
              />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Intäktsökning</span>
                <span className="font-semibold">
                  {revenueAdjust >= 0 ? "+" : ""}{(revenueAdjust * 1000).toLocaleString("sv-SE")} kr
                </span>
              </div>
              <Slider
                value={[revenueAdjust]}
                onValueChange={([v]) => setRevenueAdjust(v)}
                min={0}
                max={1000}
                step={25}
              />
            </div>
          </div>

          {scenarioResults && (
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">EBITDA</p>
                <p className="text-lg font-bold">{scenarioResults.ebitda.value.toFixed(1)}%</p>
                <Badge variant="outline" className="text-xs">P{scenarioResults.ebitda.percentile}</Badge>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Personalkostnad</p>
                <p className="text-lg font-bold">{scenarioResults.personnel.value.toFixed(1)}%</p>
                <Badge variant="outline" className="text-xs">P{scenarioResults.personnel.percentile}</Badge>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Marknadsföring</p>
                <p className="text-lg font-bold">{scenarioResults.marketing.value.toFixed(1)}%</p>
                <Badge variant="outline" className="text-xs">P{scenarioResults.marketing.percentile}</Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
