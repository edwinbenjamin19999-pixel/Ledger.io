import { ArrowDownRight, ArrowUpRight, Sparkles, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatSEK } from "@/lib/formatNumber";
import type { VarianceDriver } from "@/lib/follow-up/varianceEngine";

interface Props {
  driver: VarianceDriver;
  rootCause?: string;
  aiLoading?: boolean;
  onSimulate?: (d: VarianceDriver) => void;
  onDrilldown?: (d: VarianceDriver) => void;
}

export function VarianceDriverCard({ driver, rootCause, aiLoading, onSimulate, onDrilldown }: Props) {
  const isBad = driver.direction === "bad";
  const Icon = isBad ? ArrowDownRight : ArrowUpRight;
  const colorClass = isBad ? "text-[#7A1A1A]" : "text-[#085041]";
  const bgClass = isBad ? "bg-[#FCE8E8]" : "bg-[#E1F5EE]";
  const borderClass = isBad ? "border-[#F4C8C8]" : "border-[#BFE6D6]";

  return (
    <div
      className={cn(
        "group rounded-xl border bg-white shadow-sm hover:shadow-md transition-all duration-150",
        "p-4 cursor-pointer",
      )}
      onClick={() => onDrilldown?.(driver)}
    >
      <div className="flex items-start gap-3">
        <div className={cn("mt-1 inline-flex h-8 w-8 items-center justify-center rounded-lg border", bgClass, borderClass)}>
          <Icon className={cn("h-4 w-4", colorClass)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-sm font-mono text-slate-500">{driver.account_number}</span>
            <span className="text-base font-semibold text-slate-900 truncate">{driver.account_name}</span>
            <span className={cn("text-xs font-semibold", colorClass)}>
              {driver.variance >= 0 ? "+" : "−"}
              {formatSEK(Math.abs(Math.round(driver.variance)))}
            </span>
            <span className={cn("text-xs", colorClass)}>
              {driver.variance >= 0 ? "+" : ""}
              {driver.variancePct.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-500">
              ΔEBIT{" "}
              <span className={cn("font-semibold", driver.ebitImpact >= 0 ? "text-[#085041]" : "text-[#7A1A1A]")}>
                {driver.ebitImpact >= 0 ? "+" : "−"}
                {formatSEK(Math.abs(Math.round(driver.ebitImpact)))}
              </span>
            </span>
          </div>
          <div className="mt-1.5 flex items-start gap-1.5 text-xs text-slate-600 min-h-[1rem]">
            <Sparkles className="h-3 w-3 mt-0.5 text-[#3b82f6] shrink-0" />
            {aiLoading && !rootCause ? (
              <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
            ) : (
              <span>{rootCause ?? "Klicka för konto-drilldown."}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {onSimulate && (
            <Button size="sm" variant="outline" onClick={() => onSimulate(driver)}>
              Simulera
            </Button>
          )}
          <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
        </div>
      </div>
    </div>
  );
}
