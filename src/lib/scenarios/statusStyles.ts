/**
 * Semantic status styles for scenario / forecast / follow-up surfaces.
 *
 * Always prefer these helpers over hard-coded `bg-emerald-50` / `text-rose-700` etc.
 * They route through the design-system tokens defined in `index.css` so the
 * components automatically respect light / dark / brand themes.
 */

export type StatusTone = "positive" | "negative" | "warning" | "ai" | "neutral";

export const STATUS_STYLES: Record<StatusTone, string> = {
  positive: "bg-success/10 text-success border-success/20",
  negative: "bg-destructive/10 text-destructive border-destructive/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  ai: "bg-primary/10 text-primary border-primary/20",
  neutral: "bg-muted text-muted-foreground border-border",
};

export const STATUS_TEXT: Record<StatusTone, string> = {
  positive: "text-success",
  negative: "text-destructive",
  warning: "text-warning",
  ai: "text-primary",
  neutral: "text-muted-foreground",
};

export const STATUS_ICON: Record<StatusTone, string> = {
  positive: "text-success",
  negative: "text-destructive",
  warning: "text-warning",
  ai: "text-primary",
  neutral: "text-muted-foreground",
};

export function toneFromScore(score: number, opts?: { goodAbove?: number; warnAbove?: number }): StatusTone {
  const good = opts?.goodAbove ?? 75;
  const warn = opts?.warnAbove ?? 50;
  if (score >= good) return "positive";
  if (score >= warn) return "warning";
  return "negative";
}
