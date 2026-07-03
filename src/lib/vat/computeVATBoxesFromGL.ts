/**
 * Shared VAT aggregation helper — single source of truth for all modules
 * that need to compute Skatteverket VAT boxes (05–62, 48, 49) from the
 * general ledger. Used by /vat-reports and /tax-calculation to guarantee
 * identical numbers across the platform.
 *
 * Reads approved journal_entries + journal_entry_lines for the period,
 * maps BAS accounts (3xxx revenue, 4xxx EU/import purchases, 26xx VAT
 * accounts) to SKV boxes, and returns the same VATDeclarationData shape
 * that VATReports.tsx consumed inline before this refactor.
 */
import { supabase } from "@/integrations/supabase/client";
import type { ChartOfAccountsJoin } from "@/types/database-extensions";

export interface AccountBalance {
  accountNumber: string;
  accountName: string;
  debitTotal: number;
  creditTotal: number;
  vatCode: string | null;
}

export interface VATDeclarationData {
  box05: number; box06: number; box07: number; box08: number;
  box10: number; box11: number; box12: number;
  box20: number; box21: number; box22: number; box23: number; box24: number;
  box30: number; box31: number; box32: number;
  box35: number; box36: number; box37: number; box38: number; box39: number; box40: number; box41: number; box42: number;
  box50: number; box60: number; box61: number; box62: number;
  box48: number; box49: number;
  outputVatAccounts: AccountBalance[];
  inputVatAccounts: AccountBalance[];
  allAccounts: AccountBalance[];
  hasData: boolean;
}

const EMPTY: VATDeclarationData = {
  box05: 0, box06: 0, box07: 0, box08: 0,
  box10: 0, box11: 0, box12: 0,
  box20: 0, box21: 0, box22: 0, box23: 0, box24: 0,
  box30: 0, box31: 0, box32: 0,
  box35: 0, box36: 0, box37: 0, box38: 0, box39: 0, box40: 0, box41: 0, box42: 0,
  box50: 0, box60: 0, box61: 0, box62: 0,
  box48: 0, box49: 0,
  outputVatAccounts: [], inputVatAccounts: [], allAccounts: [],
  hasData: false,
};

