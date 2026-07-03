/**
 * Driver dependency graph — propagates impact downstream.
 *
 * Used by LiveSimulationPanel to identify which KPIs need re-rendering when
 * a driver changes. Pure metadata; runScenario() still does the math.
 */
import type { BudgetDrivers } from "@/lib/budget/driverEngine";

export type FinancialNode =
  | "revenue" | "cogs" | "gross_profit" | "opex"
  | "ebitda" | "ebit" | "ebt" | "net_profit"
  | "cash" | "runway" | "working_capital";

const DRIVER_TO_NODES: Partial<Record<keyof BudgetDrivers, FinancialNode[]>> = {
  startingCustomers:           ["revenue", "gross_profit", "ebitda", "ebit", "net_profit", "cash", "runway"],
  newCustomersPerMonth:        ["revenue", "gross_profit", "ebitda", "ebit", "net_profit", "cash", "runway"],
  churnRate:                   ["revenue", "gross_profit", "ebitda", "ebit", "net_profit", "cash", "runway"],
  averageRevenuePerCustomer:   ["revenue", "gross_profit", "ebitda", "ebit", "net_profit", "cash", "runway"],
  priceGrowthRate:             ["revenue", "gross_profit", "ebitda", "ebit", "net_profit", "cash", "runway"],
  cogsPercent:                 ["cogs", "gross_profit", "ebitda", "ebit", "net_profit", "cash", "runway"],
  salaryMonthly:               ["opex", "ebitda", "ebit", "net_profit", "cash", "runway"],
  marketingBudget:             ["opex", "ebitda", "ebit", "net_profit", "cash", "runway"],
  adminCosts:                  ["opex", "ebitda", "ebit", "net_profit", "cash", "runway"],
  rdCosts:                     ["opex", "ebitda", "ebit", "net_profit", "cash", "runway"],
  dso:                         ["working_capital", "cash", "runway"],
  dpo:                         ["working_capital", "cash", "runway"],
  inventoryDays:               ["working_capital", "cash", "runway"],
  monthlyCapex:                ["cash", "runway", "ebit"],
  depreciationYears:           ["ebit", "net_profit"],
  corporateTaxRate:            ["net_profit", "cash", "runway"],
  interestRate:                ["ebt", "net_profit", "cash", "runway"],
  loanRepaymentMonthly:        ["cash", "runway"],
  openingCash:                 ["cash", "runway"],
  openingEquity:               ["cash"],
  openingLoans:                ["cash", "ebt"],
  openingFixedAssets:          ["ebit"],
};

/** Returns the unique set of downstream nodes affected by a driver patch. */
export function affectedNodes(patchKeys: Iterable<keyof BudgetDrivers>): Set<FinancialNode> {
  const out = new Set<FinancialNode>();
  for (const k of patchKeys) {
    const nodes = DRIVER_TO_NODES[k];
    if (nodes) for (const n of nodes) out.add(n);
  }
  return out;
}

export function isAffected(node: FinancialNode, patchKeys: Iterable<keyof BudgetDrivers>): boolean {
  return affectedNodes(patchKeys).has(node);
}
