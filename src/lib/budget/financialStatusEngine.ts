/**
 * Financial Status Engine — deterministic decision layer.
 * Produces structured status, impact and recommended actions from model output.
 * Zero hallucination: every claim references a metric from driverEngine.
 */

import { RRMonth, BRMonth, KFMonth, BudgetDrivers, BudgetMetrics, calculateMetrics } from "./driverEngine";
import { formatSEK } from "./budgetEngine";

export type StatusLevel = "critical" | "warning" | "healthy";
export type UserRole = "ceo" | "accountant" | "cfo";

export interface RecommendedAction {
  id: string;
  label: string;
  detail: string;
  /** action type to dispatch to the host page */
  actionType: "adjust_driver" | "open_scenario" | "open_tracking" | "reforecast";
  payload?: Record<string, unknown>;
  impactHint?: string;
}

export interface FinancialStatus {
  level: StatusLevel;
  headline: string;
  reasons: string[];
  impact: { label: string; value: string; tone: "negative" | "neutral" | "positive" }[];
  actions: RecommendedAction[];
  /** Source references for traceability */
  sources: string[];
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];

export function computeFinancialStatus(
  rr: RRMonth[],
  br: BRMonth[],
  kf: KFMonth[],
  drivers: BudgetDrivers,
  metrics?: BudgetMetrics
): FinancialStatus {
  const m = metrics ?? calculateMetrics(drivers, rr, kf);
  const reasons: string[] = [];
  const sources: string[] = [];
  const actions: RecommendedAction[] = [];

  const totalRevenue = rr.reduce((s, x) => s + x.revenue, 0);
  const totalCosts = rr.reduce((s, x) => s + x.cogs + x.totalOpex + x.depreciation, 0);
  const costRatio = totalRevenue > 0 ? (totalCosts / totalRevenue) * 100 : 999;
  const endCash = kf[11]?.closingCash ?? 0;
  const avgBurn = kf.reduce((s, x) => s + x.netCashFlow, 0) / 12;
  const runwayMonths = avgBurn < 0 ? endCash / Math.abs(avgBurn) : Infinity;

  // Determine status level
  let level: StatusLevel = "healthy";
  if (runwayMonths <= 3 || costRatio > 130 || endCash < 0) level = "critical";
  else if (runwayMonths <= 6 || costRatio > 100 || m.annualNetIncome < 0) level = "warning";

  // Build reasons
  if (costRatio > 100) {
    reasons.push(`Kostnaderna är ${(costRatio - 100).toFixed(0)}% över intäkterna`);
    sources.push("RR · totala kostnader / totala intäkter");
  }
  if (m.annualNetIncome < 0) {
    reasons.push(`Negativt resultat: ${formatSEK(Math.round(m.annualNetIncome))} kr`);
    sources.push("RR · summa nettoresultat 12 månader");
  }
  if (avgBurn < 0) {
    reasons.push(`Genomsnittlig burn rate ${formatSEK(Math.round(Math.abs(avgBurn)))} kr/mån`);
    sources.push("KF · genomsnittligt netto kassaflöde");
  }
  if (m.breakEvenMonth === null) {
    reasons.push("Break-even uppnås inte under året");
    sources.push("RR · kumulativt nettoresultat");
  }

  if (level === "healthy" && reasons.length === 0) {
    reasons.push(`Verksamheten genererar ${formatSEK(Math.round(m.annualNetIncome))} kr i resultat`);
    if (m.breakEvenMonth !== null) reasons.push(`Break-even i ${MONTH_NAMES[m.breakEvenMonth]}`);
  }

  // Impact metrics (always shown)
  const impact: FinancialStatus["impact"] = [
    {
      label: "Runway",
      value: runwayMonths === Infinity ? "∞" : `${runwayMonths.toFixed(1)} mån`,
      tone: runwayMonths <= 3 ? "negative" : runwayMonths <= 6 ? "neutral" : "positive",
    },
    {
      label: "Break-even",
      value: m.breakEvenMonth !== null ? MONTH_NAMES[m.breakEvenMonth] : "Ej i år",
      tone: m.breakEvenMonth !== null ? "positive" : "negative",
    },
    {
      label: "Kassa vid årsslut",
      value: `${formatSEK(Math.round(endCash))} kr`,
      tone: endCash < 0 ? "negative" : endCash < Math.abs(avgBurn) * 3 ? "neutral" : "positive",
    },
    {
      label: "EBIT-marginal",
      value: `${m.ebitdaMarginPct.toFixed(1)}%`,
      tone: m.ebitdaMarginPct < 0 ? "negative" : m.ebitdaMarginPct < 10 ? "neutral" : "positive",
    },
  ];

  // Recommended actions — only when problem is real
  if (drivers.marketingBudget > 0 && (costRatio > 100 || m.annualNetIncome < 0)) {
    const reduction = Math.round(drivers.marketingBudget * 0.3);
    actions.push({
      id: "cut-marketing",
      label: `Minska marknadsbudget med 30%`,
      detail: `Sparar ${formatSEK(reduction * 12)} kr/år`,
      actionType: "adjust_driver",
      payload: { driver: "marketingBudget", value: drivers.marketingBudget * 0.7 },
      impactHint: `+${(reduction * 12 / Math.max(Math.abs(m.annualNetIncome), 1) * 100).toFixed(0)}% mot break-even`,
    });
  }

  if (m.annualNetIncome < 0 || runwayMonths < 12) {
    actions.push({
      id: "raise-prices",
      label: "Höj priser med 5%",
      detail: `+${formatSEK(Math.round(totalRevenue * 0.05))} kr i årsintäkt`,
      actionType: "adjust_driver",
      payload: { driver: "averageRevenuePerCustomer", value: drivers.averageRevenuePerCustomer * 1.05 },
      impactHint: "Direkt effekt på resultat",
    });
  }

  if (drivers.dso > 30) {
    const dsoSaving = (rr[11]?.revenue ?? 0) * 10 / 30 * 12;
    actions.push({
      id: "reduce-dso",
      label: `Korta DSO med 10 dagar`,
      detail: `Frigör ${formatSEK(Math.round(dsoSaving))} kr i likviditet`,
      actionType: "adjust_driver",
      payload: { driver: "dso", value: Math.max(15, drivers.dso - 10) },
      impactHint: "Stärker kassaflöde direkt",
    });
  }

  if (level !== "healthy") {
    actions.push({
      id: "create-scenario",
      label: "Simulera åtgärdspaket",
      detail: "Jämför base mot pessimistiskt + besparingar",
      actionType: "open_scenario",
      impactHint: "Se påverkan innan beslut",
    });
  }

  return {
    level,
    headline: buildHeadline(level, runwayMonths, costRatio),
    reasons,
    impact,
    actions: actions.slice(0, 4),
    sources,
  };
}

