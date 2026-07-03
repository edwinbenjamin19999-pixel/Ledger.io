import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight, ArrowRight,
  Wallet, BarChart3, Users, FileText, Clock, ExternalLink, Settings2,
  AlertTriangle, Plus, Upload, Play, Sparkles, Shield, Activity, Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, LineChart, Line, PieChart, Pie, Cell, Tooltip, ReferenceLine } from "recharts";
import { ChartGradients, AXIS_TICK, GRID_PROPS, BAR_ANIMATION, LINE_ANIMATION, TOOLTIP_CURSOR } from "@/components/charts/ChartGradients";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CustomLegend } from "@/components/charts/CustomLegend";
import { useDashboardConfig } from "@/hooks/useDashboardConfig";
import { ALL_KPIS, ActiveTile, ActiveWidget, DashboardGeneralSettings, LayoutItem } from "./kpi-definitions";
import { getWidgetSize, WidgetSize } from "./kpi-definitions";
import { DASHBOARD_SETTINGS_EVENT, loadDashboardSettings } from "./dashboard-settings";
import { BusinessPulseWidget } from "./BusinessPulseWidget";
import { formatSEK, formatNumber, formatPercent } from "@/lib/formatNumber";
import { useDashboardFinancials, DashboardPeriod } from "@/hooks/useDashboardFinancials";


interface DashboardCockpitProps {
  companyId: string;
  /**
   * Optional lifted dashboard config. When provided, Cockpit uses these instead
   * of calling its own useDashboardConfig hook. This guarantees that the parent
   * (Dashboard) and the Cockpit share a single state instance, so saves made
   * via the Anpassa-modal propagate immediately to the KPI grid.
   */
  tiles?: ActiveTile[];
  widgets?: ActiveWidget[];
  general?: DashboardGeneralSettings;
  layout?: LayoutItem[];
  /**
   * Optional controlled period. When provided, the internal period selector is
   * hidden and the parent (Dashboard toolbar) drives the period instead.
   */
  period?: string;
  onPeriodChange?: (value: string) => void;
}

const fmt = (n: number) => new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n);

