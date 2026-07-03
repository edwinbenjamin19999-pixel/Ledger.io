/**
 * Credit Card AI Engine — pure client logic for autonomous credit card bookkeeping.
 *
 * Determines expense account, VAT, and liability account per transaction with confidence,
 * applies learning rules, and produces a full double-entry preview.
 *
 *   Purchase event:  Debit expense + Debit input VAT (2641) / Credit liability (2890)
 *   Payment event:   Debit liability (2890) / Credit bank (1930)
 */

export type CCAccountSuggestion = {
  expense_account: string;
  expense_account_name: string;
  vat_code: string; // "25" | "12" | "6" | "0"
  vat_amount: number;
  vat_account: string | null;
  liability_account: string;
  category: string;
  is_non_deductible: boolean;
  is_foreign: boolean;
  confidence: number;
  explanation: string;
  source: "learned" | "rule" | "ai" | "fallback";
};

export type CCJournalPreviewLine = {
  account: string;
  accountName: string;
  debit: number;
  credit: number;
};

export type LearnedRule = {
  merchant_pattern: string;
  expense_account: string;
  expense_account_name?: string | null;
  vat_code?: string | null;
  category?: string | null;
};

// Static merchant heuristics (BAS 2026)
const MERCHANT_RULES: Array<{
  match: RegExp;
  account: string;
  name: string;
  vat: string;
  category: string;
  nonDeductible?: boolean;
}> = [
  // Software / SaaS
  { match: /(github|figma|notion|slack|atlassian|jira|adobe|zoom|microsoft|office\s?365|google\s?workspace|dropbox|openai|anthropic|aws|azure|gcp|stripe|vercel|netlify|cloudflare)/i, account: "6911", name: "Programvarulicenser/SaaS", vat: "25", category: "Software" },
  { match: /(spotify|apple|itunes|netflix)/i, account: "6911", name: "Programvarulicenser/SaaS", vat: "25", category: "Software" },
  // Travel
  { match: /(sj|flygbussarna|sl|skånetrafiken|västtrafik)/i, account: "6712", name: "Tågresor", vat: "6", category: "Travel" },
  { match: /(sas|norwegian|lufthansa|klm|ryanair|finnair|booking\.com|hotels?\.com|airbnb)/i, account: "6711", name: "Flygresor", vat: "6", category: "Travel" },
  { match: /(scandic|elite|clarion|radisson|hilton|marriott|hotel|hotell)/i, account: "6720", name: "Hotell och logi", vat: "12", category: "Travel" },
  { match: /(taxi|uber|bolt)/i, account: "6740", name: "Taxi", vat: "6", category: "Travel" },
  { match: /(hertz|avis|sixt|europcar|budget)/i, account: "6730", name: "Hyrbilskostnader", vat: "25", category: "Travel" },
  { match: /(circle k|preem|st1|okq8|shell|ingo|qstar|tanka)/i, account: "6770", name: "Drivmedel tjänsteresor", vat: "25", category: "Travel" },
  { match: /(parkering|easypark|aimo|q-park|apcoa)/i, account: "6750", name: "Parkeringskostnader", vat: "25", category: "Travel" },
  // Office / supplies
  { match: /(staples|clas ohlson|kjell|biltema|jula|ikea|office depot)/i, account: "6110", name: "Kontorsmaterial", vat: "25", category: "Office" },
  // Telecom
  { match: /(telia|telenor|tre|tele2|comviq|hallon)/i, account: "6212", name: "Mobiltelefon", vat: "25", category: "Telecom" },
  // Marketing
  { match: /(google ads|facebook|meta|linkedin ads|tiktok|instagram)/i, account: "6941", name: "Google Ads/online-annonsering", vat: "25", category: "Marketing" },
  // Bank fees
  { match: /(swedbank|seb|handelsbanken|nordea|avanza|nordnet)\s*(avgift|fee)/i, account: "6570", name: "Bankkostnader", vat: "0", category: "Bank" },
  // Restaurants — representation (deductible portion)
  { match: /(restaurang|restaurant|pizzeria|sushi|max|mcdonald|burger king|starbucks|espresso house|wayne|panini)/i, account: "6071", name: "Representation avdragsgill", vat: "12", category: "Restaurant" },
  // Non-deductible
  { match: /(systembolaget)/i, account: "6072", name: "Representation ej avdragsgill", vat: "0", category: "Alcohol", nonDeductible: true },
  // Books / media
  { match: /(akademibokhandeln|bokus|adlibris)/i, account: "6970", name: "Tidningar, facklitteratur", vat: "6", category: "Books" },
];

const FOREIGN_CURRENCY_RE = /^(?!SEK$)[A-Z]{3}$/;

function detectVatAmount(grossAmount: number, vatRate: string): number {
  const rate = parseFloat(vatRate);
  if (!rate || rate === 0) return 0;
  // VAT included in price: vat = gross * rate / (100 + rate)
  return Math.round((grossAmount * rate) / (100 + rate) * 100) / 100;
}

function vatAccountFor(vatRate: string): string | null {
  if (!vatRate || vatRate === "0") return null;
  return "2641"; // Debiterad ingående moms (deductible input VAT)
}

