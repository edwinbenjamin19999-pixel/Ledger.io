import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ComingSoonButton } from "@/components/ui/ComingSoonButton";
import { ShoppingCart, CreditCard, Globe, Landmark, FileText, Store,
  AlertTriangle, Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatSEK } from "@/lib/formatNumber";
import { useUnifiedCommerceData } from "@/hooks/useUnifiedCommerce";
import { useNavigate } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useChartTheme } from "@/hooks/useChartTheme";

const PIE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function UnifiedCommerceDashboard() {
  const chartTheme = useChartTheme();
  const { data, isLoading, error } = useUnifiedCommerceData();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="py-8 text-center">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-destructive" />
          <p className="font-medium">Kunde inte ladda data</p>
          <p className="text-sm text-muted-foreground mt-1">Försök igen senare</p>
        </CardContent>
      </Card>
    );
  }

  if (!data?.hasData) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-4">
          <Info className="h-10 w-10 mx-auto text-muted-foreground/40" />
          <div>
            <p className="font-medium">Anslut dina försäljningskanaler</p>
            <p className="text-sm text-muted-foreground mt-1">
              Fakturor och e-handelsordrar visas automatiskt när de skapas.
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate("/invoices")}>
              <FileText className="h-4 w-4 mr-1.5" /> Skapa faktura →
            </Button>
            <Button variant="outline" onClick={() => navigate("/ehandel")}>
              <Store className="h-4 w-4 mr-1.5" /> Koppla e-handel →
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const kpis = [
    { label: "Total omsättning", value: formatSEK(data.totalRevenue),
      sub: `${data.invoiceCount + data.orderCount} transaktioner`, icon: ShoppingCart, glow: true },
    { label: "Fakturaintäkter", value: formatSEK(data.invoiceRevenue),
      sub: `${data.invoiceCount} fakturor`, icon: FileText, color: "text-blue-500" },
    { label: "E-handel", value: formatSEK(data.ecomRevenue),
      sub: `${data.orderCount} ordrar`, icon: Globe, color: "text-[#085041]" },
    { label: "Bankinflöde", value: formatSEK(data.bankInflow),
      sub: "Inbetalningar senaste 30d", icon: Landmark, color: "text-violet-500" },
  ];

  const pieData = Object.entries(data.platforms).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <Card key={i} className={cn(
              "group transition-all hover:shadow-md",
              kpi.glow && "ring-1 ring-primary/20 shadow-[0_0_15px_-3px_hsl(var(--primary)/0.15)]"
            )}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={cn("h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors", (kpi as Record<string, unknown>).color)} />
                  <span className="text-[11px] text-muted-foreground">{kpi.label}</span>
                </div>
                <p className="text-xl font-bold tabular-nums">{kpi.value}</p>
                <p className="text-[10px] mt-0.5 text-muted-foreground">{kpi.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Daily trend */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Daglig omsättning (14 dagar)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.daily}>
                  <defs>
                    <linearGradient id="ucFill1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="ucFill2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, backdropFilter: 'blur(8px)', background: 'rgba(255,255,255,0.97)' }}
                    formatter={(v: number, name: string) => [formatSEK(v), name === 'invoices' ? 'Fakturor' : 'E-handel']}
                  />
                  <Area type="monotone" dataKey="invoices" name="invoices" stroke="hsl(var(--chart-1))" fill="url(#ucFill1)" strokeWidth={2} />
                  <Area type="monotone" dataKey="ecom" name="ecom" stroke="hsl(var(--chart-2))" fill="url(#ucFill2)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Platform breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Kanalfördelning</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <div className="flex flex-col items-center">
                <div className="h-40 w-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={65} paddingAngle={2}>
                        {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatSEK(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1 mt-2 w-full">
                  {pieData.map((p, i) => (
                    <div key={p.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span>{p.name}</span>
                      </div>
                      <span className="font-medium tabular-nums">{formatSEK(p.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Ingen data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Coming soon integrations */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4">
          <p className="text-sm font-semibold mb-3">Betalningsflöden</p>
          <div className="flex flex-wrap gap-2">
            <ComingSoonButton tooltipText="Live betalningsflöden aktiveras med Stripe-integration">
              <CreditCard className="h-4 w-4 mr-1.5" /> Stripe-flöde
            </ComingSoonButton>
            <ComingSoonButton tooltipText="Live betalningsflöden aktiveras med Klarna-integration">
              Klarna-flöde
            </ComingSoonButton>
            <ComingSoonButton tooltipText="Live betalningsflöden aktiveras med Swish-integration">
              Swish-flöde
            </ComingSoonButton>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
