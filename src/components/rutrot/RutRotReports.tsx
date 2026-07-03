import { useMemo } from "react";
import { RutRotSettings, useRutRotInvoices } from "@/hooks/useRutRot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ChartGradients, AXIS_TICK, GRID_PROPS, BAR_ANIMATION, TOOLTIP_CURSOR } from "@/components/charts/ChartGradients";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CustomLegend } from "@/components/charts/CustomLegend";
import { Download, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChartTheme } from "@/hooks/useChartTheme";

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n);

const fmtKr = (n: number) => fmt(n) + " kr";

export function RutRotReports({ settings }: { settings: RutRotSettings }) {
  const chartTheme = useChartTheme(); const { invoices } = useRutRotInvoices();
  const year = new Date().getFullYear();
  const currentMonth = new Date().toLocaleString("sv-SE", { month: "long", year: "numeric" });

  // Group by month
  const monthlyData = useMemo(() => { const map: Record<string, { month: string; totalInvoiced: number; deduction: number; customerPays: number; pendingSKV: number; paidSKV: number; count: number }> = {};
    invoices.forEach((inv) => { const month = inv.created_at.slice(0, 7);
      if (!map[month]) { map[month] = { month, totalInvoiced: 0, deduction: 0, customerPays: 0, pendingSKV: 0, paidSKV: 0, count: 0 };
      }
      const d = map[month];
      d.totalInvoiced += inv.labor_cost + inv.material_cost + inv.travel_cost;
      d.deduction += inv.deduction_amount;
      d.customerPays += inv.customer_pays;
      d.count++;
      if (inv.skv_status === "applied") d.pendingSKV += inv.deduction_amount;
      if (inv.skv_status === "approved") d.paidSKV += inv.skv_paid_amount || inv.deduction_amount;
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
  }, [invoices]);

  const chartData = monthlyData;

  // Current month narrative
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const thisMonth = monthlyData.find((m) => m.month === currentMonthKey);

  // Annual totals
  const yearInvoices = invoices.filter((i) => i.created_at.startsWith(String(year)));
  const totals = { invoiced: yearInvoices.reduce((s, i) => s + i.labor_cost + i.material_cost + i.travel_cost, 0),
    deduction: yearInvoices.reduce((s, i) => s + i.deduction_amount, 0),
    customerPays: yearInvoices.reduce((s, i) => s + i.customer_pays, 0),
    pending: yearInvoices.filter((i) => i.skv_status === "applied").reduce((s, i) => s + i.deduction_amount, 0),
    paid: yearInvoices.filter((i) => i.skv_status === "approved").reduce((s, i) => s + (i.skv_paid_amount || i.deduction_amount), 0),
    rejected: yearInvoices.filter((i) => i.skv_status === "rejected").reduce((s, i) => s + i.deduction_amount, 0),
    rejectedCount: yearInvoices.filter((i) => i.skv_status === "rejected").length,
    uniqueCustomers: new Set(yearInvoices.map((i) => i.customer_personal_id)).size,
    count: yearInvoices.length,
  };

  const avgPerCustomer = totals.uniqueCustomers > 0 ? Math.round(totals.deduction / totals.uniqueCustomers) : 0;

  return (
    <div className="space-y-6 mt-4">
      {/* Monthly narrative */}
      {thisMonth && (
        <Card className="border-l-4 border-l-[#3b82f6]">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#3b82f6]" />
              <p className="text-sm font-medium">{currentMonth} — RUT/ROT-sammanfattning</p>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1 ml-6">
              <li>{thisMonth.count} fakturor med {settings.rut_enabled && settings.rot_enabled ? "RUT/ROT" : settings.rut_enabled ? "RUT" : "ROT"}-avdrag: {fmtKr(thisMonth.totalInvoiced)} totalt</li>
              <li>Avdragsdel: {fmtKr(thisMonth.deduction)} (ansökt hos SKV)</li>
              {thisMonth.paidSKV > 0 && <li>SKV har betalat: {fmtKr(thisMonth.paidSKV)}</li>}
              {thisMonth.pendingSKV > 0 && <li>Väntar: {fmtKr(thisMonth.pendingSKV)}</li>}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Månadssammanställning</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <div className={`bg-white rounded-2xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)] transition-shadow duration-300 p-6 h-64`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barGap={2}>
              <ChartGradients />
                  <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false}/>
                  <YAxis tickFormatter={(v) => fmt(v)} tick={{ fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip />} cursor={TOOLTIP_CURSOR} />
                  <Legend content={<CustomLegend />} />
                  <Bar dataKey="customerPays" name="Kunddel" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="deduction" name="Avdragsdel" fill={settings.rot_enabled ? "#10b981" : "#3b82f6"} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">Ingen data att visa ännu</p>
          )}
        </CardContent>
      </Card>

      {/* Annual summary */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Årssammanfattning {year}</CardTitle>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7">
              <Download className="h-3 w-3" />
              Exportera SKV-underlag
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: "Totalt fakturerat", value: totals.invoiced },
              { label: "RUT/ROT-del", value: totals.deduction },
              { label: "Kunddel", value: totals.customerPays },
              { label: "Väntar från SKV", value: totals.pending },
              { label: "Inbetalt från SKV", value: totals.paid },
            ].map((item) => (
              <div key={item.label} className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
                <p className="text-sm font-bold mt-1">{fmtKr(item.value)}</p>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-lg bg-accent/50 border border-border space-y-1.5">
            <p className="text-xs font-medium">Statistik {year}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">{totals.count} fakturor</p>
                <p>Totalt med avdrag</p>
              </div>
              <div>
                <p className="font-medium text-foreground">{totals.uniqueCustomers} kunder</p>
                <p>Unika mottagare</p>
              </div>
              <div>
                <p className="font-medium text-foreground">{fmtKr(avgPerCustomer)}</p>
                <p>Snitt per kund</p>
              </div>
              {totals.rejectedCount > 0 && (
                <div>
                  <p className="font-medium text-[#7A1A1A]">{fmtKr(totals.rejected)}</p>
                  <p>{totals.rejectedCount} nekade ärenden</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
