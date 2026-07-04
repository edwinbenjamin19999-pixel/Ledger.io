import { ArrowDown, ArrowUp, Minus, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type React from "react";
import type { BoardKPI } from "@/hooks/useBoardSummary";
import { KPI_LABELS } from "@/lib/board-mode/modeProfiles";

const fmtValue = (kpi: BoardKPI): string => {
  if (kpi.value === null) return "—";
  if (kpi.format === "days") return kpi.value > 0 ? `${kpi.value}d` : "—";
  if (kpi.format === "percent") return `${kpi.value.toFixed(1)}%`;
  const abs = Math.abs(kpi.value);
  if (abs >= 1_000_000) return `${(kpi.value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(kpi.value / 1_000).toFixed(0)}k`;
  return kpi.value.toLocaleString("sv-SE");
};

export const BoardKPIRow = ({
  kpis,
  loading,
  onKPIClick,
}: {
  kpis: BoardKPI[];
  loading: boolean;
  onKPIClick?: (kpi: BoardKPI) => void;
}) => {
  if (loading || kpis.length === 0) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-36 rounded-2xl bg-gray-100 border border-gray-200 animate-pulse" />
        ))}
      </div>
    );
  }

  const cardClass = "bg-white border border-gray-200 rounded-2xl shadow-sm p-6 flex flex-col min-h-[132px]";

  return (
    <TooltipProvider delayDuration={200}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(kpi => {
          if (kpi.unavailable_reason || kpi.value === null) {
            return (
              <Tooltip key={kpi.key}>
                <TooltipTrigger asChild>
                  <div className={`${cardClass} cursor-help`}>
                    <div
                      className="uppercase font-medium mb-2 text-gray-400"
                      style={{ fontSize: 10, letterSpacing: "1.5px" }}
                    >
                      {kpi.label}
                    </div>
                    <div className="text-sm text-gray-400 flex items-center gap-2">
                      Otillgänglig
                      <Info className="h-3.5 w-3.5 text-gray-300" />
                    </div>
                    <div className="mt-auto pt-3 text-[11px] text-gray-400 leading-snug">
                      {kpi.unavailable_reason || "Saknar data"}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-white border-gray-200 text-gray-700 text-xs max-w-xs shadow-md">
                  Detta KPI går inte att beräkna eftersom: {kpi.unavailable_reason || "data saknas"}.
                </TooltipContent>
              </Tooltip>
            );
          }

          const Icon = kpi.direction === "up" ? ArrowUp : kpi.direction === "down" ? ArrowDown : Minus;
          const positiveDir = KPI_LABELS[kpi.key as keyof typeof KPI_LABELS]?.positiveDirection || "up";
          const isPositive = kpi.direction === "flat"
            ? false
            : (positiveDir === "up" ? kpi.direction === "up" : kpi.direction === "down");
          const valueColor = kpi.value !== null && kpi.value < 0
            ? "text-red-500"
            : isPositive ? "text-emerald-600" : "text-gray-900";

          return (
            <button
              key={kpi.key}
              onClick={() => onKPIClick?.(kpi)}
              className={`${cardClass} text-left transition-colors hover:border-gray-300 hover:shadow-md`}
            >
              <div
                className="uppercase font-medium mb-2 text-gray-400"
                style={{ fontSize: 10, letterSpacing: "1.5px" }}
              >
                {kpi.label}
              </div>
              <div className={`tabular-nums tracking-tight ${valueColor}`} style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.1 }}>
                {fmtValue(kpi)}
                {kpi.format === "currency" && (
                  <span className="ml-1 text-gray-400" style={{ fontSize: 14, fontWeight: 400 }}>kr</span>
                )}
              </div>
              <div
                className={cn(
                  "mt-auto pt-3 inline-flex items-center gap-1 font-medium tabular-nums text-sm",
                  kpi.delta_pct === null || kpi.direction === "flat"
                    ? "text-gray-400"
                    : isPositive ? "text-emerald-500" : "text-red-400"
                )}
              >
                {kpi.delta_pct === null ? (
                  <span>—</span>
                ) : (
                  <>
                    <Icon className="h-3 w-3" strokeWidth={2.5} />
                    {Math.abs(kpi.delta_pct).toFixed(1)}%
                  </>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </TooltipProvider>
  );
};
