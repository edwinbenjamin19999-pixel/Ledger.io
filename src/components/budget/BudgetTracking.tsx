import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ChartGradients, AXIS_TICK, GRID_PROPS, BAR_ANIMATION, TOOLTIP_CURSOR } from "@/components/charts/ChartGradients";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CustomLegend } from "@/components/charts/CustomLegend";
import { useChartTheme } from "@/hooks/useChartTheme";

const MONTH_KEYS = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"] as const;

interface TrackingRow { account_number: string;
  account_name: string;
  budgeted: number;
  actual: number;
  variance: number;
  variance_pct: number;
}

interface BudgetTrackingProps { budgetId: string;
  companyId: string;
  fiscalYear: number;
}

export const BudgetTracking = ({ budgetId, companyId, fiscalYear }: BudgetTrackingProps) => {
  const chartTheme = useChartTheme(); const [rows, setRows] = useState<TrackingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadTracking();
  }, [budgetId, companyId, fiscalYear]);

  const loadTracking = async () => { setLoading(true);
    try { // Load budget rows
      const { data: budgetRows } = await supabase
        .from("budget_rows")
        .select("*")
        .eq("budget_id", budgetId);

      // Load actuals from journal entries
      const { data: journalData } = await supabase
        .from("journal_entries")
        .select(`id, entry_date, journal_entry_lines(debit, credit, account_id)`)
        .eq("company_id", companyId)
        .eq("status", "approved")
        .gte("entry_date", `${fiscalYear}-01-01`)
        .lte("entry_date", `${fiscalYear}-12-31`);

      const { data: accounts } = await supabase
        .from("chart_of_accounts")
        .select("id, account_number")
        .eq("company_id", companyId);

      const acctMap = new Map((accounts || []).map((a: any) => [a.id, a.account_number]));
      const actualMap = new Map<string, number>();

      (journalData || []).forEach((entry: any) => { entry.journal_entry_lines.forEach((line: any) => { const num = acctMap.get(line.account_id);
          if (!num) return;
          const isIncome = num.startsWith("3") || num.startsWith("8");
          const amount = isIncome
            ? (line.credit || 0) - (line.debit || 0)
            : (line.debit || 0) - (line.credit || 0);
          actualMap.set(num, (actualMap.get(num) || 0) + amount);
        });
      });

      const trackingRows: TrackingRow[] = (budgetRows || []).map((br: any) => { const budgeted = MONTH_KEYS.reduce((s, m) => s + (br[m] || 0), 0);
        const actual = actualMap.get(br.account_number) || 0;
        const variance = actual - budgeted;
        const variance_pct = budgeted !== 0 ? (variance / Math.abs(budgeted)) * 100 : 0;
        return { account_number: br.account_number,
          account_name: br.account_name,
          budgeted,
          actual,
          variance,
          variance_pct,
        };
      }).filter((r: TrackingRow) => r.budgeted !== 0 || r.actual !== 0);

      setRows(trackingRows);
    } catch (e) { console.error(e);
    } finally { setLoading(false);
    }
  };

  const totalBudget = rows.reduce((s, r) => s + r.budgeted, 0);
  const totalActual = rows.reduce((s, r) => s + r.actual, 0);
  const totalVariance = totalActual - totalBudget;
  const totalPct = totalBudget !== 0 ? (totalVariance / Math.abs(totalBudget)) * 100 : 0;

  const incomeRows = rows.filter((r) => r.account_number >= "3000" && r.account_number <= "3999");
  const costRows = rows.filter((r) => r.account_number >= "4000" && r.account_number <= "7999");

  const totalIncomeBudget = incomeRows.reduce((s, r) => s + r.budgeted, 0);
  const totalIncomeActual = incomeRows.reduce((s, r) => s + r.actual, 0);
  const totalCostBudget = costRows.reduce((s, r) => s + r.budgeted, 0);
  const totalCostActual = costRows.reduce((s, r) => s + r.actual, 0);
  const resultBudget = totalIncomeBudget - totalCostBudget;
  const resultActual = totalIncomeActual - totalCostActual;

  const trafficLight = (pct: number) => { const abs = Math.abs(pct);
    if (abs < 5) return "bg-emerald-500";
    if (abs < 15) return "bg-amber-500";
    return "bg-red-500";
  };

  const fmt = (n: number) => n.toLocaleString("sv-SE");

  const chartData = [
    { name: "Omsättning", budget: totalIncomeBudget, utfall: totalIncomeActual },
    { name: "Kostnader", budget: totalCostBudget, utfall: totalCostActual },
    { name: "Resultat", budget: resultBudget, utfall: resultActual },
  ];

  if (loading) { return <div className="py-12 text-center text-muted-foreground text-sm">Laddar uppföljning...</div>;
  }

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Omsättning", budget: totalIncomeBudget, actual: totalIncomeActual },
          { label: "Rörelsekostnader", budget: totalCostBudget, actual: totalCostActual },
          { label: "Rörelseresultat", budget: resultBudget, actual: resultActual },
        ].map((kpi) => { const v = kpi.actual - kpi.budget;
          const p = kpi.budget !== 0 ? (v / Math.abs(kpi.budget)) * 100 : 0;
          return (
            <Card key={kpi.label}>
              <CardContent className="pt-4 pb-3 space-y-1">
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold tabular-nums">{fmt(kpi.actual)} kr</span>
                  <span className={cn("text-xs font-medium", v >= 0 ? "text-[#085041]" : "text-[#7A1A1A]")}>
                    {v >= 0 ? "+" : ""}{p.toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Budget: {fmt(kpi.budget)} kr</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Budget vs Utfall</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barCategoryGap="20%">
              <ChartGradients />
              <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false}/>
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => `${fmt(v)} kr`} />
              <Bar dataKey="budget" fill="hsl(var(--muted-foreground))" opacity={0.3} radius={[6, 6, 0, 0]} name="Budget" />
              <Bar dataKey="utfall" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Utfall" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detail table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Per konto</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto max-h-[400px]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-background z-10">
                <tr className="border-b">
                  <th className="text-left py-2 px-2 font-medium">Konto</th>
                  <th className="text-right py-2 px-2 font-medium">Budget</th>
                  <th className="text-right py-2 px-2 font-medium">Utfall</th>
                  <th className="text-right py-2 px-2 font-medium">Avvikelse</th>
                  <th className="text-center py-2 px-2 font-medium w-8"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.account_number} className="border-b hover:bg-accent/30">
                    <td className="py-1.5 px-2">
                      <span className="text-muted-foreground">{r.account_number}</span>
                      <span className="ml-1.5">{r.account_name}</span>
                    </td>
                    <td className="text-right py-1.5 px-2 tabular-nums">{fmt(r.budgeted)}</td>
                    <td className="text-right py-1.5 px-2 tabular-nums">{fmt(r.actual)}</td>
                    <td className={cn("text-right py-1.5 px-2 tabular-nums font-medium", r.variance >= 0 ? "text-[#085041]" : "text-[#7A1A1A]")}>
                      {r.variance >= 0 ? "+" : ""}{fmt(r.variance)}
                    </td>
                    <td className="text-center py-1.5 px-2">
                      <div className={cn("w-2.5 h-2.5 rounded-full mx-auto", trafficLight(r.variance_pct))} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