export async function computeVATBoxesFromGL(
  companyId: string,
  periodStart: string,
  periodEnd: string,
): Promise<VATDeclarationData> {
  if (!companyId) return EMPTY;

  const { data: entries, error: entriesError } = await supabase
    .from("journal_entries")
    .select("id")
    .eq("company_id", companyId)
    .eq("status", "approved")
    .gte("entry_date", periodStart)
    .lte("entry_date", periodEnd);

  if (entriesError) throw entriesError;
  const entryIds = (entries ?? []).map(e => e.id);
  if (entryIds.length === 0) return EMPTY;

  const BATCH_SIZE = 100;
  const allLines: any[] = [];
  for (let i = 0; i < entryIds.length; i += BATCH_SIZE) {
    const batch = entryIds.slice(i, i + BATCH_SIZE);
    const { data: batchLines, error: linesError } = await supabase
      .from("journal_entry_lines")
      .select(`debit, credit, vat_code, vat_amount, journal_entry_id, chart_of_accounts!inner ( account_number, account_name, vat_code )`)
      .in("journal_entry_id", batch);
    if (linesError) throw linesError;
    allLines.push(...(batchLines ?? []));
  }

  const accountMap = new Map<string, AccountBalance>();
  let box05 = 0, box06 = 0, box07 = 0, box08 = 0;
  const unmappedRevenue: { acctNum: string; amount: number }[] = [];
  let box10 = 0, box11 = 0, box12 = 0, box48 = 0;
  let box20 = 0, box21 = 0, box22 = 0, box23 = 0, box24 = 0;
  let box30 = 0, box31 = 0, box32 = 0;
  let box35 = 0, box36 = 0, box39 = 0, box40 = 0, box41 = 0, box42 = 0;
  let box50 = 0, box60 = 0, box61 = 0, box62 = 0;

  for (const line of allLines) {
    const account = line.chart_of_accounts as ChartOfAccountsJoin | null;
    const acctNum = account?.account_number || "";
    const acctName = account?.account_name || "";
    const lineVatCode = line.vat_code;
    const accountVatCode = account?.vat_code;
    const vatCode = (lineVatCode && lineVatCode !== "none" && lineVatCode !== "0") ? lineVatCode : (accountVatCode || null);
    const debit = line.debit || 0;
    const credit = line.credit || 0;

    if (!accountMap.has(acctNum)) {
      accountMap.set(acctNum, { accountNumber: acctNum, accountName: acctName, debitTotal: 0, creditTotal: 0, vatCode });
    }
    const e = accountMap.get(acctNum)!;
    e.debitTotal += debit;
    e.creditTotal += credit;

    if (acctNum.startsWith("3")) {
      const revenueAmount = credit - debit;
      const effectiveNet = Math.round(revenueAmount);
      if (acctNum === "3300" || acctNum === "3308") box35 += effectiveNet;
      else if (acctNum === "3305") box39 += effectiveNet;
      else if (acctNum === "3310") box36 += effectiveNet;
      else if (acctNum === "3311") box40 += effectiveNet;
      else if (acctNum === "3400" || acctNum === "3401" || acctNum === "3404") box42 += effectiveNet;
      else {
        if (vatCode === "25") box05 += effectiveNet;
        else if (vatCode === "12") box06 += effectiveNet;
        else if (vatCode === "6") box07 += effectiveNet;
        else if (vatCode === "0" || vatCode === "exempt") box08 += Math.abs(effectiveNet);
        else unmappedRevenue.push({ acctNum, amount: effectiveNet });
      }
    }

    if (acctNum === "4040") box20 += debit - credit;
    else if (acctNum === "4045") box21 += debit - credit;
    else if (acctNum === "4055") box22 += debit - credit;
    else if (acctNum === "4050") box23 += debit - credit;

    if (acctNum === "2610" || acctNum === "2611" || acctNum === "2612") box10 += credit - debit;
    else if (acctNum === "2614") box30 += credit - debit;
    else if (acctNum === "2615") box60 += credit - debit;
    else if (acctNum === "2620" || acctNum === "2621" || acctNum === "2622") box11 += credit - debit;
    else if (acctNum === "2630" || acctNum === "2631" || acctNum === "2632") box12 += credit - debit;

    if (acctNum === "2640" || acctNum === "2641") box48 += debit - credit;
    else if (acctNum === "2642") box48 += debit - credit;
    else if (acctNum === "2645") box48 += debit - credit;
    else if (acctNum === "2646") box48 += debit - credit;
  }

  if (unmappedRevenue.length > 0) {
    if (box10 > 0) unmappedRevenue.forEach(r => { box05 += r.amount; });
    else if (box11 > 0) unmappedRevenue.forEach(r => { box06 += r.amount; });
    else if (box12 > 0) unmappedRevenue.forEach(r => { box07 += r.amount; });
    else unmappedRevenue.forEach(r => { box08 += Math.abs(r.amount); });
  }

  if (box10 === 0 && box11 === 0 && box12 === 0 && box48 === 0) {
    for (const line of allLines) {
      const vc = line.vat_code || (line.chart_of_accounts as ChartOfAccountsJoin | null)?.vat_code;
      const va = line.vat_amount || 0;
      const acctNum = (line.chart_of_accounts as ChartOfAccountsJoin | null)?.account_number || "";
      if (va <= 0) continue;
      if (acctNum.startsWith("26")) continue;
      if (acctNum.startsWith("3")) {
        if (vc === "25") box10 += va;
        else if (vc === "12") box11 += va;
        else if (vc === "6") box12 += va;
      } else if (!acctNum.startsWith("3")) {
        box48 += va;
      }
    }
  }

  const totalOutput = Math.round(box10 + box11 + box12 + box30 + box31 + box32 + box60 + box61 + box62);
  const totalInput = Math.round(box48);
  const vatToPay = totalOutput - totalInput;

  const allAccounts = Array.from(accountMap.values())
    .filter(a => a.debitTotal > 0 || a.creditTotal > 0)
    .sort((a, b) => a.accountNumber.localeCompare(b.accountNumber));

  return {
    box05: Math.round(box05), box06: Math.round(box06), box07: Math.round(box07), box08: Math.round(box08),
    box10: Math.round(box10), box11: Math.round(box11), box12: Math.round(box12),
    box20: Math.round(box20), box21: Math.round(box21), box22: Math.round(box22), box23: Math.round(box23), box24: Math.round(box24),
    box30: Math.round(box30), box31: Math.round(box31), box32: Math.round(box32),
    box35: Math.round(box35), box36: Math.round(box36), box37: 0, box38: 0,
    box39: Math.round(box39), box40: Math.round(box40), box41: Math.round(box41), box42: Math.round(box42),
    box50: Math.round(box50), box60: Math.round(box60), box61: Math.round(box61), box62: Math.round(box62),
    box48: totalInput, box49: vatToPay,
    outputVatAccounts: allAccounts.filter(a => a.accountNumber.startsWith("261") || a.accountNumber.startsWith("262") || a.accountNumber.startsWith("263")),
    inputVatAccounts: allAccounts.filter(a => a.accountNumber.startsWith("264")),
    allAccounts,
    hasData: true,
  };
}

/** Build the [start, end] date strings for a given quarter Q1–Q4 of a year. */
export function quarterRange(year: number, quarter: 1 | 2 | 3 | 4): { start: string; end: string } {
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = quarter * 3;
  const lastDay = new Date(year, endMonth, 0).getDate();
  return {
    start: `${year}-${String(startMonth).padStart(2, "0")}-01`,
    end: `${year}-${String(endMonth).padStart(2, "0")}-${lastDay}`,
  };
}

/** Build the [start, end] date strings for a single month (1–12). */
export function monthRange(year: number, month: number): { start: string; end: string } {
  const lastDay = new Date(year, month, 0).getDate();
  return {
    start: `${year}-${String(month).padStart(2, "0")}-01`,
    end: `${year}-${String(month).padStart(2, "0")}-${lastDay}`,
  };
}
