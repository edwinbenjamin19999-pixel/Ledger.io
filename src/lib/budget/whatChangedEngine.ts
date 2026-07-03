/**
 * What-Changed Engine — diff current vs previous period drivers and produce
 * 3–5 driver-level deltas with EBIT / runway impact estimates.
 *
 * Pure: no DB calls. Caller supplies aggregated current/previous monthly buckets
 * for revenue and cost groups, plus current drivers for runway derivation.
 */

import type { BudgetDrivers, BudgetMetrics } from "./driverEngine";

export interface WhatChangedItem {
  id: string;
  label: string;
  /** Plain language: what moved and why. */
  detail: string;
  /** EBIT delta in SEK between current and previous period (positive = improved). */
  impactEbit: number;
  /** Runway impact in days (positive = extended). */
  impactRunway: number;
  /** BAS account numbers driving this change — used to seed drilldown. */
  accountNumbers: string[];
  severity: "positive" | "neutral" | "adverse";
}

export interface PeriodTotals {
  revenue: number;
  cogs: number;
  personnel: number;
  otherOpex: number;
}

function classifyAccount(num: string): keyof PeriodTotals | null {
  if (num >= "3000" && num <= "3999") return "revenue";
  if (num >= "4000" && num <= "4999") return "cogs";
  if (num >= "7000" && num <= "7699") return "personnel";
  if (num >= "5000" && num <= "6999") return "otherOpex";
  if (num >= "7700" && num <= "7999") return "otherOpex";
  return null;
}

/** Aggregate raw account → amount maps into period totals. */
export function bucketAccounts(amounts: Record<string, number>): PeriodTotals {
  const out: PeriodTotals = { revenue: 0, cogs: 0, personnel: 0, otherOpex: 0 };
  for (const [num, val] of Object.entries(amounts)) {
    const cls = classifyAccount(num);
    if (cls) out[cls] += val;
  }
  return out;
}

/** Top accounts in a BAS class by absolute amount, used to seed drilldown. */
export function topAccountsForClass(
  amounts: Record<string, number>,
  cls: keyof PeriodTotals,
  limit = 5
): string[] {
  return Object.entries(amounts)
    .filter(([num]) => classifyAccount(num) === cls)
    .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
    .slice(0, limit)
    .map(([num]) => num);
}

export function buildWhatChanged(
  current: { totals: PeriodTotals; raw: Record<string, number> },
  previous: { totals: PeriodTotals; raw: Record<string, number> },
  drivers: BudgetDrivers,
  metrics: BudgetMetrics
): WhatChangedItem[] {
  const burn = Math.abs(metrics.burnRate || 1);
  const dailyBurn = (burn * 12) / 365 || 1;
  const items: WhatChangedItem[] = [];

  const dRev = current.totals.revenue - previous.totals.revenue;
  if (Math.abs(dRev) > 1000) {
    items.push({
      id: "revenue",
      label: dRev >= 0 ? "Intäkter ökar" : "Intäkter minskar",
      detail: `Bruttoomsättning ${dRev >= 0 ? "+" : ""}${Math.round(dRev).toLocaleString("sv-SE")} kr mot föregående period.`,
      impactEbit: dRev,
      impactRunway: Math.round(dRev / dailyBurn),
      accountNumbers: topAccountsForClass(current.raw, "revenue"),
      severity: dRev >= 0 ? "positive" : "adverse",
    });
  }

  const dCogs = current.totals.cogs - previous.totals.cogs;
  if (Math.abs(dCogs) > 1000) {
    items.push({
      id: "cogs",
      label: dCogs <= 0 ? "Råvaror & material lägre" : "Råvaror & material högre",
      detail: `${dCogs >= 0 ? "+" : ""}${Math.round(dCogs).toLocaleString("sv-SE")} kr — påverkar bruttomarginal.`,
      impactEbit: -dCogs,
      impactRunway: Math.round(-dCogs / dailyBurn),
      accountNumbers: topAccountsForClass(current.raw, "cogs"),
      severity: dCogs <= 0 ? "positive" : "adverse",
    });
  }

  const dPers = current.totals.personnel - previous.totals.personnel;
  if (Math.abs(dPers) > 1000) {
    items.push({
      id: "personnel",
      label: dPers <= 0 ? "Personalkostnader lägre" : "Personalkostnader högre",
      detail: `${dPers >= 0 ? "+" : ""}${Math.round(dPers).toLocaleString("sv-SE")} kr i löner och förmåner.`,
      impactEbit: -dPers,
      impactRunway: Math.round(-dPers / dailyBurn),
      accountNumbers: topAccountsForClass(current.raw, "personnel"),
      severity: dPers <= 0 ? "positive" : "adverse",
    });
  }

  const dOpex = current.totals.otherOpex - previous.totals.otherOpex;
  if (Math.abs(dOpex) > 1000) {
    items.push({
      id: "opex",
      label: dOpex <= 0 ? "Övriga driftskostnader lägre" : "Övriga driftskostnader högre",
      detail: `${dOpex >= 0 ? "+" : ""}${Math.round(dOpex).toLocaleString("sv-SE")} kr i lokaler, IT, övrigt.`,
      impactEbit: -dOpex,
      impactRunway: Math.round(-dOpex / dailyBurn),
      accountNumbers: topAccountsForClass(current.raw, "otherOpex"),
      severity: dOpex <= 0 ? "positive" : "adverse",
    });
  }

  // Margin shift derived from totals.
  const grossPrev = previous.totals.revenue - previous.totals.cogs;
  const grossCurr = current.totals.revenue - current.totals.cogs;
  const marginPrev = previous.totals.revenue > 0 ? (grossPrev / previous.totals.revenue) * 100 : 0;
  const marginCurr = current.totals.revenue > 0 ? (grossCurr / current.totals.revenue) * 100 : 0;
  const marginDelta = marginCurr - marginPrev;
  if (Math.abs(marginDelta) > 0.5) {
    items.push({
      id: "margin",
      label: marginDelta >= 0 ? "Bruttomarginal förbättras" : "Bruttomarginal försämras",
      detail: `${marginPrev.toFixed(1)}% → ${marginCurr.toFixed(1)}% (${marginDelta >= 0 ? "+" : ""}${marginDelta.toFixed(1)} pp).`,
      impactEbit: Math.round(grossCurr - grossPrev),
      impactRunway: Math.round((grossCurr - grossPrev) / dailyBurn),
      accountNumbers: topAccountsForClass(current.raw, "revenue"),
      severity: marginDelta >= 0 ? "positive" : "adverse",
    });
  }

  return items
    .sort((a, b) => Math.abs(b.impactEbit) - Math.abs(a.impactEbit))
    .slice(0, 5);
}
