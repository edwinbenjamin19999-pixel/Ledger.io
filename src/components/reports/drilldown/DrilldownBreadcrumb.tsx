/**
 * Sticky breadcrumb at top of the drilldown drawer.
 * Each step is clickable to navigate back up the chain.
 */
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbStep {
  label: string;
  /** Click to jump to this level (omit for the current/last step). */
  onClick?: () => void;
}

interface DrilldownBreadcrumbProps {
  steps: BreadcrumbStep[];
}

export function DrilldownBreadcrumb({ steps }: DrilldownBreadcrumbProps) {
  return (
    <nav
      aria-label="Drilldown-väg"
      className="sticky top-0 z-10 -mx-6 -mt-6 mb-4 border-b border-border bg-card/95 px-6 py-3 backdrop-blur"
    >
      <ol className="flex flex-wrap items-center gap-1 text-xs">
        {steps.map((s, i) => {
          const isLast = i === steps.length - 1;
          return (
            <li key={i} className="flex items-center gap-1">
              {s.onClick && !isLast ? (
                <button
                  type="button"
                  onClick={s.onClick}
                  className="rounded px-1.5 py-0.5 font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {s.label}
                </button>
              ) : (
                <span
                  className={cn(
                    "px-1.5 py-0.5",
                    isLast ? "font-semibold text-foreground" : "text-muted-foreground",
                  )}
                >
                  {s.label}
                </span>
              )}
              {!isLast && <ChevronRight className="h-3 w-3 text-muted-foreground/50" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
