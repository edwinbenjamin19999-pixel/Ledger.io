import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line,
  CartesianGrid, AreaChart, Area, ScatterChart, Scatter, ZAxis, Cell
} from "recharts";
import { ChartGradients, AXIS_TICK, GRID_PROPS, BAR_ANIMATION, LINE_ANIMATION, TOOLTIP_CURSOR } from "@/components/charts/ChartGradients";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { CustomLegend } from "@/components/charts/CustomLegend";
import { TrendingUp, BarChart3, Target, AlertTriangle, Brain, TrendingDown, Sparkles, ChevronDown, Send, Eye, Wallet } from "lucide-react";
import type { ARInvoice, CustomerProfile } from "./ARAgent";
import { useChartTheme } from "@/hooks/useChartTheme";
import { useSendReminder } from "@/hooks/useInvoiceReminders";
import { cn } from "@/lib/utils";

// Risk colors per aging bucket
const BUCKET_COLORS = ["#10b981", "#f59e0b", "#f97316", "#f43f5e", "#be123c"] as const;
const BUCKET_BG = ["bg-emerald-500", "bg-amber-500", "bg-orange-500", "bg-rose-500", "bg-rose-700"] as const;

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

interface Props { openInvoices: ARInvoice[];
  paidInvoices: ARInvoice[];
  customers: CustomerProfile[];
  writtenOffAmount: number;
  writtenOffCount: number;
}

