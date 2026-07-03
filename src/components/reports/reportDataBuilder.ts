import { format } from "date-fns";
import type { ReportAccountRow, ReportSection } from "./ProfessionalReportTable";

export interface RawJournalLine {
  debit: number;
  credit: number;
  account_id: string;
  _entryDate?: string;
  /** Optional verification id — populated by the report loader so diagnostics
   *  can point to the exact verification that creates a balance discrepancy. */
  _entryId?: string;
  _entryDescription?: string;
  chart_of_accounts: {
    account_number: string;
    account_name: string;
    account_type: string;
  };
}

/** @deprecated kept for legacy imports — use RawJournalLine. */
export type RawLine = RawJournalLine;

export interface ChartAccount {
  account_number: string;
  account_name: string;
  account_type: string;
}

// Compute per-account: ingBalans, ingSaldo, perioden, utgBalans
// For Balance sheet (class 1-2): cumulative, sign depends on account class
// For Income statement (class 3-8): period-based, reset each year
export function buildAccountRows(
  allLines: RawJournalLine[],
  chartAccounts: ChartAccount[],
  fromDate: Date,
  toDate: Date,
  fiscalYearStart: Date,
  accountFilter: (num: string) => boolean,
  naturalSign: "debit" | "credit"
): ReportAccountRow[] {
  const fromStr = format(fromDate, "yyyy-MM-dd");
  const toStr = format(toDate, "yyyy-MM-dd");
  const fysStr = format(fiscalYearStart, "yyyy-MM-dd");

  // Filter relevant lines
  const relevantAccounts = chartAccounts.filter((a) => accountFilter(a.account_number));

  // Group lines by account number
  const linesByAccount: Record<string, RawLine[]> = {};
  allLines.forEach((line) => {
    const num = line.chart_of_accounts?.account_number;
    if (!num || !accountFilter(num)) return;
    if (!linesByAccount[num]) linesByAccount[num] = [];
    linesByAccount[num].push(line);
  });

  const signMultiplier = naturalSign === "debit" ? 1 : -1;

  return relevantAccounts.map((acct) => {
    const lines = linesByAccount[acct.account_number] || [];

    let ingBalans = 0; // All lines before fiscal year start
    let ingSaldo = 0;  // All lines before period start (but >= fiscal year start för P&L)
    let perioden = 0;  // Lines within period

    lines.forEach((line) => {
      const date = line._entryDate || "";
      const net = ((line.debit || 0) - (line.credit || 0)) * signMultiplier;

      if (date < fysStr) {
        ingBalans += net;
      } else if (date < fromStr) {
        ingSaldo += net;
      } else if (date <= toStr) {
        perioden += net;
      }
    });

    // For balance sheet accounts, ingBalans is cumulative from all time before FY start
    // ingSaldo = ingBalans + movements from FY start to period start
    const totalIngSaldo = ingBalans + ingSaldo;
    const utgBalans = totalIngSaldo + perioden;

    return {
      accountNumber: acct.account_number,
      accountName: acct.account_name,
      ingBalans,
      ingSaldo: totalIngSaldo,
      perioden,
      utgBalans,
    };
  }).sort((a, b) => a.accountNumber.localeCompare(b.accountNumber));
}

// BAS account plan grouping för Balance Sheet
const bsGroups: { title: string; filter: (n: string) => boolean; subtotalLabel: string }[] = [
  { title: "Immateriella anläggningstillgångar", filter: (n) => n.startsWith("10"), subtotalLabel: "Sa immateriella anl.tillg." },
  { title: "Materiella anläggningstillgångar", filter: (n) => /^1[1-2]/.test(n), subtotalLabel: "Sa materiella anl.tillg." },
  { title: "Finansiella anläggningstillgångar", filter: (n) => n.startsWith("13"), subtotalLabel: "Sa finansiella anl.tillg." },
  { title: "Varulager", filter: (n) => n.startsWith("14"), subtotalLabel: "Sa varulager" },
  { title: "Kortfristiga fordringar", filter: (n) => /^1[5-7]/.test(n), subtotalLabel: "Sa kortfristiga fordringar" },
  { title: "Kortfristiga placeringar", filter: (n) => n.startsWith("18"), subtotalLabel: "Sa kortfristiga placeringar" },
  { title: "Kassa och bank", filter: (n) => n.startsWith("19"), subtotalLabel: "Sa kassa och bank" },
];

const ekGroups: { title: string; filter: (n: string) => boolean; subtotalLabel: string }[] = [
  { title: "Eget kapital", filter: (n) => n.startsWith("20"), subtotalLabel: "Sa eget kapital" },
  { title: "Obeskattade reserver", filter: (n) => n.startsWith("21"), subtotalLabel: "Sa obeskattade reserver" },
  { title: "Avsättningar", filter: (n) => n.startsWith("22"), subtotalLabel: "Sa avsättningar" },
  { title: "Långfristiga skulder", filter: (n) => n.startsWith("23"), subtotalLabel: "Sa långfristiga skulder" },
  { title: "Kortfristiga skulder", filter: (n) => /^2[4-9]/.test(n), subtotalLabel: "Sa kortfristiga skulder" },
];

