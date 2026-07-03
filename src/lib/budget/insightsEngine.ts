/**
 * Computed AI Insights Engine
 * Generates deterministic insights from model output — no LLM needed.
 */

import { RRMonth, BRMonth, KFMonth, BudgetDrivers, BudgetMetrics } from "./driverEngine";
import { formatSEK } from "./budgetEngine";

export type InsightSeverity = "info" | "warning" | "critical" | "positive";

export interface InsightCard {
  id: string;
  title: string;
  description: string;
  severity: InsightSeverity;
  value?: string;
  icon: "cash" | "growth" | "cost" | "efficiency" | "target";
}

export function computeInsights(
  rr: RRMonth[],
  kf: KFMonth[],
  br: BRMonth[],
  drivers: BudgetDrivers,
  metrics: BudgetMetrics
): InsightCard[] {
  const insights: InsightCard[] = [];

  // 1. Cash runway
  const endCash = kf[11]?.closingCash || 0;
  const avgMonthlyBurn = kf.reduce((s, m) => s + m.netCashFlow, 0) / 12;
  if (avgMonthlyBurn < 0) {
    const runway = Math.floor(endCash / Math.abs(avgMonthlyBurn));
    insights.push({
      id: "cash-runway",
      title: "Kassaflödesvarning",
      description: runway <= 0
        ? "Kassan är redan negativ vid årets slut."
        : `Kassan räcker i ${runway} månader med nuvarande burn rate.`,
      severity: runway <= 3 ? "critical" : runway <= 6 ? "warning" : "info",
      value: runway <= 0 ? "0 mån" : `${runway} mån`,
      icon: "cash",
    });
  } else if (endCash > 0) {
    insights.push({
      id: "cash-positive",
      title: "Positivt kassaflöde",
      description: `Företaget genererar ${formatSEK(Math.round(avgMonthlyBurn))} kr/mån i kassaflöde.`,
      severity: "positive",
      value: `+${formatSEK(Math.round(avgMonthlyBurn))} kr/mån`,
      icon: "cash",
    });
  }

  // 2. Cost sustainability
  const totalRevenue = rr.reduce((s, m) => s + m.revenue, 0);
  const totalCosts = rr.reduce((s, m) => s + m.cogs + m.totalOpex, 0);
  const costRatio = totalRevenue > 0 ? (totalCosts / totalRevenue) * 100 : 0;
  if (costRatio > 100) {
    insights.push({
      id: "cost-sustainability",
      title: "Kostnader överstiger intäkter",
      description: `Kostnader är ${(costRatio - 100).toFixed(1)}% högre än intäkterna. Åtgärder krävs.`,
      severity: "critical",
      value: `${costRatio.toFixed(0)}% av intäkt`,
      icon: "cost",
    });
  } else if (costRatio > 85) {
    insights.push({
      id: "cost-high",
      title: "Höga kostnader",
      description: `Kostnaderna utgör ${costRatio.toFixed(1)}% av intäkterna — begränsat utrymme.`,
      severity: "warning",
      value: `${costRatio.toFixed(0)}%`,
      icon: "cost",
    });
  }

  // 3. Required growth for break-even
  const annualNetIncome = rr.reduce((s, m) => s + m.netIncome, 0);
  if (annualNetIncome < 0 && totalRevenue > 0) {
    const totalOpex = rr.reduce((s, m) => s + m.totalOpex + m.depreciation, 0);
    const grossMarginPct = totalRevenue > 0 ? (totalRevenue - rr.reduce((s, m) => s + m.cogs, 0)) / totalRevenue : 0;
    const breakEvenRevenue = grossMarginPct > 0 ? totalOpex / grossMarginPct : 0;
    const requiredGrowth = totalRevenue > 0 ? ((breakEvenRevenue / totalRevenue - 1) * 100) : 0;
    if (requiredGrowth > 0) {
      insights.push({
        id: "growth-required",
        title: "Tillväxt krävs för lönsamhet",
        description: `Intäkterna behöver öka med ${requiredGrowth.toFixed(1)}% för att nå break-even.`,
        severity: requiredGrowth > 30 ? "critical" : "warning",
        value: `+${requiredGrowth.toFixed(0)}%`,
        icon: "growth",
      });
    }
  }

  // 4. DSO impact analysis
  if (drivers.dso > 30) {
    const currentAR = rr[11]?.revenue * drivers.dso / 30;
    const improvedAR = rr[11]?.revenue * (drivers.dso - 10) / 30;
    const cashImprovement = currentAR - improvedAR;
    insights.push({
      id: "dso-impact",
      title: "DSO-optimering möjlig",
      description: `Minska DSO med 10 dagar → +${formatSEK(Math.round(cashImprovement * 12))} kr/år i likviditet.`,
      severity: "info",
      value: `-10 dagar DSO`,
      icon: "efficiency",
    });
  }

  // 5. Break-even month
  if (metrics.breakEvenMonth !== null && metrics.breakEvenMonth >= 0) {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];
    insights.push({
      id: "break-even",
      title: "Break-even uppnås",
      description: `Företaget blir lönsamt i ${monthNames[metrics.breakEvenMonth]}.`,
      severity: "positive",
      value: monthNames[metrics.breakEvenMonth],
      icon: "target",
    });
  }

  // 6. LTV/CAC ratio
  if (metrics.cac > 0 && metrics.ltv > 0) {
    const ltvCac = metrics.ltv / metrics.cac;
    if (ltvCac < 3) {
      insights.push({
        id: "ltv-cac",
        title: "Låg LTV/CAC-kvot",
        description: `LTV/CAC är ${ltvCac.toFixed(1)}x — bör vara minst 3x för hållbar tillväxt.`,
        severity: ltvCac < 1 ? "critical" : "warning",
        value: `${ltvCac.toFixed(1)}x`,
        icon: "growth",
      });
    }
  }

  // Return top 3 most important
  const priorityOrder: InsightSeverity[] = ["critical", "warning", "positive", "info"];
  return insights.sort((a, b) => priorityOrder.indexOf(a.severity) - priorityOrder.indexOf(b.severity)).slice(0, 4);
}
