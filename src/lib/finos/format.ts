/** FinOS — shared formatting helpers. Keep tabular-nums everywhere financial. */
export function formatSEK(n?: number): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const abs = Math.abs(Math.round(n));
  return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(abs) + " kr";
}

export function formatSignedSEK(n?: number): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const sign = n < 0 ? "−" : "+";
  return `${sign}${formatSEK(n)}`;
}

export function formatConfidence(c?: number): string {
  if (c == null) return "—";
  return `${Math.round(c * 100)}%`;
}
