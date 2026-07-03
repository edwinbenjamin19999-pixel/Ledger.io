import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, FileText, AlertTriangle, BarChart3, Zap } from "lucide-react";
import { ServiceContract } from "@/hooks/useContracts";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { parseISO, subDays, startOfDay, format } from "date-fns";

interface Props {
  contracts: ServiceContract[];
  stats: { total: number; active: number; mrr: number; arr: number; pendingRenewal: number; avgChurnRisk: number };
}

const monthlyOf = (c: ServiceContract) => {
  const a = c.total_amount || 0;
  return c.billing_interval === 'monthly' ? a
    : c.billing_interval === 'quarterly' ? a / 3
    : c.billing_interval === 'semi_annually' ? a / 6
    : a / 12;
};

export const RecurringRevenueOverview = ({ contracts, stats }: Props) => {
  const { mrrDelta, mrrPct, churnPct, churnMrr, sparkData } = useMemo(() => {
    const now = new Date();
    const cutoff30 = subDays(now, 30);
    const cutoff60 = subDays(now, 60);
    const active = contracts.filter(c => c.status === 'active');

    const last30 = active.filter(c => parseISO(c.created_at) >= cutoff30).reduce((s, c) => s + monthlyOf(c), 0);
    const prior30 = active.filter(c => parseISO(c.created_at) >= cutoff60 && parseISO(c.created_at) < cutoff30).reduce((s, c) => s + monthlyOf(c), 0);
    const mrrDelta = last30 - prior30;
    const mrrPct = prior30 > 0 ? (mrrDelta / prior30) * 100 : 0;

    const churnRisk = active.filter(c => (c.churn_risk_score || 0) > 70);
    const churnMrr = churnRisk.reduce((s, c) => s + monthlyOf(c), 0);
    const churnPct = stats.mrr > 0 ? (churnMrr / stats.mrr) * 100 : 0;

    // 30-day cumulative MRR sparkline
    const sparkData = Array.from({ length: 30 }).map((_, i) => {
      const d = startOfDay(subDays(now, 29 - i));
      const mrr = active
        .filter(c => parseISO(c.created_at) <= d)
        .reduce((s, c) => s + monthlyOf(c), 0);
      return { d: format(d, 'd MMM'), v: Math.round(mrr) };
    });

    return { mrrDelta, mrrPct, churnPct, churnMrr, sparkData };
  }, [contracts, stats.mrr]);

  const fmtKr = (n: number) => `${Math.round(n).toLocaleString("sv-SE")} kr`;
  const deltaUp = mrrDelta >= 0;

  return (
    <Card className="rounded-2xl border-slate-200/60 border-l-[3px] border-l-[#3b82f6] shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-[#3b82f6] dark:text-[#1E3A5F]" />
            <span className="text-[11px] font-semibold tracking-wider text-[#3b82f6] dark:text-[#3b82f6] uppercase">Recurring revenue</span>
          </div>
          <span className="text-[11px] text-muted-foreground">Senaste 30 dagar</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mt-5">
          <Metric
            label="MRR"
            value={fmtKr(stats.mrr)}
            chip={
              prior30Display(mrrPct, deltaUp)
            }
            primary
          />
          <Metric label="ARR" value={fmtKr(stats.arr)} icon={BarChart3} />
          <Metric
            label="Tillväxt 30d"
            value={`${mrrPct >= 0 ? '+' : ''}${mrrPct.toFixed(1)}%`}
            sub={`${deltaUp ? '+' : ''}${fmtKr(mrrDelta)}`}
            tone={deltaUp ? 'good' : 'warn'}
          />
          <Metric label="Aktiva avtal" value={String(stats.active)} sub={`av ${stats.total} totalt`} icon={FileText} />
          <Metric
            label="Churn-risk"
            value={`${churnPct.toFixed(1)}%`}
            sub={churnMrr > 0 ? `${fmtKr(churnMrr)}/mån i risk` : 'Inga risker'}
            tone={churnPct > 15 ? 'risk' : churnPct > 5 ? 'warn' : 'good'}
            icon={AlertTriangle}
          />
        </div>

        <div className="mt-6 h-16 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="mrrSpark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke="hsl(var(--primary))" strokeWidth={1.75} fill="url(#mrrSpark)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );

  function prior30Display(pct: number, up: boolean) {
    const Icon = up ? TrendingUp : TrendingDown;
    const cls = up
      ? 'bg-[#E1F5EE] text-[#085041] border-[#BFE6D6] dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/40'
      : 'bg-[#FCE8E8] text-[#7A1A1A] border-[#F4C8C8] dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/40';
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium ${cls}`}>
        <Icon className="h-3 w-3" />
        {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
      </span>
    );
  }
};

function Metric({ label, value, sub, chip, icon: Icon, tone, primary }: { label: string; value: string; sub?: string; chip?: React.ReactNode; icon?: any; tone?: 'good' | 'warn' | 'risk'; primary?: boolean }) {
  const toneCls = tone === 'risk' ? 'text-[#7A1A1A] dark:text-[#C73838]'
    : tone === 'warn' ? 'text-[#7A5417] dark:text-[#C28A2B]'
    : tone === 'good' ? 'text-[#085041] dark:text-[#1D9E75]'
    : '';
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        {Icon && <Icon className="h-3 w-3 text-muted-foreground" />}
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <p className={`tabular-nums font-bold ${primary ? 'text-2xl' : 'text-xl'} ${toneCls || 'text-foreground'}`}>{value}</p>
        {chip}
      </div>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}
