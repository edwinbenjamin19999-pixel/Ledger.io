/**
 * StatementDocument — normalised, format-agnostic document model for premium exports.
 *
 * Built from a `FinancialReport` (engine output) and consumed by BOTH the
 * Premium PDF renderer and the Premium Excel renderer.
 *
 * Design rules:
 *   • SMART ROW VISIBILITY — accounts/groups/sections with all-zero values are filtered out.
 *   • DYNAMIC COLUMNS — base columns always present; Budget/Avvikelse + Föregående år only
 *     appear when the underlying data exists. No empty placeholder columns.
 *   • COMPUTED SUBTOTALS — RR emits EBITDA, EBIT, Resultat före skatt, Årets resultat as
 *     LEVEL-5 totals so the export reads like a board-level financial statement.
 *   • RR + BR follow the SAME pipeline → exports look like sister documents.
 */
import { format as formatDate } from "date-fns";
import type { FinancialReport } from "./engine";
import type {
  ReportAccountRow,
  ReportSection,
} from "@/components/reports/ProfessionalReportTable";

// ── Row vocabulary ───────────────────────────────────────────────────
export type StatementRow =
  | { kind: "section"; label: string }                                // LEVEL 2
  | { kind: "group"; label: string }                                  // LEVEL 3
  | { kind: "account"; code: string; label: string; values: number[] } // LEVEL 4
  | { kind: "subtotal"; label: string; values: number[] }             // LEVEL 5
  | { kind: "total"; label: string; values: number[] }                // LEVEL 5 (grand)
  | { kind: "spacer" };

export type StatementColumnFormat = "text" | "number" | "percent";

export interface StatementColumn {
  key: string;
  label: string;
  align: "left" | "right";
  format: StatementColumnFormat;
  /** Approx character width for Excel, points for PDF auto-layout. */
  width: number;
}

export interface StatementDocument {
  header: {
    company: string;
    title: string;
    period: string;
    generated: Date;
    orgNumber?: string;
  };
  columns: StatementColumn[];
  rows: StatementRow[];
  warnings: { severity: "warning" | "error"; message: string }[];
  footer: { confidentiality: string };
}

// ── Helpers ──────────────────────────────────────────────────────────
const ZERO_THRESHOLD = 0.005;
const isZeroAcross = (values: number[]) => values.every((v) => !Number.isFinite(v) || Math.abs(v) < ZERO_THRESHOLD);

const sumValueArrays = (rows: number[][]): number[] => {
  if (rows.length === 0) return [];
  const len = rows[0].length;
  const out = new Array(len).fill(0);
  for (const r of rows) {
    for (let i = 0; i < len; i++) out[i] += r[i] || 0;
  }
  return out;
};

const collectSection = (s: ReportSection): ReportAccountRow[] => {
  const out: ReportAccountRow[] = [...(s.accounts || [])];
  for (const c of s.children || []) out.push(...collectSection(c));
  return out;
};

// ── Column model ─────────────────────────────────────────────────────
//
// Base layout (always present):
//   Konto · Benämning · Perioden · Utg. saldo
//
// Optional layers, appended only when data exists:
//   + Budget · Avvikelse (kr) · Avvikelse (%)
//   + Föregående år · Föregående år (%)

interface ColumnLayout {
  columns: StatementColumn[];
  hasBudget: boolean;
  hasPY: boolean;
}

function buildColumnLayout(hasBudget: boolean, hasPY: boolean): ColumnLayout {
  // Locked 8-column accounting grid — always rendered to fill 100% width.
  // Missing budget/PY data shows em-dash via formatPdfNumber(NaN).
  const columns: StatementColumn[] = [
    { key: "code",      label: "Konto",          align: "left",  format: "text",   width: 8 },
    { key: "label",     label: "Benämning",      align: "left",  format: "text",   width: 42 },
    { key: "perioden",  label: "Perioden",       align: "right", format: "number", width: 14 },
    { key: "ingBalans", label: "Ing. balans",    align: "right", format: "number", width: 14 },
    { key: "utgSaldo",  label: "Utg. saldo",     align: "right", format: "number", width: 14 },
    { key: "budget",    label: "Budget",         align: "right", format: "number", width: 12 },
    { key: "varKr",     label: "Avvik. kr",      align: "right", format: "number", width: 10 },
    { key: "varPct",    label: "%",              align: "right", format: "percent", width: 8 },
  ];
  return { columns, hasBudget, hasPY };
}

