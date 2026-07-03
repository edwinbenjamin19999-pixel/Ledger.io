/**
 * Skatteagent — Preliminary tax (F-skatt) state engine.
 *
 * Pure deterministic computation. No I/O, no React.
 * Inputs come from the page hook that already loads journal lines, bank
 * balances, and the SKV skattekonto.
 */

import { computeTax, type TaxEngineInput } from "@/lib/tax/taxEngine";

export type FTaxStatus = "due_soon" | "paid" | "overdue" | "scheduled" | "unknown";
export type TaxPosition = "too_high" | "reasonable" | "too_low" | "unknown";

export interface FTaxJournalLine {
  /** ISO date string (YYYY-MM-DD) */
  entryDate: string;
  /** Account number, e.g. "2518", "1930" */
  accountNumber: string;
  debit: number;
  credit: number;
}

export interface PreliminaryTaxEngineInput {
  /** All journal lines for the current year (or rolling 12 months). */
  glLines: FTaxJournalLine[];
  /** Bank balance summed across all bank_accounts. */
  bankBalanceTotal: number;
  /** Result-before-tax YTD (used for expectedAnnualTax projection). */
  ytdResultBeforeTax: number;
  /** Number of months covered in YTD (1-12). */
  ytdMonths: number;
  /** Optional: live SKV saldo (positive = credit / overpaid, negative = owed). */
  skvBalance?: number | null;
  /** Optional: explicit next due amount overriding the average. */
  manualNextAmount?: number | null;
  /** Today (defaults to new Date()). */
  today?: Date;
}

export interface PreliminaryTaxState {
  /** Average monthly F-skatt payment over last 3 months (D 2518). */
  currentMonthlyFtax: number;
  /** YTD paid F-skatt (sum of D 2518 this year). */
  ytdPaid: number;
  /** Annualized current F-skatt (currentMonthlyFtax × 12). */
  currentFtaxAnnualized: number;
  /** Expected final annual corporate tax from taxEngine. */
  expectedAnnualTax: number;
  /** Diff = expectedAnnualTax − currentFtaxAnnualized (positive = underpayment). */
  diff: number;
  /** ratio = diff / currentFtaxAnnualized (clamped denom). */
  ratio: number;
  /** Estimated overpayment by year-end (positive number, 0 if none). */
  overpaymentEstimate: number;
  /** AI verdict on current F-skatt level. */
  position: TaxPosition;
  /** Next due date (ISO YYYY-MM-DD). */
  nextDueDate: string;
  /** Next due amount in SEK. */
  nextDueAmount: number;
  /** Status of next payment. */
  status: FTaxStatus;
  /** Bank balance after next payment is made. */
  cashAfterPayment: number;
  /** Days remaining until next due date. */
  daysUntilDue: number;
  /** True if there is no GL data at all. */
  isEmpty: boolean;
}

const FTAX_PAYMENT_ACCOUNT = "2518";
const TOLERANCE_PCT = 0.15;

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function nextTwelfth(today: Date): Date {
  const y = today.getFullYear();
  const m = today.getMonth();
  const candidate = new Date(y, m, 12);
  if (candidate.getTime() <= today.getTime()) {
    return new Date(y, m + 1, 12);
  }
  return candidate;
}

export function computePreliminaryTaxState(
  input: PreliminaryTaxEngineInput,
): PreliminaryTaxState {
  const today = input.today ?? new Date();
  const ftaxLines = input.glLines.filter(
    (l) => l.accountNumber === FTAX_PAYMENT_ACCOUNT && l.debit > 0,
  );

  const isEmpty = input.glLines.length === 0;

  // YTD paid this year
  const yearStart = new Date(today.getFullYear(), 0, 1);
  const ytdPaid = ftaxLines
    .filter((l) => new Date(l.entryDate) >= yearStart)
    .reduce((sum, l) => sum + l.debit, 0);

  // Average over last 3 calendar months
  const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, 1);
  const recent = ftaxLines.filter((l) => new Date(l.entryDate) >= threeMonthsAgo);
  const monthsSeen = new Set(recent.map((l) => l.entryDate.slice(0, 7))).size;
  const sumRecent = recent.reduce((s, l) => s + l.debit, 0);
  const currentMonthlyFtax = monthsSeen > 0 ? Math.round(sumRecent / monthsSeen) : 0;

  // Expected annual tax — annualize result and run computeTax
  const months = Math.max(1, Math.min(12, input.ytdMonths));
  const annualizedRBT = (input.ytdResultBeforeTax * 12) / months;
  const taxInput: TaxEngineInput = {
    resultBeforeTax: annualizedRBT,
    nonDeductibleCosts: 0,
    bookDepreciation: 0,
    taxDepreciation: 0,
    netInterestExpense: 0,
    groupContribReceived: 0,
    groupContribGiven: 0,
    lossCarryforward: 0,
    periodiseringsfondAllocation: 0,
  };
  const expectedAnnualTax = isEmpty ? 0 : computeTax(taxInput).corporateTax;

  const currentFtaxAnnualized = currentMonthlyFtax * 12;
  const diff = expectedAnnualTax - currentFtaxAnnualized;
  const denom = Math.max(1, currentFtaxAnnualized);
  const ratio = diff / denom;

  let position: TaxPosition = "unknown";
  if (currentFtaxAnnualized > 0 || expectedAnnualTax > 0) {
    if (ratio > TOLERANCE_PCT) position = "too_low";
    else if (ratio < -TOLERANCE_PCT) position = "too_high";
    else position = "reasonable";
  }

  const overpaymentEstimate = position === "too_high" ? Math.max(0, -diff) : 0;

  // Next payment
  const nextDate = nextTwelfth(today);
  const nextDueDate = isoDate(nextDate);
  const nextDueAmount = input.manualNextAmount ?? currentMonthlyFtax;

  // Status
  const currentMonthKey = isoDate(startOfMonth(today)).slice(0, 7);
  const paidThisMonth = ftaxLines.some((l) => l.entryDate.slice(0, 7) === currentMonthKey);
  const daysUntilDue = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  let status: FTaxStatus = "unknown";
  if (paidThisMonth) status = "paid";
  else if (daysUntilDue < 0) status = "overdue";
  else if (daysUntilDue <= 7) status = "due_soon";
  else status = "scheduled";

  const cashAfterPayment = input.bankBalanceTotal - nextDueAmount;

  return {
    currentMonthlyFtax,
    ytdPaid,
    currentFtaxAnnualized,
    expectedAnnualTax: Math.round(expectedAnnualTax),
    diff: Math.round(diff),
    ratio,
    overpaymentEstimate: Math.round(overpaymentEstimate),
    position,
    nextDueDate,
    nextDueAmount,
    status,
    cashAfterPayment: Math.round(cashAfterPayment),
    daysUntilDue,
    isEmpty,
  };
}
