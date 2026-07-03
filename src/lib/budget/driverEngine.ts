/**
 * Driver-based financial model engine.
 * Calculates RR, BR, KF from a single set of business drivers.
 * All three statements are mathematically connected.
 */

export interface BudgetDrivers {
  // Revenue drivers
  startingCustomers: number;
  newCustomersPerMonth: number;
  churnRate: number;             // % per month
  averageRevenuePerCustomer: number;
  priceGrowthRate: number;       // % per year

  // Cost drivers
  cogsPercent: number;           // % of revenue
  salaryMonthly: number;         // Total payroll incl. fees
  marketingBudget: number;
  adminCosts: number;            // Rent, IT, misc
  rdCosts: number;               // R&D / product dev

  // Working capital
  dso: number;                   // Days Sales Outstanding
  dpo: number;                   // Days Payable Outstanding
  inventoryDays: number;         // 0 for service companies

  // Opening balance
  openingCash: number;
  openingEquity: number;
  openingLoans: number;
  openingFixedAssets: number;

  // Capex
  monthlyCapex: number;
  depreciationYears: number;     // Useful life

  // Tax & rates
  corporateTaxRate: number;      // default 0.206
  interestRate: number;          // annual, default 0.05
  loanRepaymentMonthly: number;
}

export interface RRMonth {
  month: number;
  customers: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossMarginPct: number;
  salaries: number;
  marketing: number;
  admin: number;
  rd: number;
  totalOpex: number;
  ebitda: number;
  depreciation: number;
  ebit: number;
  interestIncome: number;
  interestCost: number;
  ebt: number;
  tax: number;
  netIncome: number;
}

export interface BRMonth {
  month: number;
  // Assets
  fixedAssets: number;
  accountsReceivable: number;
  inventory: number;
  cash: number;
  totalAssets: number;
  // Equity
  openingEquity: number;
  cumulativeNetIncome: number;
  totalEquity: number;
  // Liabilities
  accountsPayable: number;
  loans: number;
  totalLiabilities: number;
  totalEquityAndLiabilities: number;
  isBalanced: boolean;
}

export interface KFMonth {
  month: number;
  // Operating
  netIncome: number;
  depreciation: number;
  arChange: number;
  apChange: number;
  invChange: number;
  taxPaid: number;
  operatingCF: number;
  // Investing
  capex: number;
  investingCF: number;
  // Financing
  loanChange: number;
  financingCF: number;
  // Totals
  netCashFlow: number;
  openingCash: number;
  closingCash: number;
}

export interface BudgetMetrics {
  annualRevenue: number;
  annualNetIncome: number;
  grossMarginPct: number;
  ebitdaMarginPct: number;
  burnRate: number;
  runway: number | null;
  breakEvenMonth: number | null;
  ltv: number;
  cac: number;
  endingCash: number;
}

export const DEFAULT_DRIVERS: BudgetDrivers = {
  startingCustomers: 50,
  newCustomersPerMonth: 5,
  churnRate: 3,
  averageRevenuePerCustomer: 2500,
  priceGrowthRate: 3,
  cogsPercent: 30,
  salaryMonthly: 180000,
  marketingBudget: 25000,
  adminCosts: 40000,
  rdCosts: 30000,
  dso: 30,
  dpo: 30,
  inventoryDays: 0,
  openingCash: 500000,
  openingEquity: 200000,
  openingLoans: 0,
  openingFixedAssets: 0,
  monthlyCapex: 0,
  depreciationYears: 5,
  corporateTaxRate: 0.206,
  interestRate: 0.05,
  loanRepaymentMonthly: 0,
};

