/**
 * Historical Analysis Engine
 * Analyzes journal entries to derive budget assumptions automatically.
 */

import { BudgetDrivers, DEFAULT_DRIVERS } from "./driverEngine";

export interface HistoricalEntry {
  entry_date: string;
  lines: { account_number: string; debit: number; credit: number }[];
}

export interface HistoricalAnalysis {
  monthlyRevenue: number[];       // 12-element array
  monthlyCosts: number[];         // 12-element array
  revenueGrowthRate: number;      // % per year
  fixedCostMonthly: number;       // estimated fixed costs per month
  variableCostRatio: number;      // variable costs as % of revenue
  dsoEstimate: number;            // days
  dpoEstimate: number;            // days
  seasonalityIndex: number[];     // 12-element, avg = 1.0
  avgMonthlyRevenue: number;
  avgMonthlyCost: number;
  cogsRatio: number;              // COGS as % of revenue
  staffCostMonthly: number;
  marketingCostMonthly: number;
  adminCostMonthly: number;
  hasData: boolean;
}

/**
 * Analyze historical journal entries to derive financial assumptions.
 * @param entries - Array of journal entries with lines containing account_number, debit, credit
 * @param months - Number of months of data (default 12)
 */
export function analyzeHistoricalData(entries: HistoricalEntry[]): HistoricalAnalysis {
  if (!entries || entries.length === 0) {
    return emptyAnalysis();
  }

  // Bucket by month (0-11)
  const monthlyRevenue = new Array(12).fill(0);
  const monthlyCOGS = new Array(12).fill(0);
  const monthlyStaff = new Array(12).fill(0);
  const monthlyExternal = new Array(12).fill(0);
  const monthlyAdmin = new Array(12).fill(0);
  const monthlyAR = new Array(12).fill(0);  // accounts receivable changes
  const monthlyAP = new Array(12).fill(0);  // accounts payable changes

  entries.forEach(entry => {
    const month = new Date(entry.entry_date).getMonth();
    entry.lines.forEach(line => {
      const num = line.account_number;
      const net = (line.credit || 0) - (line.debit || 0);
      const netDebit = (line.debit || 0) - (line.credit || 0);

      // Revenue: 3000-3999
      if (num >= "3000" && num <= "3999") monthlyRevenue[month] += net;
      // COGS: 4000-4999
      if (num >= "4000" && num <= "4999") monthlyCOGS[month] += netDebit;
      // External costs: 5000-6999
      if (num >= "5000" && num <= "6999") monthlyExternal[month] += netDebit;
      // Staff costs: 7000-7699
      if (num >= "7000" && num <= "7699") monthlyStaff[month] += netDebit;
      // Admin/other: 7700-7999
      if (num >= "7700" && num <= "7999") monthlyAdmin[month] += netDebit;
      // Accounts receivable: 1500-1599
      if (num >= "1500" && num <= "1599") monthlyAR[month] += netDebit;
      // Accounts payable: 2400-2499
      if (num >= "2400" && num <= "2499") monthlyAP[month] += net;
    });
  });

  const totalRevenue = monthlyRevenue.reduce((s, v) => s + v, 0);
  const totalCOGS = monthlyCOGS.reduce((s, v) => s + v, 0);
  const totalCosts = monthlyCOGS.reduce((s, v) => s + v, 0) +
    monthlyExternal.reduce((s, v) => s + v, 0) +
    monthlyStaff.reduce((s, v) => s + v, 0) +
    monthlyAdmin.reduce((s, v) => s + v, 0);

  const avgRevenue = totalRevenue / 12;
  const avgCost = totalCosts / 12;
  const monthsWithRevenue = monthlyRevenue.filter(v => v > 0).length || 1;

  // Growth rate: compare H2 vs H1
  const h1Rev = monthlyRevenue.slice(0, 6).reduce((s, v) => s + v, 0);
  const h2Rev = monthlyRevenue.slice(6, 12).reduce((s, v) => s + v, 0);
  const revenueGrowthRate = h1Rev > 0 ? ((h2Rev / h1Rev - 1) * 2 * 100) : 10; // annualized

  // Fixed vs variable cost estimation (simple: costs in months with low revenue vs high)
  const sortedByRev = monthlyRevenue.map((r, i) => ({ rev: r, cost: monthlyCOGS[i] + monthlyExternal[i] + monthlyStaff[i] + monthlyAdmin[i] }))
    .sort((a, b) => a.rev - b.rev);
  const lowRevMonths = sortedByRev.slice(0, 3);
  const highRevMonths = sortedByRev.slice(-3);
  const avgLowCost = lowRevMonths.reduce((s, m) => s + m.cost, 0) / 3;
  const avgHighCost = highRevMonths.reduce((s, m) => s + m.cost, 0) / 3;
  const avgLowRev = lowRevMonths.reduce((s, m) => s + m.rev, 0) / 3;
  const avgHighRev = highRevMonths.reduce((s, m) => s + m.rev, 0) / 3;

  let variableCostRatio = 0;
  let fixedCostMonthly = avgCost;
  if (avgHighRev - avgLowRev > 0) {
    variableCostRatio = Math.max(0, Math.min(1, (avgHighCost - avgLowCost) / (avgHighRev - avgLowRev)));
    fixedCostMonthly = Math.max(0, avgCost - variableCostRatio * avgRevenue);
  }

  // DSO estimate: ~30 days default, or from AR balance
  const avgAR = monthlyAR.reduce((s, v) => s + Math.abs(v), 0) / monthsWithRevenue;
  const dsoEstimate = avgRevenue > 0 ? Math.round((avgAR / avgRevenue) * 30) : 30;

  // DPO estimate
  const avgAP = monthlyAP.reduce((s, v) => s + Math.abs(v), 0) / monthsWithRevenue;
  const dpoEstimate = avgCost > 0 ? Math.round((avgAP / avgCost) * 30) : 30;

  // Seasonality index
  const seasonalityIndex = monthlyRevenue.map(v => avgRevenue > 0 ? v / avgRevenue : 1);

  // COGS ratio
  const cogsRatio = totalRevenue > 0 ? (totalCOGS / totalRevenue) * 100 : 30;

  return {
    monthlyRevenue,
    monthlyCosts: monthlyRevenue.map((_, i) => monthlyCOGS[i] + monthlyExternal[i] + monthlyStaff[i] + monthlyAdmin[i]),
    revenueGrowthRate: Math.round(revenueGrowthRate * 10) / 10,
    fixedCostMonthly: Math.round(fixedCostMonthly),
    variableCostRatio: Math.round(variableCostRatio * 1000) / 10,
    dsoEstimate: Math.max(0, Math.min(90, dsoEstimate || 30)),
    dpoEstimate: Math.max(0, Math.min(90, dpoEstimate || 30)),
    seasonalityIndex,
    avgMonthlyRevenue: Math.round(avgRevenue),
    avgMonthlyCost: Math.round(avgCost),
    cogsRatio: Math.round(cogsRatio * 10) / 10,
    staffCostMonthly: Math.round(monthlyStaff.reduce((s, v) => s + v, 0) / 12),
    marketingCostMonthly: Math.round(monthlyExternal.reduce((s, v) => s + v, 0) / 12 * 0.3), // estimate 30% of external = marketing
    adminCostMonthly: Math.round(monthlyAdmin.reduce((s, v) => s + v, 0) / 12 + monthlyExternal.reduce((s, v) => s + v, 0) / 12 * 0.7),
    hasData: totalRevenue > 0 || totalCosts > 0,
  };
}

