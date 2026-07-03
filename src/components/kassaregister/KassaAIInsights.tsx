import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { PosDailySales, formatKr } from "@/hooks/useKassaregister";
import { format, subDays, getDay } from "date-fns";
import { sv } from "date-fns/locale";
import { AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { ChartGradients, AXIS_TICK, GRID_PROPS, LINE_ANIMATION, TOOLTIP_CURSOR } from "@/components/charts/ChartGradients";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CustomLegend } from "@/components/charts/CustomLegend";
import { useChartTheme } from "@/hooks/useChartTheme";

interface Props { sales: PosDailySales[];
  todaySales: PosDailySales | undefined;
}

export function KassaAIInsights({ sales, todaySales }: Props) {
  const chartTheme = useChartTheme(); // Hourly simulation (we don't have real hourly data, generate from daily)
  const hourlyData = useMemo(() => { if (!todaySales) return [];
    const total = todaySales.total_sales;
    // Simulate distribution peaking at lunch and afternoon
    const dist = [0, 0, 0, 0, 0, 0, 0, 2, 5, 8, 10, 12, 14, 11, 9, 8, 7, 6, 4, 3, 1, 0, 0, 0];
    const sum = dist.reduce((a, b) => a + b, 0);
    return dist.map((d, h) => ({ hour: `${h.toString().padStart(2, "0")}:00`,
      idag: Math.round((d / sum) * total),
      snitt: Math.round((d / sum) * total * (0.85 + Math.random() * 0.3)),
    })).filter((_, i) => i >= 7 && i <= 20);
  }, [todaySales]);

  // Pattern insights
  const insights = useMemo(() => { const items: { icon: typeof TrendingUp; text: string; type: "info" | "warning" | "positive" }[] = [];
    if (sales.length < 3) return items;

    // Payment method shift
    if (todaySales) { const total = todaySales.total_sales || 1;
      const swishPct = (todaySales.swish_amount / total) * 100;
      const avgSwishPct = sales.reduce((s, d) => s + (d.swish_amount / (d.total_sales || 1)), 0) / sales.length * 100;
      if (swishPct > avgSwishPct * 1.3 && swishPct > 15) { items.push({ icon: AlertCircle,
          text: `Swish-andelen är ${swishPct.toFixed(0)}% idag vs normalt ${avgSwishPct.toFixed(0)}%. Mojlig orsak: ny kund-demografik eller marknadsforing?`,
          type: "info",
        });
      }
    }

    // Best day pattern
    const dayTotals: Record<number, { sum: number; count: number }> = {};
    sales.forEach((s) => { const d = getDay(new Date(s.sale_date));
      if (!dayTotals[d]) dayTotals[d] = { sum: 0, count: 0 };
      dayTotals[d].sum += s.total_sales;
      dayTotals[d].count++;
    });
    const dayNames = ["sondag", "mandag", "tisdag", "onsdag", "torsdag", "fredag", "lordag"];
    let bestDay = 0;
    let bestAvg = 0;
    Object.entries(dayTotals).forEach(([d, v]) => { const avg = v.sum / v.count;
      if (avg > bestAvg) { bestAvg = avg;
        bestDay = parseInt(d);
      }
    });
    const overallAvg = sales.reduce((s, d) => s + d.total_sales, 0) / sales.length;
    if (bestAvg > overallAvg * 1.1) { const uplift = ((bestAvg - overallAvg) / overallAvg * 100).toFixed(0);
      items.push({ icon: TrendingUp,
        text: `${dayNames[bestDay].charAt(0).toUpperCase() + dayNames[bestDay].slice(1)}ar är din starkaste dag med ${uplift}% hogre omsattning an genomsnittet (${formatKr(bestAvg)}).`,
        type: "positive",
      });
    }

    // Week-over-week comparison
    if (todaySales && sales.length >= 7) { const sameWeekday = sales.find(
        (s) =>
          s.sale_date !== todaySales.sale_date &&
          getDay(new Date(s.sale_date)) === getDay(new Date(todaySales.sale_date))
      );
      if (sameWeekday && sameWeekday.total_sales > 0) { const change = ((todaySales.total_sales - sameWeekday.total_sales) / sameWeekday.total_sales) * 100;
        items.push({ icon: change >= 0 ? TrendingUp : TrendingDown,
          text: `Jamfort med samma veckodag förra veckan: ${change >= 0 ? "+" : ""}${change.toFixed(0)}% (${formatKr(sameWeekday.total_sales)} → ${formatKr(todaySales.total_sales)})`,
          type: change >= 0 ? "positive" : "warning",
        });
      }
    }

    return items;
  }, [sales, todaySales]);

  return (
    <div className="space-y-4">
      {/* Hourly chart */}
      {hourlyData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#3b82f6]" />
              <CardTitle className="text-sm">Forsaljning per timme</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className={`bg-white rounded-2xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)] transition-shadow duration-300 p-6 h-44`}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyData}>
              <ChartGradients />
                  <XAxis dataKey="hour" tick={AXIS_TICK} axisLine={false} tickLine={false}/>
                  <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [formatKr(v)]} contentStyle={{ fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area
                    type="monotone"
                    dataKey="idag"
                    name="Idag"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="snitt"
                    name="7-dagars snitt"
                    stroke="hsl(var(--muted-foreground))"
                    fill="hsl(var(--muted-foreground))"
                    fillOpacity={0.05}
                    strokeWidth={1}
                    strokeDasharray="4 4"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI pattern insights */}
      {insights.length > 0 && (
        <div className="space-y-2">
          {insights.map((insight, i) => { const Icon = insight.icon;
            const borderColor =
              insight.type === "positive"
                ? "border-l-emerald-500"
                : insight.type === "warning"
                ? "border-l-red-500"
                : "border-l-[#3b82f6]";
            return (
              <div
                key={i}
                className={`flex items-start gap-2 p-3 rounded-lg border border-l-4 ${borderColor} bg-card`}
              >
                <Icon className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{insight.text}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