// ─── RR ───
export function calculateRR(drivers: BudgetDrivers): RRMonth[] {
  const months: RRMonth[] = [];
  let cumulativeCapex = drivers.openingFixedAssets;

  for (let i = 0; i < 12; i++) {
    // Customer model
    let customers = drivers.startingCustomers;
    for (let j = 0; j <= i; j++) {
      customers = customers + drivers.newCustomersPerMonth - Math.round(customers * drivers.churnRate / 100);
    }
    customers = Math.max(0, customers);

    const priceFactor = Math.pow(1 + drivers.priceGrowthRate / 100 / 12, i);
    const revenue = customers * drivers.averageRevenuePerCustomer * priceFactor;

    const cogs = revenue * drivers.cogsPercent / 100;
    const grossProfit = revenue - cogs;
    const grossMarginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

    const salaries = drivers.salaryMonthly;
    const marketing = drivers.marketingBudget;
    const admin = drivers.adminCosts;
    const rd = drivers.rdCosts;
    const totalOpex = salaries + marketing + admin + rd;
    const ebitda = grossProfit - totalOpex;

    // Depreciation: straight-line on cumulative capex
    cumulativeCapex += drivers.monthlyCapex;
    const monthlyDepRate = drivers.depreciationYears > 0 ? 1 / (drivers.depreciationYears * 12) : 0;
    const depreciation = cumulativeCapex * monthlyDepRate;
    const ebit = ebitda - depreciation;

    const interestIncome = 0;
    const interestCost = drivers.openingLoans > 0
      ? (drivers.openingLoans - drivers.loanRepaymentMonthly * i) * drivers.interestRate / 12
      : 0;
    const ebt = ebit + interestIncome - Math.max(0, interestCost);
    const tax = ebt > 0 ? ebt * drivers.corporateTaxRate : 0;
    const netIncome = ebt - tax;

    months.push({
      month: i, customers, revenue, cogs, grossProfit, grossMarginPct,
      salaries, marketing, admin, rd, totalOpex, ebitda,
      depreciation, ebit, interestIncome, interestCost: Math.max(0, interestCost),
      ebt, tax, netIncome,
    });
  }
  return months;
}

// ─── BR ───
export function calculateBR(drivers: BudgetDrivers, rrMonths: RRMonth[]): BRMonth[] {
  const months: BRMonth[] = [];
  let cumulativeNetIncome = 0;
  let cumulativeCapex = drivers.openingFixedAssets;
  let cumulativeDepr = 0;
  let currentLoans = drivers.openingLoans;

  for (let i = 0; i < 12; i++) {
    const rr = rrMonths[i];
    cumulativeNetIncome += rr.netIncome;
    cumulativeCapex += drivers.monthlyCapex;
    cumulativeDepr += rr.depreciation;
    currentLoans = Math.max(0, currentLoans - drivers.loanRepaymentMonthly);

    const fixedAssets = cumulativeCapex - cumulativeDepr;
    const accountsReceivable = rr.revenue * drivers.dso / 30;
    const inventory = rr.cogs * drivers.inventoryDays / 30;
    const accountsPayable = rr.cogs * drivers.dpo / 30;

    const totalEquity = drivers.openingEquity + cumulativeNetIncome;
    const totalLiabilities = accountsPayable + currentLoans;

    // Cash is the balancing item: Assets = Equity + Liabilities
    // totalAssets = fixedAssets + AR + inventory + cash
    // cash = totalEquity + totalLiabilities - fixedAssets - AR - inventory
    const cash = totalEquity + totalLiabilities - fixedAssets - accountsReceivable - inventory;
    const totalAssets = fixedAssets + accountsReceivable + inventory + cash;
    const totalEquityAndLiabilities = totalEquity + totalLiabilities;

    months.push({
      month: i,
      fixedAssets, accountsReceivable, inventory, cash, totalAssets,
      openingEquity: drivers.openingEquity, cumulativeNetIncome, totalEquity,
      accountsPayable, loans: currentLoans, totalLiabilities,
      totalEquityAndLiabilities,
      isBalanced: Math.abs(totalAssets - totalEquityAndLiabilities) < 1,
    });
  }
  return months;
}

