/**
 * FinOS adapter — VAT engine findings → FinOSInsight.
 * Maps deterministic rule-check output to the canonical insight shape.
 */
import type { VATFinding } from "@/lib/vat/vatReviewEngine";
import type { FinOSInsight } from "../insights";
import type { FinOSAction } from "../actions";
import type { FinOSSeverity } from "../severity";

const SEVERITY_MAP: Record<VATFinding["severity"], FinOSSeverity> = {
  critical: "critical",
  high: "warning",
  medium: "watch",
  info: "info",
};

interface Handlers {
  onFix: (f: VATFinding) => void;
  onDrilldown: (f: VATFinding) => void;
}

export function vatFindingToInsight(f: VATFinding, h: Handlers): FinOSInsight {
  const actions: FinOSAction[] = [
    { verb: "fix", label: f.suggestedFix ? "Åtgärda" : "Granska", onClick: () => h.onFix(f) },
  ];
  if (f.affectedBox) {
    actions.push({ verb: "open_drilldown", onClick: () => h.onDrilldown(f) });
  }

  return {
    id: `vat-${f.id}`,
    module: "vat",
    category: f.severity === "critical" || f.severity === "high" ? "risk" : "recommendation",
    severity: SEVERITY_MAP[f.severity],
    title: f.title,
    explanation: f.suggestedFix ? `${f.explanation} ${f.suggestedFix}` : f.explanation,
    impact: f.financialImpact ? { amount: f.financialImpact, unit: "SEK" } : undefined,
    confidence: f.confidence / 100,
    actions,
    drilldown: f.affectedBox ? { context: { boxId: f.affectedBox } } : undefined,
    source: "vat",
  };
}
