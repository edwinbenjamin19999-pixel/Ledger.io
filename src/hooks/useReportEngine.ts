/**
 * useReportEngine — single hook that derives the unified FinancialReport.
 * Consumers (Reports.tsx, exports, AI) all read from this — never compute totals
 * or sections themselves.
 */
import { useMemo } from "react";
import { buildReportEngine, type BuildEngineInput, type FinancialReport } from "@/lib/reports/engine";

export function useReportEngine(input: BuildEngineInput): FinancialReport {
  return useMemo(() => buildReportEngine(input), [
    input.rawLines,
    input.chartAccounts,
    input.fromDate,
    input.toDate,
    input.fiscalYearStart,
    input.company.id,
    input.company.name,
    input.hasOpeningBalances,
    input.unmappedLineCount,
    input.budgetRows,
    input.forecastRows,
    input.scenarioAdjustments,
    input.template,
  ]);
}

export type { FinancialReport } from "@/lib/reports/engine";
