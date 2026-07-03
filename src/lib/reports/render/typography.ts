/**
 * Shared typography + layout tokens for the Premium Statement Renderer.
 * One source of truth — used by BOTH the PDF renderer and the Excel renderer
 * so RR and BR look like sister documents in any format.
 *
 * LEVEL 1 — Document title (Resultaträkning / Balansräkning)
 * LEVEL 2 — Section headers (RÖRELSEINTÄKTER, TILLGÅNGAR …)  uppercase
 * LEVEL 3 — Group headers (Nettoomsättning, Kortfristiga fordringar)
 * LEVEL 4 — Account rows (3041 Försäljning …)
 * LEVEL 5 — Subtotals + Grand totals (bold + rules)
 */

// ──────────────────────────────────────────────────────────────
// PDF (jsPDF — points / RGB)
// ──────────────────────────────────────────────────────────────

export const PDF_COLOR = {
  slate900: [15, 23, 42] as [number, number, number],
  slate800: [30, 41, 59] as [number, number, number],
  slate700: [51, 65, 85] as [number, number, number],
  slate600: [71, 85, 105] as [number, number, number],
  slate500: [100, 116, 139] as [number, number, number],
  slate400: [148, 163, 184] as [number, number, number],
  slate300: [203, 213, 225] as [number, number, number],
  slate200: [226, 232, 240] as [number, number, number],
  slate100: [241, 245, 249] as [number, number, number],
  slate50: [248, 250, 252] as [number, number, number],
  rose700: [190, 18, 60] as [number, number, number],
  amber50: [255, 251, 235] as [number, number, number],
  amber700: [180, 83, 9] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

// A4 dimensions in points
export const A4_PORTRAIT = { width: 595.28, height: 841.89 };
export const A4_LANDSCAPE = { width: 841.89, height: 595.28 };

export const PDF_LAYOUT = {
  page: A4_PORTRAIT, // legacy — kept for backwards compat
  margin: { top: 72, right: 48, bottom: 64, left: 48 },
  // Heights of various line types
  h: {
    title: 28,
    period: 18,
    columnHeader: 22,
    section: 26,        // LEVEL 2
    sectionTopGap: 14,
    group: 18,          // LEVEL 3
    groupTopGap: 8,
    account: 16,        // LEVEL 4
    subtotal: 20,       // LEVEL 5 subtotal
    subtotalTopGap: 4,
    total: 26,          // LEVEL 5 grand total
    totalTopGap: 12,
    spacer: 6,
    warningBand: 28,
  },
  // Font sizes
  fs: {
    title: 18,
    period: 10,
    company: 11,
    columnHeader: 8,
    section: 11,
    group: 10,
    account: 9.5,
    subtotal: 10,
    total: 11,
    footer: 8,
    warning: 9,
  },
  // Indentation in points for first text column
  indent: {
    section: 0,
    group: 14,
    account: 26,
    subtotal: 14,
    total: 0,
  },
};

// ──────────────────────────────────────────────────────────────
// EXCEL (ExcelJS — ARGB strings + char widths)
// ──────────────────────────────────────────────────────────────

export const XLSX_COLOR = {
  navy: "FF0F172A",
  slate800: "FF1E293B",
  slate700: "FF334155",
  slate600: "FF475569",
  slate500: "FF64748B",
  slate400: "FF94A3B8",
  slate300: "FFCBD5E1",
  slate200: "FFE2E8F0",
  slate100: "FFF1F5F9",
  slate50: "FFF8FAFC",
  rose50: "FFFEE2E2",
  rose700: "FFB91C1C",
  emerald50: "FFECFDF5",
  emerald700: "FF047857",
  amber50: "FFFFFBEB",
  amber700: "FFB45309",
  white: "FFFFFFFF",
} as const;

export const XLSX_NUMFMT = {
  number: '#,##0.00;-#,##0.00;"–"',
  percent: '0.0%;-0.0%;"–"',
} as const;

// ──────────────────────────────────────────────────────────────
// UNIFIED PDF DESIGN SYSTEM (RR + BR sister documents)
// ──────────────────────────────────────────────────────────────

/** Typography levels L1–L6 — identical in RR and BR. */
export const PDF_TYPE = {
  L1_title:    { size: 13,  weight: "bold"   as const, color: "slate900" as const, transform: "none"  as const },
  L2_section:  { size: 9.5, weight: "bold"   as const, color: "slate900" as const, transform: "upper" as const, tracking: 0.8 },
  L3_group:    { size: 9,   weight: "bold"   as const, color: "slate700" as const, transform: "none"  as const },
  L4_account:  { size: 9,   weight: "normal" as const, color: "slate500" as const, transform: "none"  as const },
  L4_value:    { size: 9,   weight: "normal" as const, color: "slate800" as const, transform: "none"  as const },
  L5_subtotal: { size: 9.5, weight: "bold"   as const, color: "slate900" as const, transform: "none"  as const },
  L6_total:    { size: 11,  weight: "bold"   as const, color: "slate900" as const, transform: "upper" as const, tracking: 1.0 },
  meta:        { size: 8.5, weight: "normal" as const, color: "slate600" as const, transform: "none"  as const },
  micro:       { size: 7,   weight: "normal" as const, color: "slate500" as const, transform: "upper" as const, tracking: 0.6 },
  footer:      { size: 7.5, weight: "normal" as const, color: "slate400" as const, transform: "none"  as const },
};

/** Vertical rhythm — tight print density (Big4-grade accounting). */
export const PDF_SPACING = {
  rowH:        10,
  groupH:      12,
  sectionH:    14,
  subtotalH:   13,
  totalH:      18,
  spacer:      2,
  sectionGap:  6,
  groupGap:    2,
  beforeTotal: 2,
  afterTotal:  2,
  headerGap:   8,
  bodyGap:     3,
};

/**
 * Unified PDF column grid — landscape A4, full-width 8-column accounting layout.
 * Percentages sum to 100 → renderer scales to actual content width (mm or pt).
 * Order MUST match the StatementDocument column order produced by buildColumnLayout.
 */
export const PDF_COLUMNS = [
  { key: "code",     label: "Konto",          align: "left"  as const, format: "text"    as const, pct: 0.07 },
  { key: "label",    label: "Benämning",      align: "left"  as const, format: "text"    as const, pct: 0.27 },
  { key: "perioden", label: "Perioden",       align: "right" as const, format: "number"  as const, pct: 0.11 },
  { key: "utgSaldo", label: "Utg. saldo",     align: "right" as const, format: "number"  as const, pct: 0.11 },
  { key: "budget",   label: "Budget",         align: "right" as const, format: "number"  as const, pct: 0.11 },
  { key: "varKr",    label: "Avvikelse (kr)", align: "right" as const, format: "number"  as const, pct: 0.10 },
  { key: "varPct",   label: "Avvikelse (%)",  align: "right" as const, format: "percent" as const, pct: 0.06 },
  { key: "py",       label: "Föregående år",  align: "right" as const, format: "number"  as const, pct: 0.10 },
  { key: "pyPct",    label: "Föreg. år (%)",  align: "right" as const, format: "percent" as const, pct: 0.07 },
];

export const PDF_RULE = {
  hairline:   { width: 0.4, color: "slate200" as const },
  divider:    { width: 0.6, color: "slate300" as const },
  subtotal:   { width: 0.6, color: "slate400" as const },
  total:      { width: 1.2, color: "slate900" as const },
  totalUnder: { width: 0.4, color: "slate900" as const },
};

/**
 * Unified number formatter (RR + BR).
 * Positive: 1 234,56 — Negative: (1 234,56) accounting style — Zero/NaN: –
 */
export function formatPdfNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "–";
  if (Math.abs(n) < 0.005) return "–";
  const abs = Math.abs(n).toLocaleString("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return n < 0 ? `(${abs})` : abs;
}

export function formatPdfPercent(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "–";
  if (Math.abs(n) < 0.0005) return "–";
  const abs = (Math.abs(n) * 100).toLocaleString("sv-SE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return n < 0 ? `(${abs} %)` : `${abs} %`;
}
