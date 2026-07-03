import { useMemo } from "react";
import type { APInvoice } from "./useAPInvoices";
import type { RiskSignal } from "./useRiskSignals";

export interface PaymentBatchSummary {
  invoices: APInvoice[];
  totalAmount: number;
  newSupplierCount: number;
  bgChangedCount: number;
  amountAnomalyCount: number;
  overbillingCount: number;
  blockedCount: number;
  normalCount: number;
}

export function usePaymentBatch(
  invoices: APInvoice[],
  selectedIds: Set<string>,
  signals: RiskSignal[],
): PaymentBatchSummary {
  return useMemo(() => {
    const selected = invoices.filter((i) => selectedIds.has(i.id));
    const sigByInvoice = signals.reduce<Record<string, RiskSignal[]>>((acc, s) => {
      (acc[s.invoice_id] ||= []).push(s);
      return acc;
    }, {});

    let newSupplierCount = 0;
    let bgChangedCount = 0;
    let amountAnomalyCount = 0;
    let overbillingCount = 0;
    let blockedCount = 0;
    let normalCount = 0;
    let totalAmount = 0;

    for (const inv of selected) {
      totalAmount += inv.total_amount;
      const sigs = sigByInvoice[inv.id] ?? [];
      if (inv.is_blocked) blockedCount++;
      const hasNewSup = sigs.some((s) => s.kind === "new_supplier");
      const hasBgCh = sigs.some((s) => s.kind === "bg_changed");
      const hasAmount = sigs.some((s) => s.kind === "amount_anomaly");
      const hasOver = sigs.some(
        (s) => (s.kind === "overbilling" || s.kind === "duplicate_period") && !s.resolved_at,
      );
      if (hasNewSup) newSupplierCount++;
      if (hasBgCh) bgChangedCount++;
      if (hasAmount) amountAnomalyCount++;
      if (hasOver) overbillingCount++;
      if (!hasNewSup && !hasBgCh && !hasAmount && !hasOver && !inv.is_blocked) normalCount++;
    }

    return {
      invoices: selected,
      totalAmount,
      newSupplierCount,
      bgChangedCount,
      amountAnomalyCount,
      overbillingCount,
      blockedCount,
      normalCount,
    };
  }, [invoices, selectedIds, signals]);
}
