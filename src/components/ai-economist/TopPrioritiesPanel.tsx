import { useState } from "react";
import { ChevronDown, CheckCircle2 } from "lucide-react";
import { PriorityWorkflowCard } from "./PriorityWorkflowCard";
import type { CFOPriority } from "@/hooks/useCFOPriorities";

interface Props {
  top: CFOPriority[];
  more: CFOPriority[];
  companyId: string | null;
  onPrimary: (insight: CFOPriority, selectedItems: string[]) => void;
  onIgnore: (insight: CFOPriority) => void;
  pendingId: string | null;
  loading: boolean;
}

export function TopPrioritiesPanel({ top, more, companyId, onPrimary, onIgnore, pendingId, loading }: Props) {
  const [showMore, setShowMore] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight">
          Topp-prioriteringar just nu
        </h2>
        <span className="text-xs text-muted-foreground">Realtid · klicka för att inspektera poster</span>
      </div>

      {loading && top.length === 0 && (
        <div className="rounded-2xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-white/[0.03] p-8 text-center text-muted-foreground text-sm">
          AI analyserar din ekonomi…
        </div>
      )}

      {!loading && top.length === 0 && (
        <div className="rounded-2xl border border-[#BFE6D6] dark:border-[#BFE6D6] bg-[#E1F5EE] dark:bg-emerald-500/[0.06] p-8 text-center">
          <CheckCircle2 className="h-10 w-10 text-[#085041] dark:text-[#1D9E75] mx-auto mb-2" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Inget kritiskt att åtgärda</h3>
          <p className="text-sm text-muted-foreground mt-1">AI bevakar 47+ datapunkter live — vi hör av oss när något behöver din uppmärksamhet.</p>
        </div>
      )}

      <div className="space-y-3">
        {top.map((i) => (
          <PriorityWorkflowCard
            key={i.id}
            insight={i}
            companyId={companyId}
            onPrimary={onPrimary}
            onIgnore={onIgnore}
            pending={pendingId === i.id}
          />
        ))}
      </div>

      {more.length > 0 && (
        <div>
          <button
            onClick={() => setShowMore(s => !s)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-white/[0.03] hover:bg-slate-50 dark:hover:bg-white/[0.06] text-sm text-slate-700 dark:text-white/70 transition-all"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${showMore ? "rotate-180" : ""}`} />
            {showMore ? "Dölj" : `Visa ${more.length} fler insikter`}
          </button>
          {showMore && (
            <div className="space-y-3 mt-3">
              {more.map((i) => (
                <PriorityWorkflowCard
                  key={i.id}
                  insight={i}
                  companyId={companyId}
                  onPrimary={onPrimary}
                  onIgnore={onIgnore}
                  pending={pendingId === i.id}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
