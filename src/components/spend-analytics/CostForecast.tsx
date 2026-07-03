import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { TrendingUp } from "lucide-react";
import type { MonthlyExpense } from "./SpendAnalytics";
import { ChartGradients, AXIS_TICK, GRID_PROPS, LINE_ANIMATION, TOOLTIP_CURSOR } from "@/components/charts/ChartGradients";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CustomLegend } from "@/components/charts/CustomLegend";
import { useChartTheme } from "@/hooks/useChartTheme";

interface Props { monthlyData: MonthlyExpense[];
}

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

function linearRegression(values: number[]): { slope: number; intercept: number } { const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] || 0 };
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) { sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

const MONTH_LABELS = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

export function CostForecast({ monthlyData }: Props) {
  const chartTheme = useChartTheme(); const chartData = useMemo(() => { const actuals = monthlyData.filter(m => m.total > 0);
    if (actuals.length < 2) return [];

    const values = actuals.map(m => m.total);
    const { slope, intercept } = linearRegression(values);
    const n = values.length;

    const result: { label: string; actual: number | null; forecast: number | null }[] = [];

    for (const m of actuals) { result.push({ label: m.label, actual: Math.round(m.total), forecast: null });
    }

    const lastMonth = actuals[actuals.length - 1].month;
    const [lastY, lastM] = lastMonth.split("-").map(Number);

    for (let i = 1; i <= 3; i++) { const futureMonth = (lastM + i - 1) % 12;
      const label = MONTH_LABELS[futureMonth] + "*";
      const predicted = Math.max(0, Math.round(intercept + slope * (n - 1 + i)));
      result.push({ label, actual: null, forecast: predicted });
    }

    if (result.length > actuals.length) { const lastActualIdx = actuals.length - 1;
      result[lastActualIdx].forecast = result[lastActualIdx].actual;
    }

    return result;
  }, [monthlyData]);

  const forecastTotal = chartData
    .filter(d => d.forecast !== null && d.actual === null)
    .reduce((s, d) => s + (d.forecast || 0), 0);

  if (chartData.length === 0) { return (
      <Card>
        <CardContent className="py-12 text-center">
          <TrendingUp className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="font-medium text-foreground">Inte tillräckligt med data för prognos</p>
          <p className="text-xs text-muted-foreground mt-1">Minst 2 månaders data krävs</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5" /> Kostnadsprognos (3 månader)
          </CardTitle>
          <CardDescription>Baserad på linjär regression av senaste {monthlyData.filter(m => m.total > 0).length} månaders data</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={chartData}>
              <ChartGradients />
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => `${Math.round(v / 1000)}k`} />
              <Tooltip content={<ChartTooltip />} cursor={TOOLTIP_CURSOR} />
              <Legend content={<CustomLegend />} />
              <Area
                type="monotone"
                dataKey="actual"
                name="Faktisk kostnad"
                fill="url(#areaFillTeal)"
                stroke="#3b82f6"
                strokeWidth={2.5}
                connectNulls={false}
                activeDot={{ r: 6, fill: '#0d9488', strokeWidth: 3, stroke: '#0f172a' }}
                {...LINE_ANIMATION}
              />
              <Area
                type="monotone"
                dataKey="forecast"
                name="Prognos"
                fill="url(#areaFillIndigo)"
                stroke="#94A3B8"
                strokeWidth={2}
                strokeDasharray="6 3"
                connectNulls={false}
                activeDot={{ r: 6, fill: '#94A3B8', strokeWidth: 3, stroke: '#0f172a' }}
                {...LINE_ANIMATION}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-primary/20">
        <CardContent className="pt-4 pb-4 flex items-center gap-4">
          <TrendingUp className="h-6 w-6 text-primary" />
          <div>
            <p className="text-sm font-medium text-foreground">Prognostiserad kostnad kommande 3 månader</p>
            <p className="text-lg font-bold text-primary">{fmt(forecastTotal)} kr</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
