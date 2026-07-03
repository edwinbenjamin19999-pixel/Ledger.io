/**
 * Cashflow classification engine.
 *
 * Maps a journal-entry cash movement to:
 *   - activity (operating | investing | financing)
 *   - bucket (customer_in / supplier_out / payroll_out / tax_out / vat_out / other_op /
 *             asset_invest / fin_invest / divest / loans / equity)
 *   - confidence (0-1)
 *   - sourceType + sourceId when an invoice / bank tx / payroll link exists.
 *
 * Pure function — no I/O. Higher-level hooks call it on rows already fetched.
 */

export type CashflowActivity = "operating" | "investing" | "financing";

export type CashflowBucket =
  | "customer_in"
  | "supplier_out"
  | "payroll_out"
  | "tax_out"
  | "vat_out"
  | "other_op_in"
  | "other_op_out"
  | "asset_invest"
  | "fin_invest"
  | "divest"
  | "loans"
  | "equity";

export interface BucketMeta {
  key: CashflowBucket;
  label: string;
  activity: CashflowActivity;
  flow: "in" | "out";
  /** Suggested CTA route for "review" actions. */
  reviewRoute?: string;
}

export const BUCKETS: Record<CashflowBucket, BucketMeta> = {
  customer_in:  { key: "customer_in",  label: "Inbetalningar från kunder",        activity: "operating",  flow: "in",  reviewRoute: "/finance" },
  supplier_out: { key: "supplier_out", label: "Utbetalningar till leverantörer",  activity: "operating",  flow: "out", reviewRoute: "/direct-payment" },
  payroll_out:  { key: "payroll_out",  label: "Löner",                            activity: "operating",  flow: "out", reviewRoute: "/hr" },
  tax_out:      { key: "tax_out",      label: "Skatt",                            activity: "operating",  flow: "out", reviewRoute: "/tax-calculation" },
  vat_out:      { key: "vat_out",      label: "Moms",                             activity: "operating",  flow: "out", reviewRoute: "/moms" },
  other_op_in:  { key: "other_op_in",  label: "Övriga inbetalningar",             activity: "operating",  flow: "in" },
  other_op_out: { key: "other_op_out", label: "Övriga utbetalningar",             activity: "operating",  flow: "out" },
  asset_invest: { key: "asset_invest", label: "Förvärv av anläggningstillgångar", activity: "investing",  flow: "out", reviewRoute: "/depreciation" },
  fin_invest:   { key: "fin_invest",   label: "Finansiella placeringar",          activity: "investing",  flow: "out" },
  divest:       { key: "divest",       label: "Avyttringar",                      activity: "investing",  flow: "in" },
  loans:        { key: "loans",        label: "Lån (uttag/amorteringar)",         activity: "financing",  flow: "out" },
  equity:       { key: "equity",       label: "Eget kapital / utdelning",         activity: "financing",  flow: "out" },
};

export interface ClassifyInput {
  /** Counter (non-cash) account number, e.g. "1510". */
  counterAccount: string;
  /** Net cash delta (positive = inflow, negative = outflow). */
  cashDelta: number;
  /** Optional links from journal_entry_lines. */
  linkedInvoiceId?: string | null;
  linkedSupplierInvoiceId?: string | null;
  linkedBankTransactionId?: string | null;
  linkedPayrollRunId?: string | null;
  /** Free-text from journal entry description — used as last-resort signal. */
  description?: string | null;
}

export interface ClassifyResult {
  activity: CashflowActivity;
  bucket: CashflowBucket;
  confidence: number;
  sourceType: "invoice" | "supplierInvoice" | "bankTransaction" | "payrollRun" | "journal";
  sourceId: string | null;
  reviewClassification: boolean;
}

const isCashAccount = (n: string) => {
  const x = parseInt(n, 10);
  return x >= 1910 && x <= 1959;
};

export { isCashAccount };

