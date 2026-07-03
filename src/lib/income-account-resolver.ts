/**
 * Automatisk mappning av fakturarad → intäktskonto (BAS 2026).
 *
 * Konto 3000 får ALDRIG väljas. Systemet resolver alltid till
 * specifikt konto baserat på:
 *   1. Nyckelord i beskrivningen
 *   2. Vald momssats
 *   3. Fallback: tjänst med matchande moms
 *
 * BAS 2026 intäktskonton:
 *   3010 Varor 25%   |  3011 Varor 12%   |  3012 Varor 6%   |  3013 Varor momsfri  |  3014 Varor ej moms
 *   3040 Tjänster 25% | 3041 Tjänster 12% | 3042 Tjänster 6% | 3043 Tjänster momsfri | 3044 Tjänster ej moms
 *   3050 Konsulttjänster 25%
 *   3060 Abonnemang/licenser 25%
 *   3300 Varuexport EU (0%)
 *   3305 Tjänsteexport EU (0%)
 *   3910 Hyresintäkter 25%
 */

export interface IncomeAccountMatch {
  accountNumber: string;
  accountName: string;
  vatRate: number;
  confidence: "high" | "medium" | "low";
  reason: string;
}

// ────────────────────────────────────────────
// Keyword → account category mapping
// ────────────────────────────────────────────

type Category = "goods" | "services" | "consulting" | "subscription" | "rent" | "export_goods" | "export_services" | "food" | "books" | "transport";

const KEYWORD_MAP: { keywords: string[]; category: Category }[] = [
  // Consulting (always 25%)
  { keywords: ["konsult", "rådgivning", "advisory", "consulting", "konsulttjänst", "konsultarvode", "managementtjänst"], category: "consulting" },
  // Subscriptions / licenses
  { keywords: ["abonnemang", "licens", "saas", "subscription", "programvara", "software", "app-"], category: "subscription" },
  // Rent
  { keywords: ["hyra", "uthyrning", "lokalhyra", "hyresintäkt"], category: "rent" },
  // Books / publications (6%)
  { keywords: ["bok", "böcker", "tidning", "tidskrift", "publikation", "förlag", "book", "magazine"], category: "books" },
  // Transport (6%)
  { keywords: ["transport", "frakt", "biljett", "resa", "persontransport", "taxi", "flyg", "tåg"], category: "transport" },
  // Food / restaurant (12%)
  { keywords: ["livsmedel", "mat", "restaurang", "catering", "café", "lunch", "middag", "frukost", "food"], category: "food" },
  // Export
  { keywords: ["export", "utland", "utanför eu", "outside eu"], category: "export_goods" },
  { keywords: ["eu-tjänst", "eu tjänst", "intra-community", "eu service"], category: "export_services" },
  // Goods (generic — checked AFTER more specific categories)
  { keywords: ["vara", "varor", "produkt", "material", "gods", "artikel", "goods", "product", "leverans"], category: "goods" },
  // Services (generic — fallback)
  { keywords: ["tjänst", "service", "arbete", "uppdrag", "projekt", "installation", "underhåll", "support", "drift"], category: "services" },
];

// ────────────────────────────────────────────
// Category + VAT → specific BAS account
// ────────────────────────────────────────────

