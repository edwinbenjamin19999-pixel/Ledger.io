/**
 * gapEngine — compute what is required to close a target gap.
 *
 * Pure function. Given current forecast totals + a target,
 * returns three actionable paths: revenue-only, cost-only, balanced.
 */

import type { BudgetDrivers } from "./driverEngine";

export type GapKpi = "ebit" | "revenue" | "cash" | "runway";

export interface GapInput {
  kpi: GapKpi;
  targetValue: number;
  currentValue: number;
  /** Period revenue used to convert deltas back to %. */
  periodRevenue: number;
  /** Period cost base used for cost-share spread. */
  periodCost: number;
  /** Daily burn rate used for runway delta. */
  dailyBurn: number;
}

export interface GapOption {
  id: "revenue" | "cost" | "balanced";
  label: string;
  description: string;
  deltaRevenue: number;
  deltaCost: number;
  ebitImpact: number;
  cashImpact: number;
  runwayDeltaDays: number;
  /** Driver patch suggested to apply this option. */
  driverPatch: Partial<BudgetDrivers>;
}

export interface GapResult {
  gapSEK: number;
  gapPct: number;
  requiredRevenueDelta: number;
  requiredCostDelta: number;
  options: GapOption[];
}

export function computeGap(
  input: GapInput,
  drivers: BudgetDrivers
): GapResult {
  const { kpi, targetValue, currentValue, periodRevenue, periodCost, dailyBurn } = input;
  const gapSEK = targetValue - currentValue;
  const gapPct = currentValue !== 0 ? (gapSEK / Math.abs(currentValue)) * 100 : 0;

  // Map any KPI gap to required EBIT delta
  let ebitGap = 0;
  if (kpi === "ebit") ebitGap = gapSEK;
  else if (kpi === "revenue") ebitGap = gapSEK * 0.3; // assume 30% margin contribution
  else if (kpi === "cash") ebitGap = gapSEK; // 1:1 simplification
  else if (kpi === "runway") ebitGap = gapSEK * dailyBurn;

  const safeBurn = Math.max(1, dailyBurn);

  // Path 1: revenue only
  const deltaRev1 = ebitGap / 0.5; // assume 50% contribution margin
  const opt1: GapOption = {
    id: "revenue",
    label: "Höj intäkter",
    description: `Kräver ${formatPct(deltaRev1, periodRevenue)}% mer intäkt.`,
    deltaRevenue: deltaRev1,
    deltaCost: 0,
    ebitImpact: ebitGap,
    cashImpact: ebitGap,
    runwayDeltaDays: Math.round(ebitGap / safeBurn),
    driverPatch: {
      priceGrowthRate: drivers.priceGrowthRate + Math.min(15, deltaRev1 / Math.max(1, periodRevenue) * 100),
    },
  };

  // Path 2: cost only
  const deltaCost2 = -ebitGap;
  const opt2: GapOption = {
    id: "cost",
    label: "Sänk kostnader",
    description: `Kräver ${formatPct(Math.abs(deltaCost2), periodCost)}% kostnadsminskning.`,
    deltaRevenue: 0,
    deltaCost: deltaCost2,
    ebitImpact: ebitGap,
    cashImpact: ebitGap,
    runwayDeltaDays: Math.round(ebitGap / safeBurn),
    driverPatch: {
      adminCosts: Math.max(0, drivers.adminCosts + deltaCost2 / 12 * 0.4),
      marketingBudget: Math.max(0, drivers.marketingBudget + deltaCost2 / 12 * 0.3),
      salaryMonthly: Math.max(0, drivers.salaryMonthly + deltaCost2 / 12 * 0.3),
    },
  };

  // Path 3: balanced
  const deltaRev3 = ebitGap * 0.5 / 0.5;
  const deltaCost3 = -ebitGap * 0.5;
  const opt3: GapOption = {
    id: "balanced",
    label: "Balanserat (50/50)",
    description: `Halv intäktsökning + halv kostnadssänkning.`,
    deltaRevenue: deltaRev3,
    deltaCost: deltaCost3,
    ebitImpact: ebitGap,
    cashImpact: ebitGap,
    runwayDeltaDays: Math.round(ebitGap / safeBurn),
    driverPatch: {
      priceGrowthRate: drivers.priceGrowthRate + Math.min(8, deltaRev3 / Math.max(1, periodRevenue) * 100),
      adminCosts: Math.max(0, drivers.adminCosts + deltaCost3 / 12 * 0.5),
      marketingBudget: Math.max(0, drivers.marketingBudget + deltaCost3 / 12 * 0.5),
    },
  };

  return {
    gapSEK,
    gapPct,
    requiredRevenueDelta: ebitGap > 0 ? deltaRev1 : 0,
    requiredCostDelta: ebitGap > 0 ? deltaCost2 : 0,
    options: ebitGap > 0 ? [opt1, opt2, opt3] : [],
  };
}

function formatPct(delta: number, base: number): string {
  if (base <= 0) return "—";
  return ((delta / base) * 100).toFixed(1);
}
