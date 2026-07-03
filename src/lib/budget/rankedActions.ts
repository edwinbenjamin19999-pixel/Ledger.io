/**
 * Ranked Actions for the Planning Action Stack.
 * Pure deterministic ranking by financial impact.
 */
import type { RRMonth, BRMonth, KFMonth, BudgetDrivers, BudgetMetrics } from "./driverEngine";

export type ActionVerb = "cut_personnel" | "raise_price" | "delay_payment" | "negotiate_rent" | "reduce_marketing" | "improve_dso";

export interface RankedAction {
  id: string;
  verb: ActionVerb;
  title: string;
  rationale: string;
  impactSEK: number;
  /** Annual EBIT impact in SEK (positive = improves EBIT). */
  ebitDelta: number;
  /** Annual cash impact in SEK (positive = improves cash). */
  cashDelta: number;
  marginPP?: number;
  runwayDays?: number;
  module: { href: string; label: string };
  driverPatch?: Partial<BudgetDrivers>;
}

/** Apply an action's driver patch onto a baseline drivers object. */
export function applyAction(drivers: BudgetDrivers, action: RankedAction): BudgetDrivers {
  if (!action.driverPatch) return drivers;
  return { ...drivers, ...action.driverPatch };
}

const MODULE_MAP: Record<ActionVerb, { href: string; label: string }> = {
  cut_personnel: { href: "/hr", label: "Öppna HR" },
  raise_price: { href: "/invoices", label: "Öppna fakturor" },
  delay_payment: { href: "/direct-payment", label: "Öppna betalningar" },
  negotiate_rent: { href: "/suppliers?category=rent", label: "Öppna leverantörer" },
  reduce_marketing: { href: "/budget", label: "Justera i Budget" },
  improve_dso: { href: "/ar-agent", label: "Öppna AR-agent" },
};

export function buildRankedActions(
  rr: RRMonth[],
  kf: KFMonth[],
  drivers: BudgetDrivers,
  metrics: BudgetMetrics
): RankedAction[] {
  const actions: RankedAction[] = [];

  const annualRevenue = metrics.annualRevenue;
  const annualSalaries = drivers.salaryMonthly * 12;
  const annualMarketing = drivers.marketingBudget * 12;

  const dailyBurn = Math.max(1, Math.abs(metrics.burnRate || 1) * 12 / 365);
  const runwayFor = (annualImpact: number) => Math.round(annualImpact / dailyBurn);

  // 1. Cut personnel 5%
  if (annualSalaries > 0) {
    const impact = Math.round(annualSalaries * 0.05);
    actions.push({
      id: "cut-personnel-5",
      verb: "cut_personnel",
      title: "Sänk personalkostnad 5%",
      rationale: "Marginell minskning utan strukturell förändring.",
      impactSEK: impact,
      ebitDelta: impact,
      cashDelta: impact,
      marginPP: annualRevenue > 0 ? (impact / annualRevenue) * 100 : 0,
      runwayDays: runwayFor(impact),
      module: MODULE_MAP.cut_personnel,
      driverPatch: { salaryMonthly: Math.round(drivers.salaryMonthly * 0.95) },
    });
  }

  // 2. Raise price 3%
  if (drivers.averageRevenuePerCustomer > 0) {
    const impact = Math.round(annualRevenue * 0.03 * (1 - drivers.cogsPercent / 100));
    actions.push({
      id: "raise-price-3",
      verb: "raise_price",
      title: "Höj pris 3%",
      rationale: "Branschnormal prisjustering — låg churn-risk.",
      impactSEK: impact,
      ebitDelta: impact,
      cashDelta: impact,
      marginPP: annualRevenue > 0 ? (impact / annualRevenue) * 100 : 0,
      runwayDays: runwayFor(impact),
      module: MODULE_MAP.raise_price,
      driverPatch: { averageRevenuePerCustomer: Math.round(drivers.averageRevenuePerCustomer * 1.03) },
    });
  }

  // 3. Reduce marketing 10% if very high vs revenue
  if (annualMarketing > annualRevenue * 0.15 && annualMarketing > 0) {
    const impact = Math.round(annualMarketing * 0.10);
    actions.push({
      id: "reduce-marketing",
      verb: "reduce_marketing",
      title: "Sänk marknadsbudget 10%",
      rationale: "Marknad utgör >15% av omsättning — låg ROI sannolik.",
      impactSEK: impact,
      ebitDelta: impact,
      cashDelta: impact,
      runwayDays: runwayFor(impact),
      module: MODULE_MAP.reduce_marketing,
      driverPatch: { marketingBudget: Math.round(drivers.marketingBudget * 0.90) },
    });
  }

  // 4. Improve DSO by 10 days (cash only — no EBIT effect)
  if (drivers.dso > 30) {
    const dailyRev = annualRevenue / 365;
    const impact = Math.round(dailyRev * 10);
    actions.push({
      id: "improve-dso",
      verb: "improve_dso",
      title: "Förbättra DSO med 10 dagar",
      rationale: `Frigör ~${Math.round(impact).toLocaleString("sv-SE")} kr i likviditet.`,
      impactSEK: impact,
      ebitDelta: 0,
      cashDelta: impact,
      runwayDays: runwayFor(impact),
      module: MODULE_MAP.improve_dso,
      driverPatch: { dso: Math.max(15, drivers.dso - 10) },
    });
  }

  // 5. Delay supplier payment (DPO +10) — cash only
  if (drivers.dpo < 60) {
    const dailyCogs = (annualRevenue * drivers.cogsPercent / 100) / 365;
    const impact = Math.round(dailyCogs * 10);
    actions.push({
      id: "delay-payment",
      verb: "delay_payment",
      title: "Senarelägg leverantörsbetalning 10 dagar",
      rationale: "Förläng DPO för bättre kassaflöde — säkerställ avtalsstöd.",
      impactSEK: impact,
      ebitDelta: 0,
      cashDelta: impact,
      runwayDays: runwayFor(impact),
      module: MODULE_MAP.delay_payment,
      driverPatch: { dpo: drivers.dpo + 10 },
    });
  }

  // 6. Negotiate rent (admin -10%)
  if (drivers.adminCosts > 20000) {
    const impact = Math.round(drivers.adminCosts * 12 * 0.10);
    actions.push({
      id: "negotiate-rent",
      verb: "negotiate_rent",
      title: "Förhandla hyra/admin -10%",
      rationale: "Adminkostnader ofta förhandlingsbara vid omförhandling.",
      impactSEK: impact,
      ebitDelta: impact,
      cashDelta: impact,
      runwayDays: runwayFor(impact),
      module: MODULE_MAP.negotiate_rent,
      driverPatch: { adminCosts: Math.round(drivers.adminCosts * 0.90) },
    });
  }

  // Sort by absolute impact, return top 3
  return actions.sort((a, b) => Math.abs(b.impactSEK) - Math.abs(a.impactSEK)).slice(0, 3);
}
