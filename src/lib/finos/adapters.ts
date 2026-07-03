/**
 * FinOS — Adapters from existing module-specific shapes to the canonical
 * FinOSInsight. Adding a new source = add a new adapter, no UI changes.
 */
import type { CFOPriority } from "@/hooks/useCFOPriorities";
import type { AIAction } from "@/lib/ai-actions/types";
import type { FinOSInsight, FinOSInsightCategory } from "./insights";
import type { FinOSSeverity } from "./severity";
import type { FinOSAction, FinOSActionVerb } from "./actions";

/* ---------- CFO priorities (AI Ekonom + AI CFO) ---------- */

const CFO_TIER_TO_SEVERITY: Record<CFOPriority["tier"], FinOSSeverity> = {
  critical: "critical",
  high: "warning",
  medium: "watch",
  low: "info",
};

const CFO_ACTION_TO_VERB: Record<CFOPriority["action_type"], FinOSActionVerb> = {
  create_accrual: "fix",
  send_reminder: "fix",
  reclassify: "fix",
  apply_deferral: "fix",
  generate_report: "submit",
  none: "review",
};

export function cfoPriorityToInsight(
  p: CFOPriority,
  handlers: { onPrimary: () => void | Promise<void>; onIgnore?: () => void; pending?: boolean },
): FinOSInsight {
  const verb = CFO_ACTION_TO_VERB[p.action_type] ?? "review";
  const actions: FinOSAction[] = [
    { verb, label: p.cta_label, onClick: handlers.onPrimary, pending: handlers.pending },
  ];
  if (handlers.onIgnore) actions.push({ verb: "ignore", onClick: handlers.onIgnore });

  return {
    id: p.id,
    module: "ai_ekonom",
    category: p.action_type === "none" ? "risk" : "next_best_action",
    severity: CFO_TIER_TO_SEVERITY[p.tier],
    title: p.title,
    explanation: p.explanation,
    impact: p.impact_sek ? { amount: p.impact_sek, unit: "SEK" } : undefined,
    confidence: p.confidence,
    actions,
    source: p.source,
  };
}

/* ---------- AIAction (Cash Command, generated actions) ---------- */

const AIACTION_KIND_TO_SEVERITY: Record<AIAction["kind"], FinOSSeverity> = {
  risk: "warning",
  financial: "watch",
  optimization: "info",
};

const AIACTION_KIND_TO_CATEGORY: Record<AIAction["kind"], FinOSInsightCategory> = {
  risk: "risk",
  financial: "next_best_action",
  optimization: "opportunity",
};

const CONFIDENCE_TO_NUM: Record<AIAction["confidence"], number> = {
  high: 0.9,
  medium: 0.7,
  low: 0.5,
};

export function aiActionToInsight(a: AIAction, module: FinOSInsight["module"] = "cash_command"): FinOSInsight {
  const actions: FinOSAction[] = [
    { verb: "fix", label: a.primary.label, onClick: a.primary.onClick },
  ];
  if (a.secondary) {
    actions.push({ verb: "investigate", label: a.secondary.label, onClick: a.secondary.onClick });
  }

  return {
    id: a.id,
    module,
    category: AIACTION_KIND_TO_CATEGORY[a.kind],
    severity: AIACTION_KIND_TO_SEVERITY[a.kind],
    title: a.title,
    explanation: a.explanation,
    impact: a.impact?.amount ? { amount: a.impact.amount, unit: "SEK" } : undefined,
    confidence: CONFIDENCE_TO_NUM[a.confidence],
    evidence: a.evidence,
    actions,
    source: a.module,
  };
}
