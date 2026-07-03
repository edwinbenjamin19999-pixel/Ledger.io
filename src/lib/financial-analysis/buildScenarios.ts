import type { VarianceRow, KPIMetric } from "@/components/financial-analysis/types";

export interface ScenarioResult {
  key: 'base' | 'improved' | 'worst';
  label: string;
  profit: number;
  profitDelta: number;
  cash: number;
  cashDelta: number;
  runwayDays: number;
  runwayDelta: number;
  assumptions: string[];
}

interface BuildArgs {
  rows: VarianceRow[];
  kpis: KPIMetric[];
  /** Sum of expected_impact_sek for accepted AI suggestions (positive = profit improvement). */
  acceptedImpactSEK: number;
  /** Current cash balance for runway baseline (SEK). */
  currentCash: number;
  /** Average monthly burn (positive number, SEK/month). */
  monthlyBurn: number;
  /** "3" or "12" months perspective. */
  horizonMonths: 3 | 12;
}

const DAYS_PER_MONTH = 30;

function safeRunwayDays(cash: number, burn: number): number {
  if (burn <= 0) return 9999;
  return Math.round((cash / burn) * DAYS_PER_MONTH);
}

export function buildScenarios({
  rows, kpis, acceptedImpactSEK, currentCash, monthlyBurn, horizonMonths,
}: BuildArgs): ScenarioResult[] {
  const ebit = kpis.find(k => k.label === 'EBIT');
  const revenue = kpis.find(k => k.label === 'Intäkter');
  const costs = kpis.find(k => k.label === 'Kostnader');
  const baseProfit = ebit?.actual ?? 0;
  const baseCash = currentCash;
  const baseRunway = safeRunwayDays(baseCash, monthlyBurn);
  const horizonScale = horizonMonths === 12 ? 4 : 1;

  // Improved = base + accepted AI impact (extrapolated to horizon)
  const improvedProfit = baseProfit + acceptedImpactSEK * horizonScale;
  const improvedCash = baseCash + acceptedImpactSEK * horizonScale;
  const improvedRunway = safeRunwayDays(improvedCash, Math.max(monthlyBurn - acceptedImpactSEK / horizonScale / 1, 1));

  // Worst = revenue −10%, cost +5%, top driver loss
  const worstRevenueLoss = (revenue?.actual ?? 0) * 0.10;
  const worstCostIncrease = (costs?.actual ?? 0) * 0.05;
  const worstHit = (worstRevenueLoss + worstCostIncrease) * horizonScale;
  const worstProfit = baseProfit - worstHit;
  const worstCash = baseCash - worstHit;
  const worstRunway = safeRunwayDays(worstCash, monthlyBurn * 1.05);

  return [
    {
      key: 'base',
      label: 'Bas',
      profit: baseProfit,
      profitDelta: 0,
      cash: baseCash,
      cashDelta: 0,
      runwayDays: baseRunway,
      runwayDelta: 0,
      assumptions: [
        'Nuvarande utfall fortsätter linjärt',
        'Inga nya åtgärder vidtas',
        `${horizonMonths} månaders fönster`,
      ],
    },
    {
      key: 'improved',
      label: 'Förbättrad',
      profit: improvedProfit,
      profitDelta: improvedProfit - baseProfit,
      cash: improvedCash,
      cashDelta: improvedCash - baseCash,
      runwayDays: improvedRunway,
      runwayDelta: improvedRunway - baseRunway,
      assumptions: [
        `${acceptedImpactSEK >= 0 ? 'Förbättring' : 'Försämring'} via accepterade AI-förslag`,
        'Åtgärder verkställs inom 30 dagar',
        'Ingen volatilitet i övriga poster',
      ],
    },
    {
      key: 'worst',
      label: 'Värsta',
      profit: worstProfit,
      profitDelta: worstProfit - baseProfit,
      cash: worstCash,
      cashDelta: worstCash - baseCash,
      runwayDays: worstRunway,
      runwayDelta: worstRunway - baseRunway,
      assumptions: [
        'Intäkter -10% (kund eller marknad)',
        'Kostnader +5% (inflation/oförutsett)',
        'Förhöjd burn-rate +5%',
      ],
    },
  ];
}
