import { ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ImprovementSuggestion } from "@/lib/budget/confidenceEngine";
import type { BudgetDrivers } from "@/lib/budget/driverEngine";

interface Props {
  suggestions: ImprovementSuggestion[];
  onApplyDriverPatch?: (patch: Partial<BudgetDrivers>) => void;
  className?: string;
}

export function ConfidenceImprovementList({ suggestions, onApplyDriverPatch, className }: Props) {
  const navigate = useNavigate();

  if (suggestions.length === 0) {
    return (
      <div className={cn("text-xs text-[#085041] bg-[#E1F5EE] border border-[#BFE6D6] rounded-lg p-3", className)}>
        Inga förbättringsförslag — prognosens tillförlitlighet är hög.
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {suggestions.map((s) => (
        <div
          key={s.id}
          className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:border-[#3b82f6] transition-colors"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-900 truncate">{s.issue}</span>
              <span className="text-[10px] font-semibold text-[#085041] bg-[#E1F5EE] border border-[#BFE6D6] rounded-full px-1.5 py-0.5 whitespace-nowrap">
                +{s.expectedGain} poäng
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">{s.fix}</p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs gap-1 text-[#3b82f6] hover:text-[#3b82f6] hover:bg-[#EFF6FF]"
            onClick={() => {
              if (s.action.driverPatch && onApplyDriverPatch) {
                onApplyDriverPatch(s.action.driverPatch);
              } else if (s.action.href) {
                navigate(s.action.href);
              }
            }}
          >
            {s.action.driverPatch ? <Sparkles className="w-3 h-3" /> : null}
            Åtgärda
            <ArrowRight className="w-3 h-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}
