/**
 * Depå i Aktiebolag — näringsbetingade andelar
 *
 * Skatteregler:
 * - Innehav ≥10% (eller röstmajoritet): näringsbetingade → reavinst & utdelning skattefria
 * - Innehav <10% (kapitalplaceringar): beskattas som vanlig bolagsinkomst (20,6%)
 * - Marknadsnoterade aktier i AB: oftast kapitalplaceringar
 */

export interface DepotABHolding {
  isin: string;
  name: string;
  quantity: number;
  ownershipPct: number; // % av totalt antal aktier i bolaget
  isMarketListed: boolean;
}

export interface DepotABTaxStatus {
  isin: string;
  classification: 'naringsbetingad' | 'kapitalplacering';
  taxRate: number; // 0 om näringsbetingad, 0.206 om kapitalplacering
  reasoning: string;
}

export function classifyDepotABHolding(holding: DepotABHolding): DepotABTaxStatus {
  // Onoterad eller ≥10% innehav = näringsbetingad → skattefri
  if (!holding.isMarketListed || holding.ownershipPct >= 10) {
    return {
      isin: holding.isin,
      classification: 'naringsbetingad',
      taxRate: 0,
      reasoning: holding.isMarketListed
        ? `Marknadsnoterad med ${holding.ownershipPct.toFixed(1)}% innehav (≥10%) — näringsbetingad andel, skattefri.`
        : 'Onoterad andel — näringsbetingad, skattefri reavinst & utdelning.',
    };
  }

  return {
    isin: holding.isin,
    classification: 'kapitalplacering',
    taxRate: 0.206,
    reasoning: `Marknadsnoterad med ${holding.ownershipPct.toFixed(1)}% innehav (<10%) — kapitalplacering, beskattas som bolagsinkomst (20,6%).`,
  };
}

/**
 * BAS-konton för värdepapper i AB:
 * - 1350 Andelar i andra företag (långsiktiga)
 * - 1810 Andelar i börsnoterade företag (kortsiktiga placeringar)
 * - 8220 Resultat vid försäljning av värdepapper (långsiktiga)
 * - 8221 Resultat vid försäljning av kortfristiga placeringar
 * - 8254 Erhållna utdelningar från andra företag
 */
export const DEPOT_AB_ACCOUNTS = {
  longTermHoldings: '1350',
  shortTermHoldings: '1810',
  saleResultLong: '8220',
  saleResultShort: '8221',
  dividendIncome: '8254',
  fxResult: '8230',
} as const;
