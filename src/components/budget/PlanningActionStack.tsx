import { Link } from "react-router-dom";
import { Sparkles, ArrowRight, Beaker } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatSEK } from "@/lib/formatNumber";
import type { RankedAction } from "@/lib/budget/rankedActions";
import type { BudgetDrivers } from "@/lib/budget/driverEngine";

interface Props {
  actions: RankedAction[];
  onSimulate: (patch: Partial<BudgetDrivers>) => void;
}

export function PlanningActionStack({ actions, onSimulate }: Props) {
  if (actions.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-[#3b82f6]" />
        <h3 className="text-sm font-semibold text-slate-900">Topp 3 åtgärder</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {actions.map(a => (
          <div key={a.id} className="rounded-2xl border bg-white shadow-[0_4px_12px_rgba(15,23,42,0.04)] p-4 flex flex-col gap-2">
            <div className="text-sm font-semibold text-slate-900">{a.title}</div>
            <div className="text-xs text-slate-600 flex-1">{a.rationale}</div>
            <div className="text-xs tabular-nums text-[#085041] font-medium">
              +{formatSEK(a.impactSEK)}
              {a.marginPP != null && ` · Marginal +${a.marginPP.toFixed(1)} pp`}
              {a.runwayDays != null && a.runwayDays > 0 && ` · Runway +${a.runwayDays} d`}
            </div>
            <div className="flex gap-2 pt-1">
              <Button asChild size="sm" className="text-xs flex-1">
                <Link to={a.module.href}>
                  Verkställ <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </Button>
              {a.driverPatch && (
                <Button size="sm" variant="outline" className="text-xs" onClick={() => onSimulate(a.driverPatch!)}>
                  <Beaker className="w-3 h-3 mr-1" /> Simulera
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
