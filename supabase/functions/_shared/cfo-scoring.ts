// 5-dimensional priority scoring for AI CFO insights.
// score = w_impact*impact + w_risk*risk + w_time*time + w_trend*trend + w_user*relevance

export type Tier = "critical" | "high" | "medium" | "low";

export interface ScoringInput {
  impactSek: number;       // |kr|
  impactNorm?: number;     // optional: pre-normalized 0..1
  risk: 0 | 0.5 | 1;       // low/med/high
  daysToDeadline?: number | null;
  trend: -1 | 0 | 1;       // improving / flat / worsening
  kind: string;            // insight kind for kind_weights lookup
  kindWeights?: Record<string, number>;
}

export interface Weights {
  impact: number; risk: number; time: number; trend: number; user: number;
}

export const DEFAULT_WEIGHTS: Weights = { impact: 0.30, risk: 0.20, time: 0.20, trend: 0.15, user: 0.15 };

export function normImpact(v: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(1, Math.max(0, Math.abs(v) / max));
}

function timeSensitivity(days?: number | null): number {
  if (days == null) return 0.3;
  if (days <= 0) return 1;
  // Exponential decay: 7d ≈ 0.71, 30d ≈ 0.30, 90d ≈ 0.04
  return Math.min(1, Math.exp(-days / 25));
}

function trendDir(t: -1 | 0 | 1): number {
  return t === 1 ? 1 : t === 0 ? 0.4 : 0;
}

function userRelevance(kind: string, kindWeights?: Record<string, number>): number {
  if (!kindWeights) return 0.5;
  const w = kindWeights[kind];
  if (typeof w !== "number") return 0.5;
  // Map weight (0.5..1.5) → relevance 0..1
  return Math.min(1, Math.max(0, (w - 0.5)));
}

// Persona-based weighting: business owners care about cash/revenue/customers,
// accountants care about technical accounting (accruals, VAT, BAS, year-end).
const PERSONA_BOOST: Record<"business_owner" | "accountant", Record<string, number>> = {
  business_owner: {
    liquidity: 1.35, cashflow_stability: 1.30, overdue_ar: 1.25,
    revenue: 1.20, concentration: 1.20, margin: 1.10, pricing: 1.10,
    cost: 1.05, profit_trend: 1.05,
    personnel: 0.95, anomaly: 0.90, annual_report: 0.85,
  },
  accountant: {
    annual_report: 1.40, anomaly: 1.30, cost: 1.20, personnel: 1.15,
    margin: 1.05, profit_trend: 1.05,
    liquidity: 0.90, cashflow_stability: 0.90, overdue_ar: 0.95,
    revenue: 0.85, concentration: 0.85, pricing: 0.90,
  },
};

export function personaBoost(kind: string, persona: "business_owner" | "accountant"): number {
  return PERSONA_BOOST[persona]?.[kind] ?? 1.0;
}

export function scoreInsight(
  input: ScoringInput,
  weights: Weights = DEFAULT_WEIGHTS,
  persona: "business_owner" | "accountant" = "business_owner",
): number {
  const impact = input.impactNorm ?? normImpact(input.impactSek, 200_000);
  const time = timeSensitivity(input.daysToDeadline);
  const trend = trendDir(input.trend);
  const relevance = userRelevance(input.kind, input.kindWeights);
  const base =
    weights.impact * impact +
    weights.risk * input.risk +
    weights.time * time +
    weights.trend * trend +
    weights.user * relevance;
  return base * personaBoost(input.kind, persona);
}

export function tierOf(score: number, urgency = 0): Tier {
  if (score >= 0.75 || urgency >= 0.95) return "critical";
  if (score >= 0.55) return "high";
  if (score >= 0.32) return "medium";
  return "low";
}
