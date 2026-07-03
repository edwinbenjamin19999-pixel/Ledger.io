export type ActionKind = "financial" | "risk" | "optimization";
export type ActionConfidence = "high" | "medium" | "low";

export interface ActionImpact {
  amount?: number;
  label: string;
}

export interface ActionEvidence {
  label: string;
  href?: string;
}

export interface ActionCTA {
  label: string;
  onClick: () => void | Promise<void>;
}

export interface AIAction {
  id: string;
  kind: ActionKind;
  module: string;
  title: string;
  explanation: string;
  impact?: ActionImpact;
  confidence: ActionConfidence;
  primary: ActionCTA;
  secondary?: ActionCTA;
  evidence?: ActionEvidence[];
}

/** Tröskelvärden — single source of truth, inga magic numbers i generators. */
export const ACTION_THRESHOLDS = {
  OVERDUE_TOTAL_SEK: 50_000,
  OVERDUE_INVOICE_SEK: 25_000,
  CONCENTRATION_TOP3_PCT: 0.5,
  COST_VARIANCE_PCT: 0.15,
  MARGIN_DROP_PP: 5,
  RUNWAY_DAYS_WARN: 90,
} as const;

/** Härled konfidens från datakvalitet — fler observationer = högre tilltro. */
export function deriveConfidence(observationCount: number): ActionConfidence {
  if (observationCount > 10) return "high";
  if (observationCount >= 3) return "medium";
  return "low";
}
