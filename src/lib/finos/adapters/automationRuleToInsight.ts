/**
 * FinOS adapter — pending automation tasks → FinOSInsight.
 * Surfaces "next best action" insights from automation_tasks rows.
 */
import type { FinOSInsight } from "../insights";
import type { FinOSAction } from "../actions";

export interface AutomationTaskRow {
  id: string;
  task_type: string;
  status: string;
  created_at: string;
  approval_summary?: string | null;
}

interface Handlers {
  onReview: (t: AutomationTaskRow) => void;
  onApprove: (t: AutomationTaskRow) => void;
}

export function automationTaskToInsight(t: AutomationTaskRow, h: Handlers): FinOSInsight {
  const needsApproval = t.status === "needs_approval" || t.status === "pending_approval";
  const actions: FinOSAction[] = needsApproval
    ? [
        { verb: "approve", onClick: () => h.onApprove(t) },
        { verb: "review", onClick: () => h.onReview(t) },
      ]
    : [{ verb: "review", onClick: () => h.onReview(t) }];

  return {
    id: `automation-${t.id}`,
    module: "automation",
    category: "next_best_action",
    severity: needsApproval ? "warning" : "info",
    title: needsApproval
      ? `Automation väntar på godkännande: ${t.task_type}`
      : `Automation pågår: ${t.task_type}`,
    explanation:
      t.approval_summary ??
      `Skapad ${new Date(t.created_at).toLocaleString("sv-SE")}. Granska eller godkänn för att slutföra flödet.`,
    confidence: needsApproval ? 0.8 : 0.7,
    actions,
    source: "automation",
  };
}
