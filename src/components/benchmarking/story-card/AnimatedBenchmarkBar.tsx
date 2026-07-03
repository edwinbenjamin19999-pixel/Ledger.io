import { cn } from "@/lib/utils";
import type { Verdict } from "@/lib/benchmarking/verdictCalculator";

interface Props {
  percentile: number;
  p25: number;
  p50: number;
  p75: number;
  unit: string;
  verdict: Verdict;
  simulating?: boolean;
  reliable?: boolean;
}

/** Tick positions: P25=25%, P50=50%, P75=75%, P90=90% */
const TICKS = [25, 50, 75, 90];

export function AnimatedBenchmarkBar({
  percentile,
  p25,
  p50,
  p75,
  unit,
  verdict,
  simulating,
  reliable = true,
}: Props) {
  const position = Math.min(98, Math.max(2, percentile));

  return (
    <div className={cn("space-y-2", !reliable && "opacity-40")}>
      <div className="relative">
        {/* Track with gradient quartiles */}
        <div className="relative h-2.5 rounded-full overflow-hidden bg-gradient-to-r from-rose-100 via-amber-100 via-cyan-100 to-emerald-100 dark:from-rose-950/40 dark:via-amber-950/40 dark:via-cyan-950/40 dark:to-emerald-950/40">
          {/* Tick lines */}
          {TICKS.map((t) => (
            <div
              key={t}
              className="absolute top-0 bottom-0 w-px bg-foreground/10"
              style={{ left: `${t}%` }}
            />
          ))}
        </div>

        {/* Animated marker */}
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 -translate-x-1/2",
            "transition-[left] duration-500 ease-out",
          )}
          style={{ left: `${position}%` }}
        >
          <div
            className={cn(
              "h-4 w-4 rounded-full border-2 border-background shadow-md",
              simulating && "ring-4 ring-[#3b82f6]/40 animate-pulse",
            )}
            style={{ backgroundColor: verdict.markerColor }}
          />
        </div>
      </div>

      {/* Tick labels */}
      <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground tabular-nums">
        <span>
          P25
          <span className="ml-1 text-foreground/60">
            {p25}
            {unit}
          </span>
        </span>
        <span>
          P50
          <span className="ml-1 text-foreground/60">
            {p50}
            {unit}
          </span>
        </span>
        <span>
          P75
          <span className="ml-1 text-foreground/60">
            {p75}
            {unit}
          </span>
        </span>
        <span className="text-foreground/40">P90</span>
      </div>
    </div>
  );
}