// ─── KF ───
export function calculateKF(drivers: BudgetDrivers, rrMonths: RRMonth[], brMonths: BRMonth[]): KFMonth[] {
  const months: KFMonth[] = [];

  const openingBR: Partial<BRMonth> = {
    accountsReceivable: rrMonths[0].revenue * drivers.dso / 30 * 0.9, // approximate opening
    accountsPayable: rrMonths[0].cogs * drivers.dpo / 30 * 0.9,
    inventory: rrMonths[0].cogs * drivers.inventoryDays / 30 * 0.9,
    cash: drivers.openingCash,
    loans: drivers.openingLoans,
  };

  for (let i = 0; i < 12; i++) {
    const rr = rrMonths[i];
    const curr = brMonths[i];
    const prev = i === 0 ? openingBR : brMonths[i - 1];

    const arChange = curr.accountsReceivable - (prev.accountsReceivable || 0);
    const apChange = curr.accountsPayable - (prev.accountsPayable || 0);
    const invChange = curr.inventory - (prev.inventory || 0);

    const operatingCF = rr.netIncome + rr.depreciation - arChange + apChange - invChange;
    const capex = -drivers.monthlyCapex;
    const investingCF = capex;
    const loanChange = (curr.loans) - (prev.loans || 0);
    const financingCF = loanChange;

    const netCashFlow = operatingCF + investingCF + financingCF;
    const prevCash = i === 0 ? drivers.openingCash : months[i - 1].closingCash;
    const closingCash = prevCash + netCashFlow;

    months.push({
      month: i,
      netIncome: rr.netIncome, depreciation: rr.depreciation,
      arChange, apChange, invChange, taxPaid: rr.tax,
      operatingCF, capex, investingCF, loanChange, financingCF,
      netCashFlow, openingCash: prevCash, closingCash,
    });
  }
  return months;
}

// ─── METRICS ───
export function calculateMetrics(drivers: BudgetDrivers, rr: RRMonth[], kf: KFMonth[]): BudgetMetrics {
  const annualRevenue = rr.reduce((s, m) => s + m.revenue, 0);
  const annualNetIncome = rr.reduce((s, m) => s + m.netIncome, 0);
  const annualGrossProfit = rr.reduce((s, m) => s + m.grossProfit, 0);
  const annualEbitda = rr.reduce((s, m) => s + m.ebitda, 0);

  const grossMarginPct = annualRevenue > 0 ? (annualGrossProfit / annualRevenue) * 100 : 0;
  const ebitdaMarginPct = annualRevenue > 0 ? (annualEbitda / annualRevenue) * 100 : 0;

  const avgMonthlyCF = kf.reduce((s, m) => s + m.netCashFlow, 0) / 12;
  const burnRate = avgMonthlyCF < 0 ? avgMonthlyCF : 0;
  const endingCash = kf[11]?.closingCash || 0;
  const runway = burnRate < 0 ? Math.floor(endingCash / Math.abs(burnRate)) : null;

  const breakEvenMonth = rr.findIndex(m => m.netIncome > 0);

  // LTV = ARPU / churn
  const churnDecimal = drivers.churnRate / 100;
  const ltv = churnDecimal > 0
    ? drivers.averageRevenuePerCustomer / churnDecimal
    : drivers.averageRevenuePerCustomer * 120;

  const cac = drivers.marketingBudget > 0 && drivers.newCustomersPerMonth > 0
    ? drivers.marketingBudget / drivers.newCustomersPerMonth
    : 0;

  return {
    annualRevenue, annualNetIncome, grossMarginPct, ebitdaMarginPct,
    burnRate, runway, breakEvenMonth: breakEvenMonth >= 0 ? breakEvenMonth : null,
    ltv, cac, endingCash,
  };
}

export const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];

// ─── SCENARIO MULTIPLIER ───
export type ScenarioType = "base" | "optimistic" | "pessimistic";

export function applyScenario(drivers: BudgetDrivers, scenario: ScenarioType): BudgetDrivers {
  if (scenario === "base") return drivers;
  const revMul = scenario === "optimistic" ? 1.20 : 0.80;
  const costMul = scenario === "optimistic" ? 1.05 : 0.95;
  return {
    ...drivers,
    averageRevenuePerCustomer: drivers.averageRevenuePerCustomer * revMul,
    newCustomersPerMonth: Math.round(drivers.newCustomersPerMonth * revMul),
    cogsPercent: drivers.cogsPercent,
    salaryMonthly: Math.round(drivers.salaryMonthly * costMul),
    marketingBudget: Math.round(drivers.marketingBudget * costMul),
    adminCosts: Math.round(drivers.adminCosts * costMul),
    rdCosts: Math.round(drivers.rdCosts * costMul),
  };
}
