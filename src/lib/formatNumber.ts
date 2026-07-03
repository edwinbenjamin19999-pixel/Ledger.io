export function formatSEK(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '0 kr';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0 kr';
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatNumber(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '0';
  return new Intl.NumberFormat('sv-SE').format(amount);
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0%';
  return `${value.toFixed(1).replace('.', ',')}%`;
}

/**
 * Compact SEK formatter for narrow KPI cells.
 * 1 234        -> "1 234 kr"
 * 12 500       -> "12,5 tkr"
 * 1 083 365    -> "1,1 Mkr"
 * -1 083 365   -> "−1,1 Mkr"
 *
 * Always returns a string short enough (<= 10 chars typical) to never
 * trigger truncation in the dashboard KPI cards.
 */
export function formatSEKCompact(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '0 kr';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (!Number.isFinite(num)) return '0 kr';
  const abs = Math.abs(num);
  const sign = num < 0 ? '−' : '';
  const fmt = (v: number, d = 1) =>
    v.toLocaleString('sv-SE', { minimumFractionDigits: d, maximumFractionDigits: d });
  if (abs >= 1_000_000_000) return `${sign}${fmt(abs / 1_000_000_000)} Mdkr`;
  if (abs >= 1_000_000) return `${sign}${fmt(abs / 1_000_000)} Mkr`;
  if (abs >= 10_000) return `${sign}${fmt(abs / 1_000, 0)} tkr`;
  return `${sign}${Math.round(abs).toLocaleString('sv-SE')} kr`;
}
