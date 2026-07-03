import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentKpiTile } from "./types";
import { formatNumber } from "./format";

interface Props {
  kpis: AgentKpiTile[];
}

export function KpiStrip({ kpis }: Props) {
  if (kpis.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-sm text-slate-500">
        Inga nyckeltal tillgängliga ännu — agenten samlar in data när den körts
        en hel månad.
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid gap-3",
        kpis.length === 1 && "grid-cols-1",
        kpis.length === 2 && "grid-cols-1 sm:grid-cols-2",
        kpis.length === 3 && "grid-cols-1 sm:grid-cols-3",
        kpis.length >= 4 && "grid-cols-2 lg:grid-cols-4",
      )}
    >
      {kpis.map((k, i) => {
        const Wrapper: any = k.href ? "a" : k.onClick ? "button" : "div";
        const TrendIcon =
          k.trend === "up" ? ArrowUpRight : k.trend === "down" ? ArrowDownRight : Minus;
        const trendColor =
          k.trend && k.trend !== "flat"
            ? k.trendIsPositive
              ? "text-emerald-600"
              : "text-rose-600"
            : "text-slate-400";
        const interactive = !!(k.href || k.onClick);
        return (
          <Wrapper
            key={`${k.label}-${i}`}
            href={k.href}
            onClick={k.onClick}
            className={cn(
              "block w-full rounded-xl border border-slate-200/70 bg-white dark:bg-slate-800/60 p-4 text-left",
              "transition-shadow",
              interactive && "hover:shadow-sm cursor-pointer",
            )}
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              {k.label}
            </div>
            <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {formatNumber(k.value)}
            </div>
            {k.comparisonLabel && (
              <div
                className={cn(
                  "mt-1 inline-flex items-center gap-1 text-xs tabular-nums",
                  trendColor,
                )}
              >
                <TrendIcon className="h-3 w-3" />
                {k.comparisonLabel}
              </div>
            )}
          </Wrapper>
        );
      })}
    </div>
  );
}
