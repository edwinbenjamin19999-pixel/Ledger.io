import type { APInvoiceLite } from "./types";

export interface DeferrableAPInvoice extends APInvoiceLite {
  daysToDeadline: number;
  safeToDelay: boolean;
  estimatedSavingsSek: number;
}

const CRITICAL_KEYWORDS = ["skatte", "moms", "lön", "hyra", "elnät", "försäkring"];

export function identifyDeferrableAP(invoices: APInvoiceLite[]): DeferrableAPInvoice[] {
  const today = new Date();
  return invoices
    .map((inv) => {
      const due = inv.due_date ? new Date(inv.due_date) : today;
      const daysToDeadline = Math.floor(
        (due.getTime() - today.getTime()) / 86400000
      );
      const name = (inv.counterparty_name || "").toLowerCase();
      const isCritical = CRITICAL_KEYWORDS.some((k) => name.includes(k));
      const safeToDelay = !isCritical && daysToDeadline > 7 && inv.status !== "overdue";
      // Rough liquidity savings if we shift payment from now to due date
      const estimatedSavingsSek = safeToDelay ? inv.total_amount || 0 : 0;
      return { ...inv, daysToDeadline, safeToDelay, estimatedSavingsSek };
    })
    .sort((a, b) => b.estimatedSavingsSek - a.estimatedSavingsSek);
}
