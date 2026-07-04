import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { ServiceContract } from "@/hooks/useContracts";
import { Area, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { addMonths, format, parseISO, subDays } from "date-fns";
import { sv } from "date-fns/locale";
import { Brain, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Props {
  contracts: ServiceContract[];
  mrr: number;
}

const monthlyOf = (c: ServiceContract) => {
  const a = c.total_amount || 0;
  return c.billing_interval === 'monthly' ? a
    : c.billing_interval === 'quarterly' ? a / 3
    : c.billing_interval === 'semi_annually' ? a / 6
    : a / 12;
};

export const RevenueForecastPanel = ({ contracts, mrr }: Props) => {
  const { data, baselineTotal, bestTotal, worstTotal, growthRate, churnRate, activeCount } = useMemo(() => {
    const active = contracts.filter(c => c.status === 'active');
    const activeCount = active.length;

    // Growth: avg new MRR/month last 90d
    const cutoff90 = subDays(new Date(), 90);
    const newMrr90 = active
      .filter(c => parseISO(c.created_at) >= cutoff90)
      .reduce((s, c) => s + monthlyOf(c), 0);
    const growthRate = newMrr90 / 3; // per month

    // Churn: % of MRR at risk × monthly churn assumption (5% baseline)
    const riskMrr = active.filter(c => (c.churn_risk_score || 0) > 70).reduce((s, c) => s + monthlyOf(c), 0);
    const churnRate = mrr > 0 ? (riskMrr / mrr) * 0.05 : 0.005; // monthly

    const data = Array.from({ length: 12 }).map((_, i) => {
      const m = i + 1;
      const baseline = mrr;
      const best = mrr + growthRate * m;
      const worst = mrr * Math.pow(1 - churnRate, m);
      return {
        month: format(addMonths(new Date(), m), 'MMM yy', { locale: sv }),
        baseline: Math.round(baseline),
        best: Math.round(best),
        worst: Math.round(worst),
      };
    });

    const baselineTotal = data.reduce((s, d) => s + d.baseline, 0);
    const bestTotal = data.reduce((s, d) => s + d.best, 0);
    const worstTotal = data.reduce((s, d) => s + d.worst, 0);

    return { data, baselineTotal, bestTotal, worstTotal, growthRate, churnRate, activeCount };
  }, [contracts, mrr]);

  const fmtKr = (n: number) => `${Math.round(n).toLocaleString("sv-SE")} kr`;

  return (
    <Card className="rounded-2xl border-slate-200/60 border-l-[3px] border-l-[#3b82f6] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-[#EFF6FF] dark:bg-blue-950/30 flex items-center justify-center">
            <Brain className="h-4 w-4 text-[#3b82f6] dark:text-[#1E3A5F]" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Intäktsprognos · 12 månader</h3>
            <p className="text-[11px] text-muted-foreground">Tre scenarier baserat på {activeCount} aktiva avtal</p>
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="baselineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => fmtKr(v)}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="baseline" name="Bas" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#baselineGrad)" />
              <Line type="monotone" dataKey="best" name="Bästa fall" stroke="hsl(142 71% 45%)" strokeWidth={2} strokeDasharray="5 4" dot={false} />
              <Line type="monotone" dataKey="worst" name="Sämsta fall" stroke="hsl(346 77% 50%)" strokeWidth={2} strokeDasharray="5 4" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-5">
          <ScenarioChip label="Bästa fall" value={fmtKr(bestTotal)} icon={TrendingUp} tone="good" />
          <ScenarioChip label="Bas" value={fmtKr(baselineTotal)} icon={Minus} tone="neutral" />
          <ScenarioChip label="Sämsta fall" value={fmtKr(worstTotal)} icon={TrendingDown} tone="risk" />
        </div>

        <div className="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">AI-narrativ:</span> Baserat på {activeCount} aktiva avtal med en månatlig tillväxt om {fmtKr(growthRate)} och en uppskattad månatlig churn på {(churnRate * 100).toFixed(2)}%, förväntas årets totala återkommande intäkter landa mellan <span className="font-medium text-[#7A1A1A] dark:text-[#C73838]">{fmtKr(worstTotal)}</span> och <span className="font-medium text-[#085041] dark:text-[#1D9E75]">{fmtKr(bestTotal)}</span>.
          </p>
        </div>
      </div>
    </Card>
  );
};

function ScenarioChip({ label, value, icon: Icon, tone }: { label: string; value: string; icon: any; tone: 'good' | 'neutral' | 'risk' }) {
  const cls = tone === 'good' ? 'border-[#BFE6D6] bg-emerald-50/50 text-[#085041] dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300'
    : tone === 'risk' ? 'border-[#F4C8C8] bg-rose-50/50 text-[#7A1A1A] dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300'
    : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300';
  return (
    <div className={`rounded-lg border p-3 ${cls}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3 w-3" />
        <span className="text-[10px] uppercase tracking-wider font-semibold">{label}</span>
      </div>
      <p className="text-base font-bold tabular-nums">{value}</p>
    </div>
  );
}
