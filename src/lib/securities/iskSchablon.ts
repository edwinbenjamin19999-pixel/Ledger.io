/**
 * ISK Schablonskatt — Investeringssparkonto
 *
 * Formel:
 *   Kapitalunderlag = (IB + UT + insättningar) / 4
 *   Schablonintäkt = Kapitalunderlag × max(SLR(30 nov föregående år) + 1pp, 1,25%)
 *   Skatt = Schablonintäkt × 30%
 *
 * SLR (statslåneräntan 30 november):
 *   2024: 2,62% → 2025-skatt: 3,62% (golv slår inte in)
 *   2023: 2,62% → 2024-skatt: 3,62%
 *   2022: 1,94% → 2023-skatt: 2,94%
 *   2021: 0,23% → 2022-skatt: 1,25% (golv)
 *   2020: -0,10% → 2021-skatt: 1,25% (golv)
 */

const SLR_30_NOV: Record<number, number> = {
  2020: -0.0010,
  2021: 0.0023,
  2022: 0.0194,
  2023: 0.0262,
  2024: 0.0262,
};

const FLOOR = 0.0125; // 1,25%
const TAX_RATE = 0.30; // 30%

export interface ISKQuarterlyData {
  q1: number; // Värde 1 jan
  q2: number; // Värde 1 apr
  q3: number; // Värde 1 jul
  q4: number; // Värde 1 okt
  deposits: number; // Insättningar + överföringar in under året
}

export interface ISKSchablonResult {
  taxYear: number;
  capitalBase: number;
  schablonRate: number;
  schablonIncome: number;
  taxRate: number;
  taxAmount: number;
  slrUsed: number;
  floorApplied: boolean;
  breakdown: {
    quarterlySum: number;
    deposits: number;
  };
}

export function calculateISKSchablon(
  data: ISKQuarterlyData,
  taxYear: number,
): ISKSchablonResult {
  const slrYear = taxYear - 1;
  const slr = SLR_30_NOV[slrYear] ?? 0.0262;
  const rawRate = slr + 0.01;
  const schablonRate = Math.max(rawRate, FLOOR);
  const floorApplied = rawRate < FLOOR;

  const quarterlySum = data.q1 + data.q2 + data.q3 + data.q4;
  const capitalBase = (quarterlySum + data.deposits) / 4;
  const schablonIncome = capitalBase * schablonRate;
  const taxAmount = schablonIncome * TAX_RATE;

  return {
    taxYear,
    capitalBase: Math.round(capitalBase),
    schablonRate,
    schablonIncome: Math.round(schablonIncome),
    taxRate: TAX_RATE,
    taxAmount: Math.round(taxAmount),
    slrUsed: slr,
    floorApplied,
    breakdown: {
      quarterlySum,
      deposits: data.deposits,
    },
  };
}

export function getSchablonRateForYear(taxYear: number): number {
  const slr = SLR_30_NOV[taxYear - 1] ?? 0.0262;
  return Math.max(slr + 0.01, FLOOR);
}