export function classifyCashMovement(input: ClassifyInput): ClassifyResult {
  const { counterAccount, cashDelta } = input;
  const n = parseInt(counterAccount, 10);

  // Source-link first (highest confidence) -----------------------------
  if (input.linkedInvoiceId) {
    return mk("operating", "customer_in", 0.98, "invoice", input.linkedInvoiceId, false);
  }
  if (input.linkedSupplierInvoiceId) {
    return mk("operating", "supplier_out", 0.98, "supplierInvoice", input.linkedSupplierInvoiceId, false);
  }
  if (input.linkedPayrollRunId) {
    return mk("operating", "payroll_out", 0.98, "payrollRun", input.linkedPayrollRunId, false);
  }

  const linkedTx = input.linkedBankTransactionId ?? null;
  const sourceType: ClassifyResult["sourceType"] = linkedTx ? "bankTransaction" : "journal";
  const sourceId = linkedTx;

  if (!Number.isFinite(n)) {
    return mk("operating", cashDelta > 0 ? "other_op_in" : "other_op_out", 0.4, sourceType, sourceId, true);
  }

  // INVESTING ----------------------------------------------------------
  if (n >= 1100 && n <= 1299) return mk("investing", cashDelta > 0 ? "divest" : "asset_invest", 0.95, sourceType, sourceId, false);
  if (n >= 1300 && n <= 1399) return mk("investing", cashDelta > 0 ? "divest" : "fin_invest", 0.9, sourceType, sourceId, false);

  // FINANCING ----------------------------------------------------------
  if (n >= 2300 && n <= 2399) return mk("financing", "loans", 0.9, sourceType, sourceId, false);
  if (n >= 2000 && n <= 2099) return mk("financing", "equity", 0.85, sourceType, sourceId, false);
  if (n === 2898 || n === 2898) return mk("financing", "equity", 0.85, sourceType, sourceId, false);

  // OPERATING ----------------------------------------------------------
  // VAT (moms)
  if (n >= 2610 && n <= 2650) return mk("operating", "vat_out", 0.95, sourceType, sourceId, false);
  // Tax (F-skatt, bolagsskatt, källskatt på lön är 2710 men hanteras lägre)
  if (n === 2510 || n === 2512 || n === 2518 || (n >= 8910 && n <= 8929)) {
    return mk("operating", "tax_out", 0.95, sourceType, sourceId, false);
  }
  // Källskatt + arbetsgivaravgifter → påverkar lön-bucketen
  if (n === 2710 || n === 2731 || (n >= 7510 && n <= 7599)) {
    return mk("operating", "payroll_out", 0.92, sourceType, sourceId, false);
  }
  // Lönekostnader
  if (n >= 7000 && n <= 7499) return mk("operating", "payroll_out", 0.95, sourceType, sourceId, false);

  // AR / Revenue → customer in
  if (n === 1510 || n === 1515) return mk("operating", "customer_in", 0.95, sourceType, sourceId, false);
  if (n >= 3000 && n <= 3999) return mk("operating", cashDelta > 0 ? "customer_in" : "other_op_out", 0.85, sourceType, sourceId, false);

  // AP → supplier
  if (n === 2440 || n === 2441) return mk("operating", "supplier_out", 0.95, sourceType, sourceId, false);

  // Operating costs (4xxx-6xxx)
  if (n >= 4000 && n <= 6999) {
    return mk("operating", cashDelta > 0 ? "other_op_in" : "other_op_out", 0.7, sourceType, sourceId, false);
  }

  // Fallback
  return mk("operating", cashDelta > 0 ? "other_op_in" : "other_op_out", 0.35, sourceType, sourceId, true);
}

function mk(
  activity: CashflowActivity,
  bucket: CashflowBucket,
  confidence: number,
  sourceType: ClassifyResult["sourceType"],
  sourceId: string | null,
  reviewClassification: boolean,
): ClassifyResult {
  return { activity, bucket, confidence, sourceType, sourceId, reviewClassification };
}
