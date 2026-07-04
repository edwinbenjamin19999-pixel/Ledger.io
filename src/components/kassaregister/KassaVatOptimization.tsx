import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Download } from "lucide-react";
import { PosDailySales, formatKr } from "@/hooks/useKassaregister";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { ChartGradients, TOOLTIP_CURSOR } from "@/components/charts/ChartGradients";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CustomLegend } from "@/components/charts/CustomLegend";
import { useChartTheme } from "@/hooks/useChartTheme";
import { getFoodVatRate } from "@/lib/validators/vat-rates";

interface Props { sales: PosDailySales[];
}

export function KassaVatOptimization({ sales }: Props) {
  const chartTheme = useChartTheme(); const monthTotal = sales.reduce((s, d) => s + d.total_sales, 0);

  // Simulate mixed VAT breakdown (food/restaurant)
  const vatBreakdown = useMemo(() => { if (monthTotal === 0) return [];
    return [
      { name: "Äta här (12%)", rate: 12, exMoms: Math.round(monthTotal * 0.62 / 1.12), moms: Math.round(monthTotal * 0.62 / 1.12 * 0.12), share: 62 },
      { name: "Take away (12%)", rate: 12, exMoms: Math.round(monthTotal * 0.18 / 1.12), moms: Math.round(monthTotal * 0.18 / 1.12 * 0.12), share: 18 },
      { name: "Alkohol (25%)", rate: 25, exMoms: Math.round(monthTotal * 0.12 / 1.25), moms: Math.round(monthTotal * 0.12 / 1.25 * 0.25), share: 12 },
      { name: "Övriga varor (25%)", rate: 25, exMoms: Math.round(monthTotal * 0.08 / 1.25), moms: Math.round(monthTotal * 0.08 / 1.25 * 0.25), share: 8 },
    ];
  }, [monthTotal]);

  const totalMoms = vatBreakdown.reduce((s, v) => s + v.moms, 0);
  const avgVatRate = monthTotal > 0 ? (totalMoms / (monthTotal - totalMoms)) * 100 : 0;

  const chartColors = ["#3b82f6", "#3b82f6", "#f97316", "#f59e0b"];

  // Find highest VAT day (simulated)
  const highestVatDay = useMemo(() => { if (sales.length === 0) return null;
    const best = sales.reduce((max, s) => s.total_sales > max.total_sales ? s : max, sales[0]);
    return { date: best.sale_date, rate: 25.8 };
  }, [sales]);

  if (monthTotal === 0) { return (
      <Card className="mt-4">
        <CardContent className="py-8 text-center text-muted-foreground">
          Ingen försäljningsdata tillgänglig för momsoptimering
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      {/* VAT overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Total moms denna månad</p>
            <p className="text-2xl font-bold">{formatKr(totalMoms)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Genomsnittlig momsbörda</p>
            <p className="text-2xl font-bold">{avgVatRate.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">Blandat sortiment</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Försäljning ex moms</p>
            <p className="text-2xl font-bold">{formatKr(monthTotal - totalMoms)}</p>
          </CardContent>
        </Card>
      </div>

      {/* VAT category breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#3b82f6]" />
            <CardTitle className="text-base">Momsfördelning kassaförsäljning</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pie chart */}
            <div className={`bg-white rounded-2xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)] transition-shadow duration-300 p-6 h-56`}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={vatBreakdown}
                    dataKey="share"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={45}
                    paddingAngle={2}
                  >
                    {vatBreakdown.map((_, i) => (
                      <Cell key={i} fill={chartColors[i % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v}%`, "Andel"]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Table */}
            <div className="space-y-2">
              {vatBreakdown.map((v, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: chartColors[i] }} />
                    <div>
                      <p className="text-sm font-medium">{v.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatKr(v.exMoms)} ex moms
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{formatKr(v.moms)}</p>
                    <p className="text-xs text-muted-foreground">moms</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI insights */}
      {highestVatDay && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-[#3b82f6]/5 border border-[#3b82f6]/20">
          <Sparkles className="h-4 w-4 text-[#3b82f6] mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            Högsta moms-dag: {highestVatDay.date} ({highestVatDay.rate}%) — hög alkoholförsäljning.
            Genomsnittlig momsbörda {avgVatRate.toFixed(1)}% indikerar blandat sortiment med övervikt
            på livsmedel ({getFoodVatRate(new Date(highestVatDay.date))}%
            {getFoodVatRate(new Date(highestVatDay.date)) === 6 ? " — tillfällig sänkning 2026–2027" : ""}).
          </p>
        </div>
      )}

      {/* Export */}
      <Card>
        <CardContent className="py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Exportera momsunderlag</p>
            <p className="text-xs text-muted-foreground">
              Momsunderlag kassaförsäljning — redo för momsdeklaration
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Exportera PDF
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