// ── Value extraction per account / aggregate ─────────────────────────
//
// The engine doesn't (yet) attach budget/PY directly per account row, but it
// does expose `layers` (budget/forecast) keyed by account number, and we can
// pull a previous-year ledger if it ever lands. Until then we read `meta`
// fields on the view (`meta.budget` map, `meta.previousYear` map) when
// present. Absent → columns are filtered out by `buildColumnLayout`.

interface ValueContext {
  layout: ColumnLayout;
  budgetMap?: Map<string, number>;       // accountNumber → period budget
  pyMap?: Map<string, number>;           // accountNumber → period prior year
}

function buildValueContext(
  report: FinancialReport,
  lens: "RR" | "BR",
): ValueContext {
  // Budget — read from layers if available
  let budgetMap: Map<string, number> | undefined;
  if (report.layers?.budget?.accounts) {
    const m = new Map<string, number>();
    for (const [acct, layer] of report.layers.budget.accounts) {
      const v = layer?.perioden ?? 0;
      if (Math.abs(v) >= ZERO_THRESHOLD) m.set(acct, v);
    }
    if (m.size > 0) budgetMap = m;
  }

  // Previous year — engine surface (kept optional; renderers must tolerate absence)
  const view = lens === "RR" ? report.views.incomeStatement : report.views.balanceSheet;
  const meta = (view.meta ?? {}) as { previousYear?: Record<string, number> };
  let pyMap: Map<string, number> | undefined;
  if (meta.previousYear) {
    const m = new Map<string, number>();
    for (const [k, v] of Object.entries(meta.previousYear)) {
      if (typeof v === "number" && Math.abs(v) >= ZERO_THRESHOLD) m.set(k, v);
    }
    if (m.size > 0) pyMap = m;
  }

  const layout = buildColumnLayout(!!budgetMap, !!pyMap);
  return { layout, budgetMap, pyMap };
}

/** Build numeric values[] in column order for a single account row.
 *  Always returns 6 numerics matching the locked 8-col grid (perioden, ib, ub, budget, varKr, varPct). */
function accountValues(a: ReportAccountRow, ctx: ValueContext): number[] {
  const period = a.perioden;
  const ib = a.ingBalans;
  const ub = a.utgBalans;

  const hasBudget = !!ctx.budgetMap;
  const budget = hasBudget ? (ctx.budgetMap!.get(a.accountNumber) ?? NaN) : NaN;
  const varKr = hasBudget && Number.isFinite(budget) ? period - budget : NaN;
  const varPct =
    hasBudget && Number.isFinite(budget) && budget !== 0
      ? varKr / Math.abs(budget)
      : NaN;

  return [period, ib, ub, budget, varKr, varPct];
}

/** Aggregate a list of accounts into one summed value array. */
function aggregateAccounts(accounts: ReportAccountRow[], ctx: ValueContext): number[] {
  const period = accounts.reduce((s, a) => s + a.perioden, 0);
  const ib = accounts.reduce((s, a) => s + a.ingBalans, 0);
  const ub = accounts.reduce((s, a) => s + a.utgBalans, 0);

  const hasBudget = !!ctx.budgetMap;
  let budget = NaN, varKr = NaN, varPct = NaN;
  if (hasBudget) {
    budget = accounts.reduce((s, a) => s + (ctx.budgetMap!.get(a.accountNumber) ?? 0), 0);
    varKr = period - budget;
    varPct = budget !== 0 ? varKr / Math.abs(budget) : NaN;
  }
  return [period, ib, ub, budget, varKr, varPct];
}

