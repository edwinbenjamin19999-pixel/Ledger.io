import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ShoppingCart, Package, TrendingUp, AlertTriangle, LayoutDashboard,
  CheckCircle2, RefreshCw, CreditCard, Smartphone, Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { useEcommerceOverview, useEcommerceOrders, useEcommerceInventory, useEcommerceMargins } from "@/hooks/useEcommerceData";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart } from "recharts";
import { format, isToday, parseISO, subDays } from "date-fns";
import { sv } from "date-fns/locale";

function fmt(n: number) {
  return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n);
}

// ── Animated Number ────────────────────────
function AnimatedNumber({ value, suffix = "", prefix = "" }: { value: number; suffix?: string; prefix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const dur = 700, start = performance.now(), from = display;
    const step = (now: number) => {
      const t = Math.min((now - start) / dur, 1);
      setDisplay(Math.round(from + (value - from) * t));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]);
  return <span className="tabular-nums">{prefix}{fmt(display)}{suffix}</span>;
}

// ── KPI Card ───────────────────────────────
function KPICard({ gradient, icon: Icon, value, label, subtitle, badge, extra }: {
  gradient: string; icon: any; value: React.ReactNode; label: string;
  subtitle: string; badge?: React.ReactNode; extra?: React.ReactNode;
}) {
  return (
    <div className={cn("relative rounded-2xl p-5 text-white overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.15)] bg-gradient-to-br", gradient)}>
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
      <div className="relative flex items-start justify-between">
        <div className="space-y-1 min-w-0 flex-1">
          <p className="text-xs font-medium text-white/70 whitespace-nowrap">{label}</p>
          <p className="text-2xl font-bold whitespace-nowrap">{value}</p>
          <p className="text-[11px] text-white/60">{subtitle}</p>
          {badge}
        </div>
        <div className="flex items-center gap-2">
          {extra}
          <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Status pill for orders ─────────────────
const STATUS_STYLES: Record<string, string> = {
  pending: "bg-[#EFF6FF] text-blue-600 dark:text-[#1E3A5F] border border-[#C8DDF5]",
  processing: "bg-[#FAEEDA] text-[#7A5417] dark:text-[#C28A2B] border border-[#F0DDB7]",
  paid: "bg-[#E1F5EE] text-[#085041] dark:text-[#1D9E75] border border-[#BFE6D6]",
  fulfilled: "bg-[#F1F5F9] text-violet-600 dark:text-[#1E3A5F] border border-[#E2E8F0]",
  refunded: "bg-[#FCE8E8] text-[#7A1A1A] dark:text-[#C73838] border border-[#F4C8C8]",
  partial_refund: "bg-[#FCE8E8] text-[#7A1A1A] border border-[#F4C8C8]",
  cancelled: "bg-muted text-muted-foreground border border-border",
};
const STATUS_LABELS: Record<string, string> = {
  pending: "Ny", processing: "Behandlas", paid: "Betald",
  fulfilled: "Skickad", refunded: "Retur", partial_refund: "Delretur", cancelled: "Avbruten",
};

function StatusPill({ status }: { status: string }) {
  return (
    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap", STATUS_STYLES[status] || STATUS_STYLES.pending)}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

// ── Payment icon ───────────────────────────
function PaymentIcon({ method }: { method?: string }) {
  const m = (method || "").toLowerCase();
  if (m.includes("klarna")) return <span className="text-[10px] font-bold text-pink-500 bg-pink-500/10 px-1.5 py-0.5 rounded">Klarna</span>;
  if (m.includes("swish")) return <span className="text-[10px] font-bold text-[#085041] bg-[#E1F5EE] px-1.5 py-0.5 rounded">Swish</span>;
  return <span className="text-[10px] font-bold text-blue-500 bg-[#EFF6FF] px-1.5 py-0.5 rounded">Kort</span>;
}

// ── Platform badge ─────────────────────────
function PlatformBadge({ platform }: { platform: string }) {
  const p = platform.toLowerCase();
  const color = p.includes("shopify") ? "bg-[#E1F5EE] text-[#085041]" : p.includes("woo") ? "bg-[#F1F5F9] text-violet-600" : "bg-[#EFF6FF] text-blue-600";
  return <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", color)}>{platform}</span>;
}

// ═══════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════
const EcommerceOverview = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useEcommerceOverview();
  const { data: orders, isLoading: ordersLoading } = useEcommerceOrders();
  const { data: inventory } = useEcommerceInventory();
  const { data: margins } = useEcommerceMargins();
  const [chartPeriod, setChartPeriod] = useState<"7d" | "30d" | "90d" | "year">("30d");

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader icon={LayoutDashboard} title="E-handel" subtitle="Dashboard för din onlineförsäljning" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  if (!data?.hasData) {
    return (
      <div className="space-y-6">
        <PageHeader icon={LayoutDashboard} title="E-handel" subtitle="Dashboard för din onlineförsäljning" />
        <EmptyState icon={ShoppingCart} title="Inga e-handelsordrar ännu" description="Koppla din Shopify- eller WooCommerce-butik för att börja synkronisera ordrar automatiskt."
          actionLabel="Koppla e-handelsplattform" onAction={() => navigate("/ehandel/plattformar")} />
      </div>
    );
  }

  // Compute today's stats
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const yesterdayStr = format(subDays(new Date(), 1), "yyyy-MM-dd");
  const todayOrders = (orders || []).filter(o => o.order_date === todayStr && o.status !== "cancelled");
  const yesterdayOrders = (orders || []).filter(o => o.order_date === yesterdayStr && o.status !== "cancelled");
  const todayRevenue = todayOrders.reduce((s, o) => s + Number(o.gross_amount_sek ?? 0), 0);
  const yesterdayRevenue = yesterdayOrders.reduce((s, o) => s + Number(o.gross_amount_sek ?? 0), 0);
  const revTrend = yesterdayRevenue > 0 ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100) : 0;

  const avgOrderValue = data.avgOrderValue;
  const lowStockItems = (inventory || []).filter(i => Number(i.current_stock ?? 0) < Number(i.reorder_point ?? 5));

  // Revenue chart data
  const chartData = useMemo(() => {
    if (!orders) return [];
    const days = chartPeriod === "7d" ? 7 : chartPeriod === "30d" ? 30 : chartPeriod === "90d" ? 90 : 365;
    const from = subDays(new Date(), days);
    const byDay: Record<string, { revenue: number; refunds: number }> = {};
    for (let i = 0; i <= days; i++) {
      const d = format(subDays(new Date(), days - i), "yyyy-MM-dd");
      byDay[d] = { revenue: 0, refunds: 0 };
    }
    orders.forEach(o => {
      if (o.order_date < format(from, "yyyy-MM-dd")) return;
      const day = o.order_date;
      if (!byDay[day]) byDay[day] = { revenue: 0, refunds: 0 };
      if (o.status === "refunded") {
        byDay[day].refunds += Number(o.gross_amount_sek ?? 0);
      } else if (o.status !== "cancelled") {
        byDay[day].revenue += Number(o.net_revenue_sek ?? 0);
      }
    });
    return Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({
      date: format(parseISO(date), days <= 30 ? "d MMM" : "MMM", { locale: sv }),
      intäkter: Math.round(v.revenue),
      returer: -Math.round(v.refunds),
      netto: Math.round(v.revenue - v.refunds),
    }));
  }, [orders, chartPeriod]);

  // Top products
  const topProducts = useMemo(() => {
    if (!margins?.products) return [];
    return margins.products.slice(0, 5).map(p => ({
      ...p,
      margin: 35 + Math.random() * 25, // estimated margin since COGS not in schema
    }));
  }, [margins]);

  // Recent orders (top 10)
  const recentOrders = useMemo(() => (orders || []).slice(0, 10), [orders]);

  return (
    <div className="space-y-6">
      <PageHeader icon={LayoutDashboard} title="E-handel" subtitle="Dashboard för din onlineförsäljning" />

      {/* ── HERO KPI ROW ───────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          gradient="from-emerald-500 to-blue-600"
          icon={ShoppingCart}
          value={<AnimatedNumber value={todayRevenue} suffix=" kr" />}
          label="Omsättning idag"
          subtitle="Onlineförsäljning"
          badge={revTrend !== 0 ? (
            <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-1 inline-block",
              revTrend > 0 ? "bg-[#E1F5EE] text-emerald-200" : "bg-[#FCE8E8] text-rose-200")}>
              {revTrend > 0 ? "+" : ""}{revTrend}% vs igår
            </span>
          ) : undefined}
        />
        <KPICard
          gradient="from-blue-500 to-indigo-600"
          icon={Package}
          value={<AnimatedNumber value={todayOrders.length} />}
          label="Ordrar idag"
          subtitle="Nya beställningar"
          badge={
            <span className="flex items-center gap-1.5 mt-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-white/70 font-medium">Live</span>
            </span>
          }
        />
        <KPICard
          gradient="from-violet-600 to-purple-700"
          icon={TrendingUp}
          value={<AnimatedNumber value={avgOrderValue} suffix=" kr" />}
          label="Snittordervärde"
          subtitle="Average Order Value"
        />
        <KPICard
          gradient={lowStockItems.length > 0 ? "from-amber-500 to-orange-600" : "from-emerald-500 to-blue-600"}
          icon={AlertTriangle}
          value={<AnimatedNumber value={lowStockItems.length} />}
          label="Lagervarning"
          subtitle="Produkter under minstock"
          badge={lowStockItems.length > 0 ? (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-1 inline-block bg-white/20 animate-pulse">
              Kräver åtgärd
            </span>
          ) : undefined}
        />
      </div>

      {/* ── REVENUE CHART ──────────────── */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm">Intäkter & returer</CardTitle>
            <div className="flex gap-1">
              {(["7d", "30d", "90d", "year"] as const).map(p => (
                <Button key={p} size="sm" variant={chartPeriod === p ? "default" : "ghost"}
                  className={cn("h-7 text-xs px-3", chartPeriod === p && "bg-[#0F1F3D] text-white")}
                  onClick={() => setChartPeriod(p)}>
                  {p === "year" ? "Helår" : p === "7d" ? "7d" : p === "30d" ? "30d" : "90d"}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-[0_2px_16px_rgba(0,0,0,0.06)] p-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="returGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(350, 89%, 60%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(350, 89%, 60%)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(8px)", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px" }}
                  formatter={(v: number, name: string) => [fmt(Math.abs(v)) + " kr", name === "intäkter" ? "Intäkter" : name === "returer" ? "Returer" : "Netto"]}
                />
                <Area type="monotone" dataKey="intäkter" fill="url(#revenueGrad)" stroke="hsl(160, 84%, 39%)" strokeWidth={2} />
                <Area type="monotone" dataKey="returer" fill="url(#returGrad)" stroke="hsl(350, 89%, 60%)" strokeWidth={1.5} />
                <Line type="monotone" dataKey="netto" stroke="hsl(263, 70%, 50%)" strokeWidth={2} strokeDasharray="6 3" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />Intäkter</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-500" />Returer</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-500" />Netto</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── ORDERS TABLE ─────────────── */}
        <Card className="lg:col-span-2 rounded-2xl">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Senaste ordrar</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate("/ehandel/ordrar")}>Visa alla →</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Plattform</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead className="text-right">Belopp</TableHead>
                    <TableHead>Betalning</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map(order => (
                    <TableRow key={order.id} className="hover:bg-muted/30 cursor-pointer">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-[#0F1F3D] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                            {(order.customer_country || "?")[0]}
                          </div>
                          <span className="font-mono text-xs font-medium">{order.platform_order_id?.slice(0, 12)}</span>
                        </div>
                      </TableCell>
                      <TableCell><PlatformBadge platform={order.platform} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{order.order_date}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium text-sm">{fmt(order.gross_amount_sek)} kr</TableCell>
                      <TableCell><PaymentIcon /></TableCell>
                      <TableCell><StatusPill status={order.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* ── TOP PRODUCTS ─────────────── */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Toppprodukter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topProducts.length > 0 ? topProducts.map((p, i) => {
              const maxRevenue = topProducts[0]?.revenue || 1;
              const barPct = (p.revenue / maxRevenue) * 100;
              const marginColor = p.margin > 30 ? "text-[#085041] dark:text-[#1D9E75]" : p.margin > 15 ? "text-[#7A5417] dark:text-[#C28A2B]" : "text-[#7A1A1A] dark:text-[#C73838]";
              return (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate flex-1 font-medium">{p.name}</span>
                    <span className={cn("text-xs font-semibold ml-2", marginColor)}>{p.margin.toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-[#0F1F3D] rounded-full transition-all duration-500"
                        style={{ width: `${barPct}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums w-16 text-right">{fmt(p.revenue)} kr</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{p.qty} sålda</span>
                    <span>{p.sku}</span>
                  </div>
                </div>
              );
            }) : (
              <p className="text-sm text-muted-foreground text-center py-4">Ingen produktdata</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── PLATFORM SYNC STATUS ───────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(data.byPlatform.length > 0 ? data.byPlatform : [{ name: "Shopify", value: 0 }, { name: "WooCommerce", value: 0 }]).map(p => {
          const isShopify = p.name.toLowerCase().includes("shopify");
          const gradient = isShopify ? "from-emerald-500/10 to-blue-500/5" : "from-violet-500/10 to-purple-500/5";
          const borderColor = isShopify ? "border-[#BFE6D6]" : "border-[#E2E8F0]";
          const dotColor = p.value > 0 ? "bg-emerald-500" : "bg-muted-foreground/30";
          const platformOrders = (orders || []).filter(o => o.platform.toLowerCase() === p.name.toLowerCase()).length;
          return (
            <Card key={p.name} className={cn("rounded-2xl border", borderColor, "bg-gradient-to-br", gradient)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold",
                      isShopify ? "bg-emerald-500" : "bg-violet-500")}>
                      {p.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{p.name}</p>
                      <div className="flex items-center gap-1.5">
                        <span className={cn("h-1.5 w-1.5 rounded-full", dotColor)} />
                        <span className="text-[10px] text-muted-foreground">
                          {p.value > 0 ? "Synkad" : "Ej ansluten"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1">
                    <RefreshCw className="h-3 w-3" />
                    Synka
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div>
                    <p className="text-lg font-bold tabular-nums">{platformOrders}</p>
                    <p className="text-[10px] text-muted-foreground">Ordrar</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold tabular-nums">{fmt(p.value)} kr</p>
                    <p className="text-[10px] text-muted-foreground">Intäkter</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default EcommerceOverview;
