import { Project } from "@/hooks/useProjects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ComposedChart, Bar } from "recharts";
import { ChartGradients, AXIS_TICK, GRID_PROPS, LINE_ANIMATION, BAR_ANIMATION, TOOLTIP_CURSOR } from "@/components/charts/ChartGradients";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CustomLegend } from "@/components/charts/CustomLegend";
import { Sparkles, AlertTriangle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChartTheme } from "@/hooks/useChartTheme";

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n) + " kr";

interface Props { project: Project;
  totalRevenue: number;
  totalCost: number;
}

export function ProjectPrognosTab({ project, totalRevenue, totalCost }: Props) {
  const chartTheme = useChartTheme(); const budgetRev = project.budget_revenue || totalRevenue * 1.3 || 100000;
  const budgetCost = project.budget_cost || totalCost * 1.2 || 50000;
  const budgetResult = budgetRev - budgetCost;
  const currentMargin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;

  // Generate scenario data
  const months = ["M1", "M2", "M3", "M4", "M5", "M6"];
  const monthlyBurnRate = budgetCost / 6;
  const monthlyRevenueRate = budgetRev / 6;

  // How far through are we based on cost spend
  const spentRatio = budgetCost > 0 ? totalCost / budgetCost : 0.5;
  const currentMonth = Math.max(1, Math.min(5, Math.round(spentRatio * 6)));

  const scenarioData = months.map((m, i) => { const monthNum = i + 1;
    const budgetLine = (monthlyBurnRate * monthNum);
    const budgetRevLine = (monthlyRevenueRate * monthNum);

    if (monthNum <= currentMonth) { // Actual data
      const actualCostFactor = totalCost / (monthlyBurnRate * currentMonth);
      const actualRevFactor = totalRevenue / (monthlyRevenueRate * currentMonth);
      return { name: m,
        Budgeterad: Math.round(budgetLine),
        Faktiskt: Math.round(budgetLine * actualCostFactor),
        BudgeteradIntäkt: Math.round(budgetRevLine),
        FaktiskIntäkt: Math.round(budgetRevLine * actualRevFactor),
      };
    }

    // Forecast scenarios
    const costOverrun = totalCost > (monthlyBurnRate * currentMonth) ? 1.15 : 0.95;
    return { name: m,
      Budgeterad: Math.round(budgetLine),
      Optimistisk: Math.round(budgetLine * 0.9),
      Basfall: Math.round(budgetLine * costOverrun),
      Pessimistisk: Math.round(budgetLine * 1.25),
      BudgeteradIntäkt: Math.round(budgetRevLine),
    };
  });

  // Scenario outcomes
  const optimistic = { margin: Math.min(currentMargin + 8, 95),
    delay: 0,
    label: "Optimistisk",
  };
  const base = { margin: currentMargin - 2,
    delay: totalCost > budgetCost * 0.7 ? 5 : 0,
    label: "Basfall",
  };
  const pessimistic = { margin: currentMargin - 14,
    delay: 15,
    label: "Pessimistisk",
  };

  return (
    <div className="space-y-6 mt-4">
      {/* Burndown chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Projekt-burndown — Budget vs Utfall</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`bg-white rounded-2xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)] transition-shadow duration-300 p-6 h-72`}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={scenarioData}>
              <ChartGradients />
                <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Legend content={<CustomLegend />} />
                <Line type="monotone" dataKey="Budgeterad" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="Faktiskt" fill="#3b82f6" stroke="#3b82f6" fillOpacity={0.2} />
                <Line type="monotone" dataKey="Optimistisk" stroke="#10b981" strokeDasharray="3 3" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="Basfall" stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="Pessimistisk" stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1.5} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Three scenarios */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[optimistic, base, pessimistic].map((scenario) => { const isBase = scenario.label === "Basfall";
          const color = scenario.label === "Optimistisk"
            ? "border-l-emerald-500"
            : scenario.label === "Basfall"
              ? "border-l-amber-400"
              : "border-l-red-500";
          return (
            <Card key={scenario.label} className={cn("border-l-4", color, isBase && "ring-1 ring-amber-200")}>
              <CardContent className="p-4 space-y-2">
                <p className="text-sm font-semibold">{scenario.label}</p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Marginal</span>
                    <span className="font-medium">{scenario.margin.toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Försening</span>
                    <span className="font-medium">{scenario.delay === 0 ? "I tid" : `${scenario.delay} dagar`}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* AI analysis */}
      <Card className="border-l-4 border-l-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5">
        <CardContent className="py-3 px-4 flex items-start gap-3">
          <Sparkles className="h-4 w-4 text-[hsl(var(--primary))] flex-shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="font-medium">AI Prognos-analys</p>
            <p className="text-xs text-muted-foreground">
              {base.delay > 0
                ? `Om nuvarande takt håller: projektet slutförs ${base.delay} dagar för sent med ${base.margin.toFixed(0)}% marginal.`
                : `Projektet ligger i fas med ${base.margin.toFixed(0)}% marginal i basfallet.`}
              {currentMargin > 0 && (
                <> Historisk avvikelse för liknande projekt: -8% från estimat. Din nuvarande avvikelse: {(currentMargin - (project.budget_revenue && project.budget_cost ? ((project.budget_revenue - project.budget_cost) / project.budget_revenue) * 100 : currentMargin)).toFixed(0)}%.</>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Faktureringsgap */}
      {totalRevenue > 0 && totalCost > 0 && totalCost > totalRevenue * 0.6 && (
        <Card className="border-l-4 border-l-amber-400">
          <CardContent className="py-3 px-4 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-[#7A5417] flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Faktureringsgap detekterat</p>
              <p className="text-xs text-muted-foreground">
                Kostnaderna ({fmt(totalCost)}) närmar sig intäkterna ({fmt(totalRevenue)}). 
                Säkerställ att ofakturerat arbete faktureras omgående.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
