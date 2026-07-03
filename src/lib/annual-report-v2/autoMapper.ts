/**
 * Auto-map account numbers to AR v2 sections using BAS heuristics.
 * Output is suitable for inserting into ar_section_account_map.
 */

export type ARTarget =
  | { sectionKey: string }
  | { noteCode: string };

interface Range {
  from: number;
  to: number;
  target: ARTarget;
}

const RANGES: Range[] = [
  // Income statement (handled by financial_table calc — still tagged for traceability)
  { from: 3000, to: 3999, target: { sectionKey: "rr" } },
  { from: 4000, to: 4999, target: { sectionKey: "rr" } },
  { from: 5000, to: 6999, target: { sectionKey: "rr" } },
  { from: 7000, to: 7699, target: { noteCode: "employees" } },
  { from: 7800, to: 7899, target: { noteCode: "depreciation" } },
  { from: 8910, to: 8999, target: { noteCode: "tax" } },

  // Balance sheet
  { from: 1010, to: 1099, target: { noteCode: "intangibles" } },
  { from: 1110, to: 1299, target: { noteCode: "tangible_assets" } },
  { from: 1310, to: 1399, target: { noteCode: "financial_assets" } },
  { from: 1400, to: 1499, target: { noteCode: "inventory" } },
  { from: 1510, to: 1519, target: { noteCode: "receivables" } },
  { from: 1900, to: 1999, target: { sectionKey: "br" } },
  { from: 2010, to: 2099, target: { noteCode: "equity_changes" } },
  { from: 2110, to: 2199, target: { noteCode: "untaxed_reserves" } },
  { from: 2300, to: 2399, target: { noteCode: "long_term_liabilities" } },
  { from: 2400, to: 2999, target: { sectionKey: "br" } },

  // Specific
  { from: 5210, to: 5219, target: { noteCode: "leases" } },
  { from: 6420, to: 6429, target: { noteCode: "auditor_fees" } },
];

export interface AutoMapping {
  account_number: string;
  target: ARTarget;
  weight: number;
}

export function autoMapAccounts(accountNumbers: string[]): AutoMapping[] {
  const out: AutoMapping[] = [];
  for (const acc of accountNumbers) {
    const num = parseInt(acc, 10);
    if (!Number.isFinite(num)) continue;
    const hit = RANGES.find((r) => num >= r.from && num <= r.to);
    if (hit) out.push({ account_number: acc, target: hit.target, weight: 1.0 });
  }
  return out;
}
