import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { ChartGradients, AXIS_TICK, GRID_PROPS, LINE_ANIMATION, TOOLTIP_CURSOR } from "@/components/charts/ChartGradients";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CustomLegend } from "@/components/charts/CustomLegend";
import { useChartTheme } from "@/hooks/useChartTheme";

const MONTH_KEYS = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"] as const;
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];

interface BudgetScenariosProps { budgetId: string;
  companyId: string;
  fiscalYear: number;
}

export const BudgetScenarios = ({ budgetId, companyId, fiscalYear }: BudgetScenariosProps) => {
  const chartTheme = useChartTheme(); const [baseData, setBaseData] = useState<number[]>(new Array(12).fill(0));
  const [pessimisticPct, setPessimisticPct] = useState([-15]);
  const [optimisticPct, setOptimisticPct] = useState([20]);
  const [revenueGrowth, setRevenueGrowth] = useState([18]);
  const [staffCostPct, setStaffCostPct] = useState([31]);
  const [loading, setLoading] = useState(true);
  const [activeScenario, setActiveScenario] = useState<"base" | "pessimistic" | "optimistic">("base");

  useEffect(() => { loadBaseData();
  }, [budgetId]);

  const loadBaseData = async () => { setLoading(true);
    const { data: rows } = await supabase
      .from("budget_rows")
      .select("*")
      .eq("budget_id", budgetId);

    if (rows) { const monthly = new Array(12).fill(0);
      rows.forEach((r: any) => { const isIncome = r.account_number >= "3000" && r.account_number <= "3999";
        const isCost = r.account_number >= "4000" && r.account_number <= "7999";
        MONTH_KEYS.forEach((m, i) => { if (isIncome) monthly[i] += r[m] || 0;
          if (isCost) monthly[i] -= r[m] || 0;
        });
      });
      setBaseData(monthly);
    }
    setLoading(false);
  };

  const applyPct = (data: number[], pct: number) => data.map((v) => Math.round(v * (1 + pct / 100)));

  const pessimistic = applyPct(baseData, pessimisticPct[0]);
  const optimistic = applyPct(baseData, optimisticPct[0]);

  const chartData = MONTH_LABELS.map((label, i) => ({ name: label,
    basfall: baseData[i],
    pessimistiskt: pessimistic[i],
    optimistiskt: optimistic[i],
  }));

  const scenarioData = activeScenario === "pessimistic" ? pessimistic : activeScenario === "optimistic" ? optimistic : baseData;
  const scenarioAnnual = scenarioData.reduce((s, v) => s + v, 0);

  const fmt = (n: number) => n.toLocaleString("sv-SE");

  if (loading) { return <div className="py-12 text-center text-muted-foreground text-sm">Laddar scenariodata...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Scenario selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { key: "pessimistic" as const, label: `Pessimistiskt ${pessimisticPct[0]}%`, color: "border-red-300 bg-[#FCE8E8]" },
          { key: "base" as const, label: "Basfall", color: "border-primary/30 bg-primary/5" },
          { key: "optimistic" as const, label: `Optimistiskt +${optimisticPct[0]}%`, color: "border-[#BFE6D6] bg-[#E1F5EE]" },
        ].map((s) => (
          <Card
            key={s.key}
            className={cn("cursor-pointer transition-all", activeScenario === s.key ? s.color + " shadow-md" : "hover:shadow")}
            onClick={() => setActiveScenario(s.key)}
          >
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-lg font-bold tabular-nums">
                {fmt(applyPct(baseData, s.key === "pessimistic" ? pessimisticPct[0] : s.key === "optimistic" ? optimisticPct[0] : 0).reduce((a, b) => a + b, 0))} kr
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Resultat per månad — alla scenarios</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <ChartGradients />
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridColor} vertical={false} opacity={0.3} />
              <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false}/>
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => `${fmt(v)} kr`} />
              <Area type="monotone" dataKey="pessimistiskt" fill="hsl(0 70% 90%)" stroke="hsl(0 70% 50%)" strokeWidth={1.5} fillOpacity={0.3} />
              <Area type="monotone" dataKey="basfall" fill="#3b82f6" stroke="#3b82f6" strokeWidth={2} fillOpacity={0.15} />
              <Area type="monotone" dataKey="optimistiskt" fill="hsl(150 70% 90%)" stroke="hsl(150 70% 40%)" strokeWidth={1.5} fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Scenario builder sliders */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Scenariobyggare</CardTitle>
          <CardDescription className="text-xs">Dra i reglarna — hela budgeten uppdateras i realtid</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Pessimistiskt scenario</span>
              <span className="font-medium text-[#7A1A1A]">{pessimisticPct[0]}%</span>
            </div>
            <Slider value={pessimisticPct} onValueChange={setPessimisticPct} min={-50} max={0} step={1} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Optimistiskt scenario</span>
              <span className="font-medium text-[#085041]">+{optimisticPct[0]}%</span>
            </div>
            <Slider value={optimisticPct} onValueChange={setOptimisticPct} min={0} max={100} step={1} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
