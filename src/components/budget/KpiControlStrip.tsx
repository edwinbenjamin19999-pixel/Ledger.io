import { useMemo } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sparkline } from "./Sparkline";
import { TimeframeToggle } from "./TimeframeToggle";
import { computeTrend, trendArrowColor, type Timeframe } from "@/lib/budget/trendEngine";
import { formatSEKCompact } from "@/lib/formatNumber";

export type Kpi = "variance" | "revenue" | "costs" | "forecast";

interface KpiSeries {
  /** Monthly series (12 values) for sparkline + trend. */
  monthly: number[];
  /** Headline number to display. */
  value: number;
  /** Optional delta context shown under value. */
  delta?: number;
  /** Whether the KPI is "cost-like" (down is good). */
  isCostLike?: boolean;
}

interface Props {
  timeframe: Timeframe;
  onTimeframeChange: (t: Timeframe) => void;
  series: Record<Kpi, KpiSeries>;
  active: Kpi;
  onClick: (k: Kpi) => void;
}

const LABELS: Record<Kpi, string> = {
  variance: "Budgetavvikelse",
  revenue: "Intäkt vs plan",
  costs: "Kostnadsavvikelse",
  forecast: "Prognos EBIT",
};

export function KpiControlStrip({ timeframe, onTimeframeChange, series, active, onClick }: Props) {
  const trends = useMemo(() => {
    const out: Record<Kpi, ReturnType<typeof computeTrend>> = {} as any;
    (Object.keys(series) as Kpi[]).forEach(k => {
      out[k] = computeTrend(series[k].monthly, timeframe, { isCostLike: series[k].isCostLike });
    });
    return out;
  }, [series, timeframe]);

  return (
    <div className="rounded-2xl border bg-white shadow-[0_4px_12px_rgba(15,23,42,0.04)] p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kontrollpunkter</h3>
        <TimeframeToggle value={timeframe} onChange={onTimeframeChange} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {(Object.keys(LABELS) as Kpi[]).map(k => {
          const t = trends[k];
          const Arrow = t.direction === "up" ? ArrowUpRight : t.direction === "down" ? ArrowDownRight : Minus;
          const color = trendArrowColor(t.direction);
          return (
            <button
              key={k}
              type="button"
              onClick={() => onClick(k)}
              className={cn(
                "text-left rounded-xl border p-3 transition-all",
                active === k
                  ? "border-[#3b82f6] bg-blue-50/40 shadow-sm"
                  : "border-slate-200 bg-white hover:border-[#3b82f6] hover:bg-blue-50/30"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-slate-600">{LABELS[k]}</span>
                <Arrow className={cn("w-3.5 h-3.5", color)} />
              </div>
              <div className="text-base font-semibold tabular-nums text-slate-900 mt-0.5">
                {formatSEKCompact(series[k].value)}
              </div>
              <div className="flex items-center justify-between gap-2 mt-1">
                <span className={cn("text-[10px] tabular-nums font-medium", color)}>
                  {t.changePct >= 0 ? "+" : ""}{t.changePct.toFixed(1)}%
                </span>
                <Sparkline data={t.sparkline} color="auto" width={56} height={16} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
