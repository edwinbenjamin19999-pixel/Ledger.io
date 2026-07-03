/**
 * Built-in scenario presets (driver patches).
 * AI-generated scenarios extend this set with metadata only — math stays deterministic.
 */
import type { DriverPatch } from "./scenarioEngine";
import type { BudgetDrivers } from "@/lib/budget/driverEngine";

export type ScenarioKind =
  | "base"
  | "growth"
  | "cost_cut"
  | "survival"
  | "ai"
  | "custom";

export interface PresetScenario {
  key: string;
  kind: ScenarioKind;
  name: string;
  description: string;
  patch: (b: BudgetDrivers) => DriverPatch;
}

export const PRESETS: PresetScenario[] = [
  {
    key: "base",
    kind: "base",
    name: "Bas",
    description: "Nuvarande plan — inga justeringar.",
    patch: () => ({}),
  },
  {
    key: "growth",
    kind: "growth",
    name: "Tillväxt",
    description: "Höjd marknadsbudget, fler nya kunder, accelererad prisökning.",
    patch: (b) => ({
      newCustomersPerMonth: Math.round(b.newCustomersPerMonth * 1.5),
      marketingBudget: Math.round(b.marketingBudget * 1.4),
      priceGrowthRate: b.priceGrowthRate + 2,
      churnRate: Math.max(0.5, b.churnRate * 0.85),
    }),
  },
  {
    key: "cost_cut",
    kind: "cost_cut",
    name: "Kostnadsbesparing",
    description: "Lön −10%, marknad −30%, admin −15%, capex 0.",
    patch: (b) => ({
      salaryMonthly: Math.round(b.salaryMonthly * 0.9),
      marketingBudget: Math.round(b.marketingBudget * 0.7),
      adminCosts: Math.round(b.adminCosts * 0.85),
      monthlyCapex: 0,
    }),
  },
  {
    key: "survival",
    kind: "survival",
    name: "Överlevnad",
    description: "Skydda likviditeten: DSO ned, DPO upp, capex 0, marknad −50%.",
    patch: (b) => ({
      salaryMonthly: Math.round(b.salaryMonthly * 0.85),
      marketingBudget: Math.round(b.marketingBudget * 0.5),
      adminCosts: Math.round(b.adminCosts * 0.8),
      rdCosts: Math.round(b.rdCosts * 0.7),
      dso: Math.max(7, Math.round(b.dso * 0.7)),
      dpo: Math.round(b.dpo * 1.4),
      monthlyCapex: 0,
    }),
  },
];

export function findPreset(key: string): PresetScenario | undefined {
  return PRESETS.find((p) => p.key === key);
}

// ─── AI-generated client-side fallback patches ───
// (Used as a heuristic baseline when the edge-function isn't available.)

export function worstCaseFromTrend(b: BudgetDrivers): DriverPatch {
  return {
    newCustomersPerMonth: Math.max(0, Math.round(b.newCustomersPerMonth * 0.5)),
    averageRevenuePerCustomer: Math.round(b.averageRevenuePerCustomer * 0.9),
    churnRate: b.churnRate * 1.6,
    cogsPercent: Math.min(100, b.cogsPercent * 1.1),
    salaryMonthly: Math.round(b.salaryMonthly * 1.05),
  };
}

export function aggressiveGrowth(b: BudgetDrivers): DriverPatch {
  return {
    newCustomersPerMonth: Math.round(b.newCustomersPerMonth * 2),
    averageRevenuePerCustomer: Math.round(b.averageRevenuePerCustomer * 1.05),
    marketingBudget: Math.round(b.marketingBudget * 2),
    salaryMonthly: Math.round(b.salaryMonthly * 1.25),
    churnRate: Math.max(0.5, b.churnRate * 0.7),
  };
}

export function liquidityProtection(b: BudgetDrivers): DriverPatch {
  return {
    dso: Math.max(7, Math.round(b.dso * 0.6)),
    dpo: Math.round(b.dpo * 1.5),
    monthlyCapex: 0,
    marketingBudget: Math.round(b.marketingBudget * 0.7),
    rdCosts: Math.round(b.rdCosts * 0.8),
  };
}
