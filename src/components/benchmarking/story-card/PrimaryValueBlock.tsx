import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { percentileLabel, type Verdict } from "@/lib/benchmarking/verdictCalculator";

interface Props {
  value: number;
  unit: string;
  percentile: number;
  prevPercentile?: number;
  verdict: Verdict;
  reliable: boolean;
  simulating?: boolean;
}

export function PrimaryValueBlock({
  value,
  unit,
  percentile,
  prevPercentile,
  verdict,
  reliable,
  simulating,
}: Props) {
  const trendDiff =
    typeof prevPercentile === "number" ? percentile - prevPercentile : 0;
  const showTrend = typeof prevPercentile === "number" && Math.abs(trendDiff) > 1;

  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <div
          className={cn(
            "font-bold tracking-tight tabular-nums leading-none",
            "text-4xl sm:text-[40px]",
            !reliable && "text-muted-foreground/50",
            simulating && "text-[#3b82f6] dark:text-[#1E3A5F] transition-colors",
          )}
        >
          {reliable
            ? `${value.toLocaleString("sv-SE", { maximumFractionDigits: 1 })}`
            : "—"}
          <span className="text-xl font-semibold text-muted-foreground ml-1">
            {reliable ? unit : ""}
          </span>
        </div>
        {showTrend && (
          <div
            className={cn(
              "mt-2 inline-flex items-center gap-1 text-xs font-medium tabular-nums",
              trendDiff > 0
                ? "text-[#085041] dark:text-[#1D9E75]"
                : "text-[#7A1A1A] dark:text-[#C73838]",
            )}
          >
            {trendDiff > 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {trendDiff > 0 ? "+" : ""}
            {trendDiff} pp vs föregående
          </div>
        )}
        {!showTrend && reliable && (
          <div className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Minus className="h-3 w-3" /> Stabil
          </div>
        )}
      </div>

      {reliable && (
        <div
          className={cn(
            "shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold tabular-nums",
            "border bg-gradient-to-b shadow-sm",
            verdict.tone === "strong" &&
              "from-emerald-50 to-emerald-100/60 text-[#085041] border-[#BFE6D6] dark:from-emerald-950/60 dark:to-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800",
            verdict.tone === "watch" &&
              "from-blue-50 to-blue-100/60 text-[#3b82f6] border-[#C8DDF5] dark:from-blue-950/60 dark:to-blue-900/40 dark:text-[#3b82f6] dark:border-[#3b82f6]",
            verdict.tone === "attention" &&
              "from-amber-50 to-amber-100/60 text-[#7A5417] border-[#F0DDB7] dark:from-amber-950/60 dark:to-amber-900/40 dark:text-amber-300 dark:border-amber-800",
            verdict.tone === "critical" &&
              "from-rose-50 to-rose-100/60 text-[#7A1A1A] border-[#F4C8C8] dark:from-rose-950/60 dark:to-rose-900/40 dark:text-rose-300 dark:border-rose-800",
          )}
        >
          {percentileLabel(percentile)}
        </div>
      )}
    </div>
  );
}
