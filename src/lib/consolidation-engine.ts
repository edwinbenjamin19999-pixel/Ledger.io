/**
 * Consolidation calculation engine
 * Aggregates entity trial balances, applies eliminations, calculates KPIs
 */

export interface EntityBalance {
  entity_id: string;
  entity_name: string;
  account_no: string;
  account_name: string;
  debit: number;
  credit: number;
  closing_balance: number;
}

export interface ConsolidatedAccount {
  account_no: string;
  account_name: string;
  entity_amounts: Record<string, number>; // entity_id -> closing_balance
  raw_total: number;
  elimination: number;
  adjustment: number;
  consolidated: number;
}

export interface ConsolidationResult {
  accounts: Map<string, ConsolidatedAccount>;
  kpis: ConsolidationKPIs;
  brValidation: BRValidation;
}

export interface ConsolidationKPIs {
  revenue: number;
  ebitda: number;
  ebitdaMargin: number;
  ebit: number;
  netIncome: number;
  operatingMargin: number;
  totalAssets: number;
  totalEquity: number;
  soliditet: number;
  netDebt: number;
  debtToEbitda: number;
  currentRatio: number;
}

export interface BRValidation {
  totalAssets: number;
  totalEquityAndLiabilities: number;
  difference: number;
  isBalanced: boolean;
}

// RR section definitions
export const RR_SECTIONS = [
  { key: "revenue", label: "RÖRELSEINTÄKTER", range: ["3"], resultLabel: "Summa rörelseintäkter" },
  { key: "cogs", label: "RÖRELSEKOSTNADER", range: ["4", "5", "6", "7"], resultLabel: "Summa rörelsekostnader" },
  { key: "financial", label: "FINANSIELLA POSTER", range: ["8"], resultLabel: "Summa finansiella poster" },
];

// BR section definitions - complete klass 2 coverage
export const BR_ASSET_SECTIONS = [
  { key: "fixed_intangible", label: "Immateriella anläggningstillgångar", range: ["10"] },
  { key: "fixed_tangible", label: "Materiella anläggningstillgångar", range: ["11", "12"] },
  { key: "fixed_financial", label: "Finansiella anläggningstillgångar", range: ["13"] },
  { key: "current_inventory", label: "Varulager m.m.", range: ["14"] },
  { key: "current_receivables", label: "Kortfristiga fordringar", range: ["15", "16", "17"] },
  { key: "current_investments", label: "Kortfristiga placeringar", range: ["18"] },
  { key: "current_cash", label: "Kassa och bank", range: ["19"] },
];

export const BR_EQUITY_SECTIONS = [
  { key: "eq_restricted", label: "Bundet eget kapital", range: ["2081", "2082", "2085", "2086", "2088"] },
  { key: "eq_unrestricted", label: "Fritt eget kapital", range: ["2084", "2091", "2092", "2093", "2094", "2095", "2097", "2098", "2099"] },
];

export const BR_LIABILITY_SECTIONS = [
  { key: "untaxed_reserves", label: "Obeskattade reserver", range: ["21"] },
  { key: "provisions", label: "Avsättningar", range: ["22"] },
  { key: "long_term_debt", label: "Långfristiga skulder", range: ["23"] },
  { key: "short_term_debt", label: "Kortfristiga skulder", range: ["24", "25", "26", "27", "28", "29"] },
];

function accountMatchesRange(accountNo: string, ranges: string[]): boolean {
  return ranges.some(r => accountNo.startsWith(r));
}

