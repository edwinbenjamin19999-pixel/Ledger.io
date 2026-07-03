// Hospitality KPI calculation utilities
// Pure functions — operate on rows fetched from the ledger and POS.

export interface LedgerLine {
  account_number: string;
  debit_amount?: number | null;
  credit_amount?: number | null;
}

export interface PosDay {
  sale_date: string;
  total_sales: number;
}

export interface StaffRow {
  total_cost?: number | null;
  actual_cost?: number | null;
}

export interface HospitalityKPIs {
  revenue: number;
  foodCost: number;
  drinkCost: number;
  staffCost: number;
  foodCostPct: number;
  drinkCostPct: number;
  staffCostPct: number;
  primeCostPct: number;
  txns: number;
  avgTicket: number;
}

const sumDebit = (lines: LedgerLine[], prefixes: string[]) =>
  lines.reduce((s, l) => {
    const a = String(l.account_number ?? "");
    if (prefixes.some((p) => a.startsWith(p))) {
      return s + Number(l.debit_amount ?? 0);
    }
    return s;
  }, 0);

export function calculateHospitalityKPIs(
  posDays: PosDay[],
  ledger: LedgerLine[],
  staff: StaffRow[],
  txns = 0,
): HospitalityKPIs {
  const revenue = posDays.reduce((s, d) => s + Number(d.total_sales || 0), 0);
  const foodCost = sumDebit(ledger, ["4010", "4011", "4012"]);
  const drinkCost = sumDebit(ledger, ["4020", "4021"]);
  const staffCost = staff.reduce(
    (s, r) => s + Number(r.actual_cost ?? r.total_cost ?? 0),
    0,
  );

  const pct = (n: number) => (revenue > 0 ? (n / revenue) * 100 : 0);
  const foodCostPct = pct(foodCost);
  const drinkCostPct = pct(drinkCost);
  const staffCostPct = pct(staffCost);
  const primeCostPct = pct(foodCost + drinkCost + staffCost);

  return {
    revenue,
    foodCost,
    drinkCost,
    staffCost,
    foodCostPct,
    drinkCostPct,
    staffCostPct,
    primeCostPct,
    txns,
    avgTicket: txns > 0 ? revenue / txns : 0,
  };
}

export function kpiStatus(value: number, target?: { min?: number; max?: number }):
  | "good"
  | "ok"
  | "warn" {
  if (!target) return "ok";
  if (target.max != null && value > target.max) return "warn";
  if (target.min != null && value < target.min) return "good";
  return "ok";
}
