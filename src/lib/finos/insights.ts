/**
 * FinOS — Canonical AI output shape used by every module.
 *
 * Every AI generator (CFO scoring, VAT review, Tax Agent, Cash forecast,
 * Financial Analysis, Automation alerts) ultimately produces FinOSInsight[].
 * This guarantees one tone, one structure, one rendering primitive.
 */
import type { FinOSSeverity } from "./severity";
import type { FinOSAction } from "./actions";

export type FinOSInsightCategory =
  | "risk"
  | "recommendation"
  | "opportunity"
  | "next_best_action";

export type FinOSModule =
  | "dashboard"
  | "ai_ekonom"
  | "ai_cfo"
  | "financial_analysis"
  | "cash_command"
  | "automation"
  | "tax_agent"
  | "vat";

/** Reference for the 5-level drilldown drawer: KPI → Category → Account → Tx → Doc. */
export interface FinOSDrilldownRef {
  kpiId?: string;
  categoryId?: string;
  accountNumber?: string;
  journalEntryId?: string;
  documentId?: string;
  /** Module-specific context payload (period, scenario, vat box, etc.) */
  context?: Record<string, unknown>;
}

export interface FinOSEvidence {
  label: string;
  href?: string;
  /** Optional short hint shown next to the evidence link. */
  hint?: string;
}

export interface FinOSImpact {
  /** Signed amount: negative = cost/risk, positive = gain. */
  amount?: number;
  unit?: "SEK" | "days" | "%" | "count";
  horizon?: "today" | "7d" | "30d" | "quarter" | "year";
}

export interface FinOSInsight {
  id: string;
  module: FinOSModule;
  category: FinOSInsightCategory;
  severity: FinOSSeverity;
  /** 1-sentence verdict. Always Swedish, decision-oriented. */
  title: string;
  /** 1 paragraph explanation, data-backed (account numbers, SEK, dates). */
  explanation: string;
  impact?: FinOSImpact;
  /** 0..1 — drives sort tiebreak and confidence chip. */
  confidence: number;
  /** ≥1 piece of evidence — "AI shows receipts". */
  evidence?: FinOSEvidence[];
  /** Canonical actions; first one renders as primary CTA. */
  actions: FinOSAction[];
  /** Optional ISO date used by ranking when sooner = more urgent. */
  deadline?: string;
  drilldown?: FinOSDrilldownRef;
  /** Where the insight originated, for "as of" stamps. */
  source?: string;
}