/** Build a values[] from a partial bag (period + utgSaldo only). */
function plainValues(period: number, utgSaldo: number, _ctx: ValueContext): number[] {
  return [period, utgSaldo, utgSaldo, NaN, NaN, NaN];
}

// ── Section emission with smart visibility ───────────────────────────
function emitSection(section: ReportSection, ctx: ValueContext, rows: StatementRow[]): {
  emitted: boolean;
  totals: number[]; // aggregated values for ALL non-zero accounts under this section
} {
  const allAccounts = collectSection(section);
  const nonZeroAccounts = allAccounts.filter(
    (a) => !isZeroAcross([a.perioden, a.utgBalans]),
  );
  if (nonZeroAccounts.length === 0) {
    return { emitted: false, totals: [] };
  }

  if (rows.length > 0) rows.push({ kind: "spacer" });
  rows.push({ kind: "section", label: section.title.toUpperCase() });

  // Direct accounts at section level (rare — flat sections)
  for (const a of section.accounts || []) {
    if (isZeroAcross([a.perioden, a.utgBalans])) continue;
    rows.push({
      kind: "account",
      code: a.accountNumber,
      label: a.accountName,
      values: accountValues(a, ctx),
    });
  }

  // Child groups (LEVEL 3)
  for (const g of section.children || []) {
    const groupAccounts = collectSection(g).filter(
      (a) => !isZeroAcross([a.perioden, a.utgBalans]),
    );
    if (groupAccounts.length === 0) continue;

    rows.push({ kind: "group", label: g.title });
    for (const a of groupAccounts) {
      rows.push({
        kind: "account",
        code: a.accountNumber,
        label: a.accountName,
        values: accountValues(a, ctx),
      });
    }
    if (g.subtotalLabel) {
      rows.push({
        kind: "subtotal",
        label: g.subtotalLabel,
        values: aggregateAccounts(groupAccounts, ctx),
      });
    }
  }

  // Section-level subtotal
  if (section.subtotalLabel) {
    rows.push({ kind: "spacer" });
    rows.push({
      kind: "subtotal",
      label: section.subtotalLabel,
      values: aggregateAccounts(nonZeroAccounts, ctx),
    });
  }

  return { emitted: true, totals: aggregateAccounts(nonZeroAccounts, ctx) };
}

