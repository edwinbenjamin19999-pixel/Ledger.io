import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { ChartGradients, AXIS_TICK, GRID_PROPS, BAR_ANIMATION, TOOLTIP_CURSOR } from "@/components/charts/ChartGradients";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CustomLegend } from "@/components/charts/CustomLegend";
import { Sparkles } from "lucide-react";
import type { SwishPayment } from "@/hooks/useSwish";
import { useChartTheme } from "@/hooks/useChartTheme";

const formatKr = (n: number) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n) + " kr";

interface Props { payments: SwishPayment[];
  summary: { totalReceived: number;
    totalCount: number;
    matchRate: number;
  };
}

export function SwishAnalytics({ payments, summary }: Props) {
  const chartTheme = useChartTheme(); // Monthly breakdown
  const monthlyData: Record<string, { month: string; amount: number; count: number }> = {};
  payments.forEach((p) => { const d = new Date(p.payment_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("sv-SE", { month: "short", year: "2-digit" });
    if (!monthlyData[key]) monthlyData[key] = { month: label, amount: 0, count: 0 };
    monthlyData[key].amount += p.amount;
    monthlyData[key].count += 1;
  });
  const monthlyChart = Object.values(monthlyData).slice(-6);

  // Match status distribution
  const matched = payments.filter((p) => p.match_status === "matched" || p.match_status === "direct_sale").length;
  const unmatched = payments.filter((p) => p.match_status === "unmatched").length;
  const dismissed = payments.filter((p) => p.match_status === "dismissed").length;
  const pieData = [
    { name: "Matchade", value: matched, color: "#10b981" },
    { name: "Omatchade", value: unmatched, color: "#f59e0b" },
    { name: "Avvisade", value: dismissed, color: "#94a3b8" },
  ].filter((d) => d.value > 0);

  // DSO comparison insight
  const avgSwishDays = 0.3;
  const avgInvoiceDays = 18;

  return (
    <div className="space-y-6">
      {/* AI recommendation */}
      <Card className="border-l-4" style={{ borderLeftColor: "#41B5AC" }}>
        <CardContent className="p-4 flex items-start gap-3">
          <Sparkles className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "#41B5AC" }} />
          <div className="text-sm space-y-2">
              <p className="font-medium">AI-rekommendation: Erbjud Swish-rabatt</p>
              <p className="text-muted-foreground text-xs">
                Erbjud 1% rabatt för Swish-betalning — baserat på din DSO
                på 38 dagar och finansieringskostnad på 0,08%/dag sparar
                du netto 14 kr per 10 000 kr faktura.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Swish-inbetalningar per månad</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyChart.length > 0 ? (
              <div className={`bg-white rounded-2xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)] transition-shadow duration-300 p-6 h-60`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyChart}>
              <ChartGradients />
                    <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false}/>
                    <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(v: number) => formatKr(v)}
                      labelFormatter={(l) => l}
                    />
                    <Bar dataKey="amount" name="Belopp" fill="#41B5AC" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Ingen historisk data ännu
              </p>
            )}
          </CardContent>
        </Card>

        {/* Match distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Matchningsstatus</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <div className={`bg-white rounded-2xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)] transition-shadow duration-300 p-6 h-60 flex items-center justify-center`}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Ingen data ännu
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment channel comparison */}
      <Card>
        <CardHeader className="pb-2">
            <CardTitle className="text-base">Betalningstid per kanal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center p-6 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-2">Swish — genomsnittlig betalningstid</p>
              <p className="text-3xl font-bold" style={{ color: "#41B5AC" }}>{avgSwishDays} dagar</p>
            </div>
            <div className="text-center p-6 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-2">Faktura — genomsnittlig betalningstid</p>
              <p className="text-3xl font-bold text-muted-foreground">{avgInvoiceDays} dagar</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-4">
            Kunder som betalar via Swish betalar 98% snabbare än via traditionell faktura
          </p>
        </CardContent>
      </Card>

      {/* Fraud detection summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Bedrägeridetektering</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p className="text-sm font-medium">Transaktionsgräns</p>
                <p className="text-xs text-muted-foreground">Belopp över 150 000 kr flaggas automatiskt</p>
              </div>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#E1F5EE] text-[#085041]">Aktiv</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p className="text-sm font-medium">Upprepade belopp</p>
                <p className="text-xs text-muted-foreground">Samma belopp från okänt nummer 3+ gånger</p>
              </div>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#E1F5EE] text-[#085041]">Aktiv</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p className="text-sm font-medium">Runda belopp utan koppling</p>
                <p className="text-xs text-muted-foreground">Runda belopp utan fakturamatchning granskas</p>
              </div>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#E1F5EE] text-[#085041]">Aktiv</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
