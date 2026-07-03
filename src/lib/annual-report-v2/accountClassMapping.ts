/**
 * BAS-account → Income Statement (RR) and Balance Sheet (BR) line mapping.
 * Used by the Annual Report v2 module to auto-populate financial statements
 * from verified bookkeeping data.
 *
 * K2 — kostnadsslagsindelad (cost-of-nature classification).
 */

export type RRLineKey =
  | "net_revenue"
  | "other_operating_income"
  | "raw_materials"
  | "external_costs"
  | "personnel_costs"
  | "depreciation"
  | "other_operating_costs"
  | "financial_income"
  | "financial_costs"
  | "appropriations"
  | "taxes";

export type BRAssetKey =
  | "intangible_assets"
  | "buildings_land"
  | "machinery_equipment"
  | "financial_assets"
  | "inventory"
  | "trade_receivables"
  | "other_short_receivables"
  | "short_investments"
  | "cash_bank";

export type BREquityLiabilityKey =
  | "equity"
  | "untaxed_reserves"
  | "provisions"
  | "long_term_liabilities"
  | "short_term_credit_institutions"
  | "trade_payables_other_short"
  | "tax_liabilities_other"
  | "accrued_costs_deferred_income";

export interface LineDef<K extends string> {
  key: K;
  label: string;
  /** sign: 'credit_positive' for income/equity/liabilities (credit-natural),
   *        'debit_positive' for assets/expenses (debit-natural).
   *  Determines how the raw (debit - credit) net is converted to display value. */
  natural: "debit_positive" | "credit_positive";
}

interface Range<K extends string> {
  from: number;
  to: number;
  key: K;
}

// ──────────────────────────────────────────────────────────────────────────────
// RR — Income Statement
// ──────────────────────────────────────────────────────────────────────────────

export const RR_LINES: ReadonlyArray<LineDef<RRLineKey>> = [
  { key: "net_revenue",            label: "Nettoomsättning",              natural: "credit_positive" },
  { key: "other_operating_income", label: "Övriga rörelseintäkter",       natural: "credit_positive" },
  { key: "raw_materials",          label: "Råvaror och förnödenheter",    natural: "debit_positive" },
  { key: "external_costs",         label: "Övriga externa kostnader",     natural: "debit_positive" },
  { key: "personnel_costs",        label: "Personalkostnader",            natural: "debit_positive" },
  { key: "depreciation",           label: "Av- och nedskrivningar",       natural: "debit_positive" },
  { key: "other_operating_costs",  label: "Övriga rörelsekostnader",      natural: "debit_positive" },
  { key: "financial_income",       label: "Finansiella intäkter",         natural: "credit_positive" },
  { key: "financial_costs",        label: "Finansiella kostnader",        natural: "debit_positive" },
  { key: "appropriations",         label: "Bokslutsdispositioner",        natural: "debit_positive" },
  { key: "taxes",                  label: "Skatt på årets resultat",      natural: "debit_positive" },
];

const RR_RANGES: ReadonlyArray<Range<RRLineKey>> = [
  { from: 3000, to: 3799, key: "net_revenue" },
  { from: 3800, to: 3999, key: "other_operating_income" },
  { from: 4000, to: 4999, key: "raw_materials" },
  { from: 5000, to: 5999, key: "external_costs" },
  { from: 6000, to: 6999, key: "external_costs" },
  { from: 7000, to: 7699, key: "personnel_costs" },
  { from: 7700, to: 7899, key: "depreciation" },
  { from: 7900, to: 7999, key: "other_operating_costs" },
  { from: 8000, to: 8199, key: "financial_income" },
  { from: 8200, to: 8799, key: "financial_costs" },
  { from: 8800, to: 8899, key: "appropriations" },
  { from: 8900, to: 8999, key: "taxes" },
];

// ──────────────────────────────────────────────────────────────────────────────
// BR — Balance Sheet
// ──────────────────────────────────────────────────────────────────────────────

