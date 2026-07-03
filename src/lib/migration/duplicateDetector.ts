import { supabase } from "@/integrations/supabase/client";

export interface ExtractedInvoice {
  invoiceType: "supplier" | "customer";
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string | null;
  supplierName?: string | null;
  supplierOrgNumber?: string | null;
  supplierBankgiro?: string | null;
  customerName?: string | null;
  customerOrgNumber?: string | null;
  amountExclVat: number;
  vatAmount: number;
  amountInclVat: number;
  vatRate: number;
  currency: string;
  description: string;
  accountSuggestion: string;
  confidence: number;
}

export interface DuplicateCheckResult {
  invoice: ExtractedInvoice;
  isDuplicate: boolean;
  isPossibleDuplicate?: boolean;
  existingId?: string;
  reason?: string;
}

export async function checkForDuplicates(
  invoices: ExtractedInvoice[],
  companyId: string,
): Promise<DuplicateCheckResult[]> {
  const results: DuplicateCheckResult[] = [];

  for (const invoice of invoices) {
    const table =
      invoice.invoiceType === "customer"
        ? "imported_customer_invoices"
        : "imported_supplier_invoices";

    // Exact match by invoice number
    const { data: existing } = await supabase
      .from(table as any)
      .select("id, external_invoice_number")
      .eq("company_id", companyId)
      .eq("external_invoice_number", invoice.invoiceNumber)
      .limit(1);

    if (existing && existing.length > 0) {
      results.push({
        invoice,
        isDuplicate: true,
        existingId: (existing[0] as any).id,
        reason: `Faktura ${invoice.invoiceNumber} finns redan importerad`,
      });
      continue;
    }

    // Fuzzy match by amount + date
    const { data: similar } = await supabase
      .from(table as any)
      .select("id")
      .eq("company_id", companyId)
      .eq("invoice_date", invoice.invoiceDate)
      .eq("amount_incl_vat", invoice.amountInclVat)
      .limit(1);

    results.push({
      invoice,
      isDuplicate: false,
      isPossibleDuplicate: !!(similar && similar.length > 0),
      reason: similar && similar.length > 0
        ? "Liknande faktura med samma datum och belopp finns"
        : undefined,
    });
  }

  return results;
}
