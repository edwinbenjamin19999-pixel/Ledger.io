import { useMemo } from "react";
import { useFirmVAT } from "@/hooks/useFirmVAT";
import { useFirmTax } from "@/hooks/useFirmTax";
import { useFirmInvoices } from "@/hooks/useFirmInvoices";
import { useFirmSupplierInvoices } from "@/hooks/useFirmSupplierInvoices";

/**
 * Cross-client global KPI aggregator (spec id="wl-multitenant-core-v1" §4A).
 *
 * Pure aggregation layer — sums the SAME firm-scoped datasets used by the
 * per-module WL pages, so figures here always equal the totals you see when
 * you open Moms / Skatt / Kundfakturor / Lev.fakturor in the byrå sidebar.
 *
 * No new Supabase queries are issued. Every input comes from an existing
 * `useFirm*` hook → §10 "no duplication" satisfied.
 */
export interface FirmGlobalKPIs {
  /** Total VAT payable (sum of net_amount on all non-submitted, non-settled VAT periods). */
  vatPayable: number;
  /** Number of VAT periods contributing to the payable figure. */
  vatPayablePeriods: number;
  /** Late VAT periods (overdue & not submitted). */
  vatLatePeriods: number;

  /** Outstanding tax exposure (sum of amount on draft/review/ready tax declarations). */
  taxExposure: number;
  /** Number of tax declarations contributing. */
  taxOpenDeclarations: number;
  /** High-risk tax declarations (large deviation, missing data, late). */
  taxHighRisk: number;

  /** Unpaid customer invoices total (sent + viewed + overdue, excluding paid/cancelled). */
  unpaidAR: number;
  unpaidARCount: number;
  /** Overdue customer invoices total (subset of unpaidAR). */
  overdueAR: number;
  overdueARCount: number;

  /** Unpaid supplier invoices waiting for action (everything not paid/rejected). */
  unpaidAP: number;
  unpaidAPCount: number;
  /** Overdue supplier invoices subset. */
  overdueAP: number;
  overdueAPCount: number;

  /** Distinct clients in any of the above buckets — for the "X klienter behöver åtgärd" sub-line. */
  affectedClientCount: number;

  isLoading: boolean;
}

const SEK = (n: number) =>
  new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(n);

export const formatSEK = SEK;

export function useFirmGlobalKPIs(): FirmGlobalKPIs {
  const vat = useFirmVAT();
  const tax = useFirmTax();
  const ar = useFirmInvoices();
  const ap = useFirmSupplierInvoices();

  return useMemo<FirmGlobalKPIs>(() => {
    const vatRows = vat.data ?? [];
    const taxRows = tax.data ?? [];
    const arRows = ar.data ?? [];
    const apRows = ap.data ?? [];

    const affected = new Set<string>();

    // VAT payable — anything not yet submitted/settled
    let vatPayable = 0;
    let vatPayablePeriods = 0;
    let vatLatePeriods = 0;
    for (const r of vatRows) {
      const open = r.stage !== "submitted" && r.stage !== "settled";
      if (open && r.net_amount > 0) {
        vatPayable += r.net_amount;
        vatPayablePeriods++;
        affected.add(r.company_id);
      }
      if (r.risk === "high" && open && r.days_to_due !== null && r.days_to_due < 0) {
        vatLatePeriods++;
        affected.add(r.company_id);
      }
    }

    // Tax exposure — open declarations
    let taxExposure = 0;
    let taxOpenDeclarations = 0;
    let taxHighRisk = 0;
    for (const r of taxRows) {
      const open = r.stage !== "submitted" && r.stage !== "settled";
      if (open && r.amount > 0) {
        taxExposure += r.amount;
        taxOpenDeclarations++;
        affected.add(r.company_id);
      }
      if (r.risk === "high" && open) {
        taxHighRisk++;
        affected.add(r.company_id);
      }
    }

    // AR — `useFirmInvoices` returns enriched rows; tolerate either shape
    let unpaidAR = 0;
    let unpaidARCount = 0;
    let overdueAR = 0;
    let overdueARCount = 0;
    const todayMs = Date.now();
    for (const r of arRows as Array<Record<string, any>>) {
      const status = String(r.status ?? "").toLowerCase();
      const isPaid = status === "paid" || status === "settled" || !!r.paid_at;
      const isCancelled = status === "cancelled" || status === "void";
      if (isPaid || isCancelled) continue;
      const amount = Number(r.total_amount ?? r.amount ?? 0);
      unpaidAR += amount;
      unpaidARCount++;
      if (r.company_id) affected.add(r.company_id);
      const due = r.due_date ? new Date(r.due_date).getTime() : null;
      if (due !== null && due < todayMs) {
        overdueAR += amount;
        overdueARCount++;
      }
    }

    // AP — supplier invoice rows are normalized via STAGE_META
    let unpaidAP = 0;
    let unpaidAPCount = 0;
    let overdueAP = 0;
    let overdueAPCount = 0;
    for (const r of apRows) {
      if (r.stage === "paid" || r.stage === "rejected") continue;
      unpaidAP += r.total_amount;
      unpaidAPCount++;
      affected.add(r.company_id);
      if (r.daysToDue !== null && r.daysToDue < 0) {
        overdueAP += r.total_amount;
        overdueAPCount++;
      }
    }

    return {
      vatPayable,
      vatPayablePeriods,
      vatLatePeriods,
      taxExposure,
      taxOpenDeclarations,
      taxHighRisk,
      unpaidAR,
      unpaidARCount,
      overdueAR,
      overdueARCount,
      unpaidAP,
      unpaidAPCount,
      overdueAP,
      overdueAPCount,
      affectedClientCount: affected.size,
      isLoading: vat.isLoading || tax.isLoading || ar.isLoading || ap.isLoading,
    };
  }, [vat.data, tax.data, ar.data, ap.data, vat.isLoading, tax.isLoading, ar.isLoading, ap.isLoading]);
}
