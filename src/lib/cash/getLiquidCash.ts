import { supabase } from "@/integrations/supabase/client";

/**
 * Canonical liquid cash selector.
 *
 * Returns UB (utgående balans) for liquid funds = sum of debit-credit on all
 * BAS accounts 1910-1930 (kassa/postgiro/bank) across posted/approved
 * journal entries. Drafts and pending approvals are not ledger-affecting.
 *
 * This is the SAME source the cashflow forecast (useCashflowForecast),
 * the AR/AP reskontra and the CFO dashboard use, so every "Likvid kassa" /
 * "Runway" surface in the app must derive from this number. Never read
 * `bank_accounts.balance` directly for the user-facing cash figure — bank
 * accounts may be 0 when no bank is connected even though the ledger
 * carries a real balance.
 */
export async function getLiquidCash(companyId: string): Promise<number> {
  if (!companyId) return 0;

  const { data: cashAccounts } = await supabase
    .from("chart_of_accounts")
    .select("id, account_number")
    .eq("company_id", companyId)
    .gte("account_number", "1910")
    .lte("account_number", "1930");

  const ids = (cashAccounts ?? []).map((a) => a.id);
  if (ids.length === 0) return 0;

  const { data: lines } = await supabase
    .from("journal_entry_lines")
    .select("debit, credit, journal_entries!inner(company_id, status)")
    .eq("journal_entries.company_id", companyId)
    .in("journal_entries.status", ["approved", "posted"])
    .in("account_id", ids);

  return (lines ?? []).reduce(
    (s, l) => s + Number(l.debit ?? 0) - Number(l.credit ?? 0),
    0,
  );
}
