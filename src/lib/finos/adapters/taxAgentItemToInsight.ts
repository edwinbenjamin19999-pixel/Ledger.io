/**
 * FinOS adapter — pending tax declarations → FinOSInsight.
 * Severity scales with deadline proximity.
 */
import type { FinOSInsight } from "../insights";
import type { FinOSAction } from "../actions";

export interface TaxAgentItem {
  id: string;
  label: string;
  type: string; // INK2 | AGI | F-skatt | OSS | etc.
  deadline: string; // ISO
  status: "ready" | "pending" | "submitted" | "overdue";
}

interface Handlers {
  onSubmit: (item: TaxAgentItem) => void;
  onReview: (item: TaxAgentItem) => void;
}

function severityFor(item: TaxAgentItem): FinOSInsight["severity"] {
  if (item.status === "submitted") return "positive";
  if (item.status === "overdue") return "critical";
  const days = Math.ceil((Date.parse(item.deadline) - Date.now()) / 86_400_000);
  if (days <= 3) return "critical";
  if (days <= 10) return "warning";
  if (days <= 30) return "watch";
  return "info";
}

export function taxAgentItemToInsight(item: TaxAgentItem, h: Handlers): FinOSInsight {
  const actions: FinOSAction[] =
    item.status === "ready"
      ? [
          { verb: "submit", onClick: () => h.onSubmit(item) },
          { verb: "review", onClick: () => h.onReview(item) },
        ]
      : [{ verb: "review", onClick: () => h.onReview(item) }];

  const days = Math.ceil((Date.parse(item.deadline) - Date.now()) / 86_400_000);
  return {
    id: `tax-${item.id}`,
    module: "tax_agent",
    category: item.status === "overdue" ? "risk" : "next_best_action",
    severity: severityFor(item),
    title: `${item.label} — ${item.type}`,
    explanation:
      item.status === "submitted"
        ? `Inlämnad. Inga ytterligare åtgärder behövs.`
        : item.status === "overdue"
          ? `Deadline passerade ${Math.abs(days)} dagar sedan. Lämna in snarast.`
          : `${days} dagar till deadline (${new Date(item.deadline).toLocaleDateString("sv-SE")}).`,
    confidence: 0.9,
    deadline: item.deadline,
    actions,
    source: "tax_agent",
  };
}
