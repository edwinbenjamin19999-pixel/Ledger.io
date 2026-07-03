/**
 * SINGLE SOURCE OF TRUTH for Accounts Receivable / Accounts Payable
 * "outstanding" calculations. All AR/AP views (KPI cards, filter pills,
 * inkassomotor, dashboards) MUST use these selectors so the same number
 * never appears with five different values across the product.
 *
 * Definitions:
 * - OPEN   = invoice is not paid, cancelled or credited.
 * - OVERDUE = open AND due_date < today.
 * - DUE SOON = open AND 0 ≤ days_to_due ≤ 30 (and not overdue).
 *
 * Credit invoices (negative amount, or invoice_number prefix "KR-INV")
 * subtract from the outstanding total.
 */

import { differenceInDays, parseISO } from "date-fns";

export interface OutstandingInvoice {
  id?: string;
  invoice_number?: string | null;
  total_amount: number;
  due_date?: string | null;
  status?: string | null;
  invoice_type?: string | null;
  paid_at?: string | null;
}

const PAID_LIKE = new Set(["paid", "cancelled", "credited", "void", "refunded"]);

export const isCreditInvoice = (inv: OutstandingInvoice): boolean => {
  if (Number(inv.total_amount) < 0) return true;
  const num = (inv.invoice_number ?? "").toUpperCase();
  return num.startsWith("KR-") || num.startsWith("CR-") || num.startsWith("CRED");
};

/** Signed amount — credit notes count as negative. */
export const signedAmount = (inv: OutstandingInvoice): number => {
  const amt = Math.abs(Number(inv.total_amount) || 0);
  return isCreditInvoice(inv) ? -amt : amt;
};

/** TRUE if the invoice is still an open receivable/payable. */
export const isOpenInvoice = (inv: OutstandingInvoice): boolean => {
  const status = (inv.status ?? "").toLowerCase();
  if (inv.paid_at) return false;
  if (PAID_LIKE.has(status)) return false;
  // 'draft' is technically not yet receivable but is shown in the AR
  // workflow as a future receivable; include for UX consistency.
  return true;
};

export const isOverdueInvoice = (
  inv: OutstandingInvoice,
  today: Date = new Date(),
): boolean => {
  if (!isOpenInvoice(inv)) return false;
  if (!inv.due_date) return false;
  return differenceInDays(today, parseISO(inv.due_date)) > 0;
};

export const isDueSoonInvoice = (
  inv: OutstandingInvoice,
  withinDays = 30,
  today: Date = new Date(),
): boolean => {
  if (!isOpenInvoice(inv)) return false;
  if (!inv.due_date) return false;
  const d = differenceInDays(parseISO(inv.due_date), today);
  return d >= 0 && d <= withinDays;
};

export const selectOpen = <T extends OutstandingInvoice>(invs: T[]): T[] =>
  invs.filter(isOpenInvoice);

export const selectOverdue = <T extends OutstandingInvoice>(
  invs: T[],
  today: Date = new Date(),
): T[] => invs.filter((i) => isOverdueInvoice(i, today));

export const selectDueSoon = <T extends OutstandingInvoice>(
  invs: T[],
  withinDays = 30,
  today: Date = new Date(),
): T[] => invs.filter((i) => isDueSoonInvoice(i, withinDays, today));

/** Sum with credit-note netting. */
export const sumSigned = (invs: OutstandingInvoice[]): number =>
  invs.reduce((s, i) => s + signedAmount(i), 0);

export const sumOpen = (invs: OutstandingInvoice[]): number =>
  sumSigned(selectOpen(invs));

export const sumOverdue = (
  invs: OutstandingInvoice[],
  today: Date = new Date(),
): number => sumSigned(selectOverdue(invs, today));