/**
 * Convert historical analysis into BudgetDrivers for the driver engine.
 */
export function analysisToDrivers(analysis: HistoricalAnalysis): BudgetDrivers {
  if (!analysis.hasData) return DEFAULT_DRIVERS;

  const avgRevenue = analysis.avgMonthlyRevenue;
  // Estimate customers from revenue (assume ~2500 per customer as default)
  const arpc = 2500;
  const estimatedCustomers = Math.max(1, Math.round(avgRevenue / arpc));

  return {
    ...DEFAULT_DRIVERS,
    startingCustomers: estimatedCustomers,
    newCustomersPerMonth: Math.max(1, Math.round(estimatedCustomers * (analysis.revenueGrowthRate / 100) / 12)),
    churnRate: 3,
    averageRevenuePerCustomer: Math.round(avgRevenue / estimatedCustomers),
    priceGrowthRate: Math.max(0, Math.min(10, analysis.revenueGrowthRate / 3)),
    cogsPercent: analysis.cogsRatio,
    salaryMonthly: analysis.staffCostMonthly || DEFAULT_DRIVERS.salaryMonthly,
    marketingBudget: analysis.marketingCostMonthly || DEFAULT_DRIVERS.marketingBudget,
    adminCosts: analysis.adminCostMonthly || DEFAULT_DRIVERS.adminCosts,
    rdCosts: DEFAULT_DRIVERS.rdCosts,
    dso: analysis.dsoEstimate,
    dpo: analysis.dpoEstimate,
    openingCash: 500000,
    openingEquity: 200000,
    corporateTaxRate: 0.206,
  };
}

function emptyAnalysis(): HistoricalAnalysis {
  return {
    monthlyRevenue: new Array(12).fill(0),
    monthlyCosts: new Array(12).fill(0),
    revenueGrowthRate: 10,
    fixedCostMonthly: 0,
    variableCostRatio: 30,
    dsoEstimate: 30,
    dpoEstimate: 30,
    seasonalityIndex: new Array(12).fill(1),
    avgMonthlyRevenue: 0,
    avgMonthlyCost: 0,
    cogsRatio: 30,
    staffCostMonthly: 0,
    marketingCostMonthly: 0,
    adminCostMonthly: 0,
    hasData: false,
  };
}
