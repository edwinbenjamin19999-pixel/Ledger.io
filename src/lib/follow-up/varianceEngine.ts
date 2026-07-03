/**
 * varianceEngine — pure variance computation for the Follow-up CFO Command Center.
 *
 * Determinism: identical (actuals, budget, forecast, mode, monthIdx) → identical output.
 * No randomness, no side effects. AI metadata is layered on top in the UI; numbers and
 * ranking are produced here.
 *
 * Account classification follows BAS:
 *   3000–3999 = revenue
 *   4000–7999 = cost
 *   1910–1949 = cash
 */

export type FollowUpMode = "live" | "live_forecast" | "month";

export interface AccountSeries {
  account_number: string;
  account_name: string;
  /** 12 vector, jan..dec, signed already (revenue positive, costs positive). */
  monthly: number[];
}

export interface VarianceInput {
  /** Per-account monthly actuals (revenue + cost rows). Costs are stored as positive amounts. */
  actuals: AccountSeries[];
  /** Per-account monthly budget (same convention as actuals). */
  budget: AccountSeries[];
  /** Per-account monthly forecast (full year). Falls back to budget if not provided. */
  forecast?: AccountSeries[];
  /** Index 0..11 of last month with any actuals. -1 if none. */
  latestActualMonth: number;
  mode: FollowUpMode;
  /** When mode === "month", the month index (0..11) being inspected. */
  monthIndex?: number;
}

export interface VarianceKPIs {
  /** Aggregate revenue actual/projected vs budget for the active scope. */
  revenue: { actual: number; budget: number; variance: number; variancePct: number };
  costs: { actual: number; budget: number; variance: number; variancePct: number };
  ebit: { actual: number; budget: number; variance: number; variancePct: number };
  marginPp: { actual: number; budget: number; deltaPp: number };
  /** Convenience derived deltas — negative numbers mean worse than plan. */
  deltaEbit: number;
  deltaCash: number;
  deltaMarginPp: number;
}

export interface VarianceDriver {
  account_number: string;
  account_name: string;
  kind: "revenue" | "cost";
  actual: number;
  budget: number;
  /** actual - budget. For costs: positive = over budget = bad. For revenue: negative = below = bad. */
  variance: number;
  variancePct: number;
  /** Always signed from EBIT's perspective (negative = hurts EBIT). */
  ebitImpact: number;
  /** "good" = helps EBIT, "bad" = hurts EBIT, "neutral" = within tolerance. */
  direction: "good" | "bad" | "neutral";
}

export interface VarianceOutput {
  kpis: VarianceKPIs;
  topDrivers: VarianceDriver[];
  /** All drivers sorted (for the detailed table). */
  allDrivers: VarianceDriver[];
}

const REVENUE_RANGE: [string, string] = ["3000", "3999"];
const COST_RANGE: [string, string] = ["4000", "7999"];

function classify(acc: string): "revenue" | "cost" | "other" {
  if (acc >= REVENUE_RANGE[0] && acc <= REVENUE_RANGE[1]) return "revenue";
  if (acc >= COST_RANGE[0] && acc <= COST_RANGE[1]) return "cost";
  return "other";
}

/** Sum a 12-vector across the active month window for the given mode. */
function sumWindow(series: number[], mode: FollowUpMode, latestActualMonth: number, monthIndex?: number): number {
  if (!series || series.length === 0) return 0;
  if (mode === "month") {
    const m = monthIndex ?? Math.max(0, latestActualMonth);
    return series[m] || 0;
  }
  if (mode === "live") {
    // YTD up to and including latestActualMonth
    const last = Math.max(0, latestActualMonth);
    return series.slice(0, last + 1).reduce((s, v) => s + (v || 0), 0);
  }
  // live_forecast — full year
  return series.reduce((s, v) => s + (v || 0), 0);
}

/** Build a hybrid actuals+forecast series where months > latestActualMonth use forecast values. */
function blendedSeries(actual: number[], forecast: number[] | undefined, latestActualMonth: number): number[] {
  const out = new Array(12).fill(0);
  for (let m = 0; m < 12; m++) {
    if (m <= latestActualMonth) out[m] = actual?.[m] || 0;
    else out[m] = forecast?.[m] ?? actual?.[m] ?? 0;
  }
  return out;
}

