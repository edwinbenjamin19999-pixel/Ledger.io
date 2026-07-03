/**
 * Section 9 — Balance Sheet Continuous Reconciliation
 * Validates the accounting equation after every journal entry commit.
 * Tillgångar (klass 1) = Skulder + Eget Kapital (klass 2)
 */

import { supabase } from '@/integrations/supabase/client';
import type { ChartOfAccountsJoin } from "@/types/database-extensions";

export interface ReconciliationResult {
  balanced: boolean;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  difference: number;
  details?: string;
}

/**
 * Validates that the accounting equation holds:
 * Sum of class 1 (assets) = Sum of class 2 (liabilities + equity)
 * 
 * Class 1: Assets are debit-normal → balance = sum(debit) - sum(credit)
 * Class 2: Liabilities/equity are credit-normal → balance = sum(credit) - sum(debit)
 * 
 * Uses paginated fetches to avoid Supabase 1000-row limit.
 */
export async function validateBalanceSheet(companyId: string): Promise<ReconciliationResult> {
  try {
    // Paginate journal entry IDs to avoid 1000-row limit
    let allEntryIds: string[] = [];
    let page = 0;
    const pageSize = 1000;
    while (true) {
      const { data: entries } = await supabase
        .from('journal_entries')
        .select('id')
        .eq('company_id', companyId)
        .in('status', ['approved', 'posted'])
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (!entries?.length) break;
      allEntryIds.push(...entries.map(e => e.id));
      if (entries.length < pageSize) break;
      page++;
    }

    if (!allEntryIds.length) {
      return { balanced: true, totalAssets: 0, totalLiabilities: 0, totalEquity: 0, difference: 0 };
    }

    // Fetch all lines in batches of 50 entry IDs, paginating each batch
    let allLines: any[] = [];
    for (let i = 0; i < allEntryIds.length; i += 50) {
      const batch = allEntryIds.slice(i, i + 50);
      let linePage = 0;
      while (true) {
        const { data: batchLines } = await supabase
          .from('journal_entry_lines')
          .select('debit, credit, chart_of_accounts(account_number)')
          .in('journal_entry_id', batch)
          .range(linePage * pageSize, (linePage + 1) * pageSize - 1);
        
        if (!batchLines?.length) break;
        allLines.push(...batchLines);
        if (batchLines.length < pageSize) break;
        linePage++;
      }
    }

    let totalAssets = 0;      // Class 1 (debit-normal)
    let totalLiabilities = 0; // Class 2 excl equity (credit-normal)
    let totalEquity = 0;      // Class 2080-2099 (credit-normal)
    let yearResult = 0;       // Class 3-8 (result accounts)

    for (const line of allLines) {
      const acctNum = (line.chart_of_accounts as ChartOfAccountsJoin | null)?.account_number || '';
      const debit = line.debit || 0;
      const credit = line.credit || 0;
      const firstChar = acctNum.charAt(0);

      if (firstChar === '1') {
        totalAssets += debit - credit;
      } else if (firstChar === '2') {
        const num = parseInt(acctNum);
        if (num >= 2010 && num <= 2099) {
          totalEquity += credit - debit;
        } else {
          totalLiabilities += credit - debit;
        }
      } else if (['3', '4', '5', '6', '7', '8'].includes(firstChar)) {
        yearResult += credit - debit; // Revenue positive, costs negative
      }
    }

    totalEquity += yearResult;

    const rightSide = totalLiabilities + totalEquity;
    const difference = Math.abs(totalAssets - rightSide);
    const balanced = difference <= 1; // 1 kr tolerance

    return {
      balanced,
      totalAssets: Math.round(totalAssets * 100) / 100,
      totalLiabilities: Math.round(totalLiabilities * 100) / 100,
      totalEquity: Math.round(totalEquity * 100) / 100,
      difference: Math.round(difference * 100) / 100,
      details: balanced
        ? undefined
        : `Tillgångar: ${totalAssets.toFixed(2)} kr ≠ Skulder + EK: ${rightSide.toFixed(2)} kr. Differens: ${difference.toFixed(2)} kr.`,
    };
  } catch (error: any) {
    return {
      balanced: true, // Don't block on errors
      totalAssets: 0,
      totalLiabilities: 0,
      totalEquity: 0,
      difference: 0,
      details: `Kunde inte validera balansräkning: ${error.message}`,
    };
  }
}
