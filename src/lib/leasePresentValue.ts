// Lease present value & amortization schedule (frontend-only)
// Uses monthly periods, payments in arrears.

export interface LeaseInput {
  startDate: string; // ISO date
  endDate: string;   // ISO date
  monthlyPayment: number;
  annualInterestRate: number; // e.g. 0.04 for 4%
}

export interface ScheduleRow {
  period: string;       // "YYYY-MM"
  openingLiability: number;
  interest: number;
  amortization: number;
  payment: number;
  closingLiability: number;
}

export interface LeaseCalculation {
  termMonths: number;
  presentValue: number;
  totalInterest: number;
  totalPayments: number;
  schedule: ScheduleRow[];
  currentLiability: number;   // < 12 mån
  longTermLiability: number;  // ≥ 12 mån
  rouAssetValue: number;      // = initial PV (cost model)
}

export function monthsBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
  return Math.max(
    0,
    (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth())
  );
}

export function calculateLease(input: LeaseInput): LeaseCalculation {
  const n = monthsBetween(input.startDate, input.endDate);
  const r = input.annualInterestRate / 12;
  const pmt = input.monthlyPayment;

  if (n === 0 || pmt <= 0) {
    return {
      termMonths: n,
      presentValue: 0,
      totalInterest: 0,
      totalPayments: 0,
      schedule: [],
      currentLiability: 0,
      longTermLiability: 0,
      rouAssetValue: 0,
    };
  }

  // PV of ordinary annuity
  const pv = r === 0 ? pmt * n : pmt * (1 - Math.pow(1 + r, -n)) / r;

  const schedule: ScheduleRow[] = [];
  let opening = pv;
  const start = new Date(input.startDate);

  for (let i = 0; i < n; i++) {
    const interest = opening * r;
    const amort = pmt - interest;
    const closing = Math.max(0, opening - amort);
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    schedule.push({
      period,
      openingLiability: round2(opening),
      interest: round2(interest),
      amortization: round2(amort),
      payment: round2(pmt),
      closingLiability: round2(closing),
    });
    opening = closing;
  }

  // Current portion = sum of next 12 amortizations
  const next12 = schedule.slice(0, 12).reduce((s, r) => s + r.amortization, 0);
  const totalAmort = schedule.reduce((s, r) => s + r.amortization, 0);
  const longTerm = Math.max(0, totalAmort - next12);

  return {
    termMonths: n,
    presentValue: round2(pv),
    totalInterest: round2(schedule.reduce((s, r) => s + r.interest, 0)),
    totalPayments: round2(pmt * n),
    schedule,
    currentLiability: round2(next12),
    longTermLiability: round2(longTerm),
    rouAssetValue: round2(pv),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
