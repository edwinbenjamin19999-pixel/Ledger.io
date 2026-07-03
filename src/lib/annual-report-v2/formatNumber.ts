/**
 * Number formatting helpers for the Annual Report v2 RR/BR tables.
 * Spec:
 *   - sv-SE locale, space thousands separator, no decimals (whole kr).
 *   - Negative numbers use the proper minus glyph "−" (U+2212), not "-".
 *   - Zero (or |x| < 0.5) renders as the em-dash placeholder "—".
 *   - RR cost lines: render the value as a negative number.
 *   - BR lines: always positive (callers pass already-display-positive values
 *     for assets / liabilities; equity may be negative if deficit — that case
 *     keeps its sign).
 */

const NBSP = "\u00A0";
const MINUS = "\u2212";
const EMPTY = "—";

function formatAbs(n: number): string {
  return Math.round(Math.abs(n))
    .toLocaleString("sv-SE")
    .replace(/\s/g, NBSP);
}

/** Generic signed integer kr (no suffix). */
export function formatKr(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return EMPTY;
  if (Math.abs(n) < 0.5) return EMPTY;
  return n < 0 ? `${MINUS}${formatAbs(n)}` : formatAbs(n);
}

/** Force positive display (used for BR asset / liability rows).
 *  If the underlying value is negative (genuine deficit), the sign is preserved
 *  ONLY for equity (caller controls this by choosing which formatter). */
export function formatKrPositive(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return EMPTY;
  if (Math.abs(n) < 0.5) return EMPTY;
  return formatAbs(n);
}

/** Cost line — always render negative when value is positive (inverts sign).
 *  If value already negative (i.e. credited cost reversal), still show as negative. */
export function formatKrCost(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return EMPTY;
  if (Math.abs(n) < 0.5) return EMPTY;
  return `${MINUS}${formatAbs(n)}`;
}