// ── RR-specific computed subtotals (EBITDA, EBIT, etc.) ──────────────
function appendRRComputedTotals(
  report: FinancialReport,
  ctx: ValueContext,
  rows: StatementRow[],
) {
  const isRows = report.accounts.incomeStatement;

  const sumRange = (predicate: (n: string) => boolean): number[] => {
    const matched = isRows.filter((r) => predicate(r.accountNumber));
    if (matched.length === 0) return [];
    return aggregateAccounts(matched, ctx);
  };

  const revenue = sumRange((n) => n.startsWith("3"));
  const opCosts = sumRange((n) => /^[4-6]/.test(n) || /^7[0-6]/.test(n)); // exkl 77 (avskrivn)
  const depreciation = sumRange((n) => /^77/.test(n));
  const otherOpCosts = sumRange((n) => /^7[8-9]/.test(n));
  const finItems = sumRange((n) => /^8[0-4]/.test(n));
  const approp = sumRange((n) => /^88/.test(n));
  const tax = sumRange((n) => /^89/.test(n));

  const addVecs = (...vecs: number[][]): number[] => {
    const present = vecs.filter((v) => v.length > 0);
    if (present.length === 0) return [];
    return sumValueArrays(present);
  };

  // EBITDA = revenue + operating costs (excl depreciation) + other op costs
  const ebitda = addVecs(revenue, opCosts, otherOpCosts);
  if (ebitda.length > 0) {
    rows.push({ kind: "spacer" });
    rows.push({ kind: "subtotal", label: "EBITDA", values: ebitda });
  }

  // EBIT = EBITDA + depreciation
  const ebit = addVecs(ebitda, depreciation);
  if (ebit.length > 0 && depreciation.length > 0) {
    rows.push({ kind: "subtotal", label: "RÖRELSERESULTAT (EBIT)", values: ebit });
  }

  // Resultat efter finansiella poster
  const afterFin = addVecs(ebit.length > 0 ? ebit : ebitda, finItems);
  if (afterFin.length > 0 && finItems.length > 0) {
    rows.push({ kind: "subtotal", label: "Resultat efter finansiella poster", values: afterFin });
  }

  // Resultat före skatt = afterFin + bokslutsdispositioner
  const beforeTax = addVecs(afterFin.length > 0 ? afterFin : ebit.length > 0 ? ebit : ebitda, approp);
  if (beforeTax.length > 0 && approp.length > 0) {
    rows.push({ kind: "subtotal", label: "Resultat före skatt", values: beforeTax });
  }

  // Årets resultat = beforeTax + tax  (LEVEL-5 grand total)
  const finalBase = beforeTax.length > 0 ? beforeTax : afterFin.length > 0 ? afterFin : ebit.length > 0 ? ebit : ebitda;
  const yearResult = addVecs(finalBase, tax);
  if (yearResult.length > 0) {
    rows.push({ kind: "spacer" });
    rows.push({ kind: "total", label: "ÅRETS RESULTAT", values: yearResult });
  }
}

// ── Build entry points ───────────────────────────────────────────────
export function buildStatementDocument(
  report: FinancialReport,
  lens: "RR" | "BR",
): StatementDocument {
  const ctx = buildValueContext(report, lens);
  const view = lens === "RR" ? report.views.incomeStatement : report.views.balanceSheet;

  const rows: StatementRow[] = [];

  for (const section of view.sections) {
    emitSection(section, ctx, rows);
  }

  if (lens === "RR") {
    appendRRComputedTotals(report, ctx, rows);
  } else {
    // BR: explicit grand totals for both halves
    const meta = view.meta as { assetTotals?: { perioden: number; utgBalans: number }; liabTotals?: { perioden: number; utgBalans: number } };
    if (meta.assetTotals && meta.liabTotals) {
      rows.push({ kind: "spacer" });
      rows.push({
        kind: "total",
        label: "SUMMA TILLGÅNGAR",
        values: plainValues(meta.assetTotals.perioden, meta.assetTotals.utgBalans, ctx),
      });
      rows.push({ kind: "spacer" });
      rows.push({
        kind: "total",
        label: "SUMMA EGET KAPITAL OCH SKULDER",
        values: plainValues(meta.liabTotals.perioden, meta.liabTotals.utgBalans, ctx),
      });
    }
  }

  // Warnings
  const warnings: StatementDocument["warnings"] = [];
  if (lens === "BR" && !report.validation.balanced) {
    const diff = Math.abs(report.validation.imbalanceDiff).toLocaleString("sv-SE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    warnings.push({
      severity: "error",
      message: `Balansräkningen är inte i balans vid exporttillfället. Differens: ${diff} kr.`,
    });
  }

  return {
    header: {
      company: report.company.name,
      title: lens === "RR" ? "Resultaträkning" : "Balansräkning",
      period: `${formatDate(report.period.fromDate, "yyyy-MM-dd")} – ${formatDate(report.period.toDate, "yyyy-MM-dd")}`,
      generated: new Date(),
    },
    columns: ctx.layout.columns,
    rows,
    warnings,
    footer: { confidentiality: "Konfidentiellt · Genererad av Ledger.io" },
  };
}

/** Build BOTH documents at once (used by combined Excel/PDF pack). */
export function buildBothStatements(report: FinancialReport) {
  return {
    rr: buildStatementDocument(report, "RR"),
    br: buildStatementDocument(report, "BR"),
  };
}
