/**
 * Trend Engine — pure helpers for computing monthly/quarterly trend direction
 * and sparkline series for KPIs (revenue, costs, ebit, cash) and per-account.
 *
 * Direction is derived from a simple linear regression slope across the most
 * recent N buckets (6 months / 4 quarters). Pct change uses last vs first.
 */

export type Timeframe = "month" | "quarter";
export type TrendDirection = "up" | "flat" | "down";

export interface TrendResult {
  direction: TrendDirection;
  changePct: number;
  sparkline: number[];
}

/** Aggregate a 12-element monthly series into 4 quarterly buckets. */
export function toQuarters(monthly: number[]): number[] {
  const q = [0, 0, 0, 0];
  for (let i = 0; i < monthly.length; i++) q[Math.floor(i / 3)] += monthly[i] || 0;
  return q;
}

/** Linear regression slope through (i, y_i). */
function slope(series: number[]): number {
  if (series.length < 2) return 0;
  const n = series.length;
  const sumX = (n * (n - 1)) / 2;
  const sumY = series.reduce((s, v) => s + v, 0);
  const sumXY = series.reduce((s, v, i) => s + i * v, 0);
  const sumXX = series.reduce((s, _, i) => s + i * i, 0);
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

/**
 * Direction is based on slope normalised by the average abs value of the series.
 * Threshold: 2% to consider it a real movement (otherwise "flat").
 */
export function computeTrend(
  monthlySeries: number[],
  timeframe: Timeframe,
  // For costs we want a falling cost to be "up" (positive). Set isCostLike=true to invert.
  opts: { isCostLike?: boolean; lookback?: number } = {}
): TrendResult {
  const { isCostLike = false, lookback } = opts;
  const series = timeframe === "quarter" ? toQuarters(monthlySeries) : monthlySeries;
  const window = lookback ?? (timeframe === "quarter" ? 4 : 6);
  const tail = series.slice(-window);
  const avgAbs =
    tail.reduce((s, v) => s + Math.abs(v), 0) / Math.max(1, tail.length) || 1;
  const s = slope(tail);
  const norm = s / avgAbs;
  const first = tail[0] || 0;
  const last = tail[tail.length - 1] || 0;
  const changePct = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0;

  let direction: TrendDirection = "flat";
  if (Math.abs(norm) > 0.02) direction = norm > 0 ? "up" : "down";
  if (isCostLike && direction !== "flat") direction = direction === "up" ? "down" : "up";

  return { direction, changePct, sparkline: tail };
}

/** Convenience for KPI labels. */
export function trendArrowColor(direction: TrendDirection): string {
  if (direction === "up") return "text-emerald-600";
  if (direction === "down") return "text-red-600";
  return "text-slate-400";
}
