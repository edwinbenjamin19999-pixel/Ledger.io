/**
 * useFinancialStatements
 *
 * Auto-fetches verified journal entries for a given fiscal year (and the prior
 * year for comparison) from the bookkeeping system, sums per account, and
 * groups into RR / BR line items using the BAS account-class mapping.
 *
 * Output is the raw data layer for the Annual Report v2 RR/BR view.
 * Cached via react-query — caller can call `refetch` to force a recalculation.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  classifyAccount,
  toDisplayValue,
  RR_LINES,
  BR_ASSET_LINES,
  BR_EQUITY_LIABILITY_LINES,
  type RRLineKey,
  type BRAssetKey,
  type BREquityLiabilityKey,
} from "@/lib/annual-report-v2/accountClassMapping";

export interface AccountMovement {
  accountNumber: string;
  accountName: string;
  debit: number;
  credit: number;
  /** Raw debit − credit. */
  net: number;
}

export interface RRLine {
  key: RRLineKey;
  label: string;
  current: number | null;
  previous: number | null;
  accounts: AccountMovement[];
}

export interface BRLine<K extends string = string> {
  key: K;
  label: string;
  current: number | null;
  previous: number | null;
  accounts: AccountMovement[];
}

export interface FinancialStatements {
  fiscalYear: number;
  hasCurrent: boolean;
  hasPrevious: boolean;
  unmappedAccounts: AccountMovement[];
  /** Raw per-account movements for the current fiscal year (all accounts, mapped or not). */
  currentAccounts: AccountMovement[];
  /** Raw per-account movements for the previous fiscal year. */
  previousAccounts: AccountMovement[];
  rr: {
    lines: RRLine[];
    operatingResult: { current: number; previous: number | null };
    resultAfterFinancial: { current: number; previous: number | null };
    resultBeforeTax: { current: number; previous: number | null };
    netResult: { current: number; previous: number | null };
  };
  br: {
    assets: BRLine<BRAssetKey>[];
    equityLiabilities: BRLine<BREquityLiabilityKey>[];
    totals: {
      assets: { current: number; previous: number | null };
      equityLiabilities: { current: number; previous: number | null };
      equity: { current: number; previous: number | null };
    };
  };
  /** True iff |totalAssets − totalEqLiab| ≤ 1 SEK for current year. */
  balanceOk: boolean;
  balanceDelta: number;
  /** Net result computed from RR vs net result derived from equity (2099). */
  rrBrReconciliation: {
    rrNetResult: number;
    brEquityResult: number | null;
    matches: boolean;
  };
  /** Sum of activity in 3xxx accounts — used to detect "missing revenue mapping". */
  revenueAccountActivity: number;
  fetchedAt: string;
}

interface JournalLineRow {
  debit: number | null;
  credit: number | null;
  chart_of_accounts: { account_number: string; account_name: string } | null;
  journal_entries: { entry_date: string; status: string; company_id: string } | null;
}

async function fetchYearMovements(companyId: string, year: number): Promise<AccountMovement[]> {
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;

  // Page through journal_entry_lines via inner join on journal_entries (verified only).
  const PAGE = 1000;
  let from = 0;
  const map = new Map<string, AccountMovement>();

  // Simple loop — most SMEs fit in 1–3 pages.
  // We accept "approved" + "posted" as verified.
  // (Closed-period flag is enforced upstream when entries are approved.)
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabase
      .from("journal_entry_lines")
      .select(
        "debit, credit, chart_of_accounts!inner(account_number, account_name), journal_entries!inner(entry_date, status, company_id)",
      )
      .eq("journal_entries.company_id", companyId)
      .in("journal_entries.status", ["approved", "posted"])
      .gte("journal_entries.entry_date", start)
      .lte("journal_entries.entry_date", end)
      .range(from, from + PAGE - 1);

    if (error) throw error;
    const rows = (data ?? []) as unknown as JournalLineRow[];
    for (const r of rows) {
      const acc = r.chart_of_accounts;
      if (!acc) continue;
      const key = acc.account_number;
      const existing =
        map.get(key) ??
        { accountNumber: key, accountName: acc.account_name, debit: 0, credit: 0, net: 0 };
      existing.debit += Number(r.debit ?? 0);
      existing.credit += Number(r.credit ?? 0);
      existing.net = existing.debit - existing.credit;
      map.set(key, existing);
    }
    if (rows.length < PAGE) break;
    from += PAGE;
  }

  return Array.from(map.values()).sort((a, b) =>
    a.accountNumber.localeCompare(b.accountNumber),
  );
}

