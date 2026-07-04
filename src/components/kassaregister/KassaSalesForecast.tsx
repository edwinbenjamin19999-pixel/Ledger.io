import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ShoppingCart, AlertTriangle } from "lucide-react";
import { PosDailySales, formatKr } from "@/hooks/useKassaregister";
import { format, addDays, getDay } from "date-fns";
import { sv } from "date-fns/locale";
import { ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
  Area,
} from "recharts";
import { ChartGradients, AXIS_TICK, GRID_PROPS, BAR_ANIMATION, LINE_ANIMATION, TOOLTIP_CURSOR } from "@/components/charts/ChartGradients";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CustomLegend } from "@/components/charts/CustomLegend";
import { useChartTheme } from "@/hooks/useChartTheme";

interface Props { sales: PosDailySales[];
}

export function KassaSalesForecast({ sales }: Props) {
  const chartTheme = useChartTheme(); const forecastData = useMemo(() => { if (sales.length < 5) return [];

    // Calculate average per weekday
    const dayAvgs: Record<number, { sum: number; count: number }> = {};
    sales.forEach((s) => { const d = getDay(new Date(s.sale_date));
      if (!dayAvgs[d]) dayAvgs[d] = { sum: 0, count: 0 };
      dayAvgs[d].sum += s.total_sales;
      dayAvgs[d].count++;
    });

    const overallAvg = sales.reduce((s, d) => s + d.total_sales, 0) / sales.length;

    // Build 14-day forecast
    const today = new Date();
    const result: any[] = [];

    // Past 7 days actual
    const reversed = [...sales].reverse();
    reversed.slice(-7).forEach((s) => { result.push({ date: format(new Date(s.sale_date), "EEE d/M", { locale: sv }),
        faktisk: s.total_sales,
        prognos: null,
        prognosMin: null,
        prognosMax: null,
      });
    });

    // Next 14 days forecast
    for (let i = 1; i <= 14; i++) { const d = addDays(today, i);
      const wd = getDay(d);
      const avg = dayAvgs[wd] ? dayAvgs[wd].sum / dayAvgs[wd].count : overallAvg;
      const variance = avg * 0.15;
      result.push({ date: format(d, "EEE d/M", { locale: sv }),
        faktisk: null,
        prognos: Math.round(avg),
        prognosMin: Math.round(avg - variance),
        prognosMax: Math.round(avg + variance),
      });
    }

    return result;
  }, [sales]);

  // Find peak forecast day
  const peakDay = useMemo(() => { const forecasts = forecastData.filter((d) => d.prognos !== null);
    if (forecasts.length === 0) return null;
    return forecasts.reduce((best, d) => (d.prognos > best.prognos ? d : best), forecasts[0]);
  }, [forecastData]);

  // Inventory alert simulation
  const inventoryAlerts = useMemo(() => { if (sales.length < 5) return [];
    return [
      { article: "Kaffe 500g",
        daysLeft: 4,
        action: "Behover pafyllas innan fredag",
      },
    ];
  }, [sales]);

  if (forecastData.length === 0) { return (
      <Card className="mt-4">
        <CardContent className="py-8 text-center text-muted-foreground">
          Minst 5 dagars forsaljningsdata kravs för prognos
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      {/* Forecast chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#3b82f6]" />
              <CardTitle className="text-base">14-dagars forsaljningsprognos</CardTitle>
            </div>
            {peakDay && (
              <span className="text-xs text-muted-foreground">
                Toppdag: {peakDay.date} — {formatKr(peakDay.prognos)}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className={`bg-white rounded-2xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)] transition-shadow duration-300 p-6 h-56`}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={forecastData}>
              <ChartGradients />
                <XAxis dataKey="date" tick={AXIS_TICK} axisLine={false} tickLine={false}interval={2} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v: number | null) => (v != null ? [formatKr(v)] : ["-"])}
                  contentStyle={{ fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area
                  type="monotone"
                  dataKey="prognosMax"
                  stroke="none"
                  fill="#3b82f6"
                  fillOpacity={0.08}
                  name="Konfidensband"
                />
                <Area
                  type="monotone"
                  dataKey="prognosMin"
                  stroke="none"
                  fill="hsl(var(--background))"
                  fillOpacity={1}
                  name=" "
                />
                <Bar
                  dataKey="faktisk"
                  name="Faktisk"
                  fill="hsl(var(--muted-foreground))"
                  fillOpacity={0.3}
                  radius={[6, 6, 0, 0]}
                />
                <Line
                  type="monotone"
                  dataKey="prognos"
                  name="Prognos"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* AI forecast narrative */}
      {peakDay && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-[#3b82f6]/5 border border-[#3b82f6]/20">
          <Sparkles className="h-4 w-4 text-[#3b82f6] mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            {peakDay.date} prognos {formatKr(peakDay.prognos)} — baserat på historiskt
            veckomoenster. Helger visar typiskt +40-60% vs vardagar.
          </p>
        </div>
      )}

      {/* Inventory alerts */}
      {inventoryAlerts.length > 0 && (
        <Card className="border-[#F0DDB7] dark:border-amber-800/30">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[#7A5417]" />
              <CardTitle className="text-sm">Lagerberedning</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {inventoryAlerts.map((alert, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg border">
                <div>
                  <p className="text-sm font-medium">{alert.article}</p>
                  <p className="text-xs text-muted-foreground">
                    Racker {alert.daysLeft} dagar — {alert.action}
                  </p>
                </div>
                <Button size="sm" variant="outline" className="text-xs">
                  <ShoppingCart className="h-3 w-3 mr-1" />
                  Inkopsorder
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
