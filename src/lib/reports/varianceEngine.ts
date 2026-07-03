/**
 * Variance Engine — the ONLY place actual-vs-comparison deltas are computed.
 * UI components and AI prompts both consume this. Never re-implement.
 */

import type { AccountValues, ValueLayer } from "./valueLayers";

export type VarianceStatus = "positive" | "negative" | "neutral";

export interface Variance {
  amount: number;
  pct: number;
  status: VarianceStatus;
  /** True when the variance is favourable for the business (revenue↑ or cost↓). */
  isFavorable: boolean;
}

const ZERO_VARIANCE: Variance = {
  amount: 0,
  pct: 0,
  status: "neutral",
  isFavorable: true,
};

/**
 * Compute variance between two values.
 * `isRevenue` flips the favourable direction (positive Δ on revenue is good,
 * positive Δ on costs is bad).
 */
export function computeVariance(
  actual: number,
  comparison: number,
  isRevenue: boolean,
): Variance {
  const amount = actual - comparison;
  if (Math.abs(amount) < 0.005 && Math.abs(comparison) < 0.005) {
    return ZERO_VARIANCE;
  }
  const pct = comparison !== 0 ? (amount / Math.abs(comparison)) * 100 : 0;
  const status: VarianceStatus =
    Math.abs(amount) < 0.005 ? "neutral" : amount > 0 ? "positive" : "negative";
  const isFavorable = isRevenue ? amount >= 0 : amount <= 0;
  return { amount, pct, status, isFavorable };
}

/** Build a variance matrix keyed by account number. */
export function buildVarianceMatrix(
  actual: ValueLayer,
  comparison: ValueLayer | undefined,
  isRevenuePredicate: (accountNumber: string) => boolean,
  field: keyof AccountValues = "perioden",
): Map<string, Variance> {
  const out = new Map<string, Variance>();
  if (!comparison) return out;
  const keys = new Set<string>([
    ...actual.accounts.keys(),
    ...comparison.accounts.keys(),
  ]);
  keys.forEach((k) => {
    const a = actual.accounts.get(k);
    const c = comparison.accounts.get(k);
    const av = a ? (a[field] as number) : 0;
    const cv = c ? (c[field] as number) : 0;
    out.set(k, computeVariance(av, cv, isRevenuePredicate(k)));
  });
  return out;
}

/** Default Swedish BAS predicate: class 3 = revenue (favourable when up). */
export const isRevenueAccount = (accountNumber: string): boolean =>
  accountNumber.startsWith("3");