export function determineLiabilityAccount(cardConfig?: {
  flow?: "credit_card" | "supplier_invoice";
  custom_account?: string;
}): string {
  if (cardConfig?.custom_account) return cardConfig.custom_account;
  if (cardConfig?.flow === "supplier_invoice") return "2440";
  return "2890";
}

export function isNonDeductible(category: string, merchant: string): boolean {
  if (/systembolaget/i.test(merchant)) return true;
  if (/alcohol/i.test(category)) return true;
  return false;
}

/**
 * Main entry point — determines the full account mapping for one transaction.
 */
export function determineExpenseAccount(args: {
  merchant: string;
  amount: number;
  currency?: string;
  cardConfig?: { flow?: "credit_card" | "supplier_invoice"; custom_account?: string };
  learnedRules?: LearnedRule[];
}): CCAccountSuggestion {
  const { merchant, amount, currency = "SEK", cardConfig, learnedRules = [] } = args;
  const liability_account = determineLiabilityAccount(cardConfig);
  const is_foreign = FOREIGN_CURRENCY_RE.test(currency);

  // 1. Learned rules (highest priority) — exact substring match
  const merchLower = (merchant || "").toLowerCase().trim();
  const learned = learnedRules.find(
    (r) => merchLower && merchLower.includes(r.merchant_pattern.toLowerCase()),
  );
  if (learned) {
    const vat_code = learned.vat_code || "25";
    return {
      expense_account: learned.expense_account,
      expense_account_name: learned.expense_account_name || "",
      vat_code,
      vat_amount: detectVatAmount(amount, vat_code),
      vat_account: vatAccountFor(vat_code),
      liability_account,
      category: learned.category || "Other",
      is_non_deductible: false,
      is_foreign,
      confidence: 0.98,
      explanation: `Lärd regel: ${learned.merchant_pattern} → ${learned.expense_account}`,
      source: "learned",
    };
  }

  // 2. Static merchant rules
  for (const rule of MERCHANT_RULES) {
    if (rule.match.test(merchant)) {
      const vat_code = rule.nonDeductible ? "0" : rule.vat;
      return {
        expense_account: rule.account,
        expense_account_name: rule.name,
        vat_code,
        vat_amount: rule.nonDeductible ? 0 : detectVatAmount(amount, vat_code),
        vat_account: rule.nonDeductible ? null : vatAccountFor(vat_code),
        liability_account,
        category: rule.category,
        is_non_deductible: !!rule.nonDeductible,
        is_foreign,
        confidence: is_foreign ? 0.85 : 0.96,
        explanation: `Identifierad som ${rule.category.toLowerCase()} via leverantörsmönster`,
        source: "rule",
      };
    }
  }

  // 3. Fallback — generic "övriga externa kostnader"
  return {
    expense_account: "6990",
    expense_account_name: "Övriga externa kostnader",
    vat_code: "25",
    vat_amount: detectVatAmount(amount, "25"),
    vat_account: "2641",
    liability_account,
    category: "Other",
    is_non_deductible: false,
    is_foreign,
    confidence: is_foreign ? 0.55 : 0.7,
    explanation: "Inget mönster hittades — manuell granskning rekommenderas",
    source: "fallback",
  };
}

/**
 * Builds a balanced double-entry preview for a credit card purchase.
 */
export function buildPurchaseJournalPreview(
  amount: number,
  s: CCAccountSuggestion,
): CCJournalPreviewLine[] {
  const expenseExVat = Math.round((amount - s.vat_amount) * 100) / 100;
  const lines: CCJournalPreviewLine[] = [
    { account: s.expense_account, accountName: s.expense_account_name, debit: expenseExVat, credit: 0 },
  ];
  if (s.vat_amount > 0 && s.vat_account) {
    lines.push({ account: s.vat_account, accountName: "Debiterad ingående moms", debit: s.vat_amount, credit: 0 });
  }
  lines.push({
    account: s.liability_account,
    accountName: s.liability_account === "2890" ? "Övriga kortfristiga skulder" : "Leverantörsskulder",
    debit: 0,
    credit: amount,
  });
  return lines;
}

export function buildPaymentJournalPreview(
  amount: number,
  bankAccount = "1930",
  liabilityAccount = "2890",
): CCJournalPreviewLine[] {
  return [
    { account: liabilityAccount, accountName: "Kreditkortsskuld", debit: amount, credit: 0 },
    { account: bankAccount, accountName: "Företagskonto", debit: 0, credit: amount },
  ];
}

export const AUTO_BOOK_THRESHOLD = 0.95;
export const REVIEW_THRESHOLD = 0.75;

export function statusFromConfidence(
  confidence: number,
  hasReceipt: boolean,
): "auto_booked" | "missing_receipt" | "needs_review" | "ready" {
  if (confidence >= AUTO_BOOK_THRESHOLD) {
    return hasReceipt ? "auto_booked" : "missing_receipt";
  }
  if (confidence >= REVIEW_THRESHOLD) return "ready";
  return "needs_review";
}
