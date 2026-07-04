import { Button } from "@/components/ui/button";
import { X, Beaker, Check } from "lucide-react";
import type { SimulatedAction } from "@/lib/cashflow/simulate";

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(Math.round(n));

interface Props {
  pending: SimulatedAction[];
  weightedImpact: number;
  newRunwayDays: number;
  baseRunwayDays: number;
  onRemove: (id: string) => void;
  onApplyAll: () => void;
  onDiscard: () => void;
  applying: boolean;
}

export function ImpactPreviewBar({
  pending,
  weightedImpact,
  newRunwayDays,
  baseRunwayDays,
  onRemove,
  onApplyAll,
  onDiscard,
  applying,
}: Props) {
  if (pending.length === 0) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 rounded-full bg-[#3b82f6] text-white px-4 py-2 shadow-lg flex items-center gap-2 text-xs">
        <Beaker className="h-3.5 w-3.5" />
        Förhandsläge aktivt — välj åtgärder för att simulera effekten
      </div>
    );
  }
  const dRunway = newRunwayDays - baseRunwayDays;
  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 max-w-5xl mx-auto rounded-2xl border bg-background/95 backdrop-blur shadow-lg">
      <div className="p-4 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Beaker className="h-4 w-4 text-[#3b82f6]" />
          <span className="text-xs font-semibold uppercase tracking-wide">
            {pending.length} simulerade åtgärder
          </span>
        </div>
        <div className="flex-1 flex items-center gap-2 overflow-x-auto">
          {pending.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1 text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full whitespace-nowrap"
            >
              {p.label}
              <button onClick={() => onRemove(p.id)} className="hover:text-[#7A1A1A]">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="text-xs">
          <div>
            Δ Likviditet:{" "}
            <span className={`font-semibold tabular-nums ${weightedImpact >= 0 ? "text-[#085041]" : "text-[#7A1A1A]"}`}>
              {weightedImpact >= 0 ? "+" : ""}{fmt(weightedImpact)} kr
            </span>
          </div>
          <div>
            Δ Runway:{" "}
            <span className={`font-semibold tabular-nums ${dRunway >= 0 ? "text-[#085041]" : "text-[#7A1A1A]"}`}>
              {dRunway >= 0 ? "+" : ""}{dRunway} dgr
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onDiscard} disabled={applying}>
            Förkasta
          </Button>
          <Button
            size="sm"
            className="bg-[#3b82f6] hover:bg-[#3b82f6] text-white"
            onClick={onApplyAll}
            disabled={applying}
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            Verkställ alla
          </Button>
        </div>
      </div>
    </div>
  );
}
