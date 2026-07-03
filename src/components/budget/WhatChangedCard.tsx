import { ArrowDownRight, ArrowUpRight, ChevronRight, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatSEKCompact } from "@/lib/formatNumber";
import type { WhatChangedItem } from "@/lib/budget/whatChangedEngine";

interface Props {
  items: WhatChangedItem[];
  onPick: (item: WhatChangedItem) => void;
}

export function WhatChangedCard({ items, onPick }: Props) {
  return (
    <div className="rounded-2xl border bg-white shadow-[0_4px_12px_rgba(15,23,42,0.04)] p-4">
      <div className="flex items-center gap-2 mb-3">
        <History className="w-3.5 h-3.5 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-900">Vad har förändrats</h3>
        <span className="text-[10px] text-slate-500">vs föregående period</span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-slate-500 italic">Inga större förändringar identifierade.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map(it => {
            const positive = it.severity === "positive";
            const Arrow = positive ? ArrowUpRight : ArrowDownRight;
            const color = positive ? "text-[#085041]" : it.severity === "neutral" ? "text-slate-600" : "text-[#7A1A1A]";
            return (
              <li key={it.id}>
                <button
                  type="button"
                  onClick={() => onPick(it)}
                  className="w-full text-left rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-cyan-50/40 hover:border-[#C8DDF5] transition-colors p-2.5 flex items-start gap-2"
                >
                  <Arrow className={cn("w-4 h-4 mt-0.5 shrink-0", color)} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-900">{it.label}</div>
                    <div className="text-[11px] text-slate-600 truncate">{it.detail}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn("text-[10px] tabular-nums font-medium px-1.5 py-0.5 rounded border", positive ? "border-[#BFE6D6] bg-[#E1F5EE] text-[#085041]" : "border-[#F4C8C8] bg-[#FCE8E8] text-[#7A1A1A]")}>
                        EBIT {it.impactEbit >= 0 ? "+" : ""}{formatSEKCompact(it.impactEbit)}
                      </span>
                      <span className={cn("text-[10px] tabular-nums font-medium px-1.5 py-0.5 rounded border border-slate-200 bg-white text-slate-700")}>
                        Runway {it.impactRunway >= 0 ? "+" : ""}{it.impactRunway} d
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 mt-0.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
