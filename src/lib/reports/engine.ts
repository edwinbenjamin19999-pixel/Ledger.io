/**
 * Unified Report Engine — single source of truth for RR + BR.
 *
 * `buildReportEngine(input)` produces a `FinancialReport` that contains:
 *  - `accounts`   one per-account snapshot for the period (built ONCE)
 *  - `views.incomeStatement` and `views.balanceSheet` — filtered + structured
 *  - `totals`     all KPI numbers (revenue/costs/result/assets/equity/liab)
 *  - `validation` from runValidationEngine
 *  - `imbalance`  from diagnoseImbalance, attached so UI/debug never re-compute
 *
 * Every consumer (UI, PDF, Excel, AI) reads the same object → no drift.
 */

import { format } from "date-fns";
import {
  buildAccountRows,
  type ChartAccount,
  type RawJournalLine,
} from "@/components/reports/reportDataBuilder";
import type {
  ReportAccountRow,
  ReportSection,
} from "@/components/reports/ProfessionalReportTable";
import {
  BR_ASSET_GROUPS,
  BR_EQUITY_LIAB_GROUPS,
  RR_GROUPS,
  buildSections,
  sumRows,
} from "./sections";
import {
  BR_COLUMNS,
  RR_COLUMNS,
  type ReportColumn,
} from "./columns";
import {
  runValidationEngine,
  type ValidationReport,
} from "./validationEngine";
import {
  diagnoseImbalance,
  type DiagnosticsReport,
} from "./imbalanceDiagnostics";
import {
  buildActualLayer,
  buildBudgetLayer,
  buildForecastLayer,
  applyScenario,
  type BudgetRow,
  type ForecastRow,
  type ScenarioAdjustment,
  type ValueLayer,
} from "./valueLayers";
import {
  buildVarianceMatrix,
  isRevenueAccount,
  type Variance,
} from "./varianceEngine";
import type { LoadedTemplate } from "./types/dbSchema";
import { resolveFormulas } from "./formulaEngine";

export type ReportViewKind = "RR" | "BR";

/**
 * Build a `code → period sum` map from a LoadedTemplate.
 * Used by the DB-hydrated path to feed `resolveFormulas` for subtotal rows.
 *
 * Account rows are matched against `account_mappings` (range-based). Sign is
 * inverted when `sign_override = 'invert'`. Conflicts (multiple matches) keep
 * the lowest `account_from` for stability.
 */
export function buildTemplateRowValues(
  template: LoadedTemplate,
  accountRows: ReportAccountRow[],
  field: "perioden" | "utgBalans" = "perioden",
): Map<string, number> {
  const rowById = new Map(template.rows.map((r) => [r.id, r]));
  const sortedMappings = [...template.mappings].sort(
    (a, b) => parseInt(a.account_from, 10) - parseInt(b.account_from, 10),
  );

  const seed = new Map<string, number>();
  // Initialize all mapped_accounts rows to 0 so missing data resolves cleanly.
  for (const r of template.rows) {
    if (r.calculation_type === "mapped_accounts") seed.set(r.code, 0);
  }

  for (const acct of accountRows) {
    const num = parseInt(acct.accountNumber, 10);
    if (!isFinite(num)) continue;
    const m = sortedMappings.find((mp) => {
      const from = parseInt(mp.account_from, 10);
      const to = parseInt(mp.account_to, 10);
      return num >= from && num <= to;
    });
    if (!m) continue;
    const row = rowById.get(m.row_id);
    if (!row) continue;
    const sign = m.sign_override === "invert" ? -1 : 1;
    const prev = seed.get(row.code) ?? 0;
    seed.set(row.code, prev + sign * acct[field]);
  }

  const formulas = new Map<string, string>();
  for (const r of template.rows) {
    if (r.calculation_type === "formula" && r.formula_expression) {
      formulas.set(r.code, r.formula_expression);
    }
  }
  return resolveFormulas(seed, formulas);
}

export interface ReportTotals {
  ingBalans: number;
  ingSaldo: number;
  perioden: number;
  utgBalans: number;
}

