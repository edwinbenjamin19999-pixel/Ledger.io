/**
 * Standardised report columns. Both RR and BR share BASE_COLUMNS.
 * RR appends MARGIN_COLUMN. BR appends BALANCE_CHECK_COLUMN.
 *
 * Single source of truth for column structure across UI / PDF / Excel.
 */

export type ColumnAlign = "left" | "right";
export type ColumnFormat = "text" | "number" | "percent";

export interface ReportColumn {
  key: string;
  label: string;
  align: ColumnAlign;
  format: ColumnFormat;
  /** Tailwind width class (UI). */
  width?: string;
  /** Excel column width in characters. */
  excelWidth?: number;
  /** Whether the column is appended only to a specific view kind. */
  optional?: boolean;
}

export const BASE_COLUMNS: ReportColumn[] = [
  { key: "accountNumber", label: "Konto", align: "left", format: "text", width: "w-24", excelWidth: 14 },
  { key: "accountName", label: "Benämning", align: "left", format: "text", excelWidth: 42 },
  { key: "ingBalans", label: "Ing. balans", align: "right", format: "number", excelWidth: 16 },
  { key: "ingSaldo", label: "Ing. saldo", align: "right", format: "number", excelWidth: 16 },
  { key: "perioden", label: "Perioden", align: "right", format: "number", excelWidth: 16 },
  { key: "utgBalans", label: "Utg. balans", align: "right", format: "number", excelWidth: 16 },
];

export const MARGIN_COLUMN: ReportColumn = {
  key: "marginPct",
  label: "Marginal %",
  align: "right",
  format: "percent",
  width: "w-28",
  excelWidth: 14,
  optional: true,
};

export const BALANCE_CHECK_COLUMN: ReportColumn = {
  key: "balanceCheck",
  label: "Balans Δ",
  align: "right",
  format: "number",
  width: "w-24",
  excelWidth: 14,
  optional: true,
};

/**
 * IDENTICAL skeleton for RR and BR. Marginal % and Balans Δ are NOT table
 * columns — they live in the KPI header (marginal) and on the BR total row
 * (balans Δ inline badge). This guarantees pixel-identical column structure
 * across the two lenses.
 */
export const RR_COLUMNS: ReportColumn[] = [...BASE_COLUMNS];
export const BR_COLUMNS: ReportColumn[] = [...BASE_COLUMNS];
