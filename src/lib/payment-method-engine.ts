/**
 * AI Payment Method Detection Engine
 * Layered decision tree to determine how a purchase was paid
 * and map it to the correct balancing account.
 */
import { supabase } from "@/integrations/supabase/client";

// ─── Types ───────────────────────────────────────────────────

export type PaymentMethod =
  | "bank"
  | "credit_card"
  | "supplier_invoice"
  | "employee_outlay"
  | "cash"
  | "unknown";

export interface PaymentMethodResult {
  method: PaymentMethod;
  confidence: number;
  evidence: string;
  balancingAccount: string;
  balancingAccountName: string;
  needsClarification: boolean;
}

export interface ReceiptData {
  totalAmount?: number;
  date?: string;
  supplier?: string;
  paymentMethod?: string;
  description?: string;
  // Invoice-like fields
  dueDate?: string;
  invoiceNumber?: string;
  paymentTerms?: string;
  reference?: string;
}

export interface BankMatchData {
  transactionId: string;
  amount: number;
  date: string;
  description?: string;
  counterparty?: string;
  confidence: number;
}

export interface CCMatchData {
  transactionId: string;
  amount: number;
  date: string;
  merchantName?: string;
  confidence: number;
}

export interface DetectionContext {
  isExpenseClaim?: boolean;
  documentType?: "receipt" | "invoice" | "statement" | "unknown";
}

// ─── Balancing Account Map ──────────────────────────────────

const BALANCING_ACCOUNTS: Record<PaymentMethod, { account: string; name: string }> = {
  bank: { account: "1930", name: "Företagskonto" },
  credit_card: { account: "2890", name: "Kreditkortsskuld" },
  supplier_invoice: { account: "2440", name: "Leverantörsskulder" },
  employee_outlay: { account: "2893", name: "Utlägg anställda" },
  cash: { account: "1910", name: "Kassa" },
  unknown: { account: "1930", name: "Företagskonto" },
};

// ─── OCR Payment Method Mapping ─────────────────────────────

const OCR_METHOD_MAP: Record<string, { method: PaymentMethod; confidence: number }> = {
  card: { method: "bank", confidence: 0.7 },
  kort: { method: "bank", confidence: 0.7 },
  debit: { method: "bank", confidence: 0.72 },
  credit: { method: "credit_card", confidence: 0.65 },
  kreditkort: { method: "credit_card", confidence: 0.75 },
  cash: { method: "cash", confidence: 0.8 },
  kontant: { method: "cash", confidence: 0.8 },
  swish: { method: "bank", confidence: 0.75 },
  invoice: { method: "supplier_invoice", confidence: 0.7 },
  faktura: { method: "supplier_invoice", confidence: 0.7 },
  unknown: { method: "unknown", confidence: 0 },
};

// ─── Main Detection Function ────────────────────────────────

export async function detectPaymentMethod(
  companyId: string,
  receiptData: ReceiptData,
  bankMatch: BankMatchData | null,
  ccMatch: CCMatchData | null,
  context: DetectionContext = {}
): Promise<PaymentMethodResult> {
  // Layer 1: Direct bank match
  if (bankMatch && bankMatch.confidence >= 0.7) {
    return buildResult("bank", Math.min(0.98, bankMatch.confidence), "Matchad mot banktransaktion");
  }

  // Layer 2: Credit card match
  if (ccMatch && ccMatch.confidence >= 0.7) {
    return buildResult("credit_card", Math.min(0.96, ccMatch.confidence), "Matchad mot kreditkortstransaktion");
  }

  // Layer 2b: Try CC match from database if not provided
  if (!ccMatch && receiptData.totalAmount && receiptData.date) {
    const dbCCMatch = await matchCreditCardTransaction(companyId, receiptData);
    if (dbCCMatch) {
      return buildResult("credit_card", dbCCMatch.confidence, "Matchad mot importerad kreditkortstransaktion");
    }
  }

  // Layer 3: Invoice structure detection
  if (context.documentType === "invoice" || hasInvoiceStructure(receiptData)) {
    const conf = context.documentType === "invoice" ? 0.9 : 0.78;
    return buildResult("supplier_invoice", conf, "Dokumentet har fakturastruktur (betalningsvillkor/förfallodatum)");
  }

  // Layer 4: Expense claim context
  if (context.isExpenseClaim) {
    return buildResult("employee_outlay", 0.88, "Uppladdat via utläggsflöde");
  }

  // Layer 5: OCR payment method + merchant history
  const ocrMethod = receiptData.paymentMethod?.toLowerCase() || "";
  const ocrMapping = Object.entries(OCR_METHOD_MAP).find(([key]) => ocrMethod.includes(key));

  // Check merchant history for this company
  const historyResult = await checkMerchantHistory(companyId, receiptData.supplier || "");

  if (historyResult && historyResult.confidence >= 0.7) {
    // Boost with OCR if they agree
    let finalConfidence = historyResult.confidence;
    if (ocrMapping && ocrMapping[1].method === historyResult.method) {
      finalConfidence = Math.min(0.95, finalConfidence + 0.1);
    }
    return buildResult(
      historyResult.method,
      finalConfidence,
      `Historiskt mönster: ${receiptData.supplier} betalas oftast med ${getMethodLabel(historyResult.method)}`
    );
  }

  // Use OCR alone if available
  if (ocrMapping && ocrMapping[1].confidence > 0) {
    return buildResult(
      ocrMapping[1].method,
      ocrMapping[1].confidence,
      `OCR-detekterad betalmetod: "${ocrMethod}"`
    );
  }

  // Layer 6: Fallback - unknown, needs clarification
  return {
    method: "unknown",
    confidence: 0.2,
    evidence: "Ingen betalmetod kunde identifieras automatiskt",
    balancingAccount: "1930",
    balancingAccountName: "Företagskonto",
    needsClarification: true,
  };
}

