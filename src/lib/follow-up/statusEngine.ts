/**
 * statusEngine — derive the high-level "On track / At risk / Off track" verdict
 * from variance KPIs, projected EBIT vs target, and runway trend.
 *
 * Pure function. Deterministic.
 */

import type { VarianceDriver, VarianceKPIs } from "./varianceEngine";

export type PerformanceStatus = "on_track" | "at_risk" | "off_track";

export interface StatusInput {
  kpis: VarianceKPIs;
  topDrivers: VarianceDriver[];
  /** Optional projected full-year EBIT (used in live_forecast). */
  projectedEbit?: number;
  /** Target/goal for EBIT (full-year). When omitted, falls back to budget. */
  ebitTarget?: number;
  /** Optional runway delta in days (negative = shrinking). */
  runwayDeltaDays?: number;
}

export interface StatusOutput {
  status: PerformanceStatus;
  reason: string;
  /** The single most material driver, used for the headline. */
  headlineDriver?: VarianceDriver;
  /** Projected miss vs target (negative = shortfall). */
  projectedMiss?: number;
}

export function computeStatus(input: StatusInput): StatusOutput {
  const { kpis, topDrivers, projectedEbit, ebitTarget, runwayDeltaDays } = input;

  const target = ebitTarget ?? kpis.ebit.budget;
  const projection = projectedEbit ?? kpis.ebit.actual;
  const projectedMiss = projection - target; // negative = miss

  // Material EBIT variance — relative to budget magnitude
  const ebitMagnitude = Math.max(1, Math.abs(target));
  const ebitVariancePct = (kpis.ebit.variance / ebitMagnitude) * 100;

  let status: PerformanceStatus = "on_track";
  let reason = "Verksamheten ligger i linje med budget.";

  // Off track: EBIT >10% sämre än mål, eller projicerad miss > 15%
  if (ebitVariancePct < -10 || (target !== 0 && projectedMiss / ebitMagnitude < -0.15)) {
    status = "off_track";
  } else if (ebitVariancePct < -3 || (target !== 0 && projectedMiss / ebitMagnitude < -0.05)) {
    status = "at_risk";
  } else if (ebitVariancePct > 5) {
    status = "on_track";
  }

  // Runway-trend kan eskalera status
  if (runwayDeltaDays !== undefined && runwayDeltaDays < -30 && status === "at_risk") {
    status = "off_track";
  } else if (runwayDeltaDays !== undefined && runwayDeltaDays < -15 && status === "on_track") {
    status = "at_risk";
  }

  const headlineDriver = topDrivers.find((d) => d.direction === "bad") ?? topDrivers[0];

  if (headlineDriver) {
    const sign = headlineDriver.variance > 0 ? "över" : "under";
    const pct = Math.abs(headlineDriver.variancePct).toFixed(0);
    reason = `${headlineDriver.account_name} ${pct}% ${sign} budget — påverkar EBIT med ${formatShort(headlineDriver.ebitImpact)} kr.`;
  } else if (projectedMiss < 0) {
    reason = `Prognosen pekar mot ${formatShort(Math.abs(projectedMiss))} kr lägre EBIT än mål vid årets slut.`;
  } else if (status === "on_track") {
    reason = `EBIT ligger ${formatShort(kpis.ebit.variance)} kr över budget.`;
  }

  return { status, reason, headlineDriver, projectedMiss };
}

function formatShort(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1000) return `${Math.round(n / 1000)}k`;
  return Math.round(n).toLocaleString("sv-SE");
}
