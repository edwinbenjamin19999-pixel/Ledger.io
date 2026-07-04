import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, AlertTriangle } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { ChartGradients, TOOLTIP_CURSOR } from "@/components/charts/ChartGradients";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CustomLegend } from "@/components/charts/CustomLegend";
import { useChartTheme } from "@/hooks/useChartTheme";

const shrinkageByCategory = [
  { name: "Livsmedel", value: 1890, pct: 81, expected: true },
  { name: "Elektronik", value: 450, pct: 19, expected: false },
  { name: "Kontorsmaterial", value: 0, pct: 0, expected: true },
];

const COLORS = ["hsl(var(--primary))", "hsl(var(--destructive))", "hsl(var(--muted-foreground))"];

const monthlyTrend = [
  { month: "Jan", svinn: 1800 },
  { month: "Feb", svinn: 2100 },
  { month: "Mar", svinn: 2340 },
];

export const InventoryShrinkageAnalysis = () => {
  const chartTheme = useChartTheme(); const totalShrinkage = shrinkageByCategory.reduce((s, c) => s + c.value, 0);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Svinn denna manad</p>
            <p className="text-2xl font-bold">{totalShrinkage.toLocaleString("sv-SE")} kr</p>
            <p className="text-xs text-muted-foreground">1,0% av lagervarde</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Arsprognos</p>
            <p className="text-2xl font-bold">28 080 kr</p>
            <p className="text-xs text-muted-foreground">1,2% av lagervarde</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Branschsnitt</p>
            <p className="text-2xl font-bold">1,5%</p>
            <Badge variant="outline" className="bg-[#E1F5EE] text-[#085041] border-[#BFE6D6] text-[10px] mt-1">
              Under snittet
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Svinn per kategori</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`bg-white rounded-2xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)] transition-shadow duration-300 p-6 h-52`}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={shrinkageByCategory.filter((c) => c.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, pct }) => `${name} (${pct}%)`}
                  >
                    {shrinkageByCategory.filter((c) => c.value > 0).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [`${v.toLocaleString("sv-SE")} kr`]}
                    contentStyle={{ fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Detaljanalys</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {shrinkageByCategory.map((cat) => (
              <div
                key={cat.name}
                className={`p-3 rounded-lg border ${!cat.expected && cat.value > 0 ? "border-l-4 border-l-destructive bg-destructive/5" : "bg-muted/50"}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{cat.name}</span>
                  <span className="text-sm font-bold">{cat.value.toLocaleString("sv-SE")} kr</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {cat.pct}% av totalt svinn
                  {cat.expected ? " — forvantad niva" : " — ovantat hogt"}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* AI anomaly */}
      <Card className="border-l-4 border-l-amber-500">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-[#7A5417] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">AI ANOMALI: Elektroniksvinn okar</p>
              <p className="text-xs text-muted-foreground mt-1">
                Elektroniksvinn har okat tredje manaden i rad (150 → 300 → 450 kr).
                Mojliga orsaker: stold, fel inventering, eller returer ej bokforda.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Rekommendation: Stickprovsinventering av elektronik.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Forecast */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-[#3b82f6]/5 border border-[#3b82f6]/20">
        <Sparkles className="h-4 w-4 text-[#3b82f6] mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground">
          Om nuvarande trend haller: svinn 2026 = 28 080 kr (1,2% av lagervarde).
          Branschsnitt detaljhandel: 1,5% — du är under snittet. Fokusera på att utreda
          elektroniksvinn för att halla nivan.
        </p>
      </div>
    </div>
  );
};