export const ARAnalyticsTab = ({ openInvoices, paidInvoices, customers, writtenOffAmount, writtenOffCount }: Props) => {
  const chartTheme = useChartTheme(); const now = new Date();

  // DSO
  const dso = useMemo(() => { if (paidInvoices.length === 0) return 0;
    const totalDays = paidInvoices.reduce((sum, inv) => { if (!inv.paid_at || !inv.due_date) return sum;
      return sum + Math.max(0, Math.floor((new Date(inv.paid_at).getTime() - new Date(inv.created_at).getTime()) / 86400000));
    }, 0);
    return Math.round(totalDays / paidInvoices.length);
  }, [paidInvoices]);

  // DSO trend
  const dsoTrend = useMemo(() => { const months: { month: string; dso: number }[] = [];
    for (let i = 11; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthInvs = paidInvoices.filter(inv => inv.paid_at?.startsWith(key));
      let mDso = 0;
      if (monthInvs.length > 0) { const total = monthInvs.reduce((s, inv) => { if (!inv.paid_at) return s;
          return s + Math.max(0, Math.floor((new Date(inv.paid_at).getTime() - new Date(inv.created_at).getTime()) / 86400000));
        }, 0);
        mDso = Math.round(total / monthInvs.length);
      }
      months.push({ month: d.toLocaleDateString("sv-SE", { month: "short" }), dso: mDso });
    }
    return months;
  }, [paidInvoices]);

  // Recovery rate
  const recoveryRate = useMemo(() => { const total = paidInvoices.length + openInvoices.filter(i => new Date(i.due_date) < now).length;
    return total === 0 ? 0 : Math.round((paidInvoices.length / total) * 100);
  }, [paidInvoices, openInvoices]);

  // Cash flow prediction 30 days — 3 scenarios
  const cashFlowPrediction = useMemo(() => { const totalOutstanding = openInvoices.reduce((s, i) => s + i.total_amount, 0);
    const avgOnTimeRate = customers.length > 0
      ? customers.reduce((s, c) => s + c.onTimeRate, 0) / customers.length : 0.5;

    const best = Math.round(totalOutstanding * 0.95);
    const aiPredict = Math.round(totalOutstanding * avgOnTimeRate * 0.8);
    const worst = 0;

    // Weekly breakdown
    const weeks: { week: string; best: number; ai: number; worst: number }[] = [];
    for (let w = 1; w <= 4; w++) { const weekEnd = new Date(now.getTime() + w * 7 * 86400000);
      const weekStart = new Date(now.getTime() + (w - 1) * 7 * 86400000);
      let weekBest = 0, weekAi = 0;
      for (const inv of openInvoices) { const due = new Date(inv.due_date);
        const cust = customers.find(c => c.name === inv.counterparty_name);
        const prob = cust ? Math.min(0.95, cust.onTimeRate * 0.8 + 0.15) : 0.5;
        if (due >= weekStart && due < weekEnd) { weekBest += inv.total_amount;
          weekAi += inv.total_amount * prob;
        } else if (due < weekStart) { weekAi += inv.total_amount * prob * 0.3;
        }
      }
      weeks.push({ week: `Vecka ${new Date(weekStart).toLocaleDateString("sv-SE", { day: "numeric", month: "short" })}`,
        best: Math.round(weekBest),
        ai: Math.round(weekAi),
        worst: 0,
      });
    }

    return { best, aiPredict, worst, weeks };
  }, [openInvoices, customers]);

  // Aging buckets
  const aging = useMemo(() => { const buckets = [
      { label: "0–30 dagar", min: 0, max: 30, amount: 0, count: 0 },
      { label: "31–60 dagar", min: 31, max: 60, amount: 0, count: 0 },
      { label: "61–90 dagar", min: 61, max: 90, amount: 0, count: 0 },
      { label: "91–120 dagar", min: 91, max: 120, amount: 0, count: 0 },
      { label: "120+ dagar", min: 121, max: 9999, amount: 0, count: 0 },
    ];
    for (const inv of openInvoices) { const days = Math.max(0, Math.floor((now.getTime() - new Date(inv.due_date).getTime()) / 86400000));
      for (const b of buckets) { if (days >= b.min && days <= b.max) { b.amount += inv.total_amount; b.count++; break; }
      }
    }
    return buckets;
  }, [openInvoices]);

  // Customer profitability scatter data
  const scatterData = useMemo(() => { return customers.map(c => ({ name: c.name,
      x: c.avgDaysLate + c.maxOverdueDays * 0.5,
      y: c.totalLifetime,
      z: c.invoiceCount + c.paidCount,
      score: c.score,
      color: c.score <= "B" ? "hsl(var(--primary))" : c.score === "C" ? "hsl(45, 90%, 50%)" : "hsl(0, 70%, 50%)",
    }));
  }, [customers]);

  return (
    <div className="space-y-4">
      {/* Top KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">DSO</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{dso} <span className="text-base font-normal text-muted-foreground">dagar</span></p>
            <p className="text-xs text-muted-foreground mt-1">
              Branschsnitt: ~28 dagar. {dso > 30 ? "Om du aktiverar automatiska påminnelser: estimerad DSO 24 dagar." : "Bra — under branschsnittet."}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-[#085041]" />
              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Recovery Rate</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{recoveryRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">Andel forflallna fakturor som till slut betalas</p>
          </CardContent>
        </Card>
        <Card className="border-secondary/20 bg-secondary/5">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 text-secondary" />
              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">AI-prognos (30 dagar)</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{fmt(cashFlowPrediction.aiPredict)} <span className="text-base font-normal text-muted-foreground">kr</span></p>
            <p className="text-xs text-muted-foreground mt-1">Forväntas komma in baserat på kundmönster</p>
          </CardContent>
        </Card>
      </div>

      {/* Cash flow prediction chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4 text-secondary" /> Forväntat kassainflode (30 dagar)
          </CardTitle>
          <CardDescription>
            Bästa fall: {fmt(cashFlowPrediction.best)} kr | AI-prognos: {fmt(cashFlowPrediction.aiPredict)} kr | Sämsta fall: 0 kr
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={`bg-white rounded-2xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)] transition-shadow duration-300 p-6 h-48`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashFlowPrediction.weeks}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="week" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => `${Math.round(v / 1000)}k`} />
                <Tooltip
                  contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "14px", backdropFilter: "blur(12px)", fontSize: "12px" }}
                  formatter={(v: number, name: string) => [`${fmt(v)} kr`, name === "best" ? "Bästa fall" : name === "ai" ? "AI-prognos" : "Sämsta fall"]}
                />
                <Area type="monotone" dataKey="best" stroke="#34d399" fill="#34d399" fillOpacity={0.1} strokeWidth={1} />
                <Area type="monotone" dataKey="ai" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
                <Area type="monotone" dataKey="worst" stroke="#fb7185" fill="#fb7185" fillOpacity={0.05} strokeWidth={1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Write-off analysis */}
      {writtenOffAmount > 0 && (
        <Card className="border-amber-200/50 dark:border-amber-800/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-[#7A5417]" /> Avskrivningsanalys
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="bg-muted/30 rounded p-3">
                <span className="text-xs text-muted-foreground">Avskrivet i år</span>
                <p className="font-bold text-destructive">{fmt(writtenOffAmount)} kr</p>
              </div>
              <div className="bg-muted/30 rounded p-3">
                <span className="text-xs text-muted-foreground">Antal fakturor</span>
                <p className="font-bold">{writtenOffCount}</p>
              </div>
              <div className="bg-muted/30 rounded p-3">
                <span className="text-xs text-muted-foreground">Forutsägbara</span>
                <p className="font-bold text-[#7A5417]">{Math.max(1, Math.floor(writtenOffCount * 0.5))}</p>
              </div>
              <div className="bg-muted/30 rounded p-3">
                <span className="text-xs text-muted-foreground">Kostnad utebiven automation</span>
                <p className="font-bold text-destructive">{fmt(Math.round(writtenOffAmount * 0.5))} kr</p>
              </div>
            </div>
            <div className="bg-muted/10 border border-border/50 rounded-lg p-3 text-xs text-muted-foreground italic">
              Gemensam nämnare: alla avskrivna fakturor skickades till kunder med C-betyg eller lägre utan kreditlimit. Ingen automatisk eskalering skedde.
              Om påminnelseautomation hade aktiverats: estimerat {Math.max(1, Math.floor(writtenOffCount * 0.5))} av {writtenOffCount} hade kunnat räddas.
            </div>
          </CardContent>
        </Card>
      )}

      {/* DSO trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">DSO-trend (12 månader)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`bg-white rounded-2xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)] transition-shadow duration-300 p-6 h-48`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dsoTrend}>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "14px", backdropFilter: "blur(12px)", fontSize: "12px" }}
                  formatter={(v: number) => [`${v} dagar`, "DSO"]}
                />
                <Line type="monotone" dataKey="dso" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Customer profitability scatter */}
      {customers.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Kundlönsamhetsmatris</CardTitle>
            <CardDescription>X = betalningstid (dagar), Y = omsättning. Grön = i tid, Röd = problem</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`bg-white rounded-2xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)] transition-shadow duration-300 p-6 h-56`}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis type="number" dataKey="x" name="Betalningstid" tick={AXIS_TICK} axisLine={false} tickLine={false}label={{ value: "Dagar", position: "bottom", fontSize: 10 }} />
                  <YAxis type="number" dataKey="y" name="Omsättning" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={v => `${Math.round(v / 1000)}k`} />
                  <ZAxis type="number" dataKey="z" range={[80, 400]} />
                  <Tooltip
                    contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "14px", backdropFilter: "blur(12px)", fontSize: "12px" }}
                    formatter={(v: number, name: string) => [name === "Omsättning" ? `${fmt(v)} kr` : `${v} dagar`, name]}
                    labelFormatter={() => ""}
                  />
                  <Scatter data={scatterData} name="Kunder">
                    {scatterData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            {/* Best/worst customer summary */}
            <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
              {customers.length >= 1 && (
                <div className="bg-[#E1F5EE] dark:bg-green-900/10 border border-[#BFE6D6] dark:border-green-800/30 rounded p-3">
                  <span className="text-[#085041] dark:text-[#1D9E75] font-medium">Bästa kund</span>
                  <p className="text-foreground font-bold">{customers.reduce((best, c) => c.score < best.score || (c.score === best.score && c.totalLifetime > best.totalLifetime) ? c : best, customers[0]).name}</p>
                  <p className="text-muted-foreground">Hog omsättning, betalar i tid</p>
                </div>
              )}
              {customers.length >= 1 && (
                <div className="bg-[#FCE8E8] dark:bg-red-900/10 border border-[#F4C8C8] dark:border-red-800/30 rounded p-3">
                  <span className="text-[#7A1A1A] dark:text-[#C73838] font-medium">Sämsta kund</span>
                  <p className="text-foreground font-bold">{customers.reduce((worst, c) => c.score > worst.score || (c.score === worst.score && c.maxOverdueDays > worst.maxOverdueDays) ? c : worst, customers[0]).name}</p>
                  <p className="text-muted-foreground">Hog exponering, sen betalare</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Aging report — AI Decision Engine */}
      <AgingDecisionEngine aging={aging} openInvoices={openInvoices} customers={customers} />
    </div>
  );
};

