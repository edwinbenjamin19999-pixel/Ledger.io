/**
 * FinOS — Insight stack. Renders a deterministically-ordered list of
 * FinOSInsight cards. Used as the "AI insight layer" slot of every ModuleShell.
 */
import { cn } from "@/lib/utils";
import { rankInsights } from "@/lib/finos/ranking";
import type { FinOSInsight } from "@/lib/finos/insights";
import { FinOSInsightCard } from "./FinOSInsightCard";

interface Props {
  insights: FinOSInsight[];
  /** Optional cap; useful for "top 5" panels on Dashboard. */
  limit?: number;
  dense?: boolean;
  emptyState?: React.ReactNode;
  className?: string;
}

export function FinOSInsightStack({ insights, limit, dense, emptyState, className }: Props) {
  const ranked = rankInsights(insights);
  const visible = limit ? ranked.slice(0, limit) : ranked;

  if (visible.length === 0) {
    return emptyState ? <>{emptyState}</> : (
      <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/40 p-6 text-center text-sm text-emerald-900">
        Allt är uppdaterat. Jag säger till om något behöver uppmärksamhet.
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {visible.map((i) => (
        <FinOSInsightCard key={i.id} insight={i} dense={dense} />
      ))}
    </div>
  );
}
