import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  Droplets, ShieldCheck, AlertTriangle, Loader2, RefreshCw
} from "lucide-react";
import { GradientKPICard } from "@/components/shared/GradientKPICard";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from "recharts";
import { ChartGradients, AXIS_TICK, GRID_PROPS, LINE_ANIMATION, TOOLTIP_CURSOR } from "@/components/charts/ChartGradients";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CustomLegend } from "@/components/charts/CustomLegend";
import { format, subDays, eachDayOfInterval } from "date-fns";
import { sv } from "date-fns/locale";
import { useChartTheme } from "@/hooks/useChartTheme";

interface CashFlowKPIProps { companyId: string;
}

interface KPIData { totalBalance: number;
  balanceChange7d: number;
  balanceChangePercent: number;
  inflow30d: number;
  outflow30d: number;
  netCashFlow: number;
  burnRate: number;
  runwayDays: number;
  liquidityRatio: number;
  pendingInvoicesAmount: number;
  overdueInvoicesAmount: number;
  dailyCashFlow: { date: string; balance: number; inflow: number; outflow: number }[];
}

export const CashFlowKPI = ({ companyId }: CashFlowKPIProps) => {
  const chartTheme = useChartTheme(); const [data, setData] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => { loadKPIData();

    // Real-time subscription för bank transactions
    const channel = supabase
      .channel("cashflow-kpi")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bank_transactions", filter: `company_id=eq.${companyId}` },
        () => loadKPIData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bank_accounts", filter: `company_id=eq.${companyId}` },
        () => loadKPIData()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [companyId]);

  const loadKPIData = async () => { try { const now = new Date();
      const thirtyDaysAgo = subDays(now, 30);
      const sevenDaysAgo = subDays(now, 7);

      const [bankRes, txRes, invoiceRes, ledgerRes] = await Promise.all([
        supabase.from("bank_accounts").select("balance, currency").eq("company_id", companyId).eq("is_active", true),
        supabase.from("bank_transactions").select("amount, booking_date, status, matched_transaction_id").eq("company_id", companyId).gte("booking_date", format(thirtyDaysAgo, "yyyy-MM-dd")),
        supabase.from("invoices").select("total_amount, status, due_date, invoice_direction").eq("company_id", companyId).eq("invoice_direction", "outgoing").in("status", ["sent", "overdue"]),
        // Kanonisk fallback: huvudboken (1910–1930), samma källa som
        // Kassaflödesanalys och Cash Command. Endast slutgiltiga
        // verifikationer räknas; utkast och pending approval exkluderas.
        supabase.from("journal_entry_lines").select("debit, credit, journal_entries!inner(entry_date, status, company_id), chart_of_accounts!inner(account_number)")
          .eq("journal_entries.company_id", companyId)
          .in("journal_entries.status", ["approved", "posted"])
          .like("chart_of_accounts.account_number", "19%"),
      ]);

      // Use bank balance if available, otherwise calculate from ledger
      let totalBalance = bankRes.data?.reduce((sum, a) => sum + (a.balance || 0), 0) || 0;
      
      if (totalBalance === 0 && ledgerRes.data && ledgerRes.data.length > 0) { // Calculate balance from ledger 19xx accounts (cash & bank)
        totalBalance = (ledgerRes.data ).reduce((sum, line) => { return sum + ((line.debit || 0) - (line.credit || 0));
        }, 0);
      }

      const transactions = txRes.data || [];

      const recentTx = transactions.filter(t => new Date(t.booking_date) >= sevenDaysAgo);
      const olderTx = transactions.filter(t => new Date(t.booking_date) < sevenDaysAgo && new Date(t.booking_date) >= subDays(now, 14));
      const recentNet = recentTx.reduce((s, t) => s + t.amount, 0);
      const olderNet = olderTx.reduce((s, t) => s + t.amount, 0);

      const inflow30d = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
      const outflow30d = Math.abs(transactions.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0));
      const netCashFlow = inflow30d - outflow30d;

      const dailyOutflow = outflow30d / 30;
      const runwayDays = dailyOutflow > 0 ? Math.round(totalBalance / dailyOutflow) : 999;

      const liquidityRatio = outflow30d > 0 ? (totalBalance + inflow30d) / outflow30d : 10;

      const pendingInvoices = invoiceRes.data?.filter(i => i.status === "sent") || [];
      const overdueInvoices = invoiceRes.data?.filter(i => i.status === "overdue") || [];
      const pendingInvoicesAmount = pendingInvoices.reduce((s, i) => s + (i.total_amount || 0), 0);
      const overdueInvoicesAmount = overdueInvoices.reduce((s, i) => s + (i.total_amount || 0), 0);

      // Build daily cash flow chart data
      const days = eachDayOfInterval({ start: thirtyDaysAgo, end: now });
      let runningBalance = totalBalance - netCashFlow; // approximate starting balance
      const dailyCashFlow = days.map(day => { const dayStr = format(day, "yyyy-MM-dd");
        const dayTx = transactions.filter(t => format(new Date(t.booking_date), "yyyy-MM-dd") === dayStr);
        const dayInflow = dayTx.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
        const dayOutflow = Math.abs(dayTx.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0));
        runningBalance += (dayInflow - dayOutflow);
        return { date: format(day, "d MMM", { locale: sv }),
          balance: Math.round(runningBalance),
          inflow: Math.round(dayInflow),
          outflow: Math.round(dayOutflow),
        };
      });

      setData({ totalBalance,
        balanceChange7d: recentNet,
        balanceChangePercent: olderNet !== 0 ? ((recentNet - olderNet) / Math.abs(olderNet)) * 100 : 0,
        inflow30d,
        outflow30d,
        netCashFlow,
        burnRate: dailyOutflow,
        runwayDays,
        liquidityRatio,
        pendingInvoicesAmount,
        overdueInvoicesAmount,
        dailyCashFlow,
      });
      setLastUpdated(new Date());
    } catch (error) { console.error("Error loading KPI data:", error);
    } finally { setLoading(false);
    }
  };

  if (loading) { return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const healthStatus = data.runwayDays > 90
    ? { label: "Utmärkt", color: "text-[#085041]", bg: "bg-[#E1F5EE]", icon: ShieldCheck }
    : data.runwayDays > 30
    ? { label: "Bra", color: "text-primary", bg: "bg-primary/10", icon: ShieldCheck }
    : { label: "Varning", color: "text-destructive", bg: "bg-destructive/10", icon: AlertTriangle };

  const HealthIcon = healthStatus.icon;

  const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Droplets className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Kassaflöde & Likviditet</h2>
          <Badge variant="outline" className={`${healthStatus.bg} ${healthStatus.color} border-0`}>
            <HealthIcon className="h-3 w-3 mr-1" />
            {healthStatus.label}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Uppdaterad {format(lastUpdated, "HH:mm")}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={loadKPIData}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <GradientKPICard
          label="Totalt saldo"
          value={`${fmt(data.totalBalance)} kr`}
          sub={`${data.balanceChange7d >= 0 ? "+" : ""}${fmt(data.balanceChange7d)} kr (7d)`}
          icon={Wallet}
          gradient="bg-[#0F1F3D]"
        />
        <GradientKPICard
          label="Nettokassaflöde (30d)"
          value={`${data.netCashFlow >= 0 ? "+" : ""}${fmt(data.netCashFlow)} kr`}
          sub={`↑ ${fmt(data.inflow30d)} · ↓ ${fmt(data.outflow30d)}`}
          icon={data.netCashFlow >= 0 ? TrendingUp : TrendingDown}
          gradient={data.netCashFlow >= 0 ? "bg-[#0F1F3D]" : "bg-[#0F1F3D]"}
        />
        <GradientKPICard
          label="Runway"
          value={data.runwayDays > 365 ? "12+ mån" : `${data.runwayDays} dagar`}
          sub={healthStatus.label}
          icon={ShieldCheck}
          gradient={data.runwayDays > 180 ? "bg-[#0F1F3D]" : data.runwayDays > 60 ? "bg-[#0F1F3D]" : "bg-[#0F1F3D]"}
        />
        <GradientKPICard
          label="Likviditetskvot"
          value={`${data.liquidityRatio.toFixed(1)}x`}
          sub={data.liquidityRatio >= 1.5 ? "Stark likviditet" : data.liquidityRatio >= 1 ? "Acceptabel" : "Kritisk"}
          icon={Droplets}
          gradient={data.liquidityRatio >= 1.5 ? "bg-[#0F1F3D]" : "bg-[#0F1F3D]"}
        />
      </div>

      {/* Cash Flow Chart + Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow duration-300 p-6 lg:col-span-2">
          <h3 className="text-foreground font-bold text-sm tracking-tight mb-3">Saldobalans (30 dagar)</h3>
          <div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data.dailyCashFlow}>
              <ChartGradients />
                <defs>
                  <linearGradient id="kpiBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="date" tick={AXIS_TICK} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "14px", backdropFilter: "blur(12px)", fontSize: "12px" }}
                  formatter={(value: number) => [`${fmt(value)} kr`, "Saldo"]}
                />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#kpiBalance)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Utestående fakturor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Skickade</span>
                <span className="text-sm font-medium text-foreground">{fmt(data.pendingInvoicesAmount)} kr</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Förfallna</span>
                <span className={`text-sm font-medium ${data.overdueInvoicesAmount > 0 ? "text-destructive" : "text-foreground"}`}>
                  {fmt(data.overdueInvoicesAmount)} kr
                </span>
              </div>
            </div>

            {data.overdueInvoicesAmount > 0 && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-xs font-medium text-destructive">
                    {fmt(data.overdueInvoicesAmount)} kr förfallet
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Skicka påminnelser för att förbättra kassaflödet
                </p>
              </div>
            )}

            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Förväntat inflöde</span>
                <span className="text-sm font-bold text-[#085041]">
                  +{fmt(data.pendingInvoicesAmount)} kr
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Saldo efter betalning: {fmt(data.totalBalance + data.pendingInvoicesAmount)} kr
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
