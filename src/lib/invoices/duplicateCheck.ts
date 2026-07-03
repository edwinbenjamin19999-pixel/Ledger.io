import { supabase } from "@/integrations/supabase/client";

export interface DuplicateMatch {
  id: string;
  invoice_number: string | null;
  invoice_date: string | null;
  total_amount: number | null;
  counterparty_name: string | null;
  status: string | null;
}

export interface DuplicateCheckResult {
  /** Hard block — must not save. */
  blocking: DuplicateMatch | null;
  /** Reason code for the block. */
  blockingReason: "same_number" | "same_date_window" | null;
  /** Soft warning — same amount to/from same counterparty within 30 days. */
  softMatches: DuplicateMatch[];
}

interface Args {
  companyId: string;
  invoiceType: "incoming" | "outgoing";
  counterpartyName: string;
  counterpartyId?: string | null;
  invoiceNumber?: string | null;
  totalAmount: number;
  invoiceDate: string; // YYYY-MM-DD
  excludeInvoiceId?: string | null;
}

const AMOUNT_TOLERANCE = 0.5; // SEK
const DATE_WINDOW_DAYS = 3;
const SOFT_WINDOW_DAYS = 30;

function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function amountsMatch(a: number | null | undefined, b: number): boolean {
  if (a == null) return false;
  return Math.abs(Number(a) - b) <= AMOUNT_TOLERANCE;
}

export async function checkInvoiceDuplicates(args: Args): Promise<DuplicateCheckResult> {
  const {
    companyId,
    invoiceType,
    counterpartyName,
    counterpartyId,
    invoiceNumber,
    totalAmount,
    invoiceDate,
    excludeInvoiceId,
  } = args;

  const result: DuplicateCheckResult = {
    blocking: null,
    blockingReason: null,
    softMatches: [],
  };

  if (!counterpartyName?.trim()) return result;

  const softFrom = addDays(invoiceDate, -SOFT_WINDOW_DAYS);
  const softTo = addDays(invoiceDate, SOFT_WINDOW_DAYS);

  // Pull candidates by counterparty within 30-day window — covers all checks.
  let query = supabase
    .from("invoices")
    .select("id, invoice_number, invoice_date, total_amount, counterparty_name, status, supplier_id")
    .eq("company_id", companyId)
    .eq("invoice_type", invoiceType)
    .gte("invoice_date", softFrom)
    .lte("invoice_date", softTo);

  if (excludeInvoiceId) query = query.neq("id", excludeInvoiceId);

  const { data, error } = await query.limit(200);
  if (error || !data) return result;

  const nameKey = counterpartyName.trim().toLowerCase();
  const candidates = data.filter((row: any) => {
    if (counterpartyId && row.supplier_id === counterpartyId) return true;
    return (row.counterparty_name || "").trim().toLowerCase() === nameKey;
  });

  // 1) Hard block: same number + same amount.
  if (invoiceNumber?.trim()) {
    const numKey = invoiceNumber.trim().toLowerCase();
    const sameNumber = candidates.find(
      (r: any) =>
        (r.invoice_number || "").trim().toLowerCase() === numKey &&
        amountsMatch(r.total_amount, totalAmount),
    );
    if (sameNumber) {
      result.blocking = sameNumber as DuplicateMatch;
      result.blockingReason = "same_number";
      return result;
    }
  }

  // 2) Supplier-only: same amount + invoice_date within ±3 days (catches re-uploads).
  if (invoiceType === "incoming") {
    const dateFrom = addDays(invoiceDate, -DATE_WINDOW_DAYS);
    const dateTo = addDays(invoiceDate, DATE_WINDOW_DAYS);
    const dateMatch = candidates.find(
      (r: any) =>
        amountsMatch(r.total_amount, totalAmount) &&
        r.invoice_date &&
        r.invoice_date >= dateFrom &&
        r.invoice_date <= dateTo,
    );
    if (dateMatch) {
      result.blocking = dateMatch as DuplicateMatch;
      result.blockingReason = "same_date_window";
      return result;
    }
  }

  // 3) Soft warning: same amount in 30-day window (already filtered above).
  result.softMatches = candidates
    .filter((r: any) => amountsMatch(r.total_amount, totalAmount))
    .slice(0, 5) as DuplicateMatch[];

  return result;
}
