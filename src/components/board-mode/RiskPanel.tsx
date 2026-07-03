import { AlertTriangle, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { BoardRisk } from "@/hooks/useBoardSummary";

const SEVERITY_COLOR: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-400",
  low: "bg-emerald-500",
};

export const RiskPanel = ({
  risks,
  onDrilldown,
}: {
  risks: BoardRisk[];
  onDrilldown?: (id: string) => void;
}) => {
  const navigate = useNavigate();
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-4 w-4 text-orange-400" />
        <h3 className="text-[11px] uppercase tracking-widest text-gray-400 font-medium">Risker</h3>
      </div>
      {risks.length === 0 ? (
        <div className="py-6">
          <p className="text-gray-600 text-sm">Allt under kontroll — inga kritiska risker just nu.</p>
        </div>
      ) : (
        <ul>
          {risks.map(r => (
            <li
              key={r.id}
              className="group flex items-start justify-between gap-3 py-3 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors"
              onClick={() => { onDrilldown?.(r.id); navigate("/ai-ekonom"); }}
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <span className={cn("mt-1.5 w-2 h-2 rounded-full shrink-0", SEVERITY_COLOR[r.severity])} />
                <div className="flex-1 min-w-0">
                  <p className="text-gray-800 text-sm font-medium leading-snug">{r.title}</p>
                  <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">{r.explanation}</p>
                  {r.impact !== 0 && (
                    <p className="text-red-400 text-xs font-medium mt-1 tabular-nums">
                      Påverkan: {Math.abs(r.impact).toLocaleString("sv-SE")} kr
                    </p>
                  )}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0 mt-1" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