export interface ReportView {
  kind: ReportViewKind;
  title: string;
  columns: ReportColumn[];
  /** For BR: contains BOTH asset section + equity/liab section trees, in order. */
  sections: ReportSection[];
  grandTotal: ReportTotals;
  grandTotalLabel: string;
  /** Per-view metadata used by the table for derived cells (margin %, balance Δ). */
  meta: {
    /** RR only — used for marginal % per row. */
    totalRevenue?: number;
    /** BR only — net balance difference (assets − equity/liab). */
    balanceDiff?: number;
    /** BR only — separate sub-trees for the dual-table layout. */
    assetSections?: ReportSection[];
    assetTotals?: ReportTotals;
    liabSections?: ReportSection[];
    liabTotals?: ReportTotals;
  };
}

export interface FinancialReport {
  hasData: boolean;
  period: { fromDate: Date; toDate: Date; fiscalYearStart: Date };
  company: { id: string; name: string };
  /** All per-account rows for the period — single source for both views. */
  accounts: {
    assets: ReportAccountRow[];
    equityLiab: ReportAccountRow[];
    incomeStatement: ReportAccountRow[];
  };
  views: {
    incomeStatement: ReportView;
    balanceSheet: ReportView;
  };
  totals: {
    revenue: number;
    costs: number;
    result: number;
    assets: number;
    equity: number;
    liabilities: number;
    totalLiabEq: number;
    marginPct: number;
  };
  validation: ValidationReport;
  imbalance: DiagnosticsReport;
  /** Optional value layers — populated when caller provides budget/forecast/scenario. */
  layers?: {
    actual: ValueLayer;
    budget?: ValueLayer;
    forecast?: ValueLayer;
    scenario?: ValueLayer;
  };
  /** Variance matrix actual-vs-budget (or forecast if budget absent). */
  varianceMatrix?: Map<string, Variance>;
  /**
   * Phase 3 A/B output — DB-template row code → resolved value (period sum).
   * Populated only when caller passes `template`. Used to verify the DB path
   * matches the hardcoded structure before we cut over in Phase 5.
   */
  templateRowValues?: {
    incomeStatement?: Map<string, number>;
    balanceSheet?: Map<string, number>;
  };
}

export interface BuildEngineInput {
  rawLines: RawJournalLine[];
  chartAccounts: ChartAccount[];
  fromDate: Date;
  toDate: Date;
  fiscalYearStart: Date;
  company: { id: string; name: string };
  hasOpeningBalances?: boolean;
  unmappedLineCount?: number;
  /** Optional layers — engine projects them onto the same account skeleton. */
  budgetRows?: BudgetRow[];
  forecastRows?: ForecastRow[];
  scenarioAdjustments?: ScenarioAdjustment[];
  /**
   * Optional DB-hydrated template (Phase 3 A/B). When provided, engine attaches
   * `templateRowValues` to the report so DB-driven UIs / exports can read
   * structured row totals without re-implementing aggregation. The hardcoded
   * `RR_GROUPS` / `BR_GROUPS` path still produces the primary `views` payload
   * — swap happens in Phase 5.
   */
  template?: LoadedTemplate;
}

/**
 * Inject 2098 (Balanserat resultat) and 2099 (Årets resultat) when the journal
 * doesn't already carry them. This is the ONLY place this happens — page layer
 * never touches it again.
 */