export function computeVariance(input: VarianceInput): VarianceOutput {
  const { actuals, budget, forecast, mode, latestActualMonth, monthIndex } = input;

  // Index budgets and forecasts by account number for quick lookup
  const budgetMap = new Map(budget.map((b) => [b.account_number, b]));
  const forecastMap = new Map((forecast ?? []).map((f) => [f.account_number, f]));

  const drivers: VarianceDriver[] = [];

  // Iterate union of actual + budget account numbers
  const allAccounts = new Map<string, AccountSeries>();
  actuals.forEach((a) => allAccounts.set(a.account_number, a));
  budget.forEach((b) => { if (!allAccounts.has(b.account_number)) allAccounts.set(b.account_number, b); });

  allAccounts.forEach((row) => {
    const kind = classify(row.account_number);
    if (kind === "other") return;

    const actualSeries =
      mode === "live_forecast"
        ? blendedSeries(
            actuals.find((a) => a.account_number === row.account_number)?.monthly ?? new Array(12).fill(0),
            forecastMap.get(row.account_number)?.monthly,
            latestActualMonth,
          )
        : actuals.find((a) => a.account_number === row.account_number)?.monthly ?? new Array(12).fill(0);

    const budgetSeries = budgetMap.get(row.account_number)?.monthly ?? new Array(12).fill(0);

    const actual = sumWindow(actualSeries, mode, latestActualMonth, monthIndex);
    const budgeted = sumWindow(budgetSeries, mode, latestActualMonth, monthIndex);

    if (actual === 0 && budgeted === 0) return;

    const variance = actual - budgeted;
    const variancePct = budgeted !== 0 ? (variance / Math.abs(budgeted)) * 100 : actual !== 0 ? 100 : 0;

    // EBIT impact: revenue → +variance helps; cost → +variance hurts.
    const ebitImpact = kind === "revenue" ? variance : -variance;

    const tolerance = Math.max(1000, Math.abs(budgeted) * 0.02);
    const direction: VarianceDriver["direction"] =
      Math.abs(variance) < tolerance ? "neutral" : ebitImpact > 0 ? "good" : "bad";

    drivers.push({
      account_number: row.account_number,
      account_name: row.account_name,
      kind,
      actual,
      budget: budgeted,
      variance,
      variancePct,
      ebitImpact,
      direction,
    });
  });

  // Aggregate KPIs
  const revenueDrivers = drivers.filter((d) => d.kind === "revenue");
  const costDrivers = drivers.filter((d) => d.kind === "cost");

  const sumActual = (arr: VarianceDriver[]) => arr.reduce((s, d) => s + d.actual, 0);
  const sumBudget = (arr: VarianceDriver[]) => arr.reduce((s, d) => s + d.budget, 0);

  const revActual = sumActual(revenueDrivers);
  const revBudget = sumBudget(revenueDrivers);
  const costActual = sumActual(costDrivers);
  const costBudget = sumBudget(costDrivers);

  const ebitActual = revActual - costActual;
  const ebitBudget = revBudget - costBudget;

  const marginActual = revActual > 0 ? (ebitActual / revActual) * 100 : 0;
  const marginBudget = revBudget > 0 ? (ebitBudget / revBudget) * 100 : 0;

  const kpis: VarianceKPIs = {
    revenue: {
      actual: revActual,
      budget: revBudget,
      variance: revActual - revBudget,
      variancePct: revBudget !== 0 ? ((revActual - revBudget) / Math.abs(revBudget)) * 100 : 0,
    },
    costs: {
      actual: costActual,
      budget: costBudget,
      variance: costActual - costBudget,
      variancePct: costBudget !== 0 ? ((costActual - costBudget) / Math.abs(costBudget)) * 100 : 0,
    },
    ebit: {
      actual: ebitActual,
      budget: ebitBudget,
      variance: ebitActual - ebitBudget,
      variancePct: ebitBudget !== 0 ? ((ebitActual - ebitBudget) / Math.abs(ebitBudget)) * 100 : 0,
    },
    marginPp: {
      actual: marginActual,
      budget: marginBudget,
      deltaPp: marginActual - marginBudget,
    },
    deltaEbit: ebitActual - ebitBudget,
    // deltaCash is approximated as EBIT delta for now (true cash needs KF; engine consumer can override).
    deltaCash: ebitActual - ebitBudget,
    deltaMarginPp: marginActual - marginBudget,
  };

  // Rank drivers by absolute EBIT impact
  const allDrivers = [...drivers].sort((a, b) => Math.abs(b.ebitImpact) - Math.abs(a.ebitImpact));
  const topDrivers = allDrivers.filter((d) => d.direction !== "neutral").slice(0, 5);

  return { kpis, topDrivers, allDrivers };
}

/** Build a stable hash of the top-driver set so AI explanations can be cached deterministically. */
export function hashDrivers(drivers: VarianceDriver[]): string {
  return drivers
    .map((d) => `${d.account_number}:${Math.round(d.ebitImpact / 1000)}`)
    .join("|");
}
