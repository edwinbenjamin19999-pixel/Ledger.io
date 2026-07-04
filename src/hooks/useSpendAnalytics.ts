import { useQuery } from '@tanstack/react-query';
import type { ChartOfAccountsJoin, JournalEntryJoin } from '@/types/database-extensions';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths, startOfMonth } from 'date-fns';

const CATEGORY_MAP: Record<string, { range: [number, number]; label: string; color: string }> = {
  'Personal': { range: [7000, 7699], label: 'Personal', color: '#6366f1' },
  'Lokaler': { range: [5010, 5099], label: 'Lokaler & hyra', color: '#f59e0b' },
  'Marknadsföring': { range: [6100, 6299], label: 'Marknadsföring', color: '#10b981' },
  'IT & Teknik': { range: [6500, 6599], label: 'IT & Teknik', color: '#3b82f6' },
  'Fordon': { range: [5600, 5799], label: 'Fordon & resor', color: '#8b5cf6' },
  'Administration': { range: [6800, 6999], label: 'Administration', color: '#ec4899' },
  'Råvaror': { range: [4000, 4999], label: 'Inköp & råvaror', color: '#f97316' },
  'Avskrivningar': { range: [7800, 7999], label: 'Avskrivningar', color: '#94a3b8' },
  'Övrigt': { range: [5000, 5009], label: 'Övrigt', color: '#64748b' },
};

export { CATEGORY_MAP as SPEND_CATEGORY_MAP };

export function useSpendAnalytics(companyId: string, monthsBack = 6) {
  const from = format(subMonths(startOfMonth(new Date()), monthsBack - 1), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['spend-analytics-summary', companyId, monthsBack],
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: lines, error } = await supabase
        .from('journal_entry_lines')
        .select(`
          debit, credit,
          chart_of_accounts!inner(account_number, company_id),
          journal_entries!inner(entry_date, status, company_id)
        `)
        .eq('journal_entries.company_id', companyId)
        .in('journal_entries.status', ['approved', 'posted'])
        .gte('journal_entries.entry_date', from);

      if (error) throw error;

      const categoryTotals: Record<string, number> = {};
      const monthlyByCategory: Record<string, Record<string, number>> = {};

      for (const line of lines ?? []) {
        const accNum = parseInt((line.chart_of_accounts as ChartOfAccountsJoin)?.account_number ?? '0');
        if (accNum < 4000 || accNum > 7999) continue;
        const amount = Number(line.debit ?? 0) - Number(line.credit ?? 0);
        if (amount <= 0) continue;

        const month = (line.journal_entries as unknown as JournalEntryJoin)?.entry_date?.slice(0, 7) ?? '';

        let cat = 'Övrigt';
        for (const [key, def] of Object.entries(CATEGORY_MAP)) {
          if (accNum >= def.range[0] && accNum <= def.range[1]) { cat = key; break; }
        }

        categoryTotals[cat] = (categoryTotals[cat] ?? 0) + amount;
        if (!monthlyByCategory[month]) monthlyByCategory[month] = {};
        monthlyByCategory[month][cat] = (monthlyByCategory[month][cat] ?? 0) + amount;
      }

      const totalSpend = Object.values(categoryTotals).reduce((s, v) => s + v, 0);

      const byCategory = Object.entries(categoryTotals)
        .map(([cat, total]) => ({
          category: cat,
          label: CATEGORY_MAP[cat]?.label ?? cat,
          total,
          percent: totalSpend > 0 ? Math.round((total / totalSpend) * 1000) / 10 : 0,
          color: CATEGORY_MAP[cat]?.color ?? '#94a3b8',
        }))
        .sort((a, b) => b.total - a.total);

      const months = Object.keys(monthlyByCategory).sort();

      return { byCategory, monthlyByCategory, months, totalSpend, hasData: (lines?.length ?? 0) > 0 };
    },
  });
}