function injectResultCarryAccounts(
  liabRows: ReportAccountRow[],
  rawLines: RawJournalLine[],
  fromDate: Date,
  toDate: Date,
  fiscalYearStart: Date,
): ReportAccountRow[] {
  const fysStr = format(fiscalYearStart, "yyyy-MM-dd");
  const fromStr = format(fromDate, "yyyy-MM-dd");
  const toStr = format(toDate, "yyyy-MM-dd");

  const pnlLines = rawLines.filter((l) =>
    /^[3-8]/.test(l.chart_of_accounts?.account_number || ""),
  );

  let priorYearIB = 0;
  let currentYearIS = 0;
  let currentYearPeriod = 0;
  pnlLines.forEach((line) => {
    const date = line._entryDate || "";
    const net = (line.credit || 0) - (line.debit || 0);
    if (date < fysStr) priorYearIB += net;
    else if (date < fromStr) currentYearIS += net;
    else if (date <= toStr) currentYearPeriod += net;
  });

  const out = [...liabRows];
  const upsert = (
    accountNumber: string,
    accountName: string,
    ingBalans: number,
    ingSaldo: number,
    perioden: number,
  ) => {
    const row: ReportAccountRow = {
      accountNumber,
      accountName,
      ingBalans,
      ingSaldo,
      perioden,
      utgBalans: ingSaldo + perioden,
    };
    const i = out.findIndex((r) => r.accountNumber === accountNumber);
    if (i === -1) {
      out.push(row);
    } else if ((out[i].utgBalans ?? 0) === 0 && (out[i].perioden ?? 0) === 0) {
      // Empty placeholder row from chart_of_accounts → overwrite with synthetic carry.
      // If the bookkeeper has actually posted to 2098/2099, leave it (avoid double-count).
      out[i] = { ...out[i], ...row };
    }
  };
  upsert("2098", "Balanserat resultat", priorYearIB, priorYearIB, 0);
  upsert("2099", "Årets resultat", 0, currentYearIS, currentYearPeriod);
  return out.sort((a, b) => a.accountNumber.localeCompare(b.accountNumber));
}

