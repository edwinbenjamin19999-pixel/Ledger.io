/**
 * Target-driven planning: back-calculate required Δ per period
 * to reach a user-defined EBIT/Revenue/Cash target by date.
 */
import type { RRMonth, KFMonth } from "./driverEngine";

export type TargetKpi = "ebit" | "revenue" | "cash" | "runway";
export type TargetPeriod = "Q1" | "Q2" | "Q3" | "Q4" | "P1" | "P2" | "P3" | "P4";

export interface TargetInput {
  kpi: TargetKpi;
  targetValue: number;
  period: TargetPeriod;
}

export interface PeriodPlan {
  period: TargetPeriod;
  monthsCovered: number[];
  currentValue: number;
  requiredValue: number;
  gap: number;
  gapPct: number;
  requiredRevenueDelta?: number;
  requiredCostDelta?: number;
  requiredMarginDelta?: number;
  recommendation: string;
}

const PERIOD_MONTHS: Record<TargetPeriod, number[]> = {
  Q1: [0, 1, 2],
  Q2: [3, 4, 5],
  Q3: [6, 7, 8],
  Q4: [9, 10, 11],
  P1: [0, 1, 2],
  P2: [3, 4, 5],
  P3: [6, 7, 8],
  P4: [9, 10, 11],
};

function sumMonths(arr: number[], months: number[]): number {
  return months.reduce((s, i) => s + (arr[i] || 0), 0);
}

export function buildTargetPlan(
  input: TargetInput,
  rr: RRMonth[],
  kf: KFMonth[]
): PeriodPlan {
  const months = PERIOD_MONTHS[input.period];

  let currentValue = 0;
  if (input.kpi === "ebit") {
    currentValue = sumMonths(rr.map(m => m.ebit), months);
  } else if (input.kpi === "revenue") {
    currentValue = sumMonths(rr.map(m => m.revenue), months);
  } else if (input.kpi === "cash") {
    const lastIdx = months[months.length - 1];
    currentValue = kf[lastIdx]?.closingCash ?? 0;
  } else if (input.kpi === "runway") {
    const lastIdx = months[months.length - 1];
    const cash = kf[lastIdx]?.closingCash ?? 0;
    const burn = Math.abs(Math.min(0, kf[lastIdx]?.netCashFlow ?? 0));
    currentValue = burn > 0 ? Math.floor(cash / burn) : 999;
  }

  const gap = input.targetValue - currentValue;
  const gapPct = currentValue !== 0 ? (gap / Math.abs(currentValue)) * 100 : 0;

  // Required deltas
  const periodRevenue = sumMonths(rr.map(m => m.revenue), months);
  const periodCost = sumMonths(rr.map(m => m.cogs + m.totalOpex), months);

  let requiredRevenueDelta: number | undefined;
  let requiredCostDelta: number | undefined;
  let requiredMarginDelta: number | undefined;
  let recommendation = "";

  if (input.kpi === "ebit") {
    // Split gap 50/50 revenue up vs cost down
    requiredRevenueDelta = gap * 0.5;
    requiredCostDelta = -gap * 0.5;
    requiredMarginDelta = periodRevenue > 0 ? (gap / periodRevenue) * 100 : 0;
    recommendation =
      gap > 0
        ? `Öka intäkter ${Math.round(requiredRevenueDelta).toLocaleString("sv-SE")} kr eller minska kostnader ${Math.round(-requiredCostDelta).toLocaleString("sv-SE")} kr i ${input.period}.`
        : `Marginalen håller — fokus på lönsamhet.`;
  } else if (input.kpi === "revenue") {
    requiredRevenueDelta = gap;
    recommendation =
      gap > 0
        ? `Behov av ${Math.round(gap).toLocaleString("sv-SE")} kr i extra intäkt under ${input.period}.`
        : `Intäktsmål uppnått.`;
  } else if (input.kpi === "cash") {
    requiredCostDelta = -gap;
    recommendation =
      gap > 0
        ? `Frigör ${Math.round(gap).toLocaleString("sv-SE")} kr i kassa via kostnadsminskning eller intäktsökning.`
        : `Kassamål uppnått.`;
  } else {
    recommendation = gap > 0 ? `Förläng runway med ${Math.round(gap)} dagar.` : `Runway-mål uppnått.`;
  }

  return {
    period: input.period,
    monthsCovered: months,
    currentValue,
    requiredValue: input.targetValue,
    gap,
    gapPct,
    requiredRevenueDelta,
    requiredCostDelta,
    requiredMarginDelta,
    recommendation,
  };
}
