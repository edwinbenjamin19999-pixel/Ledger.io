import { useCFODashboard } from "@/hooks/useCFODashboard";
import { useLiveCFOKPIs } from "@/hooks/useLiveCFOKPIs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, Flame, Timer, ArrowRight, AlertTriangle } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { useNavigate } from "react-router-dom";
import { drilldown } from "./DrilldownRouter";
import { formatSEK } from "@/lib/formatNumber";
import { cn } from "@/lib/utils";

interface Props {
  companyId: string;
}

export function CashRunwayPanel({ companyId }: Props) {
  const { data, isLoading } = useCFODashboard(companyId);
  const live = useLiveCFOKPIs(companyId);
  const navigate = useNavigate();

  if (isLoading || !data) return <Skeleton className="h-full min-h-[280px] rounded-2xl" />;

  const runwayDays = live.runway_days ?? data.runway * 30;
  const monthlyBurn = data.sparkline.length
    ? data.sparkline.slice(-3).reduce((s, m) => s + (m.costs ?? 0), 0) / Math.max(data.sparkline.slice(-3).length, 1)
    : 0;
  const tone = runwayDays < 60 ? "critical" : runwayDays < 120 ? "warn" : "ok";
  const toneCfg = {
    critical: { ring: "ring-rose-500/30", chip: "bg-[#FCE8E8] text-[#7A1A1A] dark:text-rose-300", area: "#f43f5e", label: "Kritisk – agera nu" },
    warn: { ring: "ring-amber-500/30", chip: "bg-[#FAEEDA] text-[#7A5417] dark:text-amber-300", area: "#f59e0b", label: "Bevakas" },
    ok: { ring: "ring-emerald-500/30", chip: "bg-[#E1F5EE] text-[#085041] dark:text-emerald-300", area: "#10b981", label: "Stabil" },
  }[tone];

  const cashSeries = data.sparkline.length >= 2
    ? data.sparkline.map((s) => ({ label: s.label, value: s.result }))
    : [];

  return (
    <section className={cn("rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-900/60 shadow-sm h-full flex flex-col ring-1 ring-transparent", toneCfg.ring)}>
      <div className="p-5 md:p-6 border-b border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-[#EFF6FF] flex items-center justify-center">
            <Wallet className="h-4 w-4 text-[#3b82f6]" />
          </div>
          <div>
            <h3 className="font-semibold tracking-tight">Kassa & runway</h3>
            <p className="text-xs text-muted-foreground">Likviditet och brinntid</p>
          </div>
        </div>
        <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md", toneCfg.chip)}>
          {tone === "critical" && <AlertTriangle className="h-3 w-3" />}
          {toneCfg.label}
        </span>
      </div>

      <div className="p-5 md:p-6 grid grid-cols-3 gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Kassa</div>
          <div className="text-xl font-bold tabular-nums mt-1">{formatSEK(data.cash)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Flame className="h-3 w-3" /> Burn / mån</div>
          <div className="text-xl font-bold tabular-nums mt-1">{formatSEK(Math.round(monthlyBurn))}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Timer className="h-3 w-3" /> Runway</div>
          <div className="text-xl font-bold tabular-nums mt-1">{Math.round(runwayDays)} d</div>
        </div>
      </div>

      <div className="px-2 pb-3 flex-1 min-h-[120px]">
        {cashSeries.length >= 2 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cashSeries} margin={{ top: 5, right: 12, left: 12, bottom: 0 }}>
              <defs>
                <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={toneCfg.area} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={toneCfg.area} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" hide />
              <Tooltip formatter={(v: number) => formatSEK(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Area type="monotone" dataKey="value" stroke={toneCfg.area} strokeWidth={2} fill="url(#cashGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Bygger trend…</div>
        )}
      </div>

      <div className="p-4 border-t border-slate-200/60 dark:border-slate-700/60">
        <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={() => drilldown(navigate, { kind: "cash" })}>
          Öppna kassaflödesprognos <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </section>
  );
}
