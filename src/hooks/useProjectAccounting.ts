import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getStoredActiveCompanyId } from '@/lib/company-selection';

export function useProjectFinancials(projectId: string | undefined) {
  const companyId = getStoredActiveCompanyId();
  return useQuery({
    queryKey: ['project-financials', companyId, projectId],
    enabled: !!companyId && !!projectId,
    queryFn: async () => {
      // Get journal entry IDs linked to this project
      const { data: txs, error: txErr } = await supabase
        .from('project_transactions')
        .select('journal_entry_id, amount, transaction_type, description, transaction_date')
        .eq('project_id', projectId!);
      if (txErr) throw txErr;

      const jeIds = (txs ?? [])
        .map(t => t.journal_entry_id)
        .filter((id): id is string => !!id);

      if (jeIds.length === 0) {
        return { revenues: 0, costs: 0, result: 0, margin: 0, lines: [], hasData: false };
      }

      // Fetch journal entry lines with account info
      const { data: lines, error: lErr } = await supabase
        .from('journal_entry_lines')
        .select(`
          id, debit, credit, vat_code,
          journal_entry_id,
          chart_of_accounts!inner(account_number, account_name, account_type)
        `)
        .in('journal_entry_id', jeIds);
      if (lErr) throw lErr;

      // Also get journal entry dates
      const { data: entries } = await supabase
        .from('journal_entries')
        .select('id, entry_date, description')
        .in('id', jeIds);
      const entryMap = new Map((entries ?? []).map(e => [e.id, e]));

      const enriched = (lines ?? []).map(l => {
        const acct = l.chart_of_accounts as unknown as { account_number: string; account_name: string; account_type: string };
        const accNum = parseInt(acct?.account_number ?? '0', 10);
        const entry = entryMap.get(l.journal_entry_id);
        return {
          id: l.id,
          accountNumber: String(acct?.account_number ?? ''),
          accountName: String(acct?.account_name ?? ''),
          debit: Number(l.debit ?? 0),
          credit: Number(l.credit ?? 0),
          date: entry?.entry_date ?? '',
          description: entry?.description ?? '',
          isRevenue: accNum >= 3000 && accNum <= 3999,
          isCost: accNum >= 4000 && accNum <= 8999,
        };
      });

      const revenues = enriched
        .filter(l => l.isRevenue)
        .reduce((s, l) => s + l.credit - l.debit, 0);
      const costs = enriched
        .filter(l => l.isCost)
        .reduce((s, l) => s + l.debit - l.credit, 0);
      const result = revenues - costs;
      const margin = revenues > 0 ? (result / revenues) * 100 : 0;

      return {
        revenues,
        costs,
        result,
        margin,
        lines: enriched.sort((a, b) => b.date.localeCompare(a.date)),
        hasData: enriched.length > 0,
      };
    },
  });
}