export const BR_ASSET_LINES: ReadonlyArray<LineDef<BRAssetKey>> = [
  { key: "intangible_assets",        label: "Immateriella anläggningstillgångar", natural: "debit_positive" },
  { key: "buildings_land",           label: "Byggnader och mark",                 natural: "debit_positive" },
  { key: "machinery_equipment",      label: "Maskiner och inventarier",           natural: "debit_positive" },
  { key: "financial_assets",         label: "Finansiella anläggningstillgångar",  natural: "debit_positive" },
  { key: "inventory",                label: "Varulager",                          natural: "debit_positive" },
  { key: "trade_receivables",        label: "Kundfordringar",                     natural: "debit_positive" },
  { key: "other_short_receivables",  label: "Övriga kortfristiga fordringar",     natural: "debit_positive" },
  { key: "short_investments",        label: "Kortfristiga placeringar",           natural: "debit_positive" },
  { key: "cash_bank",                label: "Kassa och bank",                     natural: "debit_positive" },
];

export const BR_EQUITY_LIABILITY_LINES: ReadonlyArray<LineDef<BREquityLiabilityKey>> = [
  { key: "equity",                          label: "Eget kapital",                                  natural: "credit_positive" },
  { key: "untaxed_reserves",                label: "Obeskattade reserver",                          natural: "credit_positive" },
  { key: "provisions",                      label: "Avsättningar",                                  natural: "credit_positive" },
  { key: "long_term_liabilities",           label: "Långfristiga skulder",                          natural: "credit_positive" },
  { key: "short_term_credit_institutions",  label: "Kortfristiga skulder till kreditinstitut",      natural: "credit_positive" },
  { key: "trade_payables_other_short",      label: "Leverantörsskulder och övriga kortfristiga",    natural: "credit_positive" },
  { key: "tax_liabilities_other",           label: "Skatteskulder och övriga skulder",              natural: "credit_positive" },
  { key: "accrued_costs_deferred_income",   label: "Upplupna kostnader och förutbetalda intäkter",  natural: "credit_positive" },
];

const BR_ASSET_RANGES: ReadonlyArray<Range<BRAssetKey>> = [
  { from: 1000, to: 1099, key: "intangible_assets" },
  { from: 1100, to: 1199, key: "buildings_land" },
  { from: 1200, to: 1299, key: "machinery_equipment" },
  { from: 1300, to: 1399, key: "financial_assets" },
  { from: 1400, to: 1499, key: "inventory" },
  { from: 1500, to: 1599, key: "trade_receivables" },
  { from: 1600, to: 1799, key: "other_short_receivables" },
  { from: 1800, to: 1899, key: "short_investments" },
  { from: 1900, to: 1999, key: "cash_bank" },
];

const BR_EQ_LIAB_RANGES: ReadonlyArray<Range<BREquityLiabilityKey>> = [
  { from: 2000, to: 2099, key: "equity" },
  { from: 2100, to: 2199, key: "untaxed_reserves" },
  { from: 2200, to: 2299, key: "provisions" },
  { from: 2300, to: 2399, key: "long_term_liabilities" },
  { from: 2400, to: 2499, key: "short_term_credit_institutions" },
  { from: 2500, to: 2699, key: "trade_payables_other_short" },
  { from: 2700, to: 2899, key: "tax_liabilities_other" },
  { from: 2900, to: 2999, key: "accrued_costs_deferred_income" },
];

// ──────────────────────────────────────────────────────────────────────────────
// Resolver
// ──────────────────────────────────────────────────────────────────────────────

export type ClassifiedTarget =
  | { statement: "RR"; key: RRLineKey }
  | { statement: "BR_ASSET"; key: BRAssetKey }
  | { statement: "BR_EQ_LIAB"; key: BREquityLiabilityKey }
  | { statement: "UNMAPPED" };

export function classifyAccount(accountNumber: string | number): ClassifiedTarget {
  const num = typeof accountNumber === "number" ? accountNumber : parseInt(String(accountNumber), 10);
  if (!Number.isFinite(num)) return { statement: "UNMAPPED" };

  for (const r of RR_RANGES) if (num >= r.from && num <= r.to) return { statement: "RR", key: r.key };
  for (const r of BR_ASSET_RANGES) if (num >= r.from && num <= r.to) return { statement: "BR_ASSET", key: r.key };
  for (const r of BR_EQ_LIAB_RANGES) if (num >= r.from && num <= r.to) return { statement: "BR_EQ_LIAB", key: r.key };
  return { statement: "UNMAPPED" };
}

/** Convert the raw signed (debit − credit) net into a display-natural number
 *  according to the line's natural side. */
export function toDisplayValue(rawDebitMinusCredit: number, natural: LineDef<string>["natural"]): number {
  return natural === "debit_positive" ? rawDebitMinusCredit : -rawDebitMinusCredit;
}
