import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TrialBalanceAccount {
  accountNumber: string;
  name: string;
  balance: number;
  activity: number;
  lastActivity: string | null;
}

export function useTrialBalance(companyId: string | null, fiscalYear: number | null) {
  return useQuery({
    queryKey: ["trial-balance", companyId, fiscalYear],
    enabled: !!companyId,
    queryFn: async (): Promise<TrialBalanceAccount[]> => {
      const yearStart = `${fiscalYear ?? new Date().getFullYear()}-01-01`;
      const yearEnd = `${(fiscalYear ?? new Date().getFullYear()) + 1}-01-01`;

      const [{ data: coa }, { data: lines }] = await Promise.all([
        supabase.from("chart_of_accounts")
          .select("id, account_number, account_name")
          .eq("company_id", companyId!),
        supabase.from("journal_entry_lines")
          .select("account_id, debit, credit, journal_entries!inner(entry_date, status, company_id)")
          .eq("journal_entries.company_id", companyId!)
          .in("journal_entries.status", ["posted", "approved"])
          .gte("journal_entries.entry_date", yearStart)
          .lt("journal_entries.entry_date", yearEnd)
          .limit(50000),
      ]);

      const byId = new Map<string, { number: string; name: string }>();
      const map = new Map<string, TrialBalanceAccount>();
      for (const a of (coa ?? []) as Array<{ id: string; account_number: string; account_name: string }>) {
        byId.set(a.id, { number: a.account_number, name: a.account_name });
        map.set(a.account_number, { accountNumber: a.account_number, name: a.account_name, balance: 0, activity: 0, lastActivity: null });
      }
      for (const l of (lines ?? []) as Array<{ account_id: string; debit: number | null; credit: number | null; journal_entries: { entry_date: string } | null }>) {
        const ref = byId.get(l.account_id);
        if (!ref) continue;
        const entry = map.get(ref.number)!;
        const d = Number(l.debit ?? 0), c = Number(l.credit ?? 0);
        entry.balance += d - c;
        entry.activity += d + c;
        const date = l.journal_entries?.entry_date;
        if (date && (!entry.lastActivity || date > entry.lastActivity)) entry.lastActivity = date;
      }
      return Array.from(map.values()).sort((a, b) => a.accountNumber.localeCompare(b.accountNumber));
    },
  });
}
