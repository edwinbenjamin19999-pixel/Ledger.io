/**
 * forecastEngine — deterministic rolling-forecast model.
 *
 * Pure function of (actuals, priorYear, drivers, locks, overrides). No randomness.
 * Same inputs → same output across server and client.
 *
 * Model per account / month m:
 *   if locked       → locked_value
 *   else if override → override_value
 *   else if m ≤ latest_actual_month → actual[m]
 *   else            → seasonality[m] · base_trend · growth_factor + fixed_cost_floor
 */

import type { BudgetDrivers } from "./driverEngine";

export interface ForecastInput {
  /** Per-account 12-vector of actuals (current FY); 0 where missing. */
  actuals: Record<string, number[]>;
  /** Per-account 12-vector of prior-year actuals. */
  priorYear: Record<string, number[]>;
  /** Index 0..11 of last month with any actual (>0) data. -1 if none. */
  latestActualMonth: number;
  /** Active drivers (price growth, cogs %, etc.). */
  drivers: BudgetDrivers;
  /** account_number+month -> locked value (highest precedence). */
  locks: Record<string, number>;
  /** account_number+month -> manual override (second precedence). */
  overrides: Record<string, number>;
  /** Account number → BAS class (3=revenue, 4-7=cost). */
  classifyAccount?: (acc: string) => "revenue" | "cost" | "other";
}

export type ValueSource = "locked" | "manual" | "actual" | "ai";

export interface ForecastCell {
  value: number;
  source: ValueSource;
  /** Sub-components for explainability (ai-only). */
  components?: {
    baseTrend: number;
    seasonality: number;
    growth: number;
    floor: number;
  };
}

export interface ForecastOutput {
  /** account_number → 12-vector forecast. */
  forecast: Record<string, number[]>;
  /** account_number → 12-vector cell metadata. */
  cells: Record<string, ForecastCell[]>;
  /** Aggregate signals to feed confidenceEngine. */
  confidenceInputs: {
    accountsWithHistory: number;
    totalAccounts: number;
    monthsOfActuals: number;
    accountVariance: Record<string, number>;
  };
}

const ALPHA = 0.4;
const TREND_WINDOW = 6;

export function cellKey(acc: string, monthIdx: number): string {
  return `${acc}|${monthIdx}`;
}

function defaultClassify(acc: string): "revenue" | "cost" | "other" {
  const n = parseInt(acc, 10);
  if (!Number.isFinite(n)) return "other";
  if (n >= 3000 && n < 4000) return "revenue";
  if (n >= 4000 && n < 8000) return "cost";
  return "other";
}

/** Exponentially weighted moving average of last N non-zero entries. */
function ewma(series: number[], window: number, alpha: number): number {
  const tail = series.slice(-window).filter((v) => v !== 0);
  if (tail.length === 0) return 0;
  let v = tail[0];
  for (let i = 1; i < tail.length; i++) v = alpha * tail[i] + (1 - alpha) * v;
  return v;
}

/** Linear regression slope of last N points (y = a + b·x). Returns b. */
function slope(series: number[]): number {
  const n = series.length;
  if (n < 2) return 0;
  let sx = 0, sy = 0, sxy = 0, sxx = 0;
  for (let i = 0; i < n; i++) {
    sx += i; sy += series[i]; sxy += i * series[i]; sxx += i * i;
  }
  const denom = n * sxx - sx * sx;
  return denom === 0 ? 0 : (n * sxy - sx * sy) / denom;
}

/** 12-vector seasonality index (mean = 1) from prior-year per-account data. */
function seasonalityIndex(prior: number[]): number[] {
  const total = prior.reduce((s, v) => s + Math.abs(v), 0);
  if (total === 0) return new Array(12).fill(1);
  const mean = total / 12;
  return prior.map((v) => (mean === 0 ? 1 : Math.abs(v) / mean || 1));
}

/** YoY growth factor blended with recent trend. */
function growthFactor(actuals: number[], prior: number[], latest: number): number {
  // YoY based on year totals so far
  const ytdActual = actuals.slice(0, latest + 1).reduce((s, v) => s + v, 0);
  const ytdPrior = prior.slice(0, latest + 1).reduce((s, v) => s + v, 0);
  const yoy = ytdPrior !== 0 ? ytdActual / ytdPrior : 1;

  // Trend from last 6 months of actuals
  const recent = actuals.slice(Math.max(0, latest - TREND_WINDOW + 1), latest + 1);
  const base = ewma(recent, TREND_WINDOW, ALPHA);
  const s = slope(recent);
  const trendFactor = base !== 0 ? (base + s) / base : 1;

  // Blend 60% YoY / 40% trend, clamp to sane range
  const blended = 0.6 * yoy + 0.4 * trendFactor;
  return clamp(blended, 0.5, 2.0);
}

