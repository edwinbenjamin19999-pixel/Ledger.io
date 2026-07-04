import { Lightbulb } from "lucide-react";
import { AIActionCard } from "./AIActionCard";
import { useActionDismissals } from "@/hooks/useActionDismissals";
import type { AIAction } from "@/lib/ai-actions/types";
import { cn } from "@/lib/utils";

interface Props {
  actions: AIAction[];
  companyId?: string | null;
  title?: string;
  /** Max columns at lg breakpoint. Defaults to 2. */
  maxCols?: 1 | 2 | 3;
  className?: string;
  /** Hide the heading/wrapper if there are no actions. Defaults to true. */
  hideWhenEmpty?: boolean;
}

export function ActionRow({
  actions,
  companyId,
  title = "AI-förslag",
  maxCols = 2,
  className,
  hideWhenEmpty = true,
}: Props) {
  const { isDismissed, dismiss, loaded } = useActionDismissals(companyId);

  if (!loaded && companyId) return null;

  const visible = actions.filter((a) => !isDismissed(a.id));
  if (visible.length === 0 && hideWhenEmpty) return null;

  const colsCls =
    maxCols === 3
      ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      : maxCols === 2
      ? "grid-cols-1 lg:grid-cols-2"
      : "grid-cols-1";

  return (
    <div className={cn("rounded-2xl border bg-card p-4 sm:p-5", className)}>
      <div className="flex items-center gap-2 mb-4">
        <div className="h-7 w-7 rounded-lg bg-[#EFF6FF] border border-[#C8DDF5] flex items-center justify-center">
          <Lightbulb className="h-3.5 w-3.5 text-[#3b82f6] dark:text-[#1E3A5F]" />
        </div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground ml-1">
          {visible.length} {visible.length === 1 ? "åtgärd" : "åtgärder"}
        </span>
      </div>
      <div className={cn("grid auto-rows-fr gap-3", colsCls)}>
        {visible.map((a) => (
          <AIActionCard key={a.id} action={a} onDismiss={dismiss} />
        ))}
      </div>
    </div>
  );
}
