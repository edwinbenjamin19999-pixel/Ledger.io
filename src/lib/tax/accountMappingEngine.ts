/**
 * Deterministic BAS-account → tax classification engine.
 *
 * Every general-ledger line is classified into exactly ONE tax category
 * (revenue / cost / ndc / depreciation / interest_in / interest_out /
 *  group_contrib / tax / equity / other) and mapped to its INK2 SRU field.
 *
 * Rules (BAS 2026 reference):
 *   3000–3999 → revenue           (4.3a)
 *   4000–7699 → cost (deductible) (4.3b)
 *   6072      → NDC (representation, ej avdragsgill)   → +4.4
 *   6982/6992 → NDC (övriga ej avdragsgilla)            → +4.4
 *   7632      → NDC (personalrepresentation ej avdragsgill) → +4.4
 *   7810–7839 → depreciation (book)                    → 4.5a
 *   8310–8390 → interest income                         → 4.6
 *   8410–8499 → interest expense                        → 4.6 (EBITDA cap)
 *   8830      → received group contribution             → +4.7a
 *   8840      → given group contribution                → −4.7b
 *   8910/2510 → tax accounts                            → bookkeeping target
 *   2xxx (other) / 1xxx → balance accounts (excluded from result)
 */

export type TaxKind =
  | "revenue"
  | "cost"
  | "ndc"
  | "depreciation"
  | "interest_in"
  | "interest_out"
  | "group_contrib_received"
  | "group_contrib_given"
  | "tax"
  | "equity"
  | "balance"
  | "other";

export interface AccountClassification {
  account: string;
  kind: TaxKind;
  deductible: boolean;
  sruField: string | null;   // INK2 line target (e.g. "4.3", "4.4", "4.5a")
  signInResult: 1 | -1 | 0;  // contribution to result-before-tax (+1 income, -1 cost, 0 balance)
  flags: string[];           // e.g. "requires_review", "negative_revenue", "missing_mapping"
}

/** Hard-coded non-deductible cost accounts (must always be added back to tax base). */
export const NON_DEDUCTIBLE_ACCOUNTS = ["6072", "6982", "6992", "7632"] as const;

/** Book depreciation account range (7810–7839). */
export const DEPRECIATION_RANGE: [number, number] = [7810, 7839];

/** Interest expense range (8410–8499). */
export const INTEREST_OUT_RANGE: [number, number] = [8410, 8499];

/** Interest income range (8310–8390). */
export const INTEREST_IN_RANGE: [number, number] = [8310, 8390];

/** Group contribution accounts. */
export const GROUP_CONTRIB = { received: "8830", given: "8840" } as const;

/** Tax-related accounts used by the auto-booking layer. */
export const TAX_ACCOUNTS = { taxExpense: "8910", taxLiability: "2510", skattekonto: "1630" } as const;

const inRange = (n: number, [lo, hi]: [number, number]) => n >= lo && n <= hi;