/** Lowest of last 3 months (catches rent / payroll baselines). */
function fixedCostFloor(actuals: number[], latest: number): number {
  const tail = actuals
    .slice(Math.max(0, latest - 2), latest + 1)
    .filter((v) => v !== 0);
  if (tail.length === 0) return 0;
  return Math.min(...tail.map(Math.abs));
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

export function computeForecast(input: ForecastInput): ForecastOutput {
  const {
    actuals,
    priorYear,
    latestActualMonth,
    drivers,
    locks,
    overrides,
    classifyAccount = defaultClassify,
  } = input;

  const accounts = new Set<string>([...Object.keys(actuals), ...Object.keys(priorYear)]);
  const forecast: Record<string, number[]> = {};
  const cells: Record<string, ForecastCell[]> = {};
  const accountVariance: Record<string, number> = {};
  let accountsWithHistory = 0;

  // Pre-compute aggregate revenue forecast for variable-cost scaling
  const revenueAccounts: string[] = [];
  for (const acc of accounts) {
    if (classifyAccount(acc) === "revenue") revenueAccounts.push(acc);
  }

  for (const acc of accounts) {
    const a = actuals[acc] ?? new Array(12).fill(0);
    const p = priorYear[acc] ?? new Array(12).fill(0);
    const klass = classifyAccount(acc);
    const seasonality = seasonalityIndex(p);
    const baseTrend = ewma(a.slice(0, latestActualMonth + 1), TREND_WINDOW, ALPHA);
    const growth = growthFactor(a, p, latestActualMonth);
    const floor = fixedCostFloor(a, latestActualMonth);

    if (a.filter((v) => v !== 0).length >= 3) accountsWithHistory++;

    // Apply driver-specific multipliers
    let driverMultiplier = 1;
    if (klass === "revenue") {
      driverMultiplier = 1 + (drivers.priceGrowthRate || 0) / 100 / 12;
    } else if (klass === "cost") {
      // Variable cost accounts (40xx-49xx) scale with revenue via cogsRatio implicitly through trend
      driverMultiplier = 1;
    }

    // Variance signal (CV of monthly changes) for confidence
    accountVariance[acc] = coefficientOfVariation(a);

    const monthCells: ForecastCell[] = new Array(12);
    const monthForecast: number[] = new Array(12);

    for (let m = 0; m < 12; m++) {
      const key = cellKey(acc, m);
      if (locks[key] !== undefined) {
        monthCells[m] = { value: locks[key], source: "locked" };
        monthForecast[m] = locks[key];
        continue;
      }
      if (overrides[key] !== undefined) {
        monthCells[m] = { value: overrides[key], source: "manual" };
        monthForecast[m] = overrides[key];
        continue;
      }
      if (m <= latestActualMonth && a[m] !== 0) {
        monthCells[m] = { value: a[m], source: "actual" };
        monthForecast[m] = a[m];
        continue;
      }

      const seasonal = seasonality[m] || 1;
      const projected =
        baseTrend !== 0
          ? Math.round((seasonal * baseTrend * growth + floor * 0.1) * driverMultiplier)
          : Math.round(p[m] * growth);

      monthCells[m] = {
        value: projected,
        source: "ai",
        components: { baseTrend, seasonality: seasonal, growth, floor },
      };
      monthForecast[m] = projected;
    }

    forecast[acc] = monthForecast;
    cells[acc] = monthCells;
  }

  return {
    forecast,
    cells,
    confidenceInputs: {
      accountsWithHistory,
      totalAccounts: accounts.size,
      monthsOfActuals: latestActualMonth + 1,
      accountVariance,
    },
  };
}

/** CV = stddev / |mean|. Returns 0 for constant or empty. */
function coefficientOfVariation(series: number[]): number {
  const nonZero = series.filter((v) => v !== 0);
  if (nonZero.length < 2) return 0;
  const mean = nonZero.reduce((s, v) => s + v, 0) / nonZero.length;
  if (mean === 0) return 0;
  const variance =
    nonZero.reduce((s, v) => s + (v - mean) ** 2, 0) / nonZero.length;
  return Math.sqrt(variance) / Math.abs(mean);
}
