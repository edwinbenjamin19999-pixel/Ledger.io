/**
 * useFinancialEngine — single source-of-truth hook for the unified Reports module.
 * Consumes RR + BR rows already built by the page (to avoid double-fetching), runs
 * the validation engine and exposes 8 KPIs + confidence + diagnostics.
 *
 * The page (Reports.tsx) keeps responsibility for fetching journal lines so that we
 * don't duplicate complex pagination logic. This hook centralises *interpretation*.
 */

import { useMemo } from "react";
import type { ReportAccountRow } from "@/components/reports/ProfessionalReportTable";
import { runValidationEngine, type ValidationReport } from "@/lib/reports/validationEngine";
import { diagnoseImbalance, type DiagnosticsReport } from "@/lib/reports/imbalanceDiagnostics";

export interface FinancialEngineInput {
  assetRows: ReportAccountRow[];
  liabRows: ReportAccountRow[];
  isRows: ReportAccountRow[];
  hasOpeningBalances?: boolean;
  unmappedLineCount?: number;
}

export interface FinancialKpis {
  revenue: number;
  costs: number;
  result: number;
  assets: number;
  equity: number;
  liabilities: number;
  marginPct: number;
}

export interface FinancialEngineResult {
  kpis: FinancialKpis;
  validation: ValidationReport;
  diagnostics: DiagnosticsReport;
  hasData: boolean;
}

export function useFinancialEngine(input: FinancialEngineInput): FinancialEngineResult {
  const { assetRows, liabRows, isRows, hasOpeningBalances = true, unmappedLineCount = 0 } = input;

  return useMemo(() => {
    // KPIs
    const revenue = isRows
      .filter((r) => r.accountNumber.startsWith("3"))
      .reduce((s, r) => s + r.perioden, 0);
    const costs = isRows
      .filter((r) => /^[4-7]/.test(r.accountNumber))
      .reduce((s, r) => s + r.perioden, 0);
    const result = isRows.reduce((s, r) => s + r.perioden, 0);
    const assets = assetRows.reduce((s, r) => s + r.utgBalans, 0);
    const equityRows = liabRows.filter((r) => /^20/.test(r.accountNumber));
    const equity = equityRows.reduce((s, r) => s + r.utgBalans, 0);
    const liabRowsExEq = liabRows.filter((r) => !/^20/.test(r.accountNumber));
    const liabilities = liabRowsExEq.reduce((s, r) => s + r.utgBalans, 0);
    const totalLiabEq = equity + liabilities;
    const marginPct = revenue !== 0 ? (result / Math.abs(revenue)) * 100 : 0;

    const kpis: FinancialKpis = {
      revenue: Math.abs(revenue),
      costs: Math.abs(costs),
      result,
      assets,
      equity,
      liabilities,
      marginPct,
    };

    // Validation
    const validation = runValidationEngine({
      assetRows,
      liabRows,
      isRows,
      totalAssets: assets,
      totalLiabEq,
      rrResult: result,
      hasOpeningBalances,
      unmappedLineCount,
    });

    // Diagnostics
    const diagnostics = diagnoseImbalance({
      assetRows,
      liabRows,
      isRows,
      rrResult: result,
      totalAssets: assets,
      totalLiabEq,
    });

    const hasData = assetRows.length > 0 || liabRows.length > 0 || isRows.length > 0;

    return { kpis, validation, diagnostics, hasData };
  }, [assetRows, liabRows, isRows, hasOpeningBalances, unmappedLineCount]);
}
