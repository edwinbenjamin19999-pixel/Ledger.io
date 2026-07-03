import type { ARInvoiceLite } from "./types";

export interface RankedARInvoice extends ARInvoiceLite {
  daysOverdue: number;
  riskScore: number;
  riskLevel: "low" | "medium" | "high";
}

export function rankARInvoices(invoices: ARInvoiceLite[]): RankedARInvoice[] {
  const today = new Date();
  return invoices
    .map((inv) => {
      const due = inv.due_date ? new Date(inv.due_date) : today;
      const daysOverdue = Math.max(
        0,
        Math.floor((today.getTime() - due.getTime()) / 86400000)
      );
      const reminderPenalty = (inv.reminder_count ?? 0) * 0.15;
      // Score: amount weight × overdue weight × behavior weight
      const amount = inv.total_amount || 0;
      const score = amount * (1 + daysOverdue / 30) * (1 + reminderPenalty);
      const risk: RankedARInvoice["riskLevel"] =
        daysOverdue > 60 || (inv.reminder_count ?? 0) >= 3
          ? "high"
          : daysOverdue > 14
          ? "medium"
          : "low";
      return { ...inv, daysOverdue, riskScore: score, riskLevel: risk };
    })
    .sort((a, b) => b.riskScore - a.riskScore);
}
