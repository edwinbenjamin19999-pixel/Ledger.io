import { differenceInDays, parseISO } from "date-fns";

export type AROverdueInvoice = {
  id: string;
  invoice_number: string | null;
  counterparty_name: string | null;
  counterparty_org_number?: string | null;
  total_amount: number;
  due_date: string;
  status: string;
  reminder_count: number | null;
  last_reminder_sent_at: string | null;
  paid_at: string | null;
  customer_email: string | null;
};

export type ARRow = AROverdueInvoice & {
  daysOverdue: number;
  bucket: "current" | "1-14" | "15-30" | "30+";
  reminderLevel: 0 | 1 | 2 | 3;
  payProbability7d: number; // 0-100
};

export function bucketize(daysOverdue: number): ARRow["bucket"] {
  if (daysOverdue <= 0) return "current";
  if (daysOverdue <= 14) return "1-14";
  if (daysOverdue <= 30) return "15-30";
  return "30+";
}

export function nextReminderLevel(daysOverdue: number): 0 | 1 | 2 | 3 {
  if (daysOverdue >= 30) return 3;
  if (daysOverdue >= 14) return 2;
  if (daysOverdue >= 3) return 1;
  return 0;
}

/**
 * Estimate probability the customer pays within 7 days based on:
 * - Historical avg days-late for that counterparty (lower = better)
 * - How many reminders already sent
 * - Current days overdue (the longer overdue, the lower)
 */
export function predictPay7d(
  current: AROverdueInvoice & { daysOverdue: number },
  history: { paid_at: string | null; due_date: string }[],
): number {
  let base = 65; // baseline guess

  // History scoring: avg days late (negative = pays early)
  const closed = history.filter(h => h.paid_at);
  if (closed.length >= 2) {
    const avgLate =
      closed.reduce((s, h) => {
        const late = differenceInDays(parseISO(h.paid_at!), parseISO(h.due_date));
        return s + late;
      }, 0) / closed.length;
    if (avgLate <= 0) base = 92;
    else if (avgLate <= 5) base = 80;
    else if (avgLate <= 15) base = 60;
    else if (avgLate <= 30) base = 40;
    else base = 22;
  }

  // Penalty: current days overdue
  const od = current.daysOverdue;
  if (od > 60) base -= 35;
  else if (od > 30) base -= 22;
  else if (od > 14) base -= 10;

  // Penalty: prior reminders ignored
  const sent = current.reminder_count ?? 0;
  base -= Math.min(20, sent * 7);

  return Math.max(3, Math.min(97, Math.round(base)));
}
