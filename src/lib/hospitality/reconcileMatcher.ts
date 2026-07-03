// Match POS daily totals against bank inflows.
// Tolerance: ±2 days, ±1% amount.

export interface PosDayInput {
  sale_date: string;
  total_sales: number;
  card_amount?: number;
  swish_amount?: number;
  cash_amount?: number;
}

export interface BankTxInput {
  id: string;
  booking_date: string;
  amount: number;
  description?: string | null;
  counterparty_name?: string | null;
}

export interface ReconcileMatch {
  sale_date: string;
  pos_total: number;
  bank_matched_total: number;
  diff_amount: number;
  status: "matched" | "partial" | "unmatched" | "flagged";
  matched_transaction_ids: string[];
  notes?: string;
}

const dayDiff = (a: string, b: string): number => {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  return Math.abs(da - db) / (1000 * 60 * 60 * 24);
};

export function matchPosToBank(
  posDays: PosDayInput[],
  bankTxs: BankTxInput[],
  tolerancePct = 0.01,
  toleranceDays = 2,
): ReconcileMatch[] {
  const usedTxIds = new Set<string>();

  return posDays.map((day) => {
    const expectedNonCash =
      (day.card_amount ?? 0) + (day.swish_amount ?? 0) ||
      day.total_sales - (day.cash_amount ?? 0);

    // Candidates: positive bank deposits within ±N days, not yet used
    const candidates = bankTxs
      .filter(
        (t) =>
          t.amount > 0 &&
          !usedTxIds.has(t.id) &&
          dayDiff(t.booking_date, day.sale_date) <= toleranceDays,
      )
      .sort((a, b) => dayDiff(a.booking_date, day.sale_date) - dayDiff(b.booking_date, day.sale_date));

    let runningTotal = 0;
    const matched: string[] = [];
    const targetMin = expectedNonCash * (1 - tolerancePct);
    const targetMax = expectedNonCash * (1 + tolerancePct);

    for (const c of candidates) {
      if (runningTotal >= targetMin) break;
      runningTotal += c.amount;
      matched.push(c.id);
      if (runningTotal >= targetMin && runningTotal <= targetMax) break;
    }

    const diff = runningTotal - expectedNonCash;
    let status: ReconcileMatch["status"] = "unmatched";
    if (matched.length === 0) status = "unmatched";
    else if (Math.abs(diff) <= Math.max(1, expectedNonCash * tolerancePct)) status = "matched";
    else if (runningTotal > 0 && Math.abs(diff) / Math.max(1, expectedNonCash) < 0.05) status = "partial";
    else status = "flagged";

    if (status === "matched") matched.forEach((id) => usedTxIds.add(id));

    return {
      sale_date: day.sale_date,
      pos_total: day.total_sales,
      bank_matched_total: runningTotal,
      diff_amount: diff,
      status,
      matched_transaction_ids: matched,
      notes:
        status === "flagged"
          ? `Större avvikelse: ${diff.toFixed(0)} kr`
          : status === "partial"
            ? "Delvis matchad — kontrollera manuellt"
            : undefined,
    };
  });
}
