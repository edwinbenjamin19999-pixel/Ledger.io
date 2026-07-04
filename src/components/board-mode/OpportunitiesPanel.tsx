import { Lightbulb } from "lucide-react";
import type { BoardOpportunity } from "@/hooks/useBoardSummary";

export const OpportunitiesPanel = ({ opportunities }: { opportunities: BoardOpportunity[] }) => (
  <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
    <div className="flex items-center gap-2 mb-4">
      <Lightbulb className="h-4 w-4 text-emerald-500" />
      <h3 className="text-[11px] uppercase tracking-widest text-gray-400 font-medium">Möjligheter</h3>
    </div>
    {opportunities.length === 0 ? (
      <p className="text-gray-400 text-sm">Inga konkreta möjligheter identifierade just nu.</p>
    ) : (
      <div className="grid md:grid-cols-3 gap-4">
        {opportunities.map((o, i) => (
          <div key={i} className="rounded-xl bg-emerald-50 border border-emerald-100 p-5">
            <p className="text-gray-800 font-medium text-sm leading-snug mb-2">{o.title}</p>
            <p className="text-gray-500 text-xs leading-relaxed mb-4">{o.explanation}</p>
            <div className="text-emerald-600 text-lg font-light tabular-nums">
              +{Math.abs(o.estimated_impact).toLocaleString("sv-SE")} <span className="text-xs text-emerald-500/70">kr</span>
            </div>
            <p className="text-gray-400 text-xs mt-2 italic">{o.action}</p>
          </div>
        ))}
      </div>
    )}
  </div>
);
