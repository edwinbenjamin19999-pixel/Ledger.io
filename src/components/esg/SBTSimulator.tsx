import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { ChartGradients, AXIS_TICK, GRID_PROPS, LINE_ANIMATION, TOOLTIP_CURSOR } from "@/components/charts/ChartGradients";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CustomLegend } from "@/components/charts/CustomLegend";
import { Target, Leaf, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useChartTheme } from "@/hooks/useChartTheme";

const formatTon = (v: number) => v < 1 ? `${(v * 1000).toFixed(0)} kg` : `${v.toFixed(1)} ton`;

interface SBTSimulatorProps { currentCO2: number;
  co2Travel: number;
  co2Energy: number;
}

interface MilestoneAction { year: number;
  target: number;
  reduction: number;
  action: string;
}

export function SBTSimulator({ currentCO2, co2Travel, co2Energy }: SBTSimulatorProps) {
  const chartTheme = useChartTheme(); const [adopted, setAdopted] = useState(false);
  const baseYear = new Date().getFullYear();
  const targetYear = 2030;

  // 1.5°C pathway requires ~42% reduction by 2030
  const targetReduction = 0.42;
  const targetCO2 = currentCO2 * (1 - targetReduction);

  const milestones: MilestoneAction[] = useMemo(() => { const steps: MilestoneAction[] = [];
    const totalReduction = currentCO2 - targetCO2;
    const yearsToTarget = targetYear - baseYear;

    const actions = [
      "Byt 1 flygresa till tåg per år",
      "Kräv förnybar el från hyresvärd",
      "Prioritera lokala leverantörer",
      "Kompensera resterande via koldioxidkrediter",
    ];

    for (let i = 0; i < yearsToTarget && i < actions.length; i++) { const yearReduction = totalReduction / yearsToTarget;
      const remaining = currentCO2 - yearReduction * (i + 1);
      const pctReduction = ((currentCO2 - remaining) / currentCO2) * 100;
      steps.push({ year: baseYear + i + 1,
        target: Math.max(targetCO2, remaining),
        reduction: pctReduction,
        action: actions[i],
      });
    }

    // Ensure we reach the target
    if (steps.length > 0) { steps[steps.length - 1].target = targetCO2;
      steps[steps.length - 1].reduction = targetReduction * 100;
    }

    return steps;
  }, [currentCO2, targetCO2, baseYear]);

  const chartData = useMemo(() => { const data = [{ year: baseYear.toString(), actual: currentCO2, target: currentCO2, label: "Nu" }];
    for (const m of milestones) { data.push({ year: m.year.toString(),
        actual: m.target * 1.05, // Slight optimistic projection
        target: m.target,
        label: `${m.year}`,
      });
    }
    // Add final target year if not already there
    if (!data.find(d => d.year === targetYear.toString())) { data.push({ year: targetYear.toString(),
        actual: targetCO2,
        target: targetCO2,
        label: `${targetYear} (mål)`,
      });
    }
    return data;
  }, [currentCO2, milestones, targetCO2, baseYear]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-5 w-5" />
            Science-Based Targets — Klimatmål i linje med Parisavtalet
          </CardTitle>
          <CardDescription>
            1.5°C-scenariot kräver minst 42% minskning till 2030
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current vs Target */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-muted/30">
              <CardContent className="pt-6 text-center">
                <p className="text-xs text-muted-foreground">Nuvarande utsläpp</p>
                <p className="text-2xl font-bold">{formatTon(currentCO2)} CO₂/år</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="pt-6 text-center">
                <p className="text-xs text-muted-foreground">Mål {targetYear} (1.5°C)</p>
                <p className="text-2xl font-bold text-[#085041]">{formatTon(targetCO2)} CO₂/år</p>
                <Badge variant="outline" className="mt-1 text-xs">-{(targetReduction * 100).toFixed(0)}%</Badge>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="pt-6 text-center">
                <p className="text-xs text-muted-foreground">Minskning krävd</p>
                <p className="text-2xl font-bold">{formatTon(currentCO2 - targetCO2)}</p>
                <p className="text-xs text-muted-foreground">under {targetYear - baseYear} år</p>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <ChartGradients />
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridColor} vertical={false} />
              <XAxis dataKey="year" tick={AXIS_TICK} axisLine={false} tickLine={false}/>
              <YAxis unit=" ton" tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => `${v.toFixed(2)} ton CO₂`} />
              <ReferenceLine y={targetCO2} stroke="hsl(142, 76%, 36%)" strokeDasharray="6 3" label={{ value: "Mål", position: "right", fontSize: 11 }} />
              <Line type="monotone" dataKey="target" name="Mål (1.5°C)" stroke="hsl(142, 76%, 36%)" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="actual" name="Prognos" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>

          {/* Roadmap */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Reduktionsplan</h4>
            {milestones.map(m => (
              <div key={m.year} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                <div className="text-center min-w-[60px]">
                  <p className="text-sm font-bold">{m.year}</p>
                  <p className="text-xs text-muted-foreground">{formatTon(m.target)}</p>
                </div>
                <div className="flex-1">
                  <Progress value={m.reduction} className="h-2 mb-1" />
                  <p className="text-xs text-muted-foreground">-{m.reduction.toFixed(0)}% — {m.action}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Adopt button */}
          <div className="flex gap-3 pt-2">
            {adopted ? (
              <div className="flex items-center gap-2 p-3 bg-[#E1F5EE] dark:bg-emerald-900/20 rounded-lg border border-[#BFE6D6] dark:border-emerald-800 text-sm">
                <CheckCircle2 className="h-4 w-4 text-[#085041]" />
                <span>Klimatmål antagna — uppföljning sker automatiskt varje månad</span>
              </div>
            ) : (
              <Button onClick={() => { setAdopted(true); toast.success("Klimatmål antagna — uppföljning aktiverad"); }} className="gap-2">
                <Leaf className="h-4 w-4" />
                Anta dessa mål
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