export function buildReportEngine(input: BuildEngineInput): FinancialReport {
  const { rawLines, chartAccounts, fromDate, toDate, fiscalYearStart, company } = input;

  // 1. Per-account snapshots — built ONCE for each natural sign convention.
  const assetRows = buildAccountRows(
    rawLines,
    chartAccounts,
    fromDate,
    toDate,
    fiscalYearStart,
    (n) => n.startsWith("1"),
    "debit",
  );

  const rawLiabRows = buildAccountRows(
    rawLines,
    chartAccounts,
    fromDate,
    toDate,
    fiscalYearStart,
    (n) => n.startsWith("2"),
    "credit",
  );
  const liabRows = injectResultCarryAccounts(
    rawLiabRows,
    rawLines,
    fromDate,
    toDate,
    fiscalYearStart,
  );

  const isRows = buildAccountRows(
    rawLines,
    chartAccounts,
    fromDate,
    toDate,
    fiscalYearStart,
    (n) => /^[3-8]/.test(n),
    "credit",
  );

  // 2. Totals — computed ONCE, never re-summed in UI.
  const revenue = isRows
    .filter((r) => r.accountNumber.startsWith("3"))
    .reduce((s, r) => s + r.perioden, 0);
  const costs = isRows
    .filter((r) => /^[4-7]/.test(r.accountNumber))
    .reduce((s, r) => s + r.perioden, 0);
  const result = isRows.reduce((s, r) => s + r.perioden, 0);

  const equityRows = liabRows.filter((r) => /^20/.test(r.accountNumber));
  const equity = equityRows.reduce((s, r) => s + r.utgBalans, 0);
  const nonEquityLiab = liabRows.filter((r) => !/^20/.test(r.accountNumber));
  const liabilities = nonEquityLiab.reduce((s, r) => s + r.utgBalans, 0);

  const assetTotals = sumRows(assetRows);
  const liabTotals = sumRows(liabRows);
  const isTotals = sumRows(isRows);

  const totalAssets = assetTotals.utgBalans;
  const totalLiabEq = liabTotals.utgBalans;
  const marginPct = revenue !== 0 ? (result / Math.abs(revenue)) * 100 : 0;
  const balanceDiff = totalAssets - totalLiabEq;

  // 3. Hierarchical sections (RR + BR) via the SHARED `buildSections` builder.
  const isSections = buildSections(isRows, RR_GROUPS);
  const assetSections = buildSections(assetRows, BR_ASSET_GROUPS);
  const liabSections = buildSections(liabRows, BR_EQUITY_LIAB_GROUPS);

  const incomeStatementView: ReportView = {
    kind: "RR",
    title: "Resultaträkning",
    columns: RR_COLUMNS, // identical skeleton with BR
    sections: isSections,
    grandTotal: isTotals,
    grandTotalLabel: "ÅRETS RESULTAT",
    meta: { totalRevenue: revenue },
  };

  const balanceSheetView: ReportView = {
    kind: "BR",
    title: "Balansräkning",
    columns: BR_COLUMNS,
    // Combined sequence used by single-table consumers (PDF/Excel).
    sections: [
      {
        level: 1,
        title: "TILLGÅNGAR",
        accounts: [],
        subtotalLabel: "SA TILLGÅNGAR",
        children: assetSections,
      },
      {
        level: 1,
        title: "EGET KAPITAL, AVSÄTTN. OCH SKULDER",
        accounts: [],
        subtotalLabel: "SA EGET KAPITAL OCH SKULDER",
        children: liabSections,
      },
    ],
    grandTotal: liabTotals,
    grandTotalLabel: "BALANSOMSLUTNING",
    meta: {
      balanceDiff,
      assetSections,
      assetTotals,
      liabSections,
      liabTotals,
    },
  };

  // 4. Validation + diagnostics — same engine, same data, attached to report.
  const validation = runValidationEngine({
    assetRows,
    liabRows,
    isRows,
    totalAssets,
    totalLiabEq,
    rrResult: result,
    hasOpeningBalances: input.hasOpeningBalances ?? true,
    unmappedLineCount: input.unmappedLineCount ?? 0,
  });

  const imbalance = diagnoseImbalance({
    assetRows,
    liabRows,
    isRows,
    rrResult: result,
    totalAssets,
    totalLiabEq,
    rawLines,
  });

  // 5. Optional value layers (budget/forecast/scenario) projected on the SAME accounts.
  const allRows = [...assetRows, ...liabRows, ...isRows];
  const actualLayer = buildActualLayer(allRows);
  const budgetLayer = input.budgetRows && input.budgetRows.length > 0
    ? buildBudgetLayer(input.budgetRows, fromDate, toDate)
    : undefined;
  const forecastLayer = input.forecastRows && input.forecastRows.length > 0
    ? buildForecastLayer(input.forecastRows, fromDate, toDate)
    : undefined;
  const scenarioLayer = input.scenarioAdjustments && input.scenarioAdjustments.length > 0
    ? applyScenario(forecastLayer ?? actualLayer, input.scenarioAdjustments)
    : undefined;

  const comparisonLayer = budgetLayer ?? forecastLayer;
  const varianceMatrix = comparisonLayer
    ? buildVarianceMatrix(actualLayer, comparisonLayer, isRevenueAccount)
    : undefined;

  // 6. Optional DB-template A/B values (Phase 3) — built when caller provides
  //    a LoadedTemplate. Resolves both RR-style (period sums) and BR-style
  //    (utgBalans) row totals via the formula engine.
  let templateRowValues: FinancialReport["templateRowValues"];
  if (input.template) {
    try {
      const tCode = input.template.template.code;
      const isRRTemplate = tCode === "RR_K2" || input.template.template.type === "rr";
      const isBRTemplate = tCode === "BR_K2" || input.template.template.type === "br";
      templateRowValues = {
        incomeStatement: isRRTemplate
          ? buildTemplateRowValues(input.template, isRows, "perioden")
          : undefined,
        balanceSheet: isBRTemplate
          ? buildTemplateRowValues(input.template, [...assetRows, ...liabRows], "utgBalans")
          : undefined,
      };
    } catch (e) {
      console.warn("[reportEngine] Template hydration failed, falling back:", e);
    }
  }

  return {
    hasData: rawLines.length > 0,
    period: { fromDate, toDate, fiscalYearStart },
    company,
    accounts: {
      assets: assetRows,
      equityLiab: liabRows,
      incomeStatement: isRows,
    },
    views: {
      incomeStatement: incomeStatementView,
      balanceSheet: balanceSheetView,
    },
    totals: {
      revenue,
      costs,
      result,
      assets: totalAssets,
      equity,
      liabilities,
      totalLiabEq,
      marginPct,
    },
    validation,
    imbalance,
    layers: {
      actual: actualLayer,
      budget: budgetLayer,
      forecast: forecastLayer,
      scenario: scenarioLayer,
    },
    varianceMatrix,
    templateRowValues,
  };
}
