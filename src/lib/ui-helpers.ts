/**
 * Shared UI formatting helpers for KPI trends, relative time, and value safety.
 * Used across Reports, Dashboard, Bank and notification surfaces.
 */

export type TrendArrow = "up" | "down" | "flat";

export interface FormattedTrend {
  arrow: TrendArrow;
  /** Display string with sign + 1 decimal, e.g. "+12.4%", "−3.0%", "0%". */
  text: string;
  /** Tone for color mapping. */
  tone: "positive" | "negative" | "neutral";
  /** Convenience flag — true only when delta is a finite non-zero number. */
  hasChange: boolean;
}

/**
 * Format a percentage delta into a consistent {arrow, text, tone}.
 * - delta > 0 → ↑ +X% (positive)
 * - delta < 0 → ↓ −X% (negative)  ← uses real minus sign
 * - delta === 0 / null / NaN / Infinity → — 0% (neutral, no arrow)
 */
export function formatTrend(delta: number | null | undefined): FormattedTrend {
  if (delta == null || !Number.isFinite(delta) || delta === 0) {
    return { arrow: "flat", text: "0%", tone: "neutral", hasChange: false };
  }
  const positive = delta > 0;
  const abs = Math.abs(delta).toFixed(1);
  return {
    arrow: positive ? "up" : "down",
    text: positive ? `+${abs}%` : `−${abs}%`,
    tone: positive ? "positive" : "negative",
    hasChange: true,
  };
}

/**
 * Live relative-day formatter for notification deadlines.
 * Recomputed on every render — never stored as a frozen string.
 *
 * Returns Swedish phrasing, e.g. "om 5 dagar", "imorgon", "idag",
 * "igår", "för 3 dagar sedan".
 */
export function formatRelativeDays(
  target: string | Date | null | undefined,
  now: Date = new Date(),
): string {
  if (!target) return "";
  const d = target instanceof Date ? target : new Date(target);
  if (Number.isNaN(d.getTime())) return "";

  // Compare on date boundaries (strip time of day) to avoid "om 0 dagar".
  const startOfDay = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffMs = startOfDay(d) - startOfDay(now);
  const diffDays = Math.round(diffMs / 86_400_000);

  if (diffDays === 0) return "idag";
  if (diffDays === 1) return "imorgon";
  if (diffDays === -1) return "igår";
  if (diffDays > 1) return `om ${diffDays} dagar`;
  return `för ${Math.abs(diffDays)} dagar sedan`;
}

/** Safe progress value for shadcn `<Progress>` — returns 0 instead of undefined. */
export function safeProgressValue(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

/** "12.3 %" or "—" if value isn't a finite number. */
export function formatPercent(
  value: number | null | undefined,
  decimals = 0,
): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(decimals)} %`;
}
