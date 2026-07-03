import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  FileText, Users, Receipt, ArrowRight, Loader2, AlertTriangle,
  Percent, ShoppingCart, Wallet,
  CheckCircle, AlertCircle, BarChart3
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line
} from "recharts";
import { ChartGradients, AXIS_TICK, GRID_PROPS, TOOLTIP_CURSOR } from "@/components/charts/ChartGradients";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { format, subMonths, startOfMonth, endOfMonth, differenceInDays, startOfQuarter, startOfYear } from "date-fns";
import { sv } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface FinancialCommandProps { companyId: string;
}

interface MonthlyData { month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

interface KPIData { revenue: number;
  revenuePrev: number;
  revenueChange: number;
  expenses: number;
  expensesPrev: number;
  expensesChange: number;
  profit: number;
  profitPrev: number;
  profitChange: number;
  cashBalance: number;
  cashChange: number;
  margin: number;
  marginPrev: number;
  accountsReceivable: number;
  accountsPayable: number;
  overdueReceivable: number;
  overduePayable: number;
  upcomingReceivable: number;
  upcomingPayable: number;
  monthlyTrend: MonthlyData[];
  topCustomers: { name: string; amount: number; percentage: number }[];
  topSuppliers: { name: string; amount: number; percentage: number }[];
  verificationCount: number;
  pendingCount: number;
  unmatchedBankTx: number;
  vatDueDate: string | null;
  vatAmount: number;
  salesMTD: number;
  salesQTD: number;
  salesYTD: number;
  salesMTDPrev: number;
}

export const FinancialCommandCenter = ({ companyId }: FinancialCommandProps) => {
  const [data, setData] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"mom" | "qoq" | "yoy">("mom");
  const [salesView, setSalesView] = useState<"mtd" | "qtd" | "ytd">("mtd");
  const navigate = useNavigate();

  useEffect(() => { loadData();
  }, [companyId, period]);

  const loadData = async () => { try { const now = new Date();
      const currentStart = startOfMonth(now);
      const currentEnd = endOfMonth(now);
      const ytdStart = startOfYear(now);
      
      let prevStart: Date, prevEnd: Date;
      if (period === "mom") { prevStart = startOfMonth(subMonths(now, 1));
        prevEnd = endOfMonth(subMonths(now, 1));
      } else if (period === "qoq") { prevStart = startOfMonth(subMonths(now, 3));
        prevEnd = endOfMonth(subMonths(now, 3));
      } else { prevStart = startOfMonth(subMonths(now, 12));
        prevEnd = endOfMonth(subMonths(now, 12));
      }

      const qStart = format(startOfQuarter(now), "yyyy-MM-dd");
      const yStart = format(ytdStart, "yyyy-MM-dd");
      const prevMonthStart = format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd");
      const prevMonthEnd = format(endOfMonth(subMonths(now, 1)), "yyyy-MM-dd");

      const [
        currentLinesRes, prevLinesRes, cashRes, arRes, apRes,
        overdueArRes, overdueApRes, monthlyRes, topCustRes, topSuppRes,
        verCountRes, pendingRes, unmatchedRes,
        salesQTDRes, salesYTDRes, salesPrevMRes, ytdLinesRes,
        bookedApRes, bookedArRes
      ] = await Promise.all([
        supabase.from("journal_entry_lines")
          .select("debit, credit, chart_of_accounts!inner(account_number, account_type), journal_entries!inner(company_id, status, entry_date)")
          .eq("journal_entries.company_id", companyId)
          .eq("journal_entries.status", "approved")
          .gte("journal_entries.entry_date", format(currentStart, "yyyy-MM-dd"))
          .lte("journal_entries.entry_date", format(currentEnd, "yyyy-MM-dd")),
        supabase.from("journal_entry_lines")
          .select("debit, credit, chart_of_accounts!inner(account_number, account_type), journal_entries!inner(company_id, status, entry_date)")
          .eq("journal_entries.company_id", companyId)
          .eq("journal_entries.status", "approved")
          .gte("journal_entries.entry_date", format(prevStart, "yyyy-MM-dd"))
          .lte("journal_entries.entry_date", format(prevEnd, "yyyy-MM-dd")),
        supabase.from("journal_entry_lines")
          .select("debit, credit, chart_of_accounts!inner(account_number), journal_entries!inner(company_id, status)")
          .eq("journal_entries.company_id", companyId)
          .eq("journal_entries.status", "approved")
          .like("chart_of_accounts.account_number", "19%"),
        supabase.from("invoices")
          .select("total_amount, due_date")
          .eq("company_id", companyId)
          .eq("invoice_direction", "outgoing")
          .in("status", ["sent"]),
        supabase.from("invoices")
          .select("total_amount, due_date")
          .eq("company_id", companyId)
          .eq("invoice_direction", "incoming")
          .in("status", ["sent", "draft"]),
        supabase.from("invoices")
          .select("total_amount")
          .eq("company_id", companyId)
          .eq("invoice_direction", "outgoing")
          .eq("status", "overdue"),
        supabase.from("invoices")
          .select("total_amount")
          .eq("company_id", companyId)
          .eq("invoice_direction", "incoming")
          .eq("status", "overdue"),
        supabase.from("journal_entry_lines")
          .select("debit, credit, journal_entries!inner(entry_date, status, company_id), chart_of_accounts!inner(account_number)")
          .eq("journal_entries.company_id", companyId)
          .eq("journal_entries.status", "approved")
          .gte("journal_entries.entry_date", format(subMonths(now, 11), "yyyy-MM-dd")),
        supabase.from("invoices")
          .select("counterparty_name, total_amount")
          .eq("company_id", companyId)
          .eq("invoice_direction", "outgoing")
          .gte("created_at", format(subMonths(now, 12), "yyyy-MM-dd"))
          .order("total_amount", { ascending: false })
          .limit(50),
        supabase.from("invoices")
          .select("counterparty_name, total_amount")
          .eq("company_id", companyId)
          .eq("invoice_direction", "incoming")
          .gte("created_at", format(subMonths(now, 12), "yyyy-MM-dd"))
          .order("total_amount", { ascending: false })
          .limit(50),
        supabase.from("journal_entries")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .eq("status", "approved")
          .gte("entry_date", format(currentStart, "yyyy-MM-dd")),
        supabase.from("journal_entries")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .eq("status", "draft"),
        supabase.from("bank_transactions")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .eq("status", "pending"),
        // Sales QTD
        supabase.from("invoices")
          .select("total_amount")
          .eq("company_id", companyId)
          .eq("invoice_direction", "outgoing")
          .neq("status", "cancelled")
          .gte("invoice_date", qStart),
        // Sales YTD
        supabase.from("invoices")
          .select("total_amount")
          .eq("company_id", companyId)
          .eq("invoice_direction", "outgoing")
          .neq("status", "cancelled")
          .gte("invoice_date", yStart),
        // Sales prev month
        supabase.from("invoices")
          .select("total_amount")
          .eq("company_id", companyId)
          .eq("invoice_direction", "outgoing")
          .neq("status", "cancelled")
          .gte("invoice_date", prevMonthStart)
          .lte("invoice_date", prevMonthEnd),
        // YTD lines för fallback when current month is empty
        supabase.from("journal_entry_lines")
          .select("debit, credit, chart_of_accounts!inner(account_number, account_type), journal_entries!inner(company_id, status, entry_date)")
          .eq("journal_entries.company_id", companyId)
          .eq("journal_entries.status", "approved")
          .gte("journal_entries.entry_date", yStart),
        // Booked AP balance (account 24xx) — single source of truth
        supabase.from("journal_entry_lines")
          .select("debit, credit, chart_of_accounts!inner(account_number), journal_entries!inner(company_id, status, entry_date)")
          .eq("journal_entries.company_id", companyId)
          .in("journal_entries.status", ["approved", "posted"])
          .like("chart_of_accounts.account_number", "24%"),
        // Booked AR balance (account 15xx) — single source of truth
        supabase.from("journal_entry_lines")
          .select("debit, credit, chart_of_accounts!inner(account_number), journal_entries!inner(company_id, status, entry_date)")
          .eq("journal_entries.company_id", companyId)
          .in("journal_entries.status", ["approved", "posted"])
          .like("chart_of_accounts.account_number", "15%"),
      ]);

      const calcPeriod = (lines: any[]) => { let revenue = 0, expenses = 0;
        (lines || []).forEach((line: any) => { const accNum = line.chart_of_accounts?.account_number || "";
          if (accNum.startsWith("3")) { revenue += (line.credit || 0) - (line.debit || 0);
          } else if (accNum.startsWith("4") || accNum.startsWith("5") || accNum.startsWith("6") || accNum.startsWith("7")) { expenses += (line.debit || 0) - (line.credit || 0);
          }
        });
        return { revenue, expenses };
      };

      const current = calcPeriod(currentLinesRes.data || []);
      const prev = calcPeriod(prevLinesRes.data || []);
      const ytd = calcPeriod(ytdLinesRes.data || []);
      const pctChange = (curr: number, p: number) => { if (p === 0 && curr === 0) return 0; // 0→0 = no change
        if (p === 0) return curr > 0 ? 100 : -100; // 0→N = 100%
        return ((curr - p) / Math.abs(p)) * 100;
      };

      // Use YTD as fallback if current month has no revenue/expenses
      const hasCurrentData = current.revenue > 0 || current.expenses > 0;
      const displayCurrent = hasCurrentData ? current : ytd;
      const displayPrev = hasCurrentData ? prev : current; // if showing YTD, prev is "current month" (which is 0)
      const isShowingYTD = !hasCurrentData && (ytd.revenue > 0 || ytd.expenses > 0);

      const cashBalance = (cashRes.data || []).reduce((sum: number, l: any) => sum + ((l.debit || 0) - (l.credit || 0)), 0);

      const är = (arRes.data || []).reduce((s: number, i: any) => s + (i.total_amount || 0), 0);
      const ap = (apRes.data || []).reduce((s: number, i: any) => s + (i.total_amount || 0), 0);
      const oar = (overdueArRes.data || []).reduce((s: number, i: any) => s + (i.total_amount || 0), 0);
      const oap = (overdueApRes.data || []).reduce((s: number, i: any) => s + (i.total_amount || 0), 0);

      // Booked balances from ledger (24xx liability, 15xx asset) — single source of truth
      const bookedAP = (bookedApRes.data || []).reduce(
        (s: number, l: any) => s + ((l.credit || 0) - (l.debit || 0)),
        0
      );
      const bookedAR = (bookedArRes.data || []).reduce(
        (s: number, l: any) => s + ((l.debit || 0) - (l.credit || 0)),
        0
      );
      // Prefer booked ledger balance when it exists; fall back to open invoice totals
      const accountsPayable = bookedAP > 0 ? bookedAP : (ap + oap);
      const accountsReceivable = bookedAR > 0 ? bookedAR : (är + oar);

      // Upcoming AR/AP (due within 7 days)
      const in7days = format(new Date(now.getTime() + 7 * 86400000), "yyyy-MM-dd");
      const todayStr = format(now, "yyyy-MM-dd");
      const upcomingAR = (arRes.data || []).filter((i: any) => i.due_date && i.due_date >= todayStr && i.due_date <= in7days).reduce((s: number, i: any) => s + (i.total_amount || 0), 0);
      const upcomingAP = (apRes.data || []).filter((i: any) => i.due_date && i.due_date >= todayStr && i.due_date <= in7days).reduce((s: number, i: any) => s + (i.total_amount || 0), 0);

      // Monthly trend - 12 months
      const months: MonthlyData[] = [];
      for (let m = 11; m >= 0; m--) { const monthDate = subMonths(now, m);
        const mStart = format(startOfMonth(monthDate), "yyyy-MM-dd");
        const mEnd = format(endOfMonth(monthDate), "yyyy-MM-dd");
        const monthLines = (monthlyRes.data || []).filter((l: any) => { const d = l.journal_entries?.entry_date;
          return d && d >= mStart && d <= mEnd;
        });
        const mp = calcPeriod(monthLines);
        months.push({ month: format(monthDate, "MMM yy", { locale: sv }),
          revenue: mp.revenue,
          expenses: mp.expenses,
          profit: mp.revenue - mp.expenses,
        });
      }

      const aggTop = (items: any[]) => { const map = new Map<string, number>();
        let total = 0;
        (items || []).forEach((i: any) => { const name = i.counterparty_name || "Okänd";
          const amt = i.total_amount || 0;
          map.set(name, (map.get(name) || 0) + amt);
          total += amt;
        });
        return [...map.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, amount]) => ({ name, amount, percentage: total > 0 ? (amount / total) * 100 : 0 }));
      };

      const salesMTD = current.revenue;
      const salesMTDPrev = prev.revenue;
      const salesQTD = (salesQTDRes.data || []).reduce((s: number, i: any) => s + (i.total_amount || 0), 0);
      const salesYTD = (salesYTDRes.data || []).reduce((s: number, i: any) => s + (i.total_amount || 0), 0);
      const salesPrevM = (salesPrevMRes.data || []).reduce((s: number, i: any) => s + (i.total_amount || 0), 0);

      const margin = displayCurrent.revenue > 0 ? ((displayCurrent.revenue - displayCurrent.expenses) / displayCurrent.revenue) * 100 : 0;
      const marginPrev = displayPrev.revenue > 0 ? ((displayPrev.revenue - displayPrev.expenses) / displayPrev.revenue) * 100 : 0;

      // VAT due date (approximate: 12th or 26th of next month för monthly)
      const vatDueDay = 12;
      const vatMonth = now.getMonth() + 2; // next month
      const vatYear = vatMonth > 12 ? now.getFullYear() + 1 : now.getFullYear();
      const vatDue = new Date(vatYear, (vatMonth - 1) % 12, vatDueDay);
      const daysToVat = differenceInDays(vatDue, now);

      setData({ revenue: displayCurrent.revenue,
        revenuePrev: displayPrev.revenue,
        revenueChange: isShowingYTD ? 0 : pctChange(current.revenue, prev.revenue),
        expenses: displayCurrent.expenses,
        expensesPrev: displayPrev.expenses,
        expensesChange: isShowingYTD ? 0 : pctChange(current.expenses, prev.expenses),
        profit: displayCurrent.revenue - displayCurrent.expenses,
        profitPrev: displayPrev.revenue - displayPrev.expenses,
        profitChange: isShowingYTD ? 0 : pctChange(current.revenue - current.expenses, prev.revenue - prev.expenses),
        cashBalance,
        cashChange: 0,
        margin,
        marginPrev,
        accountsReceivable,
        accountsPayable,
        overdueReceivable: oar,
        overduePayable: oap,
        upcomingReceivable: upcomingAR,
        upcomingPayable: upcomingAP,
        monthlyTrend: months,
        topCustomers: aggTop(topCustRes.data || []),
        topSuppliers: aggTop(topSuppRes.data || []),
        verificationCount: verCountRes.count || 0,
        pendingCount: pendingRes.count || 0,
        unmatchedBankTx: unmatchedRes.count || 0,
        vatDueDate: daysToVat <= 30 ? `${daysToVat} dagar` : null,
        vatAmount: 0,
        salesMTD,
        salesQTD,
        salesYTD,
        salesMTDPrev: salesPrevM,
      });
    } catch (error) { console.error("Error loading financial data:", error);
    } finally { setLoading(false);
    }
  };

  const fmt = (n: number) => { if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(1)} M`;
    if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(0)} t`;
    return n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });
  };
  const fmtFull = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });
  const periodLabel = { mom: "MoM", qoq: "QoQ", yoy: "YoY" }[period];

  if (loading) { return (
      <div className="space-y-[16px]">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-[8px]">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] p-[14px] flex items-center justify-center h-[88px]">
              <Loader2 className="w-[14px] h-[14px] animate-spin text-[#94A3B8]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const kpis = [
    { label: "Intäkter", value: data.revenue, change: data.revenueChange, isPercent: false, invertChange: false },
    { label: "Kostnader", value: data.expenses, change: data.expensesChange, isPercent: false, invertChange: true },
    { label: "Resultat", value: data.profit, change: data.profitChange, isPercent: false, invertChange: false },
    { label: "Kassa", value: data.cashBalance, change: 0, isPercent: false, invertChange: false },
    { label: "Marginal", value: data.margin, change: data.margin - data.marginPrev, isPercent: true, invertChange: false },
  ];

  // Action Center items
  const actions: { text: string; severity: "high" | "medium" | "low"; path: string }[] = [];
  if (data.cashBalance < 0) actions.push({ text: `Negativ kassa: ${fmtFull(data.cashBalance)} kr — akut likviditetsbrist`, severity: "high", path: "/reports" });
  if (data.overdueReceivable > 0) actions.push({ text: `${fmtFull(data.overdueReceivable)} kr i förfallna kundfakturor`, severity: "high", path: "/invoices" });
  if (data.overduePayable > 0) actions.push({ text: `${fmtFull(data.overduePayable)} kr i förfallna leverantörsfakturor`, severity: "high", path: "/invoices" });
  if (data.unmatchedBankTx > 0) actions.push({ text: `${data.unmatchedBankTx} banktransaktioner att stämma av`, severity: "medium", path: "/bank" });
  if (data.pendingCount > 0) actions.push({ text: `${data.pendingCount} verifikationer att godkänna`, severity: "medium", path: "/verifications" });
  if (data.vatDueDate) actions.push({ text: `Moms att deklarera inom ${data.vatDueDate}`, severity: "medium", path: "/vat-reports" });
  if (data.upcomingReceivable > 0) actions.push({ text: `${fmtFull(data.upcomingReceivable)} kr att få in inom 7 dagar`, severity: "low", path: "/invoices" });
  if (data.upcomingPayable > 0) actions.push({ text: `${fmtFull(data.upcomingPayable)} kr att betala inom 7 dagar`, severity: "low", path: "/invoices" });

  // AI Insights (data-driven)
  const insights: string[] = [];
  if (data.overdueReceivable > 0) insights.push(`Förfallna kundfakturor binder ${fmtFull(data.overdueReceivable)} kr i likviditet. Överväg att skicka påminnelser.`);
  if (data.topCustomers.length > 0 && data.topCustomers[0].percentage > 30) insights.push(`${data.topCustomers[0].name} står för ${data.topCustomers[0].percentage.toFixed(0)}% av försäljningen — koncentrationsrisk.`);
  if (data.revenueChange > 10) insights.push(`Intäkterna har ökat ${data.revenueChange.toFixed(0)}% — stark tillväxt denna period.`);
  if (data.revenueChange < -10) insights.push(`Intäkterna har minskat ${Math.abs(data.revenueChange).toFixed(0)}% — analysera orsaken.`);
  if (data.margin < 10 && data.revenue > 0) insights.push(`Marginalen är låg (${data.margin.toFixed(1)}%). Granska kostnadsstruktur.`);
  if (data.expensesChange > 20) insights.push(`Kostnaderna har ökat ${data.expensesChange.toFixed(0)}% — ovanlig ökning att kontrollera.`);
  if (insights.length === 0 && data.revenue > 0) insights.push("Inga avvikelser upptäckta. Bolaget verkar följa sin normala trend.");

  const currentSales = salesView === "mtd" ? data.salesMTD : salesView === "qtd" ? data.salesQTD : data.salesYTD;
  const salesChangePercent = data.salesMTDPrev > 0 ? ((data.salesMTD - data.salesMTDPrev) / data.salesMTDPrev) * 100 : 0;

  return (
    <div className="space-y-[16px]">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-[20px] font-medium tracking-[-0.02em] text-[#0F172A]">Finansiell översikt</h2>
        <div className="flex items-center gap-[2px] bg-[#F8FAFB] border-[0.5px] border-[#E2E8F0] rounded-[8px] p-[2px]">
          {(["mom", "qoq", "yoy"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-[10px] h-[26px] text-[11px] font-medium rounded-[6px] transition-colors ${
                period === p
                  ? "bg-white text-[#1D4ED8] border-[0.5px] border-[#E2E8F0]"
                  : "text-[#475569] hover:text-[#0F172A]"
              }`}
            >
              {p === "mom" ? "Månad" : p === "qoq" ? "Kvartal" : "År"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards - 5 columns */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-[8px]">
        {kpis.map((kpi) => {
          const isPositive = kpi.invertChange ? kpi.change <= 0 : kpi.change >= 0;
          const showChange = kpi.change !== 0;
          const changeColor = isPositive ? "text-[#085041]" : "text-[#791F1F]";
          const valueText = kpi.isPercent ? `${kpi.value.toFixed(1)}%` : `${fmt(kpi.value)} kr`;
          const negativeValue = !kpi.isPercent && kpi.value < 0;
          return (
            <div
              key={kpi.label}
              className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] p-[14px] flex flex-col gap-[6px]"
            >
              <span className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">
                {kpi.label}
              </span>
              <span className={`text-[20px] font-medium tracking-[-0.02em] tabular-nums ${negativeValue ? "text-[#791F1F]" : "text-[#0F172A]"}`}>
                {valueText}
              </span>
              <span className="text-[11px] text-[#94A3B8]">
                {showChange ? (
                  <span className={changeColor}>
                    {isPositive ? "+" : ""}{kpi.change.toFixed(1)}% {periodLabel}
                  </span>
                ) : (
                  "vs förra perioden"
                )}
              </span>
            </div>
          );
        })}
      </div>

      {/* Row 2: Revenue Trend + AR/AP */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-[8px]">
        {/* Revenue Trend Chart */}
        <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] p-[14px] lg:col-span-3">
          <h3 className="text-[12px] font-medium text-[#0F172A] mb-[10px]">Resultattrend (12 månader)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.monthlyTrend} barGap={2}>
              <ChartGradients />
              <CartesianGrid {...GRID_PROPS} />
              <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false}/>
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip />} cursor={TOOLTIP_CURSOR} />
              <Bar dataKey="revenue" fill="url(#gradTeal)" radius={[4, 4, 0, 0]} name="Intäkter" minPointSize={3} />
              <Bar dataKey="expenses" fill="url(#gradRose)" radius={[4, 4, 0, 0]} name="Kostnader" minPointSize={3} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* AR/AP Panel */}
        <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] lg:col-span-2 overflow-hidden">
          <div className="px-[14px] py-[12px] border-b-[0.5px] border-[#E2E8F0] flex items-center justify-between">
            <span className="text-[12px] font-medium text-[#0F172A]">Fordringar &amp; Skulder</span>
            <button
              onClick={() => navigate("/invoices")}
              className="text-[11px] text-[#1D4ED8] hover:underline flex items-center gap-[4px]"
            >
              Visa <ArrowRight className="h-[12px] w-[12px]" />
            </button>
          </div>
          <div className="p-[14px] space-y-[10px]">
            {/* AR */}
            <div className="p-[10px] rounded-[8px] bg-[#F8FAFB] border-[0.5px] border-[#E2E8F0] space-y-[6px]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-[#475569]">Kundfordringar</span>
                <span className="text-[13px] font-medium text-[#085041] tabular-nums">{fmtFull(data.accountsReceivable)} kr</span>
              </div>
              {data.overdueReceivable > 0 && (
                <div className="flex items-center justify-between text-[11px] text-[#791F1F]">
                  <span className="flex items-center gap-[4px]"><AlertTriangle className="h-[11px] w-[11px]" />Förfallet</span>
                  <span className="font-medium tabular-nums">{fmtFull(data.overdueReceivable)} kr</span>
                </div>
              )}
              {data.upcomingReceivable > 0 && (
                <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
                  <span>Kommande 7 dagar</span>
                  <span className="tabular-nums">{fmtFull(data.upcomingReceivable)} kr</span>
                </div>
              )}
            </div>

            {/* AP */}
            <div className="p-[10px] rounded-[8px] bg-[#F8FAFB] border-[0.5px] border-[#E2E8F0] space-y-[6px]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-[#475569]">Leverantörsskulder</span>
                <span className="text-[13px] font-medium text-[#791F1F] tabular-nums">{fmtFull(data.accountsPayable)} kr</span>
              </div>
              {data.overduePayable > 0 && (
                <div className="flex items-center justify-between text-[11px] text-[#A0570F]">
                  <span className="flex items-center gap-[4px]"><AlertTriangle className="h-[11px] w-[11px]" />Förfallet</span>
                  <span className="font-medium tabular-nums">{fmtFull(data.overduePayable)} kr</span>
                </div>
              )}
              {data.upcomingPayable > 0 && (
                <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
                  <span>Att betala inom 7 dagar</span>
                  <span className="tabular-nums">{fmtFull(data.upcomingPayable)} kr</span>
                </div>
              )}
            </div>

            {/* Net */}
            <div className="pt-[8px] border-t-[0.5px] border-[#E2E8F0]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-[#475569]">Netto likviditetseffekt</span>
                <span className={`text-[13px] font-medium tabular-nums ${data.accountsReceivable - data.accountsPayable >= 0 ? "text-[#085041]" : "text-[#791F1F]"}`}>
                  {fmtFull(data.accountsReceivable - data.accountsPayable)} kr
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Top Customers + Top Suppliers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[8px]">
        {/* Top Customers */}
        <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] overflow-hidden">
          <div className="px-[14px] py-[12px] border-b-[0.5px] border-[#E2E8F0] flex items-center gap-[8px]">
            <Users className="h-[14px] w-[14px] text-[#475569]" />
            <span className="text-[12px] font-medium text-[#0F172A]">Topp kunder (12 mån)</span>
          </div>
          <div className="p-[14px]">
            {data.topCustomers.length > 0 ? (
              <div className="space-y-[10px]">
                {data.topCustomers.map((c, i) => (
                  <div key={i} className="space-y-[4px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-[#0F172A] truncate">{c.name}</span>
                      <div className="flex items-center gap-[8px] shrink-0 ml-[8px]">
                        <span className="text-[11px] text-[#94A3B8] tabular-nums">{c.percentage.toFixed(0)}%</span>
                        <span className="text-[12px] font-medium text-[#0F172A] tabular-nums">{fmt(c.amount)} kr</span>
                      </div>
                    </div>
                    <div className="h-[4px] bg-[#F1F5F9] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[#1D9E75]" style={{ width: `${Math.min(c.percentage, 100)}%` }} />
                    </div>
                    {c.percentage > 30 && (
                      <span className="text-[10px] text-[#A0570F] flex items-center gap-[4px]">
                        <AlertTriangle className="h-[10px] w-[10px]" />Koncentrationsrisk
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-[#94A3B8] py-[16px] text-center">Inga fakturor ännu</p>
            )}
          </div>
        </div>

        {/* Top Suppliers */}
        <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] overflow-hidden">
          <div className="px-[14px] py-[12px] border-b-[0.5px] border-[#E2E8F0] flex items-center gap-[8px]">
            <ShoppingCart className="h-[14px] w-[14px] text-[#475569]" />
            <span className="text-[12px] font-medium text-[#0F172A]">Topp leverantörer (12 mån)</span>
          </div>
          <div className="p-[14px]">
            {data.topSuppliers.length > 0 ? (
              <div className="space-y-[10px]">
                {data.topSuppliers.map((s, i) => (
                  <div key={i} className="space-y-[4px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-[#0F172A] truncate">{s.name}</span>
                      <div className="flex items-center gap-[8px] shrink-0 ml-[8px]">
                        <span className="text-[11px] text-[#94A3B8] tabular-nums">{s.percentage.toFixed(0)}%</span>
                        <span className="text-[12px] font-medium text-[#0F172A] tabular-nums">{fmt(s.amount)} kr</span>
                      </div>
                    </div>
                    <div className="h-[4px] bg-[#F1F5F9] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[#1D4ED8]" style={{ width: `${Math.min(s.percentage, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-[#94A3B8] py-[16px] text-center">Inga leverantörsfakturor ännu</p>
            )}
          </div>
        </div>
      </div>

      {/* Row 4: Sales Performance + Action Center */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[8px]">
        {/* Sales Performance */}
        <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] overflow-hidden">
          <div className="px-[14px] py-[12px] border-b-[0.5px] border-[#E2E8F0] flex items-center justify-between">
            <div className="flex items-center gap-[8px]">
              <BarChart3 className="h-[14px] w-[14px] text-[#475569]" />
              <span className="text-[12px] font-medium text-[#0F172A]">Försäljning</span>
            </div>
            <div className="flex items-center gap-[2px] bg-[#F8FAFB] border-[0.5px] border-[#E2E8F0] rounded-[8px] p-[2px]">
              {(["mtd", "qtd", "ytd"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setSalesView(v)}
                  className={`px-[8px] h-[22px] text-[10px] font-medium rounded-[6px] transition-colors ${
                    salesView === v
                      ? "bg-white text-[#1D4ED8] border-[0.5px] border-[#E2E8F0]"
                      : "text-[#475569]"
                  }`}
                >
                  {v === "mtd" ? "Månad" : v === "qtd" ? "Kvartal" : "År"}
                </button>
              ))}
            </div>
          </div>
          <div className="p-[14px]">
            <div className="space-y-[12px]">
              <div>
                <p className="text-[24px] font-medium tracking-[-0.02em] text-[#0F172A] tabular-nums">{fmtFull(currentSales)} kr</p>
                {salesView === "mtd" && salesChangePercent !== 0 && (
                  <div className={`flex items-center gap-[4px] text-[11px] mt-[2px] ${salesChangePercent >= 0 ? "text-[#085041]" : "text-[#791F1F]"}`}>
                    {salesChangePercent >= 0 ? <ArrowUpRight className="h-[12px] w-[12px]" /> : <ArrowDownRight className="h-[12px] w-[12px]" />}
                    {Math.abs(salesChangePercent).toFixed(1)}% vs förra månaden
                  </div>
                )}
              </div>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={data.monthlyTrend}>
                  <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false}/>
                  <Tooltip
                    contentStyle={{ background: "#0F172A", border: "none", borderRadius: "6px", fontSize: "11px", color: "#fff" }}
                    formatter={(v: number) => [`${fmtFull(v)} kr`, "Intäkter"]}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#1D4ED8" strokeWidth={1.5} dot={{ r: 2.5, fill: "#1D4ED8" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Action Center */}
        <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] overflow-hidden">
          <div className="px-[14px] py-[12px] border-b-[0.5px] border-[#E2E8F0] flex items-center gap-[8px]">
            <AlertCircle className="h-[14px] w-[14px] text-[#475569]" />
            <span className="text-[12px] font-medium text-[#0F172A]">Kräver åtgärd</span>
            {actions.filter(a => a.severity === "high").length > 0 && (
              <span className="ml-auto bg-[#FCE8E8] text-[#791F1F] border-[0.5px] border-[#E5A8A8] rounded-full text-[10px] font-medium px-[8px] py-px">
                {actions.filter(a => a.severity === "high").length} brådskande
              </span>
            )}
          </div>
          <div className="p-[14px]">
            {actions.length > 0 ? (
              <div className="space-y-[4px]">
                {actions.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => navigate(action.path)}
                    className="w-full flex items-center gap-[10px] px-[10px] py-[8px] rounded-[8px] hover:bg-[#F8FAFB] transition-colors text-left group"
                  >
                    <div className={`w-[7px] h-[7px] rounded-full shrink-0 ${
                      action.severity === "high" ? "bg-[#E24B4A]" : action.severity === "medium" ? "bg-[#EF9F27]" : "bg-[#94A3B8]"
                    }`} />
                    <span className="text-[12px] text-[#0F172A] flex-1">{action.text}</span>
                    <ArrowRight className="h-[12px] w-[12px] text-[#94A3B8] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            ) : data && data.cashBalance <= 0 ? (
              <div className="py-[20px] text-center">
                <AlertTriangle className="h-[24px] w-[24px] mx-auto mb-[6px] text-[#E24B4A]" />
                <p className="text-[12px] font-medium text-[#791F1F]">Negativ kassa — kritiskt läge</p>
                <p className="text-[11px] text-[#94A3B8] mt-[2px]">Inga öppna ärenden i kön, men likviditeten kräver åtgärd.</p>
              </div>
            ) : (
              <div className="py-[20px] text-center">
                <CheckCircle className="h-[24px] w-[24px] mx-auto mb-[6px] text-[#1D9E75]" />
                <p className="text-[12px] text-[#475569]">Allt under kontroll</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 5: AI Insights + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[8px]">
        {/* AI Insights — DSAIInfoCard style */}
        <div className="lg:col-span-2 bg-[#EFF6FF] border-[0.5px] border-[#C8DDF5] rounded-[12px] p-[14px]">
          <div className="flex items-center gap-[8px] mb-[8px]">
            <span className="w-[18px] h-[18px] rounded-full bg-[#1D4ED8] flex items-center justify-center">
              <span className="w-[7px] h-[7px] rounded-full bg-[#E6F4FA]" />
            </span>
            <span className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#0C447C]">AI Ekonom</span>
          </div>
          <div className="space-y-[6px]">
            {insights.slice(0, 3).map((insight, i) => (
              <p key={i} className="text-[12px] text-[#185FA5] leading-[1.6]">
                • {insight}
              </p>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] overflow-hidden">
          <div className="px-[14px] py-[12px] border-b-[0.5px] border-[#E2E8F0] flex items-center gap-[8px]">
            <FileText className="h-[14px] w-[14px] text-[#475569]" />
            <span className="text-[12px] font-medium text-[#0F172A]">Denna månad</span>
          </div>
          <div className="p-[14px] space-y-[10px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#475569]">Verifikationer</span>
              <span className="text-[14px] font-medium text-[#0F172A] tabular-nums">{data.verificationCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#475569]">Väntande</span>
              <span className={`text-[10px] font-medium rounded-full px-[8px] py-px border-[0.5px] ${
                data.pendingCount > 0
                  ? "bg-[#FCE8E8] text-[#791F1F] border-[#E5A8A8]"
                  : "bg-white text-[#475569] border-[#E2E8F0]"
              }`}>
                {data.pendingCount}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#475569]">Bankavstämning</span>
              <span className={`text-[10px] font-medium rounded-full px-[8px] py-px border-[0.5px] ${
                data.unmatchedBankTx > 0
                  ? "bg-[#FAEEDA] text-[#A0570F] border-[#EF9F27]"
                  : "bg-white text-[#475569] border-[#E2E8F0]"
              }`}>
                {data.unmatchedBankTx} kvar
              </span>
            </div>
            <button
              onClick={() => navigate("/accounting")}
              className="w-full bg-white border-[0.5px] border-[#E2E8F0] rounded-[8px] text-[12px] text-[#475569] px-[12px] h-[34px] hover:bg-[#F8FAFB] flex items-center justify-center gap-[5px]"
            >
              Gå till bokföring <ArrowRight className="h-[12px] w-[12px]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
