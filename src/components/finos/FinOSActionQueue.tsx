/**
 * FinOS — Action queue. Renders the top N "next-best-actions" extracted from
 * a list of FinOSInsights. Used by ModuleShell's `actions` slot.
 */
import { cn } from "@/lib/utils";
import { topN } from "@/lib/finos/ranking";
import type { FinOSInsight } from "@/lib/finos/insights";
import { SeverityBadge } from "./SeverityBadge";
import { FinOSActionButton } from "./FinOSActionButton";

interface Props {
  insights: FinOSInsight[];
  limit?: number;
  className?: string;
}

export function FinOSActionQueue({ insights, limit = 5, className }: Props) {
  const queue = topN(
    insights.filter((i) => i.actions?.length > 0 && (i.category === "next_best_action" || i.severity === "critical" || i.severity === "warning")),
    limit,
  );

  if (queue.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-6 text-center text-sm text-muted-foreground">
        Inga väntande åtgärder. AI bevakar i bakgrunden.
      </div>
    );
  }

  return (
    <ul className={cn("divide-y divide-slate-200/60 dark:divide-white/10 rounded-2xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-white/[0.04] overflow-hidden", className)}>
      {queue.map((i) => (
        <li key={i.id} className="flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors">
          <SeverityBadge severity={i.severity} withIcon />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{i.title}</p>
            <p className="text-xs text-muted-foreground truncate">{i.explanation}</p>
          </div>
          <FinOSActionButton action={i.actions[0]} size="sm" />
        </li>
      ))}
    </ul>
  );
}
