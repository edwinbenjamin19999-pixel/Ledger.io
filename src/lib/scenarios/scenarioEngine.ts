/**
 * Scenario Engine — pure functions on top of driverEngine.
 *
 * Hierarchy: locks > accountOverrides > driverPatch > aiPresetPatch > baseDrivers
 * (account overrides handled outside since they patch matrix output, not drivers).
 *
 * All math is deterministic — same input ⇒ identical output.
 */
import {
  BudgetDrivers,
  RRMonth,
  BRMonth,
  KFMonth,
  BudgetMetrics,
  calculateRR,
  calculateBR,
  calculateKF,
  calculateMetrics,
} from "@/lib/budget/driverEngine";

export type DriverPatch = Partial<BudgetDrivers>;

export interface ScenarioRunInput {
  baseDrivers: BudgetDrivers;
  /** Optional ordered patches — later patches override earlier ones. */
  patches?: DriverPatch[];
}

export interface ScenarioRunResult {
  drivers: BudgetDrivers;
  rr: RRMonth[];
  br: BRMonth[];
  kf: KFMonth[];
  metrics: BudgetMetrics;
}

export function mergeDrivers(base: BudgetDrivers, ...patches: (DriverPatch | undefined | null)[]): BudgetDrivers {
  let out: BudgetDrivers = { ...base };
  for (const p of patches) {
    if (!p) continue;
    out = { ...out, ...p };
  }
  return out;
}

export function runScenario({ baseDrivers, patches = [] }: ScenarioRunInput): ScenarioRunResult {
  const drivers = mergeDrivers(baseDrivers, ...patches);
  const rr = calculateRR(drivers);
  const br = calculateBR(drivers, rr);
  const kf = calculateKF(drivers, rr, br);
  const metrics = calculateMetrics(drivers, rr, kf);
  return { drivers, rr, br, kf, metrics };
}

// ─── HEADLINE KPIs ───
export interface ScenarioKpis {
  runwayMonths: number | null;
  breakEvenMonth: number | null;
  endingCash: number;
  annualEbit: number;
  ebitMarginPct: number;
  willHitTarget: boolean | null;
}

export function deriveKpis(result: ScenarioRunResult, targetEbit?: number | null): ScenarioKpis {
  const annualEbit = result.rr.reduce((s, m) => s + m.ebit, 0);
  const ebitMarginPct = result.metrics.ebitdaMarginPct;
  const willHitTarget = targetEbit != null ? annualEbit >= targetEbit : null;
  return {
    runwayMonths: result.metrics.runway,
    breakEvenMonth: result.metrics.breakEvenMonth,
    endingCash: result.metrics.endingCash,
    annualEbit,
    ebitMarginPct,
    willHitTarget,
  };
}

// ─── DIFF ───
export interface DriverDiff {
  key: keyof BudgetDrivers;
  base: number;
  next: number;
  delta: number;
  pctDelta: number;
}

export function diffDrivers(base: BudgetDrivers, next: BudgetDrivers): DriverDiff[] {
  const out: DriverDiff[] = [];
  (Object.keys(next) as (keyof BudgetDrivers)[]).forEach((k) => {
    const b = Number(base[k] ?? 0);
    const n = Number(next[k] ?? 0);
    if (b === n) return;
    const delta = n - b;
    const pctDelta = b !== 0 ? (delta / Math.abs(b)) * 100 : 0;
    out.push({ key: k, base: b, next: n, delta, pctDelta });
  });
  return out;
}