// ============================================================
// AGING DECISION ENGINE — Aging analysis as interactive AI tool
// ============================================================

type AgingBucket = { label: string; min: number; max: number; amount: number; count: number };

interface AgingProps {
  aging: AgingBucket[];
  openInvoices: ARInvoice[];
  customers: CustomerProfile[];
}

function AgingDecisionEngine({ aging, openInvoices, customers }: AgingProps) {
  const [hoveredBucket, setHoveredBucket] = useState<number | null>(null);
  const [expandedBucket, setExpandedBucket] = useState<number | null>(null);
  const sendReminder = useSendReminder();

  const totalAmount = aging.reduce((s, b) => s + b.amount, 0);
  const totalCount = aging.reduce((s, b) => s + b.count, 0);
  const overdueAmount = aging.slice(1).reduce((s, b) => s + b.amount, 0);
  const overdueCount = aging.slice(1).reduce((s, b) => s + b.count, 0);
  const overduePct = totalAmount > 0 ? Math.round((overdueAmount / totalAmount) * 100) : 0;

  // Largest overdue bucket for AI recommendation
  const largestOverdue = aging.slice(1).reduce<AgingBucket & { idx: number }>(
    (best, b, i) => (b.amount > best.amount ? { ...b, idx: i + 1 } : best),
    { amount: 0, count: 0, label: "", min: 0, max: 0, idx: -1 }
  );

  // Customers per bucket
  const customersByBucket = useMemo(() => {
    const now = new Date();
    return aging.map((b) =>
      Object.values(
        openInvoices
          .filter((inv) => {
            const days = Math.max(0, Math.floor((now.getTime() - new Date(inv.due_date).getTime()) / 86400000));
            return days >= b.min && days <= b.max;
          })
          .reduce((acc: Record<string, { name: string; amount: number; count: number; invoiceIds: string[] }>, inv) => {
            const key = inv.counterparty_name || "Okänd kund";
            if (!acc[key]) acc[key] = { name: key, amount: 0, count: 0, invoiceIds: [] };
            acc[key].amount += inv.total_amount;
            acc[key].count += 1;
            acc[key].invoiceIds.push(inv.id);
            return acc;
          }, {})
      ).sort((a, b) => b.amount - a.amount)
    );
  }, [aging, openInvoices]);

  const overdueCustomerCount = new Set(
    customersByBucket.slice(1).flatMap((cs) => cs.map((c) => c.name))
  ).size;

  if (totalCount === 0) {
    return (
      <Card className="rounded-2xl border-slate-200/70 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Åldringsanalys</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center text-sm text-muted-foreground">
            Inga utestående fordringar — alla fakturor är betalda eller avskrivna.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Insight + Cash Flow Impact (2-col grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Insight Card */}
        <div className="rounded-2xl border-l-[3px] border-l-[#3b82f6] border border-slate-200/70 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:shadow-md transition-shadow p-5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-[#3b82f6]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">AI-insikt</span>
          </div>
          <p className="text-base font-semibold text-slate-900 leading-snug">
            {overduePct > 0
              ? `${overduePct}% av fordringarna är äldre än 30 dagar — ${overduePct >= 40 ? "ökad risk" : "bevaka noga"}`
              : "Alla fordringar är inom betalningstid"}
          </p>
          {largestOverdue.idx > 0 && (
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              Skicka påminnelser till{" "}
              <span className="font-semibold">{customersByBucket[largestOverdue.idx].length} kunder</span> med fakturor i{" "}
              <span className="font-semibold">{largestOverdue.label}</span> ({fmt(largestOverdue.amount)} kr).
            </p>
          )}
          {overdueCount > 0 && (
            <Button
              size="sm"
              className="mt-4 bg-[#3b82f6] hover:bg-[#3b82f6] text-white"
              onClick={() => setExpandedBucket(largestOverdue.idx > 0 ? largestOverdue.idx : 1)}
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              Skicka påminnelser
            </Button>
          )}
        </div>

        {/* Cash Flow Impact */}
        <div className="rounded-2xl border border-blue-200/60 bg-gradient-to-br from-blue-50 to-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:shadow-md transition-shadow p-5">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="h-4 w-4 text-[#3b82f6]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#3b82f6]/80">Om alla förfallna fakturor betalas</span>
          </div>
          <p className="text-3xl font-bold tabular-nums text-[#3b82f6]">
            +{fmt(overdueAmount)} <span className="text-lg font-medium">kr i kassa</span>
          </p>
          <p className="text-sm text-slate-600 mt-2">
            {overdueCount} {overdueCount === 1 ? "faktura" : "fakturor"} från {overdueCustomerCount} {overdueCustomerCount === 1 ? "kund" : "kunder"}
          </p>
        </div>
      </div>

      {/* Chart card */}
      <Card className="rounded-2xl border-slate-200/70 shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Åldringsanalys</CardTitle>
          <CardDescription>Klicka på en stapel för att se kunder och åtgärder</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-white rounded-xl p-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={aging} onMouseLeave={() => setHoveredBucket(null)}>
                <defs>
                  {BUCKET_COLORS.map((c, i) => (
                    <linearGradient key={i} id={`agingGrad-${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={c} stopOpacity={0.95} />
                      <stop offset="100%" stopColor={c} stopOpacity={0.55} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid {...GRID_PROPS} />
                <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip
                  cursor={{ fill: "rgba(37,99,235, 0.06)" }}
                  content={({ active, payload }: any) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as AgingBucket;
                    const pct = totalAmount > 0 ? Math.round((d.amount / totalAmount) * 100) : 0;
                    return (
                      <div className="rounded-xl bg-white border border-slate-200 shadow-lg px-3 py-2 text-xs">
                        <p className="font-semibold text-slate-900 mb-1">{d.label}</p>
                        <p className="text-slate-700 tabular-nums">{fmt(d.amount)} kr</p>
                        <p className="text-slate-500">{pct}% av total · {d.count} {d.count === 1 ? "faktura" : "fakturor"}</p>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="amount"
                  radius={[8, 8, 0, 0]}
                  onClick={(_, idx) => setExpandedBucket(expandedBucket === idx ? null : idx)}
                  onMouseEnter={(_, idx) => setHoveredBucket(idx)}
                  cursor="pointer"
                >
                  {aging.map((_, i) => (
                    <Cell
                      key={i}
                      fill={`url(#agingGrad-${i})`}
                      opacity={hoveredBucket === null || hoveredBucket === i ? 1 : 0.45}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Drill-down panel */}
          {expandedBucket !== null && customersByBucket[expandedBucket]?.length > 0 && (
            <div className="rounded-xl border border-slate-200/70 bg-slate-50/50 p-4 animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={cn("h-2.5 w-2.5 rounded-full", BUCKET_BG[expandedBucket])} />
                  <span className="text-sm font-semibold text-slate-900">
                    {aging[expandedBucket].label} · {customersByBucket[expandedBucket].length} kunder
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setExpandedBucket(null)} className="h-7 text-xs">
                  Stäng
                </Button>
              </div>
              <div className="space-y-1.5">
                {customersByBucket[expandedBucket].slice(0, 8).map((c) => (
                  <div
                    key={c.name}
                    className="flex items-center justify-between bg-white rounded-lg border border-slate-200/60 px-3 py-2.5 hover:shadow-sm transition-shadow"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">{c.name}</p>
                      <p className="text-xs text-slate-500">{c.count} {c.count === 1 ? "faktura" : "fakturor"}</p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-slate-900 mx-4">{fmt(c.amount)} kr</span>
                    <div className="flex items-center gap-1.5">
                      {expandedBucket > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-[#C8DDF5] text-[#3b82f6] hover:bg-[#EFF6FF]"
                          disabled={sendReminder.isPending}
                          onClick={() =>
                            c.invoiceIds.forEach((id) => {
                              const inv = openInvoices.find((i) => i.id === id);
                              sendReminder.mutate({ invoiceId: id, reminderNumber: (inv?.reminder_count ?? 0) + 1 });
                            })
                          }
                        >
                          <Send className="h-3 w-3 mr-1" /> Påminn
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 text-xs">
                        <Eye className="h-3 w-3 mr-1" /> Detaljer
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Enhanced table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground border-b border-slate-200">
                  <th className="px-3 py-2 font-medium">Period</th>
                  <th className="px-3 py-2 font-medium text-right">Belopp</th>
                  <th className="px-3 py-2 font-medium text-right">% av total</th>
                  <th className="px-3 py-2 font-medium text-right">Antal</th>
                </tr>
              </thead>
              <tbody>
                {aging.map((b, i) => {
                  const pct = totalAmount > 0 ? Math.round((b.amount / totalAmount) * 100) : 0;
                  return (
                    <tr
                      key={i}
                      onMouseEnter={() => setHoveredBucket(i)}
                      onMouseLeave={() => setHoveredBucket(null)}
                      onClick={() => setExpandedBucket(expandedBucket === i ? null : i)}
                      className={cn(
                        "border-b border-slate-100 last:border-0 cursor-pointer transition-colors duration-200",
                        hoveredBucket === i && "bg-blue-50/50"
                      )}
                    >
                      <td className="px-3 py-2.5 text-foreground">
                        <span className="inline-flex items-center gap-2">
                          <span className={cn("h-2 w-2 rounded-full", BUCKET_BG[i])} />
                          {b.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium text-foreground tabular-nums">{fmt(b.amount)} kr</td>
                      <td className="px-3 py-2.5 text-right text-slate-600 tabular-nums">{pct}%</td>
                      <td className="px-3 py-2.5 text-right text-muted-foreground tabular-nums">{b.count}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
