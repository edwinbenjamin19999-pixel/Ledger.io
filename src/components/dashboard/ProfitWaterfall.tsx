import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { ChartGradients, AXIS_TICK, GRID_PROPS, BAR_ANIMATION, TOOLTIP_CURSOR } from "@/components/charts/ChartGradients";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CustomLegend } from "@/components/charts/CustomLegend";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { useChartTheme } from "@/hooks/useChartTheme";

interface ProfitWaterfallProps { companyId: string;
}

interface WaterfallItem { name: string;
  value: number;
  fill: string;
  isTotal?: boolean;
}

export const ProfitWaterfall = ({ companyId }: ProfitWaterfallProps) => {
  const chartTheme = useChartTheme(); const [data, setData] = useState<WaterfallItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData();
  }, [companyId]);

  const loadData = async () => { try { const now = new Date();
      const mStart = format(startOfMonth(now), "yyyy-MM-dd");
      const mEnd = format(endOfMonth(now), "yyyy-MM-dd");

      const { data: lines } = await supabase
        .from("journal_entry_lines")
        .select("debit, credit, chart_of_accounts!inner(account_number, account_name, account_type), journal_entries!inner(company_id, status, entry_date)")
        .eq("journal_entries.company_id", companyId)
        .eq("journal_entries.status", "approved")
        .gte("journal_entries.entry_date", mStart)
        .lte("journal_entries.entry_date", mEnd);

      if (!lines || lines.length === 0) { setData([]);
        setLoading(false);
        return;
      }

      let revenue = 0;
      let materials = 0;
      let personnel = 0;
      let otherExpenses = 0;
      let depreciation = 0;

      (lines ).forEach((line) => { const accNum = line.chart_of_accounts?.account_number || "";
        const credit = line.credit || 0;
        const debit = line.debit || 0;

        if (accNum.startsWith("3")) { revenue += credit - debit;
        } else if (accNum.startsWith("4")) { materials += debit - credit;
        } else if (accNum.startsWith("7")) { personnel += debit - credit;
        } else if (accNum.startsWith("78")) { depreciation += debit - credit;
        } else if (accNum.startsWith("5") || accNum.startsWith("6")) { otherExpenses += debit - credit;
        }
      });

      const profit = revenue - materials - personnel - otherExpenses - depreciation;

      const items: WaterfallItem[] = [
        { name: "Intäkter", value: revenue, fill: "hsl(142, 71%, 45%)" },
        { name: "Material", value: -materials, fill: "hsl(var(--destructive))" },
        { name: "Personal", value: -personnel, fill: "hsl(var(--destructive))" },
        { name: "Övriga", value: -otherExpenses, fill: "hsl(var(--destructive))" },
      ];

      if (depreciation > 0) { items.push({ name: "Avskrivn.", value: -depreciation, fill: "hsl(var(--destructive))" });
      }

      items.push({ name: "Resultat", value: profit, fill: profit >= 0 ? "hsl(142, 71%, 45%)" : "hsl(var(--destructive))", isTotal: true });

      setData(items);
    } catch (error) { console.error("Error loading waterfall data:", error);
    } finally { setLoading(false);
    }
  };

  const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

  if (loading) { return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) return null;

  // Transform waterfall data into cumulative för stacked rendering
  let cumulative = 0;
  const chartData = data.map((item) => { const start = item.isTotal ? 0 : cumulative;
    const end = item.isTotal ? item.value : cumulative + item.value;
    if (!item.isTotal) cumulative += item.value;
    return { name: item.name,
      start: Math.min(start, end),
      delta: Math.abs(end - start),
      value: item.value,
      fill: item.fill,
    };
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)] transition-shadow duration-300 p-6">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="h-4 w-4 text-[#1D9E75]" />
        <h3 className="text-slate-800 font-bold text-sm tracking-tight">Resultatbrygga (denna månad)</h3>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} barSize={32}>
          <ChartGradients />
          <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
          <Tooltip content={<ChartTooltip />} cursor={TOOLTIP_CURSOR} />
          <ReferenceLine y={0} stroke={chartTheme.referenceLineColor} />
          <Bar dataKey="start" stackId="stack" fill="transparent" />
          <Bar dataKey="delta" stackId="stack" radius={[6, 6, 0, 0]} minPointSize={3}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
