/**
 * Kapitalförsäkring (KF) — endast värdetracking.
 * Försäkringsbolaget hanterar avkastningsskatten — bolaget bokför bara värdet.
 *
 * Avkastningsskatt KF (informationsändamål):
 *   Kapitalunderlag × (SLR + 1pp, golv 1,25%) × 30%
 *   Identisk formel med ISK men dras direkt av försäkringsbolaget.
 */

export interface KFTrackingResult {
  accountId: string;
  currentValue: number;
  ytdReturn: number;
  ytdReturnPct: number;
  estimatedYearlyTax: number; // Informationsändamål — dras av försäkringsbolaget
  note: string;
}

export function trackKF(
  accountId: string,
  openingBalance: number,
  currentValue: number,
  taxYear: number,
): KFTrackingResult {
  const ytdReturn = currentValue - openingBalance;
  const ytdReturnPct = openingBalance > 0 ? (ytdReturn / openingBalance) * 100 : 0;
  const slr = 0.0262; // 30 nov 2024
  const rate = Math.max(slr + 0.01, 0.0125);
  const estimatedYearlyTax = Math.round(currentValue * rate * 0.30);

  return {
    accountId,
    currentValue,
    ytdReturn,
    ytdReturnPct,
    estimatedYearlyTax,
    note: 'Avkastningsskatt dras automatiskt av försäkringsbolaget. KF bokförs på konto 1385.',
  };
}
