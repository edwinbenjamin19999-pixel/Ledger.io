/**
 * Validation helper for invoice drafts.
 * Used to surface "BEHÖVER ÅTGÄRD" badges + tooltip messages on invoice rows.
 */

export interface InvoiceValidationIssue {
  field: string;
  message: string;
}

export interface InvoiceValidationResult {
  ok: boolean;
  issues: InvoiceValidationIssue[];
}

export interface InvoiceLike {
  status?: string | null;
  counterparty_name?: string | null;
  counterparty_org_number?: string | null;
  invoice_date?: string | null;
  due_date?: string | null;
  total_amount?: number | null;
}

export interface InvoiceLineLike {
  unit_price?: number | null;
  quantity?: number | null;
  vat_rate?: number | null;
  description?: string | null;
}

export const INVOICE_FIELD_LABELS: Record<string, string> = {
  counterparty_name: "Kund",
  invoice_date: "Fakturadatum",
  due_date: "Förfallodatum",
  lines: "Fakturarader",
  unit_price: "Á-pris",
  vat_rate: "Momssats",
  total_amount: "Totalbelopp",
};

/**
 * Validate an invoice draft. Only meaningful for status === 'draft'.
 * For non-drafts, returns ok: true (no inline action needed).
 */
export function validateInvoiceDraft(
  invoice: InvoiceLike,
  lines?: InvoiceLineLike[] | null,
): InvoiceValidationResult {
  const issues: InvoiceValidationIssue[] = [];

  if (invoice.status && invoice.status !== "draft") {
    return { ok: true, issues: [] };
  }

  if (!invoice.counterparty_name || !invoice.counterparty_name.trim()) {
    issues.push({ field: "counterparty_name", message: "Kund saknas" });
  }
  if (!invoice.invoice_date) {
    issues.push({ field: "invoice_date", message: "Fakturadatum saknas" });
  }
  if (!invoice.due_date) {
    issues.push({ field: "due_date", message: "Förfallodatum saknas" });
  }

  if (lines !== undefined) {
    if (!lines || lines.length === 0) {
      issues.push({ field: "lines", message: "Inga fakturarader" });
    } else {
      lines.forEach((ln, idx) => {
        const rowNum = idx + 1;
        if (ln.unit_price == null || Number(ln.unit_price) === 0) {
          issues.push({
            field: `line-${idx}-unit_price`,
            message: `Rad ${rowNum}: á-pris saknas`,
          });
        }
        if (
          ln.vat_rate != null &&
          (Number(ln.vat_rate) < 0 || Number(ln.vat_rate) > 100)
        ) {
          issues.push({
            field: `line-${idx}-vat_rate`,
            message: `Rad ${rowNum}: orimlig momssats`,
          });
        }
      });
    }
  } else {
    // Lines not loaded — fall back to total_amount sanity check.
    if (invoice.total_amount == null || Number(invoice.total_amount) === 0) {
      issues.push({ field: "total_amount", message: "Totalbelopp saknas" });
    }
  }

  return { ok: issues.length === 0, issues };
}