export function runConsolidationEngine(
  balances: EntityBalance[],
  eliminations: { account_no: string; debit: number; credit: number }[],
  entities: { id: string; name: string }[]
): ConsolidationResult {
  // Step 1: Aggregate by account
  const accounts = new Map<string, ConsolidatedAccount>();

  for (const bal of balances) {
    let acc = accounts.get(bal.account_no);
    if (!acc) {
      acc = {
        account_no: bal.account_no,
        account_name: bal.account_name,
        entity_amounts: {},
        raw_total: 0,
        elimination: 0,
        adjustment: 0,
        consolidated: 0,
      };
      accounts.set(bal.account_no, acc);
    }
    acc.entity_amounts[bal.entity_id] = (acc.entity_amounts[bal.entity_id] || 0) + bal.closing_balance;
  }

  // Calculate raw totals
  for (const acc of accounts.values()) {
    acc.raw_total = Object.values(acc.entity_amounts).reduce((s, v) => s + v, 0);
  }

  // Step 2: Apply eliminations
  for (const elim of eliminations) {
    const acc = accounts.get(elim.account_no);
    if (acc) {
      acc.elimination += (elim.debit || 0) - (elim.credit || 0);
    }
  }

  // Step 3: Calculate consolidated amounts
  for (const acc of accounts.values()) {
    acc.consolidated = acc.raw_total - acc.elimination + acc.adjustment;
  }

  // Step 3b: Inject synthetic "Årets resultat" (2099) if not already present
  // Net income = revenue (class 3, credit=negative) + costs (class 4-8, debit=positive)
  // In the balance sheet, this should appear as a credit (negative closing_balance)
  let syntheticNetIncome = 0;
  const perEntityNetIncome: Record<string, number> = {};
  for (const acc of accounts.values()) {
    const first = acc.account_no.charAt(0);
    if (first >= "3" && first <= "8") {
      // These are RR accounts; their closing_balance contributes to net income
      // closing_balance = debit - credit, so revenue (credit) is negative, costs (debit) positive
      syntheticNetIncome += acc.consolidated;
      for (const [eid, amt] of Object.entries(acc.entity_amounts)) {
        perEntityNetIncome[eid] = (perEntityNetIncome[eid] || 0) + amt;
      }
    }
  }

  // Only inject if there's no real 2099 account with a balance
  const existing2099 = accounts.get("2099");
  if (!existing2099 || Math.abs(existing2099.consolidated) < 0.5) {
    // Net income from RR perspective: revenue is negative (credit), costs positive (debit)
    // So syntheticNetIncome is negative when profitable (more credits than debits)
    // This is exactly what we want för a credit-side equity account
    const synthetic: ConsolidatedAccount = {
      account_no: "2099",
      account_name: "Årets resultat",
      entity_amounts: perEntityNetIncome,
      raw_total: Object.values(perEntityNetIncome).reduce((s, v) => s + v, 0),
      elimination: 0,
      adjustment: 0,
      consolidated: syntheticNetIncome,
    };
    if (existing2099) {
      // Merge into existing
      existing2099.entity_amounts = synthetic.entity_amounts;
      existing2099.raw_total = synthetic.raw_total;
      existing2099.consolidated = synthetic.consolidated;
    } else {
      accounts.set("2099", synthetic);
    }
  }

  // Step 4: Calculate KPIs
  const sumRange = (ranges: string[]) => {
    let total = 0;
    for (const acc of accounts.values()) {
      if (accountMatchesRange(acc.account_no, ranges)) {
        total += acc.consolidated;
      }
    }
    return total;
  };

  const revenue = -sumRange(["3"]); // Revenue accounts are credit (negative), flip sign
  const opCosts = sumRange(["4", "5", "6"]); // Operating costs are debit (positive)
  const depreciation = sumRange(["78"]); // 78xx depreciation
  const personalCosts = sumRange(["7"]); // Includes depreciation
  const ebit = revenue - opCosts - personalCosts;
  const ebitda = ebit + depreciation;
  const financialNet = -sumRange(["8"]);
  const netIncome = ebit + financialNet;

  const totalAssets = sumRange(["1"]);
  const equity20 = sumRange(["20"]); // Klass 20xx = equity (usually negative = credit)
  const untaxedReserves = sumRange(["21"]);
  const totalEquity = -equity20; // Flip sign since equity is credit
  const soliditetEquity = totalEquity + 0.78 * Math.abs(untaxedReserves);
  const soliditet = totalAssets > 0 ? (soliditetEquity / totalAssets) * 100 : 0;

  // Net debt
  const interestBearingDebt = Math.abs(sumRange(["23"])); // Long-term loans
  const cashAndBank = sumRange(["19"]);
  const netDebt = interestBearingDebt - cashAndBank;
  const debtToEbitda = ebitda !== 0 ? netDebt / ebitda : 0;

  // Current ratio
  const currentAssets = sumRange(["14", "15", "16", "17", "18", "19"]);
  const inventory = sumRange(["14"]);
  const currentLiabilities = Math.abs(sumRange(["24", "25", "26", "27", "28", "29"]));
  const currentRatio = currentLiabilities > 0 ? (currentAssets - inventory) / currentLiabilities : 0;

  // BR validation
  const brTotalAssets = totalAssets;
  const brTotalEqLiab = -sumRange(["2"]); // Klass 2 is credit, flip
  const brDiff = Math.abs(brTotalAssets - brTotalEqLiab);

  return {
    accounts,
    kpis: {
      revenue,
      ebitda,
      ebitdaMargin: revenue !== 0 ? (ebitda / revenue) * 100 : 0,
      ebit,
      netIncome,
      operatingMargin: revenue !== 0 ? (ebit / revenue) * 100 : 0,
      totalAssets,
      totalEquity,
      soliditet,
      netDebt,
      debtToEbitda,
      currentRatio,
    },
    brValidation: {
      totalAssets: brTotalAssets,
      totalEquityAndLiabilities: brTotalEqLiab,
      difference: brDiff,
      isBalanced: brDiff < 1,
    },
  };
}

export function formatSEK(n: number): string {
  if (Math.abs(n) < 0.5) return "—";
  return n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });
}