function buildStatements(
  current: AccountMovement[],
  previous: AccountMovement[] | null,
  fiscalYear: number,
): FinancialStatements {
  const hasCurrent = current.length > 0;
  const hasPrevious = !!previous && previous.length > 0;

  // Group accounts by classification for both years.
  type Group = Map<string, { current: number; previous: number | null; accounts: AccountMovement[] }>;
  const rrGroups: Group = new Map();
  const brAssetGroups: Group = new Map();
  const brEqLiabGroups: Group = new Map();
  const unmapped: AccountMovement[] = [];
  let revenueAccountActivity = 0;

  const ingest = (m: AccountMovement, year: "current" | "previous") => {
    const cls = classifyAccount(m.accountNumber);
    if (cls.statement === "UNMAPPED") {
      if (year === "current") unmapped.push(m);
      return;
    }
    const target =
      cls.statement === "RR" ? rrGroups :
      cls.statement === "BR_ASSET" ? brAssetGroups :
      brEqLiabGroups;
    const entry = target.get(cls.key) ?? { current: 0, previous: null, accounts: [] };
    if (year === "current") {
      entry.current += m.net;
      entry.accounts.push(m);
    } else {
      entry.previous = (entry.previous ?? 0) + m.net;
    }
    target.set(cls.key, entry);
  };

  for (const m of current) {
    ingest(m, "current");
    const num = parseInt(m.accountNumber, 10);
    if (Number.isFinite(num) && num >= 3000 && num <= 3999) {
      revenueAccountActivity += m.debit + m.credit;
    }
  }
  if (previous) for (const m of previous) ingest(m, "previous");

  // RR lines
  const rrLines: RRLine[] = RR_LINES.map((def) => {
    const g = rrGroups.get(def.key);
    return {
      key: def.key,
      label: def.label,
      current: hasCurrent ? toDisplayValue(g?.current ?? 0, def.natural) : null,
      previous: hasPrevious ? toDisplayValue(g?.previous ?? 0, def.natural) : null,
      accounts: g?.accounts ?? [],
    };
  });

  const sumRR = (keys: RRLineKey[], side: "current" | "previous"): number | null => {
    if (side === "previous" && !hasPrevious) return null;
    let s = 0;
    for (const k of keys) {
      const v = rrLines.find((l) => l.key === k);
      if (v) s += (side === "current" ? v.current : v.previous) ?? 0;
    }
    return s;
  };

  // RR subtotals — income (positive) + costs (already negative in display).
  // In display values: income lines positive, cost lines negative (because their
  // natural is debit_positive but we want costs shown negative).
  // Actually we keep cost lines POSITIVE in display (they ARE costs) and apply
  // sign at render time. To make subtotal arithmetic intuitive we use:
  // operating result = income − costs.
  const incomeKeys: RRLineKey[] = ["net_revenue", "other_operating_income"];
  const opCostKeys: RRLineKey[] = [
    "raw_materials", "external_costs", "personnel_costs",
    "depreciation", "other_operating_costs",
  ];
  const finIncomeKeys: RRLineKey[] = ["financial_income"];
  const finCostKeys: RRLineKey[] = ["financial_costs"];

  const opResultCur = (sumRR(incomeKeys, "current") ?? 0) - (sumRR(opCostKeys, "current") ?? 0);
  const opResultPrev = hasPrevious
    ? (sumRR(incomeKeys, "previous") ?? 0) - (sumRR(opCostKeys, "previous") ?? 0)
    : null;
  const resAfterFinCur = opResultCur + (sumRR(finIncomeKeys, "current") ?? 0) - (sumRR(finCostKeys, "current") ?? 0);
  const resAfterFinPrev = hasPrevious
    ? (opResultPrev ?? 0) + (sumRR(finIncomeKeys, "previous") ?? 0) - (sumRR(finCostKeys, "previous") ?? 0)
    : null;
  const resBeforeTaxCur = resAfterFinCur - (sumRR(["appropriations"], "current") ?? 0);
  const resBeforeTaxPrev = hasPrevious ? (resAfterFinPrev ?? 0) - (sumRR(["appropriations"], "previous") ?? 0) : null;
  const netResultCur = resBeforeTaxCur - (sumRR(["taxes"], "current") ?? 0);
  const netResultPrev = hasPrevious ? (resBeforeTaxPrev ?? 0) - (sumRR(["taxes"], "previous") ?? 0) : null;

  // BR lines
  const assets: BRLine<BRAssetKey>[] = BR_ASSET_LINES.map((def) => {
    const g = brAssetGroups.get(def.key);
    return {
      key: def.key,
      label: def.label,
      current: hasCurrent ? toDisplayValue(g?.current ?? 0, def.natural) : null,
      previous: hasPrevious ? toDisplayValue(g?.previous ?? 0, def.natural) : null,
      accounts: g?.accounts ?? [],
    };
  });
  const eqLiab: BRLine<BREquityLiabilityKey>[] = BR_EQUITY_LIABILITY_LINES.map((def) => {
    const g = brEqLiabGroups.get(def.key);
    return {
      key: def.key,
      label: def.label,
      current: hasCurrent ? toDisplayValue(g?.current ?? 0, def.natural) : null,
      previous: hasPrevious ? toDisplayValue(g?.previous ?? 0, def.natural) : null,
      accounts: g?.accounts ?? [],
    };
  });

  const sumLines = <K extends string>(lines: BRLine<K>[], side: "current" | "previous"): number | null => {
    if (side === "previous" && !hasPrevious) return null;
    return lines.reduce((s, l) => s + ((side === "current" ? l.current : l.previous) ?? 0), 0);
  };

  const totalAssetsCur = sumLines(assets, "current") ?? 0;
  const totalAssetsPrev = sumLines(assets, "previous");
  const totalEqLiabCur = sumLines(eqLiab, "current") ?? 0;
  const totalEqLiabPrev = sumLines(eqLiab, "previous");
  const equityLine = eqLiab.find((l) => l.key === "equity");
  const equityCur = equityLine?.current ?? 0;
  const equityPrev = equityLine?.previous ?? null;

  // RR ↔ BR reconciliation:
  // The 2099 (Årets resultat) account belongs to equity. Its display value
  // (credit_positive) equals net result for the year.
  const acc2099Current = current.find((m) => m.accountNumber === "2099");
  const brEquityResult = acc2099Current ? -acc2099Current.net : null; // credit_positive
  const matches = brEquityResult == null ? false : Math.abs(brEquityResult - netResultCur) <= 1;

  const balanceDelta = totalAssetsCur - totalEqLiabCur;
  const balanceOk = Math.abs(balanceDelta) <= 1;

  return {
    fiscalYear,
    hasCurrent,
    hasPrevious,
    unmappedAccounts: unmapped,
    currentAccounts: current,
    previousAccounts: previous ?? [],
    rr: {
      lines: rrLines,
      operatingResult: { current: opResultCur, previous: opResultPrev },
      resultAfterFinancial: { current: resAfterFinCur, previous: resAfterFinPrev },
      resultBeforeTax: { current: resBeforeTaxCur, previous: resBeforeTaxPrev },
      netResult: { current: netResultCur, previous: netResultPrev },
    },
    br: {
      assets,
      equityLiabilities: eqLiab,
      totals: {
        assets: { current: totalAssetsCur, previous: totalAssetsPrev },
        equityLiabilities: { current: totalEqLiabCur, previous: totalEqLiabPrev },
        equity: { current: equityCur, previous: equityPrev },
      },
    },
    balanceOk,
    balanceDelta,
    rrBrReconciliation: {
      rrNetResult: netResultCur,
      brEquityResult,
      matches,
    },
    revenueAccountActivity,
    fetchedAt: new Date().toISOString(),
  };
}

export function useFinancialStatements(companyId: string | null, fiscalYear: number) {
  return useQuery({
    queryKey: ["ar-v2-financial-statements", companyId, fiscalYear],
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!companyId) throw new Error("Saknar företag");
      const [current, previous] = await Promise.all([
        fetchYearMovements(companyId, fiscalYear),
        fetchYearMovements(companyId, fiscalYear - 1).catch(() => []),
      ]);
      return buildStatements(current, previous.length > 0 ? previous : null, fiscalYear);
    },
  });
}
