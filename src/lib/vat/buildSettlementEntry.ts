/**
 * Deterministic VAT settlement journal-entry builder.
 *
 * Case A — Payable (net > 0):
 *   Debit  output VAT accounts (2610/2611/2612, 2614/2615, 2620, 2630)
 *   Credit input VAT accounts  (2640/2641/2642, 2645, 2646)
 *   Diff → Credit 2650 Redovisningskonto för moms
 *
 * Case B — Receivable (net < 0):
 *   Same clearing, diff → Debit 1650 Momsfordran
 *
 * All amounts rounded to öre (2 decimals). Output is balanced (Σdebit = Σcredit).
 */

export interface AccountBalanceForSettlement {
  accountNumber: string;
  /** Period UB on this account (credit-debit for liabilities, debit-credit for assets). Always positive going in. */
  ubAmount: number;
}

export interface SettlementLine {
  accountNumber: string;
  accountName: string;
  debit: number;
  credit: number;
}

export interface SettlementProposal {
  direction: "payable" | "receivable";
  netAmount: number;
  lines: SettlementLine[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
}

const ACCOUNT_NAMES: Record<string, string> = {
  "2610": "Utgående moms 25%",
  "2611": "Utgående moms 25%, varuförsäljning",
  "2612": "Utgående moms 25%, tjänster",
  "2614": "Utgående moms omvänd skattskyldighet 25%",
  "2615": "Utgående moms omvänd skattskyldighet, utländska köp",
  "2620": "Utgående moms 12%",
  "2621": "Utgående moms 12%, varuförsäljning",
  "2622": "Utgående moms 12%, tjänster",
  "2630": "Utgående moms 6%",
  "2631": "Utgående moms 6%, varuförsäljning",
  "2632": "Utgående moms 6%, tjänster",
  "2640": "Ingående moms",
  "2641": "Debiterad ingående moms",
  "2642": "Debiterad ingående moms i andra länder",
  "2645": "Beräknad ingående moms på förvärv från utlandet",
  "2646": "Ingående moms omvänd skattskyldighet 25%",
  "2650": "Redovisningskonto för moms",
  "1650": "Momsfordran",
  "1930": "Företagskonto / Bank",
};

const OUTPUT_ACCOUNTS = ["2610","2611","2612","2614","2615","2620","2621","2622","2630","2631","2632"];
const INPUT_ACCOUNTS  = ["2640","2641","2642","2645","2646"];

function round2(n: number) { return Math.round(n * 100) / 100; }

/**
 * Build a settlement proposal.
 * `outputBalances` are credit-side UB (positive = liability); `inputBalances` are debit-side UB (positive = receivable).
 */
export function buildSettlementEntry(
  outputBalances: AccountBalanceForSettlement[],
  inputBalances: AccountBalanceForSettlement[],
): SettlementProposal {
  const lines: SettlementLine[] = [];
  let totalOutput = 0;
  let totalInput = 0;

  for (const a of outputBalances) {
    if (Math.abs(a.ubAmount) < 0.005) continue;
    const amt = round2(a.ubAmount);
    totalOutput += amt;
    // Clear liability: Debit
    lines.push({
      accountNumber: a.accountNumber,
      accountName: ACCOUNT_NAMES[a.accountNumber] || `Konto ${a.accountNumber}`,
      debit: amt,
      credit: 0,
    });
  }

  for (const a of inputBalances) {
    if (Math.abs(a.ubAmount) < 0.005) continue;
    const amt = round2(a.ubAmount);
    totalInput += amt;
    // Clear receivable: Credit
    lines.push({
      accountNumber: a.accountNumber,
      accountName: ACCOUNT_NAMES[a.accountNumber] || `Konto ${a.accountNumber}`,
      debit: 0,
      credit: amt,
    });
  }

  const net = round2(totalOutput - totalInput);
  const direction: "payable" | "receivable" = net >= 0 ? "payable" : "receivable";

  if (direction === "payable") {
    // Credit 2650 with the net liability
    lines.push({
      accountNumber: "2650",
      accountName: ACCOUNT_NAMES["2650"],
      debit: 0,
      credit: round2(Math.abs(net)),
    });
  } else {
    // Debit 1650 with the net receivable
    lines.push({
      accountNumber: "1650",
      accountName: ACCOUNT_NAMES["1650"],
      debit: round2(Math.abs(net)),
      credit: 0,
    });
  }

  const totalDebit = round2(lines.reduce((s, l) => s + l.debit, 0));
  const totalCredit = round2(lines.reduce((s, l) => s + l.credit, 0));

  return {
    direction,
    netAmount: round2(Math.abs(net)),
    lines,
    totalDebit,
    totalCredit,
    isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
  };
}

/**
 * Payment booking:
 *   Payable paid:  Debit 2650 / Credit 1930
 *   Refund recv'd: Debit 1930 / Credit 1650
 */
export function buildPaymentEntry(
  direction: "payable" | "receivable",
  amount: number,
  bankAccount: string = "1930",
): SettlementProposal {
  const amt = round2(Math.abs(amount));
  const lines: SettlementLine[] =
    direction === "payable"
      ? [
          { accountNumber: "2650", accountName: ACCOUNT_NAMES["2650"], debit: amt, credit: 0 },
          { accountNumber: bankAccount, accountName: ACCOUNT_NAMES[bankAccount] || `Konto ${bankAccount}`, debit: 0, credit: amt },
        ]
      : [
          { accountNumber: bankAccount, accountName: ACCOUNT_NAMES[bankAccount] || `Konto ${bankAccount}`, debit: amt, credit: 0 },
          { accountNumber: "1650", accountName: ACCOUNT_NAMES["1650"], debit: 0, credit: amt },
        ];

  return {
    direction,
    netAmount: amt,
    lines,
    totalDebit: amt,
    totalCredit: amt,
    isBalanced: true,
  };
}

export { OUTPUT_ACCOUNTS, INPUT_ACCOUNTS, ACCOUNT_NAMES };