/** Classify a single BAS account into its tax category. */
export function classifyAccount(accountNumber: string): AccountClassification {
  const flags: string[] = [];
  const num = parseInt(accountNumber, 10);

  if (!Number.isFinite(num)) {
    return {
      account: accountNumber,
      kind: "other",
      deductible: false,
      sruField: null,
      signInResult: 0,
      flags: ["missing_mapping"],
    };
  }

  // Non-deductible (overrides cost classification)
  if ((NON_DEDUCTIBLE_ACCOUNTS as readonly string[]).includes(accountNumber)) {
    return { account: accountNumber, kind: "ndc", deductible: false, sruField: "4.4", signInResult: -1, flags };
  }

  // Revenue
  if (num >= 3000 && num <= 3999) {
    return { account: accountNumber, kind: "revenue", deductible: false, sruField: "4.3a", signInResult: 1, flags };
  }

  // Depreciation (subset of cost — separated for adjustments)
  if (inRange(num, DEPRECIATION_RANGE)) {
    return { account: accountNumber, kind: "depreciation", deductible: true, sruField: "4.5a", signInResult: -1, flags };
  }

  // Cost
  if (num >= 4000 && num <= 7699) {
    return { account: accountNumber, kind: "cost", deductible: true, sruField: "4.3b", signInResult: -1, flags };
  }

  // Group contributions (must be checked BEFORE generic 8xxx ranges)
  if (accountNumber === GROUP_CONTRIB.received) {
    return { account: accountNumber, kind: "group_contrib_received", deductible: false, sruField: "4.7a", signInResult: 1, flags };
  }
  if (accountNumber === GROUP_CONTRIB.given) {
    return { account: accountNumber, kind: "group_contrib_given", deductible: true, sruField: "4.7b", signInResult: -1, flags };
  }

  // Interest income
  if (inRange(num, INTEREST_IN_RANGE)) {
    return { account: accountNumber, kind: "interest_in", deductible: false, sruField: "4.6", signInResult: 1, flags };
  }

  // Interest expense
  if (inRange(num, INTEREST_OUT_RANGE)) {
    return { account: accountNumber, kind: "interest_out", deductible: true, sruField: "4.6", signInResult: -1, flags };
  }

  // Tax accounts
  if (accountNumber === TAX_ACCOUNTS.taxExpense || accountNumber === TAX_ACCOUNTS.taxLiability || accountNumber === TAX_ACCOUNTS.skattekonto) {
    return { account: accountNumber, kind: "tax", deductible: false, sruField: null, signInResult: 0, flags };
  }

  // Equity
  if (num >= 2080 && num <= 2099) {
    return { account: accountNumber, kind: "equity", deductible: false, sruField: null, signInResult: 0, flags };
  }

  // Other balance accounts (1xxx and 2xxx)
  if (num >= 1000 && num <= 2999) {
    return { account: accountNumber, kind: "balance", deductible: false, sruField: null, signInResult: 0, flags };
  }

  // 8000–8299, 8500–8829, 8841–8899 → other financial / non-classified
  if (num >= 8000 && num <= 8999) {
    return { account: accountNumber, kind: "other", deductible: false, sruField: null, signInResult: -1, flags };
  }

  flags.push("missing_mapping", "requires_review");
  return { account: accountNumber, kind: "other", deductible: false, sruField: null, signInResult: 0, flags };
}

/** Aggregated GL line used by the tax engine. */
export interface ClassifiedAmount {
  kind: TaxKind;
  account: string;
  amount: number;          // positive = expense / cost / debit-side; revenue is signed positive too
  signedResult: number;    // contribution to result-before-tax (positive = increases result)
  flags: string[];
}

/**
 * Apply classifyAccount() to a list of `{ account, debit, credit }` GL aggregates.
 * Returns one ClassifiedAmount per input row.
 *
 * Convention:
 *   revenue   amount = credit − debit  (positive when there is income)
 *   cost/ndc/depr amount = debit − credit (positive when there is expense)
 *   interest/group  treated like cost/revenue based on sign of category
 */
export function classifyGLBalances(
  rows: Array<{ accountNumber: string; debit: number; credit: number }>,
): ClassifiedAmount[] {
  return rows.map((r) => {
    const c = classifyAccount(r.accountNumber);
    const debit = Number(r.debit) || 0;
    const credit = Number(r.credit) || 0;
    let amount = 0;
    let signed = 0;

    switch (c.kind) {
      case "revenue":
      case "interest_in":
      case "group_contrib_received":
        amount = credit - debit;
        signed = amount; // increases result
        if (amount < 0) c.flags.push("negative_revenue");
        break;
      case "cost":
      case "ndc":
      case "depreciation":
      case "interest_out":
      case "group_contrib_given":
        amount = debit - credit;
        signed = -amount; // decreases result
        break;
      case "tax":
      case "equity":
      case "balance":
      case "other":
      default:
        amount = debit - credit;
        signed = 0;
    }

    return { kind: c.kind, account: r.accountNumber, amount, signedResult: signed, flags: c.flags };
  });
}

/** Sum amounts of a specific tax kind. */
export function sumByKind(items: ClassifiedAmount[], kind: TaxKind): number {
  return items.filter((i) => i.kind === kind).reduce((s, i) => s + i.amount, 0);
}

/** Collect all rows that need human review (mixed accounts, negative revenue, missing mapping). */
export function flagReviewItems(items: ClassifiedAmount[]): ClassifiedAmount[] {
  return items.filter((i) => i.flags.length > 0);
}