export function buildBalanceSheetSections(
  allRows: ReportAccountRow[]
): { assets: ReportSection; equityLiabilities: ReportSection } {
  const assetRows = allRows.filter((r) => r.accountNumber.startsWith("1"));
  const ekRows = allRows.filter((r) => r.accountNumber.startsWith("2"));

  const fixedAssetChildren: ReportSection[] = [];
  const currentAssetChildren: ReportSection[] = [];

  bsGroups.forEach((g) => {
    const accounts = assetRows.filter((r) => g.filter(r.accountNumber));
    if (accounts.length === 0) return;
    const isFixed = /^1[0-3]/.test(accounts[0]?.accountNumber || "");
    (isFixed ? fixedAssetChildren : currentAssetChildren).push({
      level: 2,
      title: g.title,
      accounts,
      subtotalLabel: g.subtotalLabel,
    });
  });

  const ekChildren: ReportSection[] = [];
  ekGroups.forEach((g) => {
    const accounts = ekRows.filter((r) => g.filter(r.accountNumber));
    if (accounts.length === 0) return;
    ekChildren.push({
      level: 2,
      title: g.title,
      accounts,
      subtotalLabel: g.subtotalLabel,
    });
  });

  const sumAccounts = (rows: ReportAccountRow[]) => ({
    ingBalans: rows.reduce((s, r) => s + r.ingBalans, 0),
    ingSaldo: rows.reduce((s, r) => s + r.ingSaldo, 0),
    perioden: rows.reduce((s, r) => s + r.perioden, 0),
    utgBalans: rows.reduce((s, r) => s + r.utgBalans, 0),
  });

  return {
    assets: {
      level: 1,
      title: "TILLGÅNGAR",
      accounts: [],
      subtotalLabel: "SA TILLGÅNGAR",
      children: [
        ...(fixedAssetChildren.length > 0
          ? [{
              level: 1 as const,
              title: "Anläggningstillgångar",
              accounts: [] as ReportAccountRow[],
              subtotalLabel: "Sa anläggningstillgångar",
              children: fixedAssetChildren,
            }]
          : []),
        ...(currentAssetChildren.length > 0
          ? [{
              level: 1 as const,
              title: "Omsättningstillgångar",
              accounts: [] as ReportAccountRow[],
              subtotalLabel: "Sa omsättningstillgångar",
              children: currentAssetChildren,
            }]
          : []),
      ],
    },
    equityLiabilities: {
      level: 1,
      title: "EGET KAPITAL, AVSÄTTN. OCH SKULDER",
      accounts: [],
      subtotalLabel: "SA EGET KAPITAL OCH SKULDER",
      children: ekChildren,
    },
  };
}

// BAS account plan grouping för Income Statement
const isGroups: { title: string; filter: (n: string) => boolean; subtotalLabel: string; section: string }[] = [
  { title: "Nettoomsättning", filter: (n) => /^3[0-7]/.test(n), subtotalLabel: "Sa nettoomsättning", section: "income" },
  { title: "Övriga rörelseintäkter", filter: (n) => /^3[8-9]/.test(n), subtotalLabel: "Sa övriga rörelseintäkter", section: "income" },
  { title: "Råvaror och förnödenheter", filter: (n) => n.startsWith("4"), subtotalLabel: "Sa råvaror och förnödenheter", section: "expense" },
  { title: "Övriga externa kostnader", filter: (n) => n.startsWith("5") || n.startsWith("6"), subtotalLabel: "Sa övriga externa kostnader", section: "expense" },
  { title: "Personalkostnader", filter: (n) => n.startsWith("7"), subtotalLabel: "Sa personalkostnader", section: "expense" },
  { title: "Finansiella intäkter", filter: (n) => /^8[0-2]/.test(n), subtotalLabel: "Sa finansiella intäkter", section: "financial" },
  { title: "Finansiella kostnader", filter: (n) => /^8[3-4]/.test(n), subtotalLabel: "Sa finansiella kostnader", section: "financial" },
  { title: "Bokslutsdispositioner", filter: (n) => n.startsWith("88"), subtotalLabel: "Sa bokslutsdispositioner", section: "approp" },
  { title: "Skatt på årets resultat", filter: (n) => n.startsWith("89"), subtotalLabel: "Sa skatt", section: "tax" },
];

export function buildIncomeStatementSections(
  allRows: ReportAccountRow[]
): ReportSection[] {
  const incomeChildren: ReportSection[] = [];
  const expenseChildren: ReportSection[] = [];
  const financialChildren: ReportSection[] = [];
  const appropChildren: ReportSection[] = [];
  const taxChildren: ReportSection[] = [];

  isGroups.forEach((g) => {
    const accounts = allRows.filter((r) => g.filter(r.accountNumber));
    if (accounts.length === 0) return;
    const section: ReportSection = {
      level: 2,
      title: g.title,
      accounts,
      subtotalLabel: g.subtotalLabel,
    };
    switch (g.section) {
      case "income": incomeChildren.push(section); break;
      case "expense": expenseChildren.push(section); break;
      case "financial": financialChildren.push(section); break;
      case "approp": appropChildren.push(section); break;
      case "tax": taxChildren.push(section); break;
    }
  });

  const sections: ReportSection[] = [];

  if (incomeChildren.length > 0) {
    sections.push({
      level: 1,
      title: "RÖRELSEINTÄKTER",
      accounts: [],
      subtotalLabel: "Sa rörelseintäkter",
      children: incomeChildren,
    });
  }

  if (expenseChildren.length > 0) {
    sections.push({
      level: 1,
      title: "RÖRELSEKOSTNADER",
      accounts: [],
      subtotalLabel: "Sa rörelsekostnader",
      children: expenseChildren,
    });
  }

  if (financialChildren.length > 0) {
    sections.push({
      level: 1,
      title: "FINANSIELLA POSTER",
      accounts: [],
      subtotalLabel: "Resultat efter finansiella poster",
      children: financialChildren,
    });
  }

  if (appropChildren.length > 0) {
    sections.push({
      level: 1,
      title: "BOKSLUTSDISPOSITIONER",
      accounts: [],
      children: appropChildren,
    });
  }

  if (taxChildren.length > 0) {
    sections.push({
      level: 1,
      title: "SKATT",
      accounts: [],
      children: taxChildren,
    });
  }

  return sections;
}