const ACCOUNT_TABLE: Record<Category, Record<number, { number: string; name: string }>> = {
  goods: {
    25: { number: "3010", name: "Försäljning varor 25% moms" },
    12: { number: "3011", name: "Försäljning varor 12% moms" },
    6:  { number: "3012", name: "Försäljning varor 6% moms" },
    0:  { number: "3013", name: "Försäljning varor momsfri" },
  },
  services: {
    25: { number: "3040", name: "Försäljning tjänster 25% moms" },
    12: { number: "3041", name: "Försäljning tjänster 12% moms" },
    6:  { number: "3042", name: "Försäljning tjänster 6% moms" },
    0:  { number: "3043", name: "Försäljning tjänster momsfri" },
  },
  consulting: {
    25: { number: "3050", name: "Försäljning konsulttjänster 25% moms" },
    12: { number: "3041", name: "Försäljning tjänster 12% moms" },
    6:  { number: "3042", name: "Försäljning tjänster 6% moms" },
    0:  { number: "3043", name: "Försäljning tjänster momsfri" },
  },
  subscription: {
    25: { number: "3060", name: "Försäljning abonnemang/licenser 25% moms" },
    12: { number: "3041", name: "Försäljning tjänster 12% moms" },
    6:  { number: "3042", name: "Försäljning tjänster 6% moms" },
    0:  { number: "3043", name: "Försäljning tjänster momsfri" },
  },
  rent: {
    25: { number: "3910", name: "Hyresintäkter 25% moms" },
    12: { number: "3910", name: "Hyresintäkter 25% moms" },
    6:  { number: "3910", name: "Hyresintäkter 25% moms" },
    0:  { number: "3912", name: "Hyresintäkter bostäder momsfri" },
  },
  export_goods: {
    25: { number: "3010", name: "Försäljning varor 25% moms" },
    12: { number: "3011", name: "Försäljning varor 12% moms" },
    6:  { number: "3012", name: "Försäljning varor 6% moms" },
    0:  { number: "3300", name: "Försäljning varor EU momsfri" },
  },
  export_services: {
    25: { number: "3040", name: "Försäljning tjänster 25% moms" },
    12: { number: "3041", name: "Försäljning tjänster 12% moms" },
    6:  { number: "3042", name: "Försäljning tjänster 6% moms" },
    0:  { number: "3305", name: "Försäljning tjänster EU momsfri" },
  },
  food: {
    25: { number: "3010", name: "Försäljning varor 25% moms" },
    12: { number: "3011", name: "Försäljning varor 12% moms" },
    6:  { number: "3012", name: "Försäljning varor 6% moms" },
    0:  { number: "3013", name: "Försäljning varor momsfri" },
  },
  books: {
    25: { number: "3010", name: "Försäljning varor 25% moms" },
    12: { number: "3011", name: "Försäljning varor 12% moms" },
    6:  { number: "3012", name: "Försäljning varor 6% moms" },
    0:  { number: "3013", name: "Försäljning varor momsfri" },
  },
  transport: {
    25: { number: "3040", name: "Försäljning tjänster 25% moms" },
    12: { number: "3041", name: "Försäljning tjänster 12% moms" },
    6:  { number: "3042", name: "Försäljning tjänster 6% moms" },
    0:  { number: "3043", name: "Försäljning tjänster momsfri" },
  },
};

// ────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────

/**
 * Resolve the best income account för a given line description + VAT rate.
 * Never returns 3000.
 */
export function resolveIncomeAccount(
  description: string,
  vatRate: number,
): IncomeAccountMatch {
  const normalizedVat = [0, 6, 12, 25].includes(vatRate) ? vatRate : 25;
  const lowerDesc = (description || "").toLowerCase().trim();

  // 1. Try keyword matching
  for (const entry of KEYWORD_MAP) {
    for (const kw of entry.keywords) {
      if (lowerDesc.includes(kw)) {
        const account = ACCOUNT_TABLE[entry.category][normalizedVat];
        if (account) {
          return {
            accountNumber: account.number,
            accountName: account.name,
            vatRate: normalizedVat,
            confidence: "high",
            reason: `Nyckelord "${kw}" → ${entry.category}`,
          };
        }
      }
    }
  }

  // 2. Fallback: use VAT rate to guess category
  //    6% → likely books/transport → services
  //    12% → likely food → goods
  //    25% → default services
  //    0% → default services
  let fallbackCategory: Category = "services";
  if (normalizedVat === 12) fallbackCategory = "goods"; // livsmedel/hotell most common at 12%

  const fallback = ACCOUNT_TABLE[fallbackCategory][normalizedVat];
  return {
    accountNumber: fallback.number,
    accountName: fallback.name,
    vatRate: normalizedVat,
    confidence: "low",
    reason: `Ingen matchning – default ${fallbackCategory} vid ${normalizedVat}% moms`,
  };
}

