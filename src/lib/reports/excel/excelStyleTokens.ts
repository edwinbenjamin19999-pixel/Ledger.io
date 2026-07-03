/**
 * Shared visual tokens for the Premium Excel Export Engine.
 * Mirror the on-screen design language: dark navy headers, light section bands,
 * bold subtotals, premium totals with thick borders, signal pastels.
 */
import type { Borders, Fill, Font } from "exceljs";

export const ARGB = {
  navy: "FF0F172A",
  slate500: "FF64748B",
  slate400: "FF94A3B8",
  slate200: "FFE2E8F0",
  slate100: "FFF1F5F9",
  slate50: "FFF8FAFC",
  white: "FFFFFFFF",
  cyan600: "FF0891B2",
  cyan50: "FFECFEFF",
  emerald50: "FFECFDF5",
  emerald600: "FF059669",
  amber50: "FFFFFBEB",
  amber600: "FFD97706",
  rose50: "FFFEE2E2",
  rose100: "FFFECACA",
  rose700: "FFB91C1C",
  rose900: "FF7F1D1D",
} as const;

export const NUM_FMT = {
  number: '#,##0;[Red](#,##0);"–"',
  percent: '0.0%;[Red](0.0%);"–"',
  date: "yyyy-mm-dd",
} as const;

export const FONTS = {
  base: { name: "Calibri", size: 10, color: { argb: ARGB.navy } } as Partial<Font>,
  title: { name: "Calibri", size: 18, bold: true, color: { argb: ARGB.navy } } as Partial<Font>,
  subtitle: { name: "Calibri", size: 11, color: { argb: ARGB.slate500 } } as Partial<Font>,
  meta: { name: "Calibri", size: 9, italic: true, color: { argb: ARGB.slate400 } } as Partial<Font>,
  header: { name: "Calibri", size: 9, bold: true, color: { argb: ARGB.white } } as Partial<Font>,
  section: { name: "Calibri", size: 11, bold: true, color: { argb: ARGB.navy } } as Partial<Font>,
  subtotal: { name: "Calibri", size: 10, bold: true, color: { argb: ARGB.navy } } as Partial<Font>,
  total: { name: "Calibri", size: 11, bold: true, color: { argb: ARGB.navy } } as Partial<Font>,
  warningBold: { name: "Calibri", size: 10, bold: true, color: { argb: ARGB.rose900 } } as Partial<Font>,
} as const;

export const FILLS: Record<string, Fill> = {
  headerBand: { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.navy } },
  sectionBand: { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.slate50 } },
  subtotalBand: { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.slate100 } },
  warningBand: { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.rose50 } },
  okBand: { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.emerald50 } },
  cyanBand: { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.cyan50 } },
  amberBand: { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.amber50 } },
};

export const BORDERS: Record<string, Partial<Borders>> = {
  totalRow: {
    top: { style: "medium", color: { argb: ARGB.navy } },
    bottom: { style: "medium", color: { argb: ARGB.navy } },
  },
  subtotalRow: { top: { style: "thin", color: { argb: ARGB.slate200 } } },
  headerRow: { bottom: { style: "thin", color: { argb: ARGB.slate200 } } },
};

export function severityFill(sev: "critical" | "warning" | "info"): Fill {
  if (sev === "critical") return FILLS.warningBand;
  if (sev === "warning") return FILLS.amberBand;
  return FILLS.cyanBand;
}

export function severityLabel(sev: "critical" | "warning" | "info"): string {
  return sev === "critical" ? "Kritisk" : sev === "warning" ? "Varning" : "Info";
}
