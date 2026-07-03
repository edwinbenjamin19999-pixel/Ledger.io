/**
 * FinOS — Canonical insight card. Replaces every ad-hoc "alert" / "insight" /
 * "priority" card across all 8 modules. Identical anatomy:
 *   [severity bar] · [badge + confidence + source] · title · explanation
 *                                                  · impact · evidence · actions
 */
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { SEVERITY } from "@/lib/finos/severity";
import { formatSignedSEK, formatConfidence } from "@/lib/finos/format";
import type { FinOSInsight } from "@/lib/finos/insights";
import { SeverityBadge } from "./SeverityBadge";
import { FinOSActionBar } from "./FinOSActionBar";

interface Props {
  insight: FinOSInsight;
  /** Compact variant used in dense lists (Dashboard top-5). */
  dense?: boolean;
  className?: string;
}

const CATEGORY_LABEL: Record<FinOSInsight["category"], string> = {
  risk: "Risk",
  recommendation: "Rekommendation",
  opportunity: "Möjlighet",
  next_best_action: "Nästa åtgärd",
};

export function FinOSInsightCard({ insight, dense = false, className }: Props) {
  const [expanded, setExpanded] = useState(false);
  const sev = SEVERITY[insight.severity];
  const isNeg = (insight.impact?.amount ?? 0) < 0;

  return (
    <article
      className={cn(
        "relative overflow-hidden bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] p-[14px] transition-colors",
        "hover:border-[#CBD5E1]",
        className,
      )}
      style={{ borderLeftWidth: 3, borderLeftColor: insight.severity === "critical" ? "#E24B4A" : insight.severity === "warning" ? "#EF9F27" : insight.severity === "watch" ? "#1D4ED8" : insight.severity === "positive" ? "#1D9E75" : "#94A3B8" }}
    >
      <header className="flex items-center gap-2 mb-2 flex-wrap">
        <SeverityBadge severity={insight.severity} />
        <span className="text-[10px] uppercase tracking-[0.07em] text-[#94A3B8] font-medium">
          {CATEGORY_LABEL[insight.category]}
        </span>
        <span className="text-[10px] text-[#94A3B8]">·</span>
        <span className="text-[10px] text-[#94A3B8]">
          Konfidens {formatConfidence(insight.confidence)}
        </span>
        {insight.source && (
          <>
            <span className="text-[10px] text-[#94A3B8]">·</span>
            <span className="text-[10px] text-[#94A3B8]">{insight.source}</span>
          </>
        )}
      </header>

      <h3 className={cn("font-medium text-[#0F172A] leading-tight", dense ? "text-[13px]" : "text-[14px]")}>
        {insight.title}
      </h3>
      <p className={cn("text-[#475569] mt-1.5 leading-relaxed", dense ? "text-[11px]" : "text-[12px]")}>
        {insight.explanation}
      </p>

      {insight.impact?.amount != null && insight.impact.amount !== 0 && (
        <div className="mt-3 flex items-baseline gap-2">
          <span
            className={cn(
              "font-medium tabular-nums tracking-[-0.02em] text-[16px]",
              isNeg ? "text-[#E24B4A]" : "text-[#1D9E75]",
            )}
          >
            {formatSignedSEK(insight.impact.amount)}
          </span>
          <span className="text-[10px] text-[#94A3B8]">finansiell påverkan</span>
        </div>
      )}

      {insight.evidence && insight.evidence.length > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronDown className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")} />
          {insight.evidence.length} underlag
        </button>
      )}

      {expanded && insight.evidence && (
        <ul className="mt-2 p-3 rounded-lg bg-slate-50 dark:bg-black/20 border border-slate-200/60 dark:border-white/5 text-xs text-slate-600 dark:text-white/60 space-y-1">
          {insight.evidence.map((e, i) => (
            <li key={i} className="flex items-center gap-2">
              {e.href ? (
                <a href={e.href} className="underline underline-offset-2 hover:text-[#3b82f6]">{e.label}</a>
              ) : (
                <span>{e.label}</span>
              )}
              {e.hint && <span className="text-muted-foreground/70">— {e.hint}</span>}
            </li>
          ))}
        </ul>
      )}

      {insight.actions.length > 0 && (
        <footer className="mt-4">
          <FinOSActionBar actions={insight.actions} size={dense ? "sm" : "md"} />
        </footer>
      )}
    </article>
  );
}