export const DashboardCockpit = ({
  companyId,
  tiles: tilesProp,
  widgets: widgetsProp,
  general: generalProp,
  layout: layoutProp,
  period: periodProp,
  onPeriodChange,
}: DashboardCockpitProps) => {
  const navigate = useNavigate();
  // Fallback: if no props supplied, fetch our own config (legacy callers).
  const fallback = useDashboardConfig(tilesProp ? undefined : companyId);
  const tiles = tilesProp ?? fallback.tiles;
  const widgets = widgetsProp ?? fallback.widgets;
  const general = generalProp ?? fallback.general;
  const layout = layoutProp ?? fallback.layout;
  const configLoading = tilesProp ? false : fallback.loading;
  const isPeriodControlled = periodProp !== undefined;
  const [periodInitialized, setPeriodInitialized] = useState(false);
  const [internalPeriod, setInternalPeriod] = useState("month");
  const period = isPeriodControlled ? (periodProp as string) : internalPeriod;
  const setPeriod = (val: string) => {
    if (isPeriodControlled) {
      onPeriodChange?.(val);
    } else {
      setInternalPeriod(val);
    }
  };
  const [dashboardSettings, setDashboardSettings] = useState(loadDashboardSettings);

  // Sync period with saved default on first load
  useEffect(() => { if (!configLoading && !periodInitialized) { const saved = dashboardSettings.defaultPeriod || general.defaultPeriod || 'month';
      setPeriod(saved);
      setPeriodInitialized(true);
    }
  }, [configLoading, periodInitialized, general.defaultPeriod, dashboardSettings.defaultPeriod]);

  useEffect(() => {
    const syncSettings = () => setDashboardSettings(loadDashboardSettings());
    window.addEventListener(DASHBOARD_SETTINGS_EVENT, syncSettings);
    window.addEventListener("storage", syncSettings);
    return () => {
      window.removeEventListener(DASHBOARD_SETTINGS_EVENT, syncSettings);
      window.removeEventListener("storage", syncSettings);
    };
  }, []);

  useEffect(() => {
    if (isPeriodControlled) return;
    setPeriod(dashboardSettings.defaultPeriod);
  }, [dashboardSettings.defaultPeriod, isPeriodControlled]);
  const [kpis, setKpis] = useState({ revenue: 0, costs: 0, result: 0, cash: 0, margin: 0, prevRevenue: 0, prevCosts: 0, prevResult: 0, prevCash: 0, ar: 0, prevAr: 0, ap: 0, prevAp: 0, dso: 0, prevDso: 0 });
  const [sparklines, setSparklines] = useState<{ revenue: number[]; costs: number[]; result: number[]; cash: number[]; margin: number[]; ar: number[]; ap: number[]; dso: number[] }>({ revenue: [], costs: [], result: [], cash: [], margin: [], ar: [], ap: [], dso: [] });
  const [arData, setArData] = useState({ total: 0, overdue: 0, overdueCount: 0, recentOverdue: []  });
  const [apData, setApData] = useState({ total: 0, dueSoon: 0, recentDue: []  });
  const [topCustomers, setTopCustomers] = useState<any[]>([]);
  const [topSuppliers, setTopSuppliers] = useState<any[]>([]);
  const [cashFlowData, setCashFlowData] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [monthlyResults, setMonthlyResults] = useState<any[]>([]);
  const [reconciliationLog, setReconciliationLog] = useState<any[]>([]);
  const [expenseAnomalies, setExpenseAnomalies] = useState<any[]>([]);
  const periodLabel = period === "month" ? "MTD" : period === "year" ? "YTD" : period.toUpperCase();

  // Single KPI source shared with the upper KPI strip. No client-side
  // journal-line KPI math is allowed here.
  const { data: fin } = useDashboardFinancials(
    companyId,
    period as DashboardPeriod,
  );

  // Mirror RPC values into the existing kpis state shape so downstream render
  // code stays unchanged while dashboard_financials remains the only source.
  useEffect(() => {
    if (!fin) return;
    const revenue = Number(fin.omsattning);
    const cogs = Number(fin.ksv);
    const opex = Number(fin.ovriga);
    const costs = cogs + opex;
    const result = Number(fin.resultat);
    setKpis(prev => ({
      ...prev,
      revenue,
      costs,
      result,
      margin: fin?.bruttomarginal == null ? Number.NaN : Number(fin.bruttomarginal),
      cash: Number(fin.likvida),
      prevRevenue: 0,
      prevCosts: 0,
      prevResult: 0,
      prevCash: Number(fin.likvida),
    }));

    setSparklines({
      revenue: [],
      costs: [],
      result: [],
      cash: [],
      margin: fin.bruttomarginal == null ? [] : [Number(fin.bruttomarginal)],
      ar: [],
      ap: [],
      dso: [],
    });
  }, [fin]);


  useEffect(() => { loadAll();
  }, [companyId, period]);

  useEffect(() => {
    if (!dashboardSettings.autoRefresh) return;
    const interval = window.setInterval(loadAll, 300000);
    return () => window.clearInterval(interval);
  }, [companyId, period, dashboardSettings.autoRefresh]);

  const getPeriodDates = () => { const now = new Date();
    const year = now.getFullYear();
    let start: Date, end: Date, prevStart: Date, prevEnd: Date;

    if (period === "q1") { start = new Date(year, 0, 1);
      end = new Date(year, 2, 31);
      prevStart = new Date(year - 1, 9, 1);
      prevEnd = new Date(year - 1, 11, 31);
    } else if (period === "q2") { start = new Date(year, 3, 1);
      end = new Date(year, 5, 30);
      prevStart = new Date(year, 0, 1);
      prevEnd = new Date(year, 2, 31);
    } else if (period === "q3") { start = new Date(year, 6, 1);
      end = new Date(year, 8, 30);
      prevStart = new Date(year, 3, 1);
      prevEnd = new Date(year, 5, 30);
    } else if (period === "q4") { start = new Date(year, 9, 1);
      end = new Date(year, 11, 31);
      prevStart = new Date(year, 6, 1);
      prevEnd = new Date(year, 8, 30);
    } else if (period === "year") { start = new Date(year, 0, 1);
      end = new Date(year, 11, 31);
      prevStart = new Date(year - 1, 0, 1);
      prevEnd = new Date(year - 1, 11, 31);
    } else { // month
      start = new Date(year, now.getMonth(), 1);
      end = new Date(year, now.getMonth() + 1, 0);
      prevStart = new Date(year, now.getMonth() - 1, 1);
      prevEnd = new Date(year, now.getMonth(), 0);
    }
    return { start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
      prevStart: prevStart.toISOString().split("T")[0],
      prevEnd: prevEnd.toISOString().split("T")[0],
    };
  };

  const loadAll = async () => { const dates = getPeriodDates();
    await Promise.all([
      loadInvoiceMetrics(dates),
      loadAR(),
      loadAP(),
      loadTopCustomers(dates),
      loadTopSuppliers(dates),
      loadRecentActivity(),
      loadReconciliationLog(),
    ]);
    // Load sparklines separately so they don't block initial render
    loadSparklines();
  };

  const loadSparklines = async () => {
    // No-op: headline KPI sparklines were removed with the old client-side
    // journal-line KPI calculations.
  };

  const loadInvoiceMetrics = async (dates: any) => {
    // P&L and cash are sourced only from dashboard_financials. This function
    // only computes DSO from invoice payments, since that needs paid_at.
    try {
      const { data: paidInvoices } = await supabase
        .from("invoices")
        .select("invoice_date, paid_at")
        .eq("company_id", companyId)
        .eq("status", "paid")
        .not("paid_at", "is", null);

      let dso = 0;
      let prevDso = 0;
      if (paidInvoices && paidInvoices.length > 0) {
        const dsoValues = paidInvoices.map((inv: any) => {
          const issued = new Date(inv.invoice_date).getTime();
          const paid = new Date(inv.paid_at).getTime();
          return Math.max(0, Math.ceil((paid - issued) / 86400000));
        });
        dso = Math.round(dsoValues.reduce((a: number, b: number) => a + b, 0) / dsoValues.length);

        const periodStart = new Date(dates.start);
        const prevPaid = paidInvoices.filter((inv: any) => new Date(inv.paid_at) < periodStart);
        if (prevPaid.length > 0) {
          const prevValues = prevPaid.map((inv: any) => {
            const issued = new Date(inv.invoice_date).getTime();
            const paid = new Date(inv.paid_at).getTime();
            return Math.max(0, Math.ceil((paid - issued) / 86400000));
          });
          prevDso = Math.round(prevValues.reduce((a: number, b: number) => a + b, 0) / prevValues.length);
        }
      }
      dso = Math.min(dso, 365);
      prevDso = Math.min(prevDso, 365);
      setKpis(prev => ({ ...prev, dso, prevDso }));
    } catch (e) {
      console.warn("[DSO] Failed to calculate from invoices", e);
    }
  };


  const loadAR = async () => { const today = new Date().toISOString().split("T")[0];
    const { data: openInvoices } = await supabase
      .from("invoices")
      .select("id, counterparty_name, total_amount, due_date, status")
      .eq("company_id", companyId)
      .eq("invoice_type", "outgoing")
      .in("status", ["sent", "overdue"])
      .order("due_date")
      .limit(100);

    const total = (openInvoices || []).reduce((s, i) => s + i.total_amount, 0);
    const overdue = (openInvoices || []).filter((i) => i.due_date < today);
    setArData({ total,
      overdue: overdue.reduce((s, i) => s + i.total_amount, 0),
      overdueCount: overdue.length,
      recentOverdue: overdue.slice(0, 3).map((i) => ({ name: i.counterparty_name,
        amount: i.total_amount,
        days: Math.ceil((Date.now() - new Date(i.due_date).getTime()) / 86400000),
      })),
    });
  };

  const loadAP = async () => { const today = new Date().toISOString().split("T")[0];
    const sevenDays = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
    const { data: openAP } = await supabase
      .from("invoices")
      .select("id, counterparty_name, total_amount, due_date, status")
      .eq("company_id", companyId)
      .eq("invoice_type", "incoming")
      .in("status", ["draft", "sent", "attested"])
      .order("due_date")
      .limit(100);

    const total = (openAP || []).reduce((s, i) => s + i.total_amount, 0);
    const dueSoon = (openAP || []).filter((i) => i.due_date <= sevenDays);
    setApData({ total,
      dueSoon: dueSoon.reduce((s, i) => s + i.total_amount, 0),
      recentDue: dueSoon.slice(0, 3).map((i) => ({ name: i.counterparty_name,
        amount: i.total_amount,
        due: i.due_date,
      })),
    });
  };

  const loadTopCustomers = async (dates: any) => { const { data } = await supabase
      .from("invoices")
      .select("counterparty_name, total_amount")
      .eq("company_id", companyId)
      .eq("invoice_type", "outgoing")
      .gte("invoice_date", dates.start)
      .lte("invoice_date", dates.end)
      .in("status", ["sent", "paid"]);

    const map = new Map<string, number>();
    let grandTotal = 0;
    for (const inv of data || []) { map.set(inv.counterparty_name, (map.get(inv.counterparty_name) || 0) + inv.total_amount);
      grandTotal += inv.total_amount;
    }
    const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    setTopCustomers(sorted.map(([name, amount]) => ({ name, amount, pct: grandTotal > 0 ? (amount / grandTotal) * 100 : 0 })));
  };

  const loadTopSuppliers = async (dates: any) => { const { data } = await supabase
      .from("invoices")
      .select("counterparty_name, total_amount")
      .eq("company_id", companyId)
      .eq("invoice_type", "incoming")
      .gte("invoice_date", dates.start)
      .lte("invoice_date", dates.end);

    const map = new Map<string, number>();
    let grandTotal = 0;
    for (const inv of data || []) { map.set(inv.counterparty_name, (map.get(inv.counterparty_name) || 0) + inv.total_amount);
      grandTotal += inv.total_amount;
    }
    const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    setTopSuppliers(sorted.map(([name, amount]) => ({ name, amount, pct: grandTotal > 0 ? (amount / grandTotal) * 100 : 0 })));
  };

  const loadRecentActivity = async () => { const { data } = await supabase
      .from("journal_entries")
      .select("id, journal_number, description, entry_date, status, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(8);
    setRecentActivity(data || []);
  };

  const loadMonthlyResults = async () => {
    setMonthlyResults([]);
  };

  const loadReconciliationLog = async () => { // Load recent bank transactions with AI matching status
    const { data } = await supabase
      .from("bank_transactions")
      .select("id, description, amount, booking_date, status, ai_confidence, counterparty_name")
      .eq("company_id", companyId)
      .order("booking_date", { ascending: false })
      .limit(8);
    setReconciliationLog(data || []);
  };

  const pctChange = (cur: number, prev: number) => { if (prev === 0) return cur > 0 ? 100 : 0;
    return ((cur - prev) / Math.abs(prev)) * 100;
  };

  const DONUT_COLORS = ['#3b82f6', '#22C55E', '#F59E0B', '#8B5CF6', '#EC4899'];

  const DonutChart = ({ data, title, emptyText, showLegend = true, iconType }: { data: any[]; title: string; emptyText: string; showLegend?: boolean; iconType?: 'customer' | 'supplier' }) => { const total = data.reduce((s, d) => s + d.amount, 0);
    const chartData = data.map((d, i) => ({ ...d, fill: DONUT_COLORS[i % DONUT_COLORS.length] }));

    const CustomTooltip = ({ active, payload }: any) => { if (!active || !payload?.[0]) return null;
      const d = payload[0].payload;
      return (
        <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-xl">
          <p className="font-semibold text-foreground">{d.name}</p>
          <p className="text-muted-foreground">{fmt(d.amount)} kr ({d.pct.toFixed(1)}%)</p>
        </div>
      );
    };

    const HeaderIcon = () => {
      if (iconType === 'supplier') return (
        <div className="p-1.5 rounded-lg bg-[#F1F5F9]">
          <Users className="w-4 h-4 text-violet-600" />
        </div>
      );
      return (
        <div className="p-1.5 rounded-lg bg-[#EFF6FF]">
          <Users className="w-4 h-4 text-[#3b82f6]" />
        </div>
      );
    };

    if (data.length === 0) { return (
        <Card className="border-0 bg-card rounded-xl shadow-[var(--shadow-soft)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <HeaderIcon />
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8">
              <Users className="w-10 h-10 text-slate-200 mb-3" />
              <p className="text-sm text-slate-400">{emptyText}</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="border-0 bg-card rounded-xl shadow-[var(--shadow-soft)]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <HeaderIcon />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <div className="w-full sm:w-[45%] flex justify-center" style={{ minHeight: 160 }}>
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="amount" nameKey="name" paddingAngle={2} stroke="none">
                    {chartData.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <text x="50%" y="42%" textAnchor="middle" dominantBaseline="central" style={{ fontSize: '14px', fontWeight: 700 }} className="fill-foreground">{fmt(total)}</text>
                  <text x="50%" y="58%" textAnchor="middle" dominantBaseline="central" style={{ fontSize: '10px' }} className="fill-muted-foreground">Total</text>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full sm:w-[55%] space-y-2">
              {chartData.map((d, i) => {
                const dotSize = Math.max(6, Math.min(14, (d.pct / 100) * 20));
                return (
                  <div key={i} className="flex items-center gap-3" style={{ fontSize: '13px', lineHeight: '1.4' }}>
                    <span className="rounded-full shrink-0" style={{ backgroundColor: d.fill, width: dotSize, height: dotSize }} />
                    <span className="flex-1 truncate font-medium text-slate-700">{d.name}</span>
                    <span className="font-semibold text-slate-900 tabular-nums shrink-0">{fmt(d.amount)} kr</span>
                    <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5 shrink-0">{d.pct.toFixed(0)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Tenant-aware gradient map.
  // Brand-driven categories (revenue/cash/result) use white-label CSS variables.
  // Cost semantic (red) is LOCKED — never branded — to preserve UX warning meaning.
  const KPI_GRADIENT_MAP: Record<string, string> = {
    revenue: 'bg-[image:var(--brand-grad-revenue)]',
    costs: 'bg-[image:var(--brand-grad-cost)]',
    result: 'bg-[image:var(--brand-grad-result)]',
    cash: 'bg-[image:var(--brand-grad-cash)]',
    margin: 'bg-[image:var(--brand-grad-result)]',
    ar: 'bg-[image:var(--brand-grad-cash)]',
    ap: 'bg-[image:var(--brand-grad-cost)]',
    dso: 'bg-[image:var(--brand-grad-revenue)]',
    operating_margin: 'bg-[image:var(--brand-grad-result)]',
    ebitda: 'bg-[image:var(--brand-grad-result)]',
    budget_variance: 'bg-[image:var(--brand-grad-result)]',
    current_ratio: 'bg-[image:var(--brand-grad-cash)]',
    quick_ratio: 'bg-[image:var(--brand-grad-cash)]',
    period_cashflow: 'bg-[image:var(--brand-grad-cash)]',
    ar_overdue: 'bg-[image:var(--brand-grad-cost)]',
    ap_overdue: 'bg-[image:var(--brand-grad-cost)]',
    dpo: 'bg-[image:var(--brand-grad-revenue)]',
    payroll: 'bg-[image:var(--brand-grad-cost)]',
    vat_balance: 'bg-[image:var(--brand-grad-result)]',
    automation_pct: 'bg-[image:var(--brand-grad-revenue)]',
    verification_count: 'bg-[image:var(--brand-grad-cash)]',
  };

  // Data-driven sparkline — neutral, brand-tinted
  const MiniSparkline = ({ data, className = "", stroke = "#94A3B8" }: { data?: number[]; className?: string; stroke?: string }) => {
    const width = 80;
    const height = 28;
    const pts = (data && data.length >= 2) ? data : [1, 1.05, 1.02, 1.1, 1.08, 1.15, 1.12];
    const min = Math.min(...pts);
    const max = Math.max(...pts);
    const range = max - min || 1;
    const stepX = width / (pts.length - 1);
    const coords = pts.map((v, i) => [i * stepX, height - 2 - ((v - min) / range) * (height - 4)] as [number, number]);
    let d = `M ${coords[0][0]},${coords[0][1]}`;
    for (let i = 1; i < coords.length; i++) {
      const [x0, y0] = coords[i - 1];
      const [x1, y1] = coords[i];
      const cx = (x0 + x1) / 2;
      d += ` Q ${cx},${y0} ${cx},${(y0 + y1) / 2} T ${x1},${y1}`;
    }
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={`${className} ${dashboardSettings.animations ? 'animate-fade-in' : ''}`}>
        <path d={d} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  const KPICard = ({ label, value, prevValue, prefix, suffix, icon: Icon, onClick, invertChange, accentColor, sparkData, warningThreshold, warningType, warningDirection, widgetSize = 'medium', isPrimary = false, kpiId }: any) => { const change = pctChange(value, prevValue);
    const effectiveChange = invertChange ? -change : change;
    const isPositive = effectiveChange >= 0;

    // Warning check
    let hasWarning = false;
    let warningTooltip = '';
    if (warningThreshold !== undefined && warningThreshold !== null) { const dir = warningDirection || 'below';
      const triggered = dir === 'below' ? value < warningThreshold : value > warningThreshold;
      if (triggered) { hasWarning = true;
        const dirLabel = dir === 'below' ? 'under' : 'över';
        warningTooltip = `⚠ Värdet är ${dirLabel} din inställda tröskel (${fmt(warningThreshold)}${suffix})`;
      }
    }

    const sparkVals = sparkData && sparkData.length ? sparkData : undefined;
    const isFlat = !Number.isFinite(effectiveChange) || effectiveChange === 0;
    const isHero = kpiId === 'cash';
    const sparkStroke = isHero
      ? "#3b82f6"
      : isFlat
        ? "#94A3B8"
        : (isPositive ? "#10B981" : "#EF4444");

    const compactPadding = dashboardSettings.compactMode ? "px-[16px] py-[14px]" : "px-[22px] py-[20px]";
    const cardClass = isHero
      ? `kpi-tile group isolate relative w-full min-w-0 max-w-full overflow-hidden rounded-[14px] cursor-pointer transition-colors duration-[120ms] ${compactPadding}`
      : `kpi-tile group isolate relative w-full min-w-0 max-w-full overflow-hidden bg-white border border-black/[0.08] rounded-[14px] cursor-pointer hover:border-black/15 transition-colors duration-[120ms] ${compactPadding}`;

    // Category color for subtle top border + whisper gradient
    const getCategoryColor = (id: string): string => {
      const colors: Record<string, string> = {
        'intakter': '#2DD4BF',
        'kostnader': '#2DD4BF',
        'resultat': '#2DD4BF',
        'bruttomarginal': '#2DD4BF',
        'rorelsemarginal': '#2DD4BF',
        'ebitda': '#2DD4BF',
        'kassa': '#3b82f6',
        'likviditetsgrad': '#3b82f6',
        'kassalikviditet': '#3b82f6',
        'periodens-kassaflode': '#3b82f6',
        'kundfordringar': '#8b5cf6',
        'leverantorsskulder': '#8b5cf6',
        'forfallna': '#8b5cf6',
        'dso': '#f59e0b',
        'budgetavvikelse': '#f59e0b',
      };
      return colors[id] || '#2DD4BF';
    };
    const categoryColor = getCategoryColor(kpiId);

    const cardStyle = isHero
      ? {
          backgroundColor: "rgba(29,217,240,0.04)",
          border: "1.5px solid rgba(29,217,240,0.35)",
          borderTop: `3px solid ${categoryColor}`,
        }
      : {
          borderTop: `3px solid ${categoryColor}`,
          background: `linear-gradient(to bottom, ${categoryColor}14 0%, #ffffff 40%)`,
        };

    const heroValueColor = value < 0 ? "#EF4444" : "#0B1F2F";
    const valueClass = isHero
      ? "relative mt-2 min-w-0 max-w-full pr-1 text-[22px] font-bold leading-none tracking-[-0.03em] tabular-nums"
      : "relative mt-2 min-w-0 max-w-full pr-1 text-[22px] font-bold leading-none text-[#0B1F2F] tracking-[-0.03em] tabular-nums";

    const labelClass = "min-w-0 text-[11px] font-medium uppercase text-black/40 leading-snug break-words [overflow-wrap:anywhere]";

    const cardContent = (
      <div
        className={cardClass}
        style={{ ...cardStyle, ...(isHero ? {} : {}) }}
        onClick={onClick}
      >
        {hasWarning && (
          <div className="absolute top-2 right-2 z-10">
            <AlertTriangle size={12} strokeWidth={1.5} className="text-[#EF9F27]" />
          </div>
        )}

        {/* TOP: label only — icon buttons removed to reduce visual noise */}
        <div className="relative flex items-start justify-between gap-2">
          <span className={labelClass} style={{ letterSpacing: "1px" }}>
            {label}
          </span>
        </div>

        {/* CENTER: value */}
        <p className={valueClass} style={isHero ? { color: heroValueColor } : undefined}>
          {Number.isNaN(value)
            ? "Ej tillämpbar"
            : suffix === '%'
              ? `${prefix}${value.toFixed(1).replace('.', ',')} %`
              : `${prefix}${fmt(value)}${suffix}`}
        </p>

        {/* BOTTOM: delta + sparkline */}
        <div className="relative mt-3 flex items-end justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            {prevValue !== undefined && (() => {
              const color = isFlat ? 'rgba(0,0,0,0.4)' : (isPositive ? '#10B981' : '#EF4444');
              const Arrow = isFlat ? null : (isPositive ? TrendingUp : TrendingDown);
              const sign = isFlat ? '' : (effectiveChange >= 0 ? '+' : '−');
              const abs = isFlat ? '0' : Math.abs(effectiveChange).toFixed(1);
              return (
                <span
                  className="inline-flex items-center gap-1 text-[12px] font-medium tabular-nums whitespace-nowrap"
                  style={{ color }}
                >
                  {Arrow && <Arrow size={12} strokeWidth={2} />}
                  {sign}{abs}%
                </span>
              );
            })()}
            <span className="hidden sm:inline text-[10px] text-black/40">vs förra perioden</span>
          </div>
          <div className="hidden min-[480px]:block self-end shrink-0" style={{ height: 36 }}>
            <MiniSparkline data={sparkVals} stroke={sparkStroke} className="h-full" />
          </div>
        </div>
      </div>
    );

    if (warningTooltip) { return (
        <TooltipProvider>
          <UITooltip>
            <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
            <TooltipContent className="max-w-xs text-sm">{warningTooltip}</TooltipContent>
          </UITooltip>
        </TooltipProvider>
      );
    }

    return cardContent;
  };

  // Map KPI id to value/prevValue/sparkData
  const kpiValueMap: Record<string, { value: number; prevValue: number; sparkData: number[] }> = { revenue: { value: kpis.revenue, prevValue: kpis.prevRevenue, sparkData: sparklines.revenue },
    costs: { value: kpis.costs, prevValue: kpis.prevCosts, sparkData: sparklines.costs },
    result: { value: kpis.result, prevValue: kpis.prevResult, sparkData: sparklines.result },
    cash: { value: kpis.cash, prevValue: kpis.prevCash, sparkData: sparklines.cash },
    margin: { value: kpis.margin, prevValue: kpis.prevRevenue > 0 ? (kpis.prevResult / kpis.prevRevenue) * 100 : 0, sparkData: sparklines.margin },
    ar: { value: kpis.ar, prevValue: kpis.prevAr, sparkData: sparklines.ar },
    ap: { value: kpis.ap, prevValue: kpis.prevAp, sparkData: sparklines.ap },
    dso: { value: kpis.dso, prevValue: kpis.prevDso, sparkData: sparklines.dso },
    // Placeholders för KPIs without dedicated data yet
    operating_margin: { value: kpis.margin, prevValue: kpis.prevRevenue > 0 ? (kpis.prevResult / kpis.prevRevenue) * 100 : 0, sparkData: sparklines.margin },
    ebitda: { value: kpis.result, prevValue: kpis.prevResult, sparkData: sparklines.result },
    budget_variance: { value: 0, prevValue: 0, sparkData: [] },
    current_ratio: { value: 0, prevValue: 0, sparkData: [] },
    quick_ratio: { value: 0, prevValue: 0, sparkData: [] },
    period_cashflow: { value: kpis.cash - kpis.prevCash, prevValue: 0, sparkData: [] },
    ar_overdue: { value: arData.overdue, prevValue: 0, sparkData: [] },
    ap_overdue: { value: 0, prevValue: 0, sparkData: [] },
    dpo: { value: 0, prevValue: 0, sparkData: [] },
    payroll: { value: 0, prevValue: 0, sparkData: [] },
    vat_balance: { value: 0, prevValue: 0, sparkData: [] },
    automation_pct: { value: 0, prevValue: 0, sparkData: [] },
    verification_count: { value: 0, prevValue: 0, sparkData: [] },
  };

  const ICON_MAP: Record<string, any> = { TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight,
    Wallet, BarChart3, Users, FileText, Clock, ExternalLink,
  };

  // Compute threshold warnings from tiles
  const thresholdWarnings = useMemo(() => { const warnings: { kpiLabel: string; value: number; threshold: number; direction: 'below' | 'above'; type: 'yellow' | 'red'; suffix: string; navigateTo?: string }[] = [];
    for (const tile of tiles) { if (tile.warningThreshold === undefined || tile.warningThreshold === null) continue;
      const kpiDef = ALL_KPIS.find((k) => k.id === tile.kpiId);
      const vals = kpiValueMap[tile.kpiId];
      if (!kpiDef || !vals) continue;
      const dir = tile.warningDirection || 'below';
      const triggered = dir === 'below' ? vals.value < tile.warningThreshold : vals.value > tile.warningThreshold;
      if (triggered) { warnings.push({ kpiLabel: kpiDef.label,
          value: vals.value,
          threshold: tile.warningThreshold,
          direction: dir,
          type: tile.warningType || 'red',
          suffix: kpiDef.suffix,
          navigateTo: kpiDef.navigateTo,
        });
      }
    }
    return warnings;
  }, [tiles, kpiValueMap]);

  // Widget visibility helper
  const isWidgetVisible = (widgetId: string) => { const w = widgets.find((w) => w.widgetId === widgetId);
    return w ? w.visible : true;
  };

  const getWidgetWidth = (widgetId: string) => { const w = widgets.find((w) => w.widgetId === widgetId);
    return w?.width || 'full';
  };

  // Column layout
  const colCount = general.columnLayout || 4;
  const gridMinWidth = colCount === 3 ? '280px' : colCount === 5 ? '180px' : '220px';

  // Build unified render items from layout
  const activeTileIds = new Set(tiles.map(t => t.kpiId));
  const activeWidgetIds = new Set(widgets.filter(w => w.visible).map(w => w.widgetId));
  const baseUnifiedItems = (layout || []).filter(item => { if (item.type === 'kpi') return activeTileIds.has(item.id);
    if (item.type === 'widget') return activeWidgetIds.has(item.id);
    return false;
  });

  // Trust `layout.colSpan` (built by the modal from kpiTiles size 1x1/2x1/4x1).
  // Any legacy `kpiSizes` localStorage overlay is ignored to avoid stale-state drift.
  const unifiedItems = baseUnifiedItems;

  if (typeof window !== "undefined") {
    console.log("[DashboardCockpit] Rendering tiles:", tiles, "layout:", layout);
  }


  return (
    <div className="space-y-6">
      {/* Threshold warnings bar */}
      {thresholdWarnings.length > 0 && (
        <div className="rounded-lg px-4 py-2.5 bg-orange-50 dark:bg-orange-950/30 border-b-2 border-orange-500">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-orange-500" />
            <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
              {thresholdWarnings.length} troskelvarning{thresholdWarnings.length > 1 ? 'ar' : ''}
            </span>
            <span className="text-xs text-muted-foreground ml-2">
              {thresholdWarnings.map((w) => `${w.kpiLabel}: ${fmt(w.value)}${w.suffix}`).join(' · ')}
            </span>
          </div>
        </div>
      )}
      {/* Period filter — hidden when parent (Dashboard toolbar) controls period */}
      {!isPeriodControlled && (
        <div className="flex items-center justify-between">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger
              className="w-44 bg-white border-[0.5px] border-[#E2E8F0] rounded-[8px] text-[12px] font-medium text-[#0F172A] px-[12px] h-[34px]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Denna månad</SelectItem>
              <SelectItem value="q1">Q1 (jan–mar)</SelectItem>
              <SelectItem value="q2">Q2 (apr–jun)</SelectItem>
              <SelectItem value="q3">Q3 (jul–sep)</SelectItem>
              <SelectItem value="q4">Q4 (okt–dec)</SelectItem>
              <SelectItem value="year">Helår</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      {/* Config modal is rendered by the parent (Dashboard) — single instance, single source of truth. */}

      {/* ── Unified bento grid ── */}
      <div
        className={`grid grid-cols-2 ${dashboardSettings.animations ? 'dash-stagger' : ''} ${dashboardSettings.showHeaders ? '' : 'dashboard-hide-widget-headers'}`}
        style={{ ['--kpi-cols' as string]: colCount, gridAutoFlow: 'row dense', gap: '16px' }}
        id="kpi-grid"
      >
        <style>{`
          #kpi-grid {
            overflow-x: hidden;
            align-items: start;
            grid-auto-flow: row dense;
            gap: 16px;
          }
          #kpi-grid > * {
            min-width: 0;
          }
          @media (max-width: 479px) {
            #kpi-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
              gap: 10px !important;
            }
            #kpi-grid > [data-dashboard-item="kpi"] {
              grid-column: span 1 !important;
              grid-row: span 1 !important;
              overflow: hidden;
              contain: layout paint;
            }
            #kpi-grid .kpi-tile {
              min-height: 154px;
              border-radius: 1.25rem;
            }
          }
          @media (min-width: 768px) {
            #kpi-grid { grid-template-columns: repeat(var(--kpi-cols, 4), minmax(0, 1fr)) !important; }
          }
          #kpi-grid.dashboard-hide-widget-headers [data-dashboard-item="widget"] [class*="CardHeader"],
          #kpi-grid.dashboard-hide-widget-headers [data-dashboard-item="widget"] > div > div:first-child {
            display: none;
          }
        `}</style>
        {unifiedItems.map((item) => { const size = getWidgetSize(item);
          const rowSpan = item.rowSpan || 1;
          const spanCols = Math.min(item.colSpan || 1, colCount);
          if (item.type === 'kpi') { const tile = tiles.find(t => t.kpiId === item.id);
            const kpiDef = ALL_KPIS.find(k => k.id === item.id);
            if (!tile || !kpiDef) return null;
            const vals = kpiValueMap[item.id] || { value: 0, prevValue: 0, sparkData: [] };
            const IconComp = ICON_MAP[kpiDef.icon] || BarChart3;
            return (
              <div key={`kpi-${item.id}`} data-dashboard-item="kpi" className="min-w-0 overflow-hidden" style={{
                gridColumn: `span ${spanCols}`,
                ...(rowSpan === 2 ? { gridRow: 'span 2' } : {}),
              }}>
                <KPICard
                  kpiId={item.id}
                  label={`${kpiDef.label}${item.id === 'revenue' || item.id === 'costs' || item.id === 'result' ? ` (${periodLabel})` : ''}`}
                  value={vals.value}
                  prevValue={vals.prevValue}
                  prefix={kpiDef.prefix}
                  suffix={kpiDef.suffix}
                  icon={IconComp}
                  onClick={() => kpiDef.navigateTo && navigate(kpiDef.navigateTo)}
                  invertChange={kpiDef.invertChange}
                  accentColor={kpiDef.accentColor}
                   sparkData={dashboardSettings.showSparklines && size !== 'small' && tile.showSparkline ? vals.sparkData : []}
                  warningThreshold={tile.warningThreshold}
                  warningType={tile.warningType}
                  warningDirection={tile.warningDirection}
                  widgetSize={size}
                  isPrimary={['revenue', 'costs', 'result', 'cash'].includes(item.id)}
                />
              </div>
            );
          }

          if (item.type === 'widget') {
            const widgetContent = renderWidgetById(item.id, size);
            if (!widgetContent) return null;
            return (
              <div key={`widget-${item.id}`} data-dashboard-item="widget" className="min-w-0 overflow-hidden" style={{ gridColumn: `span ${spanCols}`,
                ...(rowSpan === 2 ? { gridRow: 'span 2' } : {}),
              }}>
                {widgetContent}
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );

  function renderWidgetById(widgetId: string, size: WidgetSize = 'medium') { const isLarge = size === 'large';
    const chartHeight = isLarge ? 'h-72' : 'h-52';
    const listLimit = isLarge ? 8 : 3;

    // Period chip for cashflow
    const now = new Date();
    const cfStartMonth = new Date(now.getFullYear(), now.getMonth() - (isLarge ? 5 : 2), 1);
    const cfEndMonth = now;
    const periodChip = `${cfStartMonth.toLocaleDateString('sv-SE', { month: 'short' })}–${cfEndMonth.toLocaleDateString('sv-SE', { month: 'short', year: 'numeric' })}`;

    switch (widgetId) { case 'cashflow_chart':
        return (
          <Card className={`border-0 bg-card rounded-2xl shadow-[var(--shadow-soft)] ${isLarge ? 'h-full' : ''}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[#EFF6FF]">
                    <BarChart3 className="w-4 h-4 text-[#3b82f6]" />
                  </div>
                  <CardTitle className="text-base font-semibold text-slate-800">{isLarge ? 'Kassaflöde – 6 månader' : 'Kassaflöde – 3 mån'}</CardTitle>
                </div>
                <span className="bg-slate-100 text-slate-600 text-xs rounded-full px-2 py-0.5">{periodChip}</span>
              </div>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#3b82f6]" /><span className="text-xs text-slate-500">Inbetalningar</span></div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" /><span className="text-xs text-slate-500">Utbetalningar</span></div>
              </div>
            </CardHeader>
            <CardContent>
              <div className={chartHeight}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={isLarge ? cashFlowData : cashFlowData.slice(-3)}>
                    <ChartGradients />
                    <defs>
                      <linearGradient id="gradInbet" x1="0" y1="1" x2="0" y2="0">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} /><stop offset="100%" stopColor="#3b82f6" />
                      </linearGradient>
                      <linearGradient id="gradUtbet" x1="0" y1="1" x2="0" y2="0">
                        <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.6} /><stop offset="100%" stopColor="#F43F5E" />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false}/>
                    <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <RechartsTooltip formatter={(v: number) => `${fmt(v)} kr`} />
                    <Bar dataKey="inbetalningar" name="Inbetalningar" fill="url(#gradInbet)" radius={[6, 6, 0, 0]} minPointSize={3} />
                    <Bar dataKey="utbetalningar" name="Utbetalningar" fill="url(#gradUtbet)" radius={[6, 6, 0, 0]} minPointSize={3} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-slate-50 rounded-b-xl border-t border-slate-100 px-6 py-4 -mx-6 -mb-6 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 sm:divide-x divide-slate-200 gap-2 sm:gap-0">
                  <div className="text-center px-3">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Kassasaldo</p>
                    <p className="font-bold text-slate-900 text-lg tabular-nums">{fmt(kpis.cash)} kr</p>
                  </div>
                  <div className="text-center px-3">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Förväntade inbet.</p>
                    <p className="font-bold text-slate-900 text-lg tabular-nums">{fmt(arData.total)} kr</p>
                  </div>
                  <div className="text-center px-3">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Lev.skulder</p>
                    <p className="font-bold text-slate-900 text-lg tabular-nums">{fmt(kpis.ap)} kr</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'monthly_result':
        return (
          <Card className="border-0 bg-card rounded-xl shadow-[var(--shadow-soft)]">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-slate-100">
                  <BarChart3 className="w-4 h-4 text-slate-600" />
                </div>
                <CardTitle className="text-base font-semibold text-slate-800">Månadsresultat – 12 mån</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyResults}>
                    <defs>
                      <linearGradient id="areaResultat" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false}/>
                    <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <RechartsTooltip formatter={(v: number) => `${fmt(v)} kr`} />
                    <Legend content={<CustomLegend />} />
                    <Line type="monotone" dataKey="intäkter" name="Intäkter" stroke="#22C55E" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="kostnader" name="Kostnader" stroke="#F97316" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="resultat" name="Resultat" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        );

      case 'top_customers':
        if (!topCustomers || topCustomers.length === 0) return null;
        return <DonutChart data={topCustomers} title="Top 5 kunder" emptyText="Inga kundfakturor denna period" showLegend={isLarge} iconType="customer" />;

      case 'top_suppliers':
        if (!topSuppliers || topSuppliers.length === 0) return null;
        return <DonutChart data={topSuppliers} title="Top 5 leverantörer" emptyText="Inga leverantörsfakturor registrerade" showLegend={isLarge} iconType="supplier" />;

      case 'business_pulse':
        return <BusinessPulseWidget companyId={companyId} size={size} />;

      case 'ai_insights':
        return (
          <Card className="rounded-2xl border border-violet-200/60 bg-card shadow-[var(--shadow-soft)]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-foreground tracking-tight flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[#F1F5F9]">
                    <Sparkles className="h-4 w-4 text-violet-500" />
                  </div>
                  AI-insikter & prognoser
                </CardTitle>
                <span className="bg-[#0F1F3D] text-white text-xs px-2 py-0.5 rounded-full font-medium">AI</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {kpis.result < 0 && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-rose-50/50 border-l-4 border-rose-500">
                  <div className="p-1.5 rounded-md bg-[#FCE8E8] flex-shrink-0">
                    <AlertTriangle className="w-4 h-4 text-[#7A1A1A]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">Negativt resultat</p>
                    <p className="text-xs text-slate-500 mt-0.5">Kostnaderna överstiger intäkterna med {fmt(Math.abs(kpis.result))} kr.</p>
                  </div>
                  <span className="text-xs font-bold bg-[#FCE8E8] text-[#7A1A1A] px-2 py-0.5 rounded-full shrink-0">Kritiskt</span>
                </div>
              )}
              {arData.overdueCount > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50/50 border-l-4 border-amber-400">
                  <div className="p-1.5 rounded-md bg-[#FAEEDA] flex-shrink-0">
                    <Clock className="w-4 h-4 text-[#7A5417]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">{arData.overdueCount} förfallna fakturor</p>
                    <p className="text-xs text-slate-500 mt-0.5">Totalt {fmt(arData.overdue)} kr.</p>
                  </div>
                  <span className="text-xs font-bold bg-[#FAEEDA] text-[#7A5417] px-2 py-0.5 rounded-full shrink-0">{arData.overdueCount} st</span>
                </div>
              )}
              {kpis.cash > 0 && kpis.result >= 0 && arData.overdueCount === 0 && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50/50 border-l-4 border-emerald-400">
                  <div className="p-1.5 rounded-md bg-[#E1F5EE] flex-shrink-0">
                    <TrendingUp className="w-4 h-4 text-[#085041]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">Bra ekonomisk hälsa</p>
                    <p className="text-xs text-slate-500 mt-0.5">Positivt resultat och inga förfallna fakturor.</p>
                  </div>
                </div>
              )}
              {kpis.margin < 10 && kpis.revenue > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50/50 border-l-4 border-amber-400">
                  <div className="p-1.5 rounded-md bg-[#FAEEDA] flex-shrink-0">
                    <Activity className="w-4 h-4 text-[#7A5417]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">Låg marginal ({kpis.margin.toFixed(1)}%)</p>
                    <p className="text-xs text-slate-500 mt-0.5">Marginalen ligger under 10%.</p>
                  </div>
                  <span className="text-xs font-bold bg-[#FAEEDA] text-[#7A5417] px-2 py-0.5 rounded-full shrink-0">Varning</span>
                </div>
              )}
              <button
                onClick={() => navigate("/assistant")}
                className="w-full bg-[#0F1F3D] text-white rounded-xl h-11 flex items-center justify-center gap-2 font-medium text-sm hover:from-[#3b82f6] hover:to-slate-900 transition-all duration-200 mt-2"
              >
                <Sparkles className="h-4 w-4" />Fråga AI-revisorn
              </button>
            </CardContent>
          </Card>
        );

      case 'reconciliation_log':
        if (!reconciliationLog || reconciliationLog.length === 0) return null;
        return (
          <Card className="border-0 bg-card rounded-xl shadow-[var(--shadow-soft)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-slate-100">
                  <Shield className="h-4 w-4 text-slate-600" />
                </div>
                Automatisk avstämningslogg
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reconciliationLog.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Shield className="w-12 h-12 text-slate-200 mb-3" />
                  <p className="text-sm text-slate-400 font-medium">Inga bankavstämningar att visa</p>
                  <p className="text-xs text-slate-300 mt-1">Koppla din bank för att starta automatisk avstämning</p>
                </div>
              ) : (
                <div className="space-y-1 max-h-[260px] overflow-y-auto">
                  {reconciliationLog.map((tx: any) => (
                    <div key={tx.id} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0 text-xs hover:bg-slate-50 rounded transition-colors px-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-slate-400 shrink-0">{tx.booking_date}</span>
                        <Badge variant={tx.status === 'matched' ? 'default' : tx.status === 'flagged' ? 'destructive' : 'secondary'} className="text-[9px] shrink-0">
                          {tx.status === 'matched' ? 'Avstämd' : tx.status === 'flagged' ? 'Flaggad' : tx.status === 'pending' ? 'Väntande' : tx.status}
                        </Badge>
                        <span className="truncate text-slate-600">{tx.counterparty_name || tx.description || '–'}</span>
                      </div>
                      <span className={`font-mono shrink-0 ml-2 ${tx.amount < 0 ? 'text-destructive' : 'text-slate-700'}`}>{fmt(tx.amount)} kr</span>
                    </div>
                  ))}
                </div>
              )}
              <Button variant="outline" size="sm" className="w-full mt-3 border-slate-200 hover:border-[#3b82f6] hover:text-[#3b82f6] transition-colors" onClick={() => navigate("/bank")}>
                <ExternalLink className="h-3 w-3 mr-1" />Öppna bankavstämning
              </Button>
            </CardContent>
          </Card>
        );

      case 'revenue_forecast': {
        const avg6 = monthlyResults.length > 0
          ? monthlyResults.slice(-6).reduce((s, m) => s + m.intäkter, 0) / Math.min(6, monthlyResults.length)
          : 0;
        return (
          <Card className="border-0 bg-card rounded-xl shadow-[var(--shadow-soft)]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[#EFF6FF]">
                    <TrendingUp className="h-4 w-4 text-[#3b82f6]" />
                  </div>
                  Intäktsprognos
                </CardTitle>
                <span className="bg-[#EFF6FF] text-[#3b82f6] text-xs rounded-full px-2 py-0.5 font-medium">Prognos</span>
              </div>
            </CardHeader>
            <CardContent>
              {monthlyResults.length > 0 ? (
                <>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyResults.slice(-6)}>
                        <defs>
                          <linearGradient id="gradRevForecast" x1="0" y1="1" x2="0" y2="0">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} /><stop offset="100%" stopColor="#3b82f6" />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false}/>
                        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <RechartsTooltip formatter={(v: number) => `${fmt(v)} kr`} />
                        {avg6 > 0 && (
                          <ReferenceLine y={avg6} stroke="#94A3B8" strokeDasharray="6 4" strokeWidth={1} />
                        )}
                        <Bar dataKey="intäkter" name="Intäkter" fill="url(#gradRevForecast)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="bg-slate-50 rounded-lg px-4 py-2 inline-flex items-center gap-2 mt-3">
                    <TrendingUp className="h-4 w-4 text-[#3b82f6]" />
                    <span className="font-medium text-slate-700 text-sm">Snitt 6 mån: {fmt(avg6)} kr/mån</span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-400 py-4 text-center">Ingen data ännu</p>
              )}
            </CardContent>
          </Card>
        );
      }

      case 'expense_anomalies':
        if (!expenseAnomalies || expenseAnomalies.length === 0) return null;
        return (
          <Card className="border-0 bg-card rounded-xl shadow-[var(--shadow-soft)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#FAEEDA]">
                  <AlertTriangle className="h-4 w-4 text-[#7A5417]" />
                </div>
                Kostnadsavvikelser
              </CardTitle>
            </CardHeader>
            <CardContent>
              {expenseAnomalies.length === 0 ? (
                <div className="bg-green-50/30 rounded-xl p-6 flex flex-col items-center justify-center">
                  <Shield className="w-12 h-12 text-green-200 mb-3" />
                  <p className="text-sm text-slate-500 font-medium">Inga avvikelser detekterade</p>
                  <p className="text-xs text-slate-300 mt-1">AI-agenten övervakar dina kostnader i realtid</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {expenseAnomalies.map((a, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-amber-50/50 border-l-4 border-amber-400 text-sm">
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{a.account} {a.name}</p>
                        <p className="text-xs text-slate-500">Snitt: {fmt(a.avg)} kr → Max: {fmt(a.amount)} kr</p>
                      </div>
                      <span className="text-xs font-bold bg-[#FAEEDA] text-[#7A5417] px-2 py-0.5 rounded-full">+{a.deviation}%</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 'activity_feed':
        return (
          <Card className={`border-0 bg-card rounded-2xl shadow-[var(--shadow-soft)] ${isLarge ? 'h-full' : ''}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="p-2 rounded-lg bg-slate-100">
                  <Clock className="h-4 w-4 text-slate-600" />
                </div>
                <span className="font-semibold text-slate-800">Senaste aktivitet</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="rounded-2xl bg-slate-50 p-3 mb-3">
                    <FileText className="w-12 h-12 text-slate-200" />
                  </div>
                  <p className="text-sm text-slate-400 font-medium">Ingen aktivitet ännu</p>
                </div>
              ) : (
                <>
                  <div className={`${isLarge ? '' : 'max-h-[260px] overflow-y-auto'}`}>
                    {recentActivity.slice(0, isLarge ? 8 : 5).map((entry: any) => {
                      const jn = entry.journal_number;
                      const desc = entry.description || '';
                      const primaryText = jn ? `Faktura INV-${jn}` : `Verifikat #${String(entry.id).slice(-6)}`;
                      const secondaryText = desc || null;
                      return (
                        <div key={entry.id} className="flex items-center gap-3 min-h-[52px] border-b border-slate-50 last:border-0 cursor-pointer hover:bg-slate-50 rounded-lg px-2 py-2 transition-colors" onClick={() => navigate("/verifications")}>
                          <div className="p-2 rounded-lg bg-slate-100 shrink-0">
                            <FileText className="h-4 w-4 text-slate-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-800 text-sm truncate">{primaryText}</p>
                            {secondaryText && (
                              <p className="text-xs text-slate-400 truncate">{secondaryText}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                              entry.status === 'approved'
                                ? 'bg-[#E1F5EE] text-[#085041]'
                                : entry.status === 'draft'
                                  ? 'bg-slate-100 text-slate-600'
                                  : 'bg-[#FAEEDA] text-[#7A5417]'
                            }`}>
                              {entry.status === 'approved' ? 'Godkänd' : entry.status === 'draft' ? 'Utkast' : entry.status}
                            </span>
                            <span className="text-xs text-slate-400">{entry.entry_date}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button onClick={() => navigate("/verifications")} className="text-sm text-[#3b82f6] font-medium hover:text-[#3b82f6] flex items-center gap-1 mt-3 transition-colors group">
                    Visa alla <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </button>
                </>
              )}
            </CardContent>
          </Card>
        );

      case 'quick_actions':
        return (
          <Card className="border-0 bg-card rounded-xl shadow-[var(--shadow-soft)]">
            <CardHeader className="pb-2"><CardTitle className="text-base">Snabbåtgärder</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Button variant="outline" size="sm" className="h-10 text-sm gap-1.5" onClick={() => navigate("/invoices?action=new")}><Plus className="h-3.5 w-3.5" /> Ny faktura</Button>
                <Button variant="outline" size="sm" className="h-10 text-sm gap-1.5" onClick={() => navigate("/bookkeep")}><FileText className="h-3.5 w-3.5" /> Ny verifikation</Button>
                <Button variant="outline" size="sm" className="h-10 text-sm gap-1.5" onClick={() => navigate("/bookkeep")}><Upload className="h-3.5 w-3.5" /> Ladda upp kvitto</Button>
                <Button variant="outline" size="sm" className="h-10 text-sm gap-1.5" onClick={() => navigate("/hr")}><Play className="h-3.5 w-3.5" /> Kör lön</Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'overdue_invoices':
        return (
          <Card className="border-0 bg-card rounded-xl shadow-[var(--shadow-soft)]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[#FCE8E8]">
                    <AlertTriangle className="h-4 w-4 text-[#7A1A1A]" />
                  </div>
                  Förfallna fakturor
                </CardTitle>
                {arData.overdueCount > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-bold">{arData.overdueCount} st</span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1">Totalt utestående</p>
                <p className="font-bold text-slate-900 text-xl tabular-nums">{fmt(arData.total)} kr</p>
                {arData.overdueCount > 0 && (
                  <p className="text-sm text-[#7A1A1A] font-bold mt-1">Varav förfallet: {fmt(arData.overdue)} kr ({arData.overdueCount} st)</p>
                )}
              </div>
              {arData.recentOverdue.length > 0 && (
                <div className="space-y-1">
                  {arData.recentOverdue.map((item, i) => {
                    const initials = (item.name || '??').slice(0, 2).toUpperCase();
                    return (
                      <div key={i} className="flex items-center gap-3 hover:bg-slate-50 rounded-lg px-3 py-2 transition-colors">
                        <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">{initials}</div>
                        <span className="flex-1 font-medium text-slate-700 text-sm truncate">{item.name}</span>
                        <span className="font-semibold text-slate-900 tabular-nums text-sm">{fmt(item.amount)} kr</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.days > 30 ? 'bg-[#FCE8E8] text-[#7A1A1A]' : 'bg-[#FAEEDA] text-[#7A5417]'}`}>{item.days}d</span>
                      </div>
                    );
                  })}
                </div>
              )}
              <Button variant="outline" size="sm" className="w-full border-slate-200 hover:border-[#3b82f6] hover:text-[#3b82f6] transition-colors" onClick={() => navigate("/invoices")}><ExternalLink className="h-3 w-3 mr-1" />Visa alla kundfakturor</Button>
            </CardContent>
          </Card>
        );

      case 'upcoming_deadlines':
        return (
          <Card className="border-0 bg-card rounded-xl shadow-[var(--shadow-soft)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-slate-100">
                  <Clock className="h-4 w-4 text-slate-600" />
                </div>
                Kommande deadlines
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Totala skulder</p>
                    <p className="font-bold text-slate-900 text-lg tabular-nums">{fmt(apData.total)} kr</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Förfaller inom 7d</p>
                    <p className="font-bold text-orange-600 text-lg tabular-nums">{fmt(apData.dueSoon)} kr</p>
                  </div>
                </div>
              </div>
              {apData.recentDue.length > 0 && (
                <div className="space-y-1">
                  {apData.recentDue.map((item, i) => (
                    <div key={i} className="flex items-center justify-between hover:bg-slate-50 rounded-lg px-3 py-2 transition-colors text-sm">
                      <span className="truncate font-medium text-slate-700">{item.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-semibold text-slate-900 tabular-nums">{fmt(item.amount)} kr</span>
                        <span className="text-[10px] text-slate-400">{item.due}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Button variant="outline" size="sm" className="w-full border-slate-200 hover:border-[#3b82f6] hover:text-[#3b82f6] transition-colors" onClick={() => navigate("/invoices?tab=incoming")}><ExternalLink className="h-3 w-3 mr-1" />Visa alla leverantörsfakturor</Button>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  }
};
