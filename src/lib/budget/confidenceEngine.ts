/**
 * confidenceEngine — deterministic forecast confidence scoring.
 *
 * score = 0.30·data_quality + 0.30·historical_consistency
 *       + 0.25·variance_stability + 0.15·coverage
 * each component ∈ [0,1]; final ∈ [0,100].
 *
 * Pure function. No randomness. Stable across renders.
 */

import type { BudgetDrivers } from "./driverEngine";

export interface ConfidenceInput {
  /** From forecastEngine.confidenceInputs */
  accountsWithHistory: number;
  totalAccounts: number;
  monthsOfActuals: number;
  accountVariance: Record<string, number>;
  /** (actual − forecast) / forecast across last 6 months, per KPI bucket. */
  forecastErrors?: number[];
  /** Drivers — used to detect unrealistic settings. */
  drivers?: BudgetDrivers;
}

export interface ConfidenceComponents {
  dataQuality: number;
  historicalConsistency: number;
  varianceStability: number;
  coverage: number;
}

export type ConfidenceLevel = "high" | "medium" | "low";

export interface ConfidenceOutput {
  score: number;
  level: ConfidenceLevel;
  components: ConfidenceComponents;
  weightedComponents: ConfidenceComponents;
  top3WeakSignals: WeakSignal[];
}

export interface WeakSignal {
  account: string;
  variance: number;
  reason: string;
}

const W_DATA = 0.30;
const W_CONS = 0.30;
const W_VAR = 0.25;
const W_COV = 0.15;

export function computeConfidence(input: ConfidenceInput): ConfidenceOutput {
  const dataQuality = clamp01(
    input.totalAccounts > 0 ? input.accountsWithHistory / input.totalAccounts : 0
  );

  const variances = Object.values(input.accountVariance);
  // Lower CV mean = higher consistency. Normalize: CV 0 = 1.0, CV ≥ 1.5 = 0.
  const meanCV =
    variances.length === 0
      ? 0
      : variances.reduce((s, v) => s + v, 0) / variances.length;
  const historicalConsistency = clamp01(1 - meanCV / 1.5);

  // Variance stability from forecast errors stddev
  const errs = input.forecastErrors ?? [];
  let varianceStability = 0.7; // neutral when no error history
  if (errs.length >= 3) {
    const m = errs.reduce((s, v) => s + v, 0) / errs.length;
    const sd = Math.sqrt(errs.reduce((s, v) => s + (v - m) ** 2, 0) / errs.length);
    varianceStability = clamp01(1 - sd / 0.5); // sd ≥ 50% → 0
  }

  const coverage = clamp01(input.monthsOfActuals / 12);

  const components: ConfidenceComponents = {
    dataQuality,
    historicalConsistency,
    varianceStability,
    coverage,
  };

  const weightedComponents: ConfidenceComponents = {
    dataQuality: dataQuality * W_DATA,
    historicalConsistency: historicalConsistency * W_CONS,
    varianceStability: varianceStability * W_VAR,
    coverage: coverage * W_COV,
  };

  const score = Math.round(
    (weightedComponents.dataQuality +
      weightedComponents.historicalConsistency +
      weightedComponents.varianceStability +
      weightedComponents.coverage) *
      100
  );

  const level: ConfidenceLevel = score >= 75 ? "high" : score >= 50 ? "medium" : "low";

  // Top weak signals = accounts with highest variance
  const top3WeakSignals: WeakSignal[] = Object.entries(input.accountVariance)
    .filter(([, v]) => v > 0.5)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([acc, v]) => ({
      account: acc,
      variance: v,
      reason: v > 1 ? "Mycket hög månadsvarians" : "Hög månadsvarians",
    }));

  return { score, level, components, weightedComponents, top3WeakSignals };
}

export interface ImprovementSuggestion {
  id: string;
  issue: string;
  fix: string;
  expectedGain: number;
  action: { href?: string; driverPatch?: Partial<BudgetDrivers> };
}

export function suggestImprovements(
  output: ConfidenceOutput,
  input: ConfidenceInput
): ImprovementSuggestion[] {
  const out: ImprovementSuggestion[] = [];

  // Missing history
  const missing = input.totalAccounts - input.accountsWithHistory;
  if (missing > 0 && input.totalAccounts > 0) {
    const expectedGain = Math.round((missing / input.totalAccounts) * 30);
    out.push({
      id: "missing-history",
      issue: `Saknad historik för ${missing} konton`,
      fix: "Importera SIE-fil för föregående år",
      expectedGain,
      action: { href: "/migration" },
    });
  }

  // Coverage
  if (input.monthsOfActuals < 6) {
    out.push({
      id: "coverage",
      issue: `Endast ${input.monthsOfActuals} månader utfall i år`,
      fix: "Bokför fler perioder eller importera tidigare data",
      expectedGain: Math.round((6 - input.monthsOfActuals) * 2),
      action: { href: "/verifikationer" },
    });
  }

  // Variance hotspots
  for (const w of output.top3WeakSignals) {
    out.push({
      id: `variance-${w.account}`,
      issue: `Hög varians i konto ${w.account}`,
      fix: "Markera enstaka utlägg som engångspost eller granska bokningar",
      expectedGain: Math.round(Math.min(8, w.variance * 4)),
      action: { href: `/budget?focus=${w.account}` },
    });
  }

  // Unrealistic growth
  const d = input.drivers;
  if (d && d.priceGrowthRate > 20) {
    out.push({
      id: "unrealistic-growth",
      issue: `Orealistisk tillväxt ${d.priceGrowthRate.toFixed(0)}%/år i prognosen`,
      fix: "Sänk priceGrowthRate till ≤ 10% för stabilare prognos",
      expectedGain: 6,
      action: { driverPatch: { priceGrowthRate: 8 } },
    });
  }
  if (d && d.churnRate > 10) {
    out.push({
      id: "high-churn",
      issue: `Hög churn antagen (${d.churnRate.toFixed(1)}%/mån)`,
      fix: "Verifiera kundbortfall mot faktisk historik",
      expectedGain: 4,
      action: { href: "/customers" },
    });
  }

  return out.sort((a, b) => b.expectedGain - a.expectedGain).slice(0, 5);
}

/** Confidence trend label from a series of recent scores. */
export function computeConfidenceTrend(history: { score: number; at: string }[]): {
  direction: "up" | "down" | "flat";
  label: string;
  slope: number;
  lastDrop: number;
} {
  if (history.length < 2) {
    return { direction: "flat", label: "Stabil", slope: 0, lastDrop: 0 };
  }
  const sorted = [...history].sort((a, b) => +new Date(a.at) - +new Date(b.at));
  const recent = sorted.slice(-7);
  const xs = recent.map((_, i) => i);
  const ys = recent.map((p) => p.score);
  const n = xs.length;
  const sx = xs.reduce((s, v) => s + v, 0);
  const sy = ys.reduce((s, v) => s + v, 0);
  const sxy = xs.reduce((s, x, i) => s + x * ys[i], 0);
  const sxx = xs.reduce((s, v) => s + v * v, 0);
  const denom = n * sxx - sx * sx;
  const slope = denom === 0 ? 0 : (n * sxy - sx * sy) / denom;

  const lastTwo = sorted.slice(-2);
  const lastDrop = lastTwo.length === 2 ? lastTwo[0].score - lastTwo[1].score : 0;

  let direction: "up" | "down" | "flat" = "flat";
  let label = "Stabil";
  if (slope > 2) {
    direction = "up";
    label = "Förbättras";
  } else if (slope < -2) {
    direction = "down";
    label = "Försämras";
  }
  return { direction, label, slope, lastDrop };
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}
