/**
 * Shared data shapes for the unified Financial Report table system.
 * RR and BR consume the SAME types — only the `columns` array differs
 * (RR adds an optional `margin` column when `showMarginColumn` is true).
 */

export type RowVariant = "section" | "subcategory" | "account" | "total";

export type RowTone = "default" | "negative" | "positive" | "muted";

/** Subtle row-level performance signal (opt-in). Renders as edge + tint + icon. */
export type RowSignal = "positive" | "negative" | "warning" | "anomaly";

export interface FinancialColumn {
  key: string;
  label: string;
  align?: "left" | "right";
  /** Tailwind width class, e.g. "w-32" */
  width?: string;
  format?: "number" | "percent" | "text";
}

export interface FinancialRowData {
  id: string;
  variant: RowVariant;
  /** null cells render as em-dash. */
  cells: Record<string, number | string | null>;
  /** Indent steps applied to the first text cell (subcategory/account). */
  indent?: 0 | 1 | 2;
  /** Optional accent for total/section rows. */
  tone?: RowTone;
  /** Optional click handler (e.g. drill-down). */
  onClick?: () => void;
  /** Subtle performance signal (edge + tint + icon, opt-in). */
  signal?: RowSignal;
  /** Reason text shown on hover (native title attribute). */
  signalReason?: string;
}
