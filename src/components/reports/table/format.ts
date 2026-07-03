/**
 * Formatting helpers for the unified Financial Report table.
 * All numeric output goes through here so the entire reporting surface
 * shares a single representation (no font-mono leaks, no rogue fallbacks).
 */

export const EMPTY_DASH = "–";

/** Format a number sv-SE, 2 decimals, minus sign for negatives. */
export const formatNumber = (n: number | null | undefined): string => {
  if (n === null || n === undefined || Number.isNaN(n)) return EMPTY_DASH;
  if (Math.abs(n) < 0.005) return EMPTY_DASH;
  return n.toLocaleString("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/** Format a percent value with minus sign for negatives. */
export const formatPercent = (n: number | null | undefined): string => {
  if (n === null || n === undefined || Number.isNaN(n)) return EMPTY_DASH;
  return `${n.toFixed(1).replace(".", ",")}%`;
};

/** Compact format for KPI cards (>= 1 000 000 → "1,1 mkr"). */
export const formatCompactSEK = (n: number | null | undefined): string => {
  if (n === null || n === undefined || Number.isNaN(n)) return EMPTY_DASH;
  const abs = Math.abs(n);
  if (abs >= 1_000_000) {
    const mkr = (n / 1_000_000).toLocaleString("sv-SE", {
      maximumFractionDigits: 1,
    });
    return `${mkr} mkr`;
  }
  return `${n.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr`;
};

export const formatFullSEK = (n: number | null | undefined): string => {
  if (n === null || n === undefined || Number.isNaN(n)) return EMPTY_DASH;
  return `${n.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr`;
};
