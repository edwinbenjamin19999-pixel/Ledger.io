/**
 * Report Design Tokens — Unified system for RR + BR + future reports.
 * Use these constants instead of arbitrary Tailwind values to keep
 * the entire reporting surface consistent.
 */

export const reportColors = {
  bgCanvas: "#F5F7FB",
  bgSurface: "#FFFFFF",
  bgSurfaceSoft: "#F8FAFC",
  bgSurfaceElevated: "#F1F5F9",
  bgSection: "#FCFDFE",
  bgSubcategory: "#FAFBFC",
  borderSoft: "rgba(15,23,42,0.06)",
  borderRow: "rgb(241,245,249)",
  textPrimary: "#0F172A",
  textSecondary: "#64748B",
  textMuted: "#94A3B8",
  textBody: "#334155",
  success: "#16A34A",
  warning: "#D97706",
  danger: "#DC2626",
  accent: "#2563EB",
} as const;

export const reportSpacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  "2xl": 40,
} as const;

export const reportRadius = {
  sm: 12,
  md: 16,
  lg: 20,
} as const;

export const reportShadow = {
  soft: "0 4px 12px rgba(15,23,42,0.04)",
  medium: "0 8px 24px rgba(15,23,42,0.05)",
  elevated: "0 12px 30px rgba(15,23,42,0.07)",
  card: "0 10px 30px rgba(15,23,42,0.04)",
} as const;

export const reportTypography = {
  reportTitle: "text-[20px] font-medium text-[#0F172A] tracking-tight",
  sectionLabel: "text-[12px] font-semibold text-[#0F172A] uppercase tracking-wider",
  subLabel: "text-[13px] font-medium text-[#334155]",
  body: "text-[13px] font-normal text-[#334155]",
  metric: "text-[22px] font-medium text-[#0F172A] tabular-nums leading-none",
  tableHeader:
    "text-[10px] font-semibold text-[#64748B] uppercase tracking-[0.12em]",
  numeric: "tabular-nums font-medium text-[13px] text-right",
} as const;

/** Class strings for the unified report card shell. */
export const reportShellClasses = {
  card: "bg-white dark:bg-card rounded-ds-card border-0.5 border-ds-border dark:border-slate-800 overflow-hidden",
  header:
    "bg-white dark:bg-card px-5 py-3 border-b border-0.5 border-ds-border dark:border-slate-800 flex items-center justify-between flex-wrap gap-3 min-h-[56px]",
  title: "font-medium text-[15px] text-[#0F172A] dark:text-foreground leading-tight",
  subtitle: "text-[12px] text-[#94A3B8] mt-0.5",
};
