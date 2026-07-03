/**
 * Monte Carlo simulation for scenarios.
 * Deterministic: same seed → identical output.
 *
 * Uses mulberry32 RNG (32-bit, fast, well-tested) seeded from a string hash.
 * 1000 iterations × 12 months. Independent normal noise per driver.
 */
import type { BudgetDrivers } from "@/lib/budget/driverEngine";
import { calculateRR, calculateBR, calculateKF } from "@/lib/budget/driverEngine";

// ─── Deterministic RNG ───
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Box-Muller transform: returns N(0, 1). */
function gaussian(rand: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// ─── Volatility presets (% standard deviation per driver) ───
export interface MonteCarloVolatility {
  priceSigma: number; // % of ARPU
  customerSigma: number; // % of newCustomersPerMonth
  cogsSigma: number; // % of cogsPercent
  churnSigma: number; // % of churnRate
  dsoSigma: number; // % of DSO
}

export const DEFAULT_VOL: MonteCarloVolatility = {
  priceSigma: 0.05, // 5%
  customerSigma: 0.15, // 15%
  cogsSigma: 0.05,
  churnSigma: 0.20,
  dsoSigma: 0.10,
};

// ─── Output ───
export interface MonteCarloResult {
  iterations: number;
  survivalPct: number; // % runs with closingCash[11] > 0
  targetHitPct: number; // % runs with annual EBIT ≥ targetEbit (NaN if no target)
  /** Per-month percentile cash curves (length 12). */
  p10Cash: number[];
  p50Cash: number[];
  p90Cash: number[];
  /** Per-month percentile EBIT curves. */
  p10Ebit: number[];
  p50Ebit: number[];
  p90Ebit: number[];
  /** Final-cash distribution histogram bins (sorted) for richer charts. */
  endingCashSorted: number[];
}

export interface MonteCarloInput {
  drivers: BudgetDrivers;
  seed: string;
  iterations?: number;
  volatility?: Partial<MonteCarloVolatility>;
  targetEbit?: number | null;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * sorted.length)));
  return sorted[idx];
}

export function runMonteCarlo({
  drivers,
  seed,
  iterations = 1000,
  volatility,
  targetEbit = null,
}: MonteCarloInput): MonteCarloResult {
  const vol: MonteCarloVolatility = { ...DEFAULT_VOL, ...(volatility || {}) };
  const rand = mulberry32(hashString(seed));

  const monthlyCash: number[][] = Array.from({ length: 12 }, () => []);
  const monthlyEbit: number[][] = Array.from({ length: 12 }, () => []);
  const endingCash: number[] = [];
  let survives = 0;
  let hitsTarget = 0;

  for (let i = 0; i < iterations; i++) {
    // Sample once per iteration (held constant across the year — keeps it deterministic + fast).
    const dArpu = 1 + gaussian(rand) * vol.priceSigma;
    const dCust = 1 + gaussian(rand) * vol.customerSigma;
    const dCogs = 1 + gaussian(rand) * vol.cogsSigma;
    const dChurn = 1 + gaussian(rand) * vol.churnSigma;
    const dDso = 1 + gaussian(rand) * vol.dsoSigma;

    const sampled: BudgetDrivers = {
      ...drivers,
      averageRevenuePerCustomer: Math.max(0, drivers.averageRevenuePerCustomer * dArpu),
      newCustomersPerMonth: Math.max(0, Math.round(drivers.newCustomersPerMonth * dCust)),
      cogsPercent: Math.max(0, Math.min(100, drivers.cogsPercent * dCogs)),
      churnRate: Math.max(0, drivers.churnRate * dChurn),
      dso: Math.max(0, drivers.dso * dDso),
    };

    const rr = calculateRR(sampled);
    const br = calculateBR(sampled, rr);
    const kf = calculateKF(sampled, rr, br);

    let annualEbit = 0;
    for (let m = 0; m < 12; m++) {
      monthlyCash[m].push(kf[m].closingCash);
      monthlyEbit[m].push(rr[m].ebit);
      annualEbit += rr[m].ebit;
    }

    const finalCash = kf[11].closingCash;
    endingCash.push(finalCash);
    if (finalCash > 0) survives++;
    if (targetEbit != null && annualEbit >= targetEbit) hitsTarget++;
  }

  const p10Cash: number[] = [];
  const p50Cash: number[] = [];
  const p90Cash: number[] = [];
  const p10Ebit: number[] = [];
  const p50Ebit: number[] = [];
  const p90Ebit: number[] = [];

  for (let m = 0; m < 12; m++) {
    const sortedCash = [...monthlyCash[m]].sort((a, b) => a - b);
    p10Cash.push(percentile(sortedCash, 10));
    p50Cash.push(percentile(sortedCash, 50));
    p90Cash.push(percentile(sortedCash, 90));
    const sortedEbit = [...monthlyEbit[m]].sort((a, b) => a - b);
    p10Ebit.push(percentile(sortedEbit, 10));
    p50Ebit.push(percentile(sortedEbit, 50));
    p90Ebit.push(percentile(sortedEbit, 90));
  }

  return {
    iterations,
    survivalPct: (survives / iterations) * 100,
    targetHitPct: targetEbit != null ? (hitsTarget / iterations) * 100 : NaN,
    p10Cash,
    p50Cash,
    p90Cash,
    p10Ebit,
    p50Ebit,
    p90Ebit,
    endingCashSorted: [...endingCash].sort((a, b) => a - b),
  };
}