// ─── Helper Functions ───────────────────────────────────────

function buildResult(method: PaymentMethod, confidence: number, evidence: string): PaymentMethodResult {
  const account = BALANCING_ACCOUNTS[method];
  return {
    method,
    confidence,
    evidence,
    balancingAccount: account.account,
    balancingAccountName: account.name,
    needsClarification: confidence < 0.6,
  };
}

function hasInvoiceStructure(data: ReceiptData): boolean {
  if (data.dueDate || data.invoiceNumber || data.paymentTerms) return true;
  // Check description for invoice-like keywords
  const text = `${data.description || ""} ${data.supplier || ""}`.toLowerCase();
  const invoiceKeywords = ["förfallodatum", "betalningsvillkor", "fakturanummer", "faktura nr", "30 dagar", "10 dagar", "ocr"];
  return invoiceKeywords.some(kw => text.includes(kw));
}

async function matchCreditCardTransaction(
  companyId: string,
  receiptData: ReceiptData
): Promise<{ confidence: number } | null> {
  try {
    const amount = Math.abs(receiptData.totalAmount || 0);
    if (amount === 0) return null;

    const dateObj = new Date(receiptData.date || "");
    if (isNaN(dateObj.getTime())) return null;

    const dayBefore = new Date(dateObj);
    dayBefore.setDate(dayBefore.getDate() - 2);
    const dayAfter = new Date(dateObj);
    dayAfter.setDate(dayAfter.getDate() + 2);

    const { data: matches } = await supabase
      .from("credit_card_transactions")
      .select("id, amount, transaction_date, merchant_name")
      .eq("company_id", companyId)
      .gte("transaction_date", dayBefore.toISOString().split("T")[0])
      .lte("transaction_date", dayAfter.toISOString().split("T")[0])
      .limit(20);

    if (!matches || matches.length === 0) return null;

    const tolerance = amount * 0.03;
    const best = matches
      .map(m => ({
        ...m,
        amountDiff: Math.abs(Math.abs(m.amount) - amount),
      }))
      .filter(m => m.amountDiff <= tolerance)
      .sort((a, b) => a.amountDiff - b.amountDiff)[0];

    if (!best) return null;

    // Calculate confidence based on amount proximity and merchant name similarity
    let conf = Math.max(0.7, 1 - best.amountDiff / amount);
    if (receiptData.supplier && best.merchant_name) {
      const supplierLower = receiptData.supplier.toLowerCase();
      const merchantLower = best.merchant_name.toLowerCase();
      if (merchantLower.includes(supplierLower) || supplierLower.includes(merchantLower)) {
        conf = Math.min(0.95, conf + 0.1);
      }
    }

    return { confidence: conf };
  } catch {
    return null;
  }
}

async function checkMerchantHistory(
  companyId: string,
  supplier: string
): Promise<{ method: PaymentMethod; confidence: number } | null> {
  if (!supplier || supplier.length < 2) return null;

  try {
    const { data } = await supabase
      .from("agent_bookings")
      .select("balancing_account, payment_method")
      .eq("company_id", companyId)
      .ilike("counterparty", `%${supplier.substring(0, 15)}%`)
      .not("payment_method", "is", null)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!data || data.length < 2) return null;

    // Count occurrences of each payment method
    const counts: Record<string, number> = {};
    for (const row of data) {
      const m = row.payment_method || "unknown";
      counts[m] = (counts[m] || 0) + 1;
    }

    const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (!best) return null;

    const ratio = best[1] / data.length;
    if (ratio < 0.5) return null;

    return {
      method: best[0] as PaymentMethod,
      confidence: Math.min(0.88, 0.6 + ratio * 0.2 + Math.min(data.length, 5) * 0.02),
    };
  } catch {
    return null;
  }
}

// ─── Utility ────────────────────────────────────────────────

export function getMethodLabel(method: PaymentMethod): string {
  const labels: Record<PaymentMethod, string> = {
    bank: "Bank / betalkort",
    credit_card: "Kreditkort",
    supplier_invoice: "Leverantörsfaktura",
    employee_outlay: "Utlägg / reimbursement",
    cash: "Kontant",
    unknown: "Okänd",
  };
  return labels[method] || method;
}

export function getBalancingAccount(method: PaymentMethod): { account: string; name: string } {
  return BALANCING_ACCOUNTS[method];
}

export const PAYMENT_METHOD_OPTIONS: { method: PaymentMethod; label: string; iconName: string }[] = [
  { method: "bank", label: "Bank / betalkort", iconName: "Building2" },
  { method: "credit_card", label: "Kreditkort", iconName: "CreditCard" },
  { method: "supplier_invoice", label: "Leverantörsfaktura", iconName: "Receipt" },
  { method: "employee_outlay", label: "Utlägg", iconName: "Wallet" },
  { method: "cash", label: "Kontant", iconName: "Banknote" },
];
