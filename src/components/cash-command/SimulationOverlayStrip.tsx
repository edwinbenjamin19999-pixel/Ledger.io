import { Beaker, RotateCcw, Play, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SimulatedAction } from "@/lib/cashflow/simulate";

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(Math.round(Math.abs(n)));

interface Props {
  pending: SimulatedAction[];
  /** Net runway delta vs baseline (days). */
  runwayDelta: number;
  onRemove: (id: string) => void;
  onClear: () => void;
  onExecuteAll: () => void;
}

export function SimulationOverlayStrip({
  pending,
  runwayDelta,
  onRemove,
  onClear,
  onExecuteAll,
}: Props) {
  if (pending.length === 0) return null;

  const totalImpact = pending.reduce((s, a) => s + a.expectedImpactSek * a.confidence, 0);
  const positive = totalImpact >= 0;

  return (
    <div className="rounded-xl border border-[#3b82f6]/60 dark:border-[#C8DDF5] bg-cyan-50/60 dark:bg-[#EFF6FF] px-3 py-2 flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2 text-xs font-semibold text-[#3b82f6] dark:text-[#3b82f6]">
        <Beaker className="h-3.5 w-3.5" />
        Simulering aktiv
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#EFF6FF] text-[#3b82f6] dark:text-[#3b82f6]">
          {pending.length} {pending.length === 1 ? "åtgärd" : "åtgärder"}
        </span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
        {pending.map((a) => (
          <span
            key={a.id}
            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-white dark:bg-white/5 border border-[#C8DDF5] dark:border-[#C8DDF5] text-slate-700 dark:text-white/80 max-w-[220px]"
          >
            <span className="truncate">{a.label}</span>
            <button
              onClick={() => onRemove(a.id)}
              className="text-slate-400 hover:text-[#7A1A1A] shrink-0"
              aria-label="Ta bort"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>

      <div className="flex items-center gap-3 text-xs">
        <span className={cn("tabular-nums font-semibold", positive ? "text-[#085041] dark:text-emerald-300" : "text-[#7A1A1A] dark:text-rose-300")}>
          {positive ? "+" : "−"}{fmt(totalImpact)} kr
        </span>
        {runwayDelta !== 0 && (
          <span className="tabular-nums font-medium text-[#3b82f6] dark:text-[#3b82f6]">
            Runway {runwayDelta > 0 ? "+" : ""}{runwayDelta} d
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <button
          onClick={onClear}
          className="text-xs px-2.5 py-1 rounded-md border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/80 hover:bg-white/60 dark:hover:bg-white/5 inline-flex items-center gap-1"
        >
          <RotateCcw className="h-3 w-3" />
          Återställ
        </button>
        <button
          onClick={onExecuteAll}
          className="text-xs px-3 py-1 rounded-md bg-[#3b82f6] hover:bg-[#3b82f6] text-white font-semibold inline-flex items-center gap-1"
        >
          <Play className="h-3 w-3" />
          Utför alla
        </button>
      </div>
    </div>
  );
}
