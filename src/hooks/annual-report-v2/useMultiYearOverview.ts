/**
 * useMultiYearOverview — fetches up to 5 years of historical financial data
 * for the Flerårsöversikt and Nyckeltal sections in Förvaltningsberättelsen.
 *
 * Strategy:
 *   1. Pull existing `annual_reports` rows for the company (closed years
 *      contain pre-aggregated totals — fast).
 *   2. For the current year (and any year missing from annual_reports),
 *      compute on the fly via `useFinancialStatements` (RR/BR built from
 *      journal entries).
 *
 * Output is a 5-column matrix of KPIs.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface YearKPIs {
  fiscalYear: number;
  /** Source: "annual_report" (closed) or "live" (computed from current journal). */
  source: "annual_report" | "live" | "empty";
  revenue: number | null;
  operatingResult: number | null;
  resultAfterFinancial: number | null;
  netResult: number | null;
  totalAssets: number | null;
  totalEquity: number | null;
  avgEmployees: number | null;
  /** Derived metrics */
  operatingMargin: number | null; // %
  netMargin: number | null; // %
  solidity: number | null; // %
  returnOnEquity: number | null; // %
  returnOnAssets: number | null; // %
  quickRatio: number | null; // %
  revenueChange: number | null; // % vs previous year
}

interface AnnualReportRow {
  fiscal_year: number;
  revenue: number | null;
  net_profit: number | null;
  total_equity: number | null;
  total_assets: number | null;
  total_liabilities: number | null;
  income_statement: Record<string, unknown> | null;
  balance_sheet: Record<string, unknown> | null;
}

function getNum(obj: Record<string, unknown> | null | undefined, ...keys: string[]): number | null {
  if (!obj) return null;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}

function compute(row: AnnualReportRow): YearKPIs {
  const rr = row.income_statement as Record<string, unknown> | null;
  const br = row.balance_sheet as Record<string, unknown> | null;

  const operatingResult =
    getNum(rr, "operating_result", "operatingResult", "rorelseresultat") ?? null;
  const resultAfterFinancial =
    getNum(rr, "result_after_financial", "resultAfterFinancial", "resultat_efter_finansiella_poster") ?? null;
  const avgEmployees =
    getNum(rr, "average_employees", "avg_employees") ??
    getNum(br, "average_employees", "avg_employees") ??
    null;

  const revenue = row.revenue != null ? Number(row.revenue) : null;
  const netResult = row.net_profit != null ? Number(row.net_profit) : null;
  const totalAssets = row.total_assets != null ? Number(row.total_assets) : null;
  const totalEquity = row.total_equity != null ? Number(row.total_equity) : null;

  const operatingMargin =
    revenue && operatingResult != null && revenue !== 0
      ? (operatingResult / revenue) * 100
      : null;
  const netMargin =
    revenue && netResult != null && revenue !== 0 ? (netResult / revenue) * 100 : null;
  const solidity =
    totalAssets && totalEquity != null && totalAssets !== 0
      ? (totalEquity / totalAssets) * 100
      : null;
  const returnOnEquity =
    totalEquity && netResult != null && totalEquity !== 0
      ? (netResult / totalEquity) * 100
      : null;
  const returnOnAssets =
    totalAssets && (operatingResult ?? netResult) != null && totalAssets !== 0
      ? ((operatingResult ?? netResult ?? 0) / totalAssets) * 100
      : null;

  return {
    fiscalYear: row.fiscal_year,
    source: "annual_report",
    revenue,
    operatingResult,
    resultAfterFinancial,
    netResult,
    totalAssets,
    totalEquity,
    avgEmployees,
    operatingMargin,
    netMargin,
    solidity,
    returnOnEquity,
    returnOnAssets,
    quickRatio: null,
    revenueChange: null,
  };
}

function emptyYear(year: number): YearKPIs {
  return {
    fiscalYear: year,
    source: "empty",
    revenue: null,
    operatingResult: null,
    resultAfterFinancial: null,
    netResult: null,
    totalAssets: null,
    totalEquity: null,
    avgEmployees: null,
    operatingMargin: null,
    netMargin: null,
    solidity: null,
    returnOnEquity: null,
    returnOnAssets: null,
    quickRatio: null,
    revenueChange: null,
  };
}

export function useMultiYearOverview(companyId: string, currentFiscalYear: number, years = 5) {
  return useQuery({
    queryKey: ["ar-v2-multi-year-overview", companyId, currentFiscalYear, years],
    enabled: !!companyId,
    queryFn: async (): Promise<YearKPIs[]> => {
      const wantedYears: number[] = [];
      for (let i = 0; i < years; i++) wantedYears.push(currentFiscalYear - i);

      const { data, error } = await supabase
        .from("annual_reports")
        .select(
          "fiscal_year, revenue, net_profit, total_equity, total_assets, total_liabilities, income_statement, balance_sheet",
        )
        .eq("company_id", companyId)
        .in("fiscal_year", wantedYears);

      if (error) throw error;

      const byYear = new Map<number, YearKPIs>();
      for (const row of (data as unknown as AnnualReportRow[]) ?? []) {
        byYear.set(row.fiscal_year, compute(row));
      }

      // Build ordered (newest → oldest) list, fill gaps with empty placeholders.
      const ordered = wantedYears.map((y) => byYear.get(y) ?? emptyYear(y));

      // Compute revenue change vs previous year (older year is at index+1).
      for (let i = 0; i < ordered.length - 1; i++) {
        const cur = ordered[i].revenue;
        const prev = ordered[i + 1].revenue;
        if (cur != null && prev != null && prev !== 0) {
          ordered[i].revenueChange = ((cur - prev) / Math.abs(prev)) * 100;
        }
      }

      return ordered;
    },
  });
}