/**
 * Given multiple invoice lines, resolve the dominant income account.
 * Uses the line with the highest total amount as the primary signal.
 */
export function resolveIncomeAccountForInvoice(
  lines: { description: string; quantity: number; unit_price: number; vat_rate: number }[],
): IncomeAccountMatch {
  if (lines.length === 0) {
    return {
      accountNumber: "3040",
      accountName: "Försäljning tjänster 25% moms",
      vatRate: 25,
      confidence: "low",
      reason: "Inga fakturarader — default tjänst 25%",
    };
  }

  // Pick the line with the highest amount
  let bestLine = lines[0];
  let bestAmount = Math.abs(lines[0].quantity * lines[0].unit_price);
  for (let i = 1; i < lines.length; i++) {
    const amt = Math.abs(lines[i].quantity * lines[i].unit_price);
    if (amt > bestAmount) {
      bestLine = lines[i];
      bestAmount = amt;
    }
  }

  return resolveIncomeAccount(bestLine.description, bestLine.vat_rate);
}

/**
 * Grouped income accounts för UI selectors — corrected BAS 2026 mapping.
 * NEVER includes 3000.
 */
export const INCOME_ACCOUNTS_BAS2026 = [
  {
    label: "Försäljning varor",
    accounts: [
      { number: "3010", name: "Försäljning varor 25% moms", vatRate: 25 },
      { number: "3011", name: "Försäljning varor 12% moms", vatRate: 12 },
      { number: "3012", name: "Försäljning varor 6% moms", vatRate: 6 },
      { number: "3013", name: "Försäljning varor momsfri", vatRate: 0 },
    ],
  },
  {
    label: "Försäljning tjänster",
    accounts: [
      { number: "3040", name: "Försäljning tjänster 25% moms", vatRate: 25 },
      { number: "3041", name: "Försäljning tjänster 12% moms", vatRate: 12 },
      { number: "3042", name: "Försäljning tjänster 6% moms", vatRate: 6 },
      { number: "3043", name: "Försäljning tjänster momsfri", vatRate: 0 },
    ],
  },
  {
    label: "Konsulttjänster & specialiserat",
    accounts: [
      { number: "3050", name: "Konsulttjänster 25% moms", vatRate: 25 },
      { number: "3060", name: "Abonnemang/licenser 25% moms", vatRate: 25 },
      { number: "3910", name: "Hyresintäkter 25% moms", vatRate: 25 },
      { number: "3912", name: "Hyresintäkter bostäder momsfri", vatRate: 0 },
    ],
  },
  {
    label: "Export & EU",
    accounts: [
      { number: "3300", name: "Försäljning varor EU momsfri", vatRate: 0 },
      { number: "3305", name: "Försäljning tjänster EU momsfri", vatRate: 0 },
      { number: "3310", name: "Försäljning varor utanför EU", vatRate: 0 },
      { number: "3311", name: "Försäljning tjänster utanför EU", vatRate: 0 },
    ],
  },
  {
    label: "Vidarefakturering & övrigt",
    accounts: [
      { number: "3500", name: "Fakturerade kostnader 25% moms", vatRate: 25 },
      { number: "3520", name: "Fakturerade frakter 25% moms", vatRate: 25 },
      { number: "3590", name: "Övriga fakturerade kostnader 25%", vatRate: 25 },
      { number: "3990", name: "Övriga intäkter 25% moms", vatRate: 25 },
    ],
  },
];

export const ALL_INCOME_ACCOUNTS_BAS2026 = INCOME_ACCOUNTS_BAS2026.flatMap(g => g.accounts);