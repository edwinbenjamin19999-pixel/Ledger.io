import { supabase } from "@/integrations/supabase/client";
import { INK2R_SRU_MAPPINGS, type SruRangeMapping } from "./basSruMapping";

export interface SruCalculationResult {
  sruCode: string;
  label: string;
  value: number;
  section: string;
  /** Which BAS accounts contributed and how much */
  contributions: { accountNumber: string; accountName: string; amount: number }[];
}

interface AccountBalance {
  account_number: string;
  account_name: string;
  debit: number;
  credit: number;
  balance: number; // debit - credit
}

/**
 * Calculate all INK2R SRU values from the general ledger.
 */
export async function calculateINK2RValues(
  companyId: string,
  fiscalYearStart: string,
  fiscalYearEnd: string
): Promise<{ results: SruCalculationResult[]; transactionCount: number; accountCount: number }> {
  // 1. Fetch approved journal entries for fiscal year
  const { data: entries } = await supabase
    .from("journal_entries")
    .select("id")
    .eq("company_id", companyId)
    .eq("status", "approved")
    .gte("entry_date", fiscalYearStart)
    .lte("entry_date", fiscalYearEnd);

  const entryIds = (entries || []).map((e) => e.id);
  if (entryIds.length === 0) {
    return { results: buildEmptyResults(), transactionCount: 0, accountCount: 0 };
  }

  // 2. Fetch all lines in batches
  let allLines: any[] = [];
  for (let i = 0; i < entryIds.length; i += 100) {
    const batch = entryIds.slice(i, i + 100);
    const { data: lines } = await supabase
      .from("journal_entry_lines")
      .select("debit, credit, chart_of_accounts!inner(account_number, account_name)")
      .in("journal_entry_id", batch);
    allLines.push(...(lines || []));
  }

  // 3. Build account balances
  const balMap = new Map<string, AccountBalance>();
  for (const l of allLines) {
    const num = l.chart_of_accounts?.account_number || "";
    const name = l.chart_of_accounts?.account_name || "";
    if (!num) continue;
    const existing = balMap.get(num) || { account_number: num, account_name: name, debit: 0, credit: 0, balance: 0 };
    existing.debit += l.debit || 0;
    existing.credit += l.credit || 0;
    existing.balance = existing.debit - existing.credit;
    balMap.set(num, existing);
  }

  const balances = Array.from(balMap.values());

  // 4. Map to SRU codes
  const sruMap = new Map<string, SruCalculationResult>();

  // Initialize all SRU codes
  for (const mapping of INK2R_SRU_MAPPINGS) {
    if (!sruMap.has(mapping.sruCode)) {
      sruMap.set(mapping.sruCode, {
        sruCode: mapping.sruCode,
        label: mapping.label,
        value: 0,
        section: mapping.section,
        contributions: [],
      });
    }
  }

  // Calculate values
  for (const bal of balances) {
    for (const mapping of INK2R_SRU_MAPPINGS) {
      if (bal.account_number >= mapping.from && bal.account_number <= mapping.to) {
        const result = sruMap.get(mapping.sruCode)!;
        const amount = bal.balance * mapping.sign;
        result.value += amount;
        result.contributions.push({
          accountNumber: bal.account_number,
          accountName: bal.account_name,
          amount,
        });
      }
    }
  }

  return {
    results: Array.from(sruMap.values()),
    transactionCount: allLines.length,
    accountCount: balances.length,
  };
}

function buildEmptyResults(): SruCalculationResult[] {
  const results: SruCalculationResult[] = [];
  for (const mapping of INK2R_SRU_MAPPINGS) {
    if (!results.find((r) => r.sruCode === mapping.sruCode)) {
      results.push({
        sruCode: mapping.sruCode,
        label: mapping.label,
        value: 0,
        section: mapping.section,
        contributions: [],
      });
    }
  }
  return results;
}