function buildHeadline(level: StatusLevel, runway: number, costRatio: number): string {
  if (level === "critical") {
    if (runway <= 3) return "Kritisk: kassan tar slut inom kort";
    return "Kritisk: kostnader överstiger intäkter med marginal";
  }
  if (level === "warning") {
    if (costRatio > 100) return "Varning: olönsam drift";
    return "Varning: begränsad lönsamhetsmarginal";
  }
  return "Hälsosam ekonomi — verksamheten är lönsam";
}

/**
 * Role-adaptive view of the same status.
 * Same data → different framing, different action priority.
 */
export function adaptStatusForRole(status: FinancialStatus, role: UserRole): FinancialStatus {
  if (role === "ceo") {
    return {
      ...status,
      // Strategic framing — focus on runway, growth, risk
      reasons: status.reasons.filter(r => /runway|burn|kassa|negativt|kostnader/i.test(r)).slice(0, 3),
      actions: status.actions.filter(a =>
        ["create-scenario", "raise-prices", "cut-marketing"].includes(a.id)
      ),
    };
  }
  if (role === "accountant") {
    return {
      ...status,
      // Account-level framing — focus on variances, posting
      reasons: status.reasons,
      actions: status.actions.filter(a => a.actionType === "adjust_driver" || a.actionType === "open_tracking"),
    };
  }
  // CFO — full view, both strategic and detail
  return status;
}
