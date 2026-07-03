/**
 * Value Layers — multiple "financial lenses" on top of the same row skeleton.
 *
 * The engine builds `accounts: ReportAccountRow[]` ONCE. Different lenses
 * (Actual / Budget / Forecast / Scenario) are simply different value maps
 * keyed by accountNumber. The table renders the SAME sections; only the
 * cell values change when the user switches lens.
 */

import type { ReportAccountRow } from "@/components/reports/ProfessionalReportTable";

export type LensKind = "actual" | "budget" | "forecast" | "scenario";

export interface AccountValues {
  ingBalans: number;
  ingSaldo: number;
  perioden: number;
  utgBalans: number;
}

export interface ValueLayer {
  kind: LensKind;
  label: string;
  /** Per-account values keyed by accountNumber. Missing keys → zero. */
  accounts: Map<string, AccountValues>;
}

const ZERO: AccountValues = { ingBalans: 0, ingSaldo: 0, perioden: 0, utgBalans: 0 };

/** Build the actual layer from already-computed account rows. */
export function buildActualLayer(rows: ReportAccountRow[]): ValueLayer {
  const accounts = new Map<string, AccountValues>();
  for (const r of rows) {
    accounts.set(r.accountNumber, {
      ingBalans: r.ingBalans,
      ingSaldo: r.ingSaldo,
      perioden: r.perioden,
      utgBalans: r.utgBalans,
    });
  }
  return { kind: "actual", label: "Utfall", accounts };
}

/**
 * Project budget rows (one row per account+month) onto the same shape.
 * Period total = sum of monthly amounts within fromDate..toDate.
 */
export interface BudgetRow {
  account_number: string;
  month: string; // ISO yyyy-MM-01
  amount: number;
}

export function buildBudgetLayer(
  rows: BudgetRow[],
  fromDate: Date,
  toDate: Date,
  label = "Budget",
  kind: LensKind = "budget",
): ValueLayer {
  const fromStr = fromDate.toISOString().slice(0, 10);
  const toStr = toDate.toISOString().slice(0, 10);
  const accounts = new Map<string, AccountValues>();
  for (const r of rows) {
    if (!r.account_number) continue;
    const m = (r.month || "").slice(0, 10);
    if (m < fromStr || m > toStr) continue;
    const prev = accounts.get(r.account_number) ?? { ...ZERO };
    prev.perioden += r.amount;
    prev.utgBalans = prev.ingSaldo + prev.perioden;
    accounts.set(r.account_number, prev);
  }
  return { kind, label, accounts };
}

export interface ForecastRow extends BudgetRow {}

export function buildForecastLayer(
  rows: ForecastRow[],
  fromDate: Date,
  toDate: Date,
): ValueLayer {
  return buildBudgetLayer(rows, fromDate, toDate, "Prognos", "forecast");
}

/** Apply scenario multipliers to a base layer (e.g. growth +10%, costs -5%). */
export interface ScenarioAdjustment {
  /** Account number prefix this rule applies to (e.g. "3" for revenue). */
  accountPrefix: string;
  /** Multiplier on perioden (1.10 = +10%). */
  multiplier: number;
}

export function applyScenario(
  base: ValueLayer,
  adjustments: ScenarioAdjustment[],
  label = "Scenario",
): ValueLayer {
  const accounts = new Map<string, AccountValues>();
  base.accounts.forEach((v, key) => {
    let mult = 1;
    for (const adj of adjustments) {
      if (key.startsWith(adj.accountPrefix)) mult *= adj.multiplier;
    }
    const perioden = v.perioden * mult;
    accounts.set(key, {
      ingBalans: v.ingBalans,
      ingSaldo: v.ingSaldo,
      perioden,
      utgBalans: v.ingSaldo + perioden,
    });
  });
  return { kind: "scenario", label, accounts };
}

/** Read values for a row from a layer; missing → zero. */
export function selectValues(row: ReportAccountRow, layer: ValueLayer | undefined): AccountValues {
  if (!layer) return ZERO;
  return layer.accounts.get(row.accountNumber) ?? ZERO;
}
