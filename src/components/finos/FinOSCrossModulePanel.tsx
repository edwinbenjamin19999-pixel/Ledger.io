/**
 * FinOS — Cross-module insight panel.
 *
 * Mounts the same insight layer in every core module. On the Dashboard it
 * aggregates the full platform stream; inside a specific module it scopes to
 * that module's own insights. Same anatomy, same ranking, same actions —
 * everywhere.
 */
import { Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { FinOSInsightStack } from "./FinOSInsightStack";
import { useFinOSInsights } from "@/hooks/useFinOSInsights";
import type { FinOSModule } from "@/lib/finos/insights";

interface Props {
  companyId: string | null;
  /** Restrict to subset of modules. Omit on Dashboard for full platform view. */
  modules?: FinOSModule[];
  /** Cap how many cards to render. */
  limit?: number;
  title?: string;
  hint?: string;
  dense?: boolean;
  personaMode?: "business_owner" | "accountant";
}

export function FinOSCrossModulePanel({
  companyId,
  modules,
  limit = 5,
  title = "AI-insikter",
  hint,
  dense = false,
  personaMode,
}: Props) {
  const { insights: rawInsights, loading } = useFinOSInsights(companyId, { modules, personaMode });
  // Filter out meaningless insights:
  //  - SEK-impact insights with 0/null amount
  //  - Titles that explicitly mention "med 0 kr" (auto-generated but worthless)
  const insights = rawInsights.filter((i) => {
    if (i.impact?.unit === "SEK" && (i.impact.amount == null || i.impact.amount === 0)) return false;
    if (i.title?.includes("med 0 kr") || i.title?.includes("0 kr")) {
      // Only drop the literal "0 kr" cases, not e.g. "10 kr" — guard with word boundaries.
      if (/\b0\s*kr\b/i.test(i.title)) return false;
    }
    return true;
  });

  return (
    <section>
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-[#3b82f6]" />
          {title}
        </h2>
        <span className="text-[11px] text-muted-foreground">
          {hint ?? `Sorterat efter allvar · top ${limit}`}
        </span>
      </div>

      {loading && insights.length === 0 ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      ) : (
        <FinOSInsightStack insights={insights} limit={limit} dense={dense} />
      )}
    </section>
  );
}
