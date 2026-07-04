/**
 * Single source of truth for row signal colors across web, PDF and Excel.
 * Keep these three representations in lock-step.
 */
import type { RowSignal } from "./types";

export interface SignalTokens {
  /** Tailwind classes for left edge (3px line) */
  edgeClass: string;
  /** Tailwind classes for row background tint (2-4% opacity) */
  tintClass: string;
  /** Tailwind classes for inline icon */
  iconClass: string;
  /** RGB triplet for jsPDF (left edge line) */
  pdfRgb: [number, number, number];
  /** ARGB hex for ExcelJS cell fill (very light pastel) */
  excelArgb: string;
}

export const SIGNAL_TOKENS: Record<RowSignal, SignalTokens> = {
  positive: {
    edgeClass: "before:bg-emerald-500/60",
    tintClass: "bg-emerald-500/[0.025] dark:bg-emerald-500/[0.05]",
    iconClass: "text-emerald-600 dark:text-[#1D9E75]",
    pdfRgb: [16, 185, 129],
    excelArgb: "FFF0FDF4",
  },
  negative: {
    edgeClass: "before:bg-rose-500/60",
    tintClass: "bg-rose-500/[0.025] dark:bg-rose-500/[0.05]",
    iconClass: "text-rose-600 dark:text-[#C73838]",
    pdfRgb: [225, 29, 72],
    excelArgb: "FFFEF2F2",
  },
  warning: {
    edgeClass: "before:bg-amber-500/70",
    tintClass: "bg-amber-500/[0.03] dark:bg-amber-500/[0.06]",
    iconClass: "text-amber-600 dark:text-[#C28A2B]",
    pdfRgb: [217, 119, 6],
    excelArgb: "FFFFFBEB",
  },
  anomaly: {
    edgeClass: "before:bg-purple-500/60",
    tintClass: "bg-purple-500/[0.025] dark:bg-purple-500/[0.05]",
    iconClass: "text-purple-600 dark:text-[#1E3A5F]",
    pdfRgb: [147, 51, 234],
    excelArgb: "FFFAF5FF",
  },
};

export const getSignalTokens = (signal?: RowSignal): SignalTokens | null =>
  signal ? SIGNAL_TOKENS[signal] : null;
