import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useAccrualTimeline(companyId: string | null) {
  return useQuery({
    queryKey: ['accrual-timeline', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      // Hämta journalposter med periodiseringsbeskrivning
      const { data: entries, error } = await supabase
        .from('journal_entries')
        .select('id, entry_date, description, journal_entry_lines(debit, credit)')
        .eq('company_id', companyId!)
        .eq('status', 'approved')
        .or('description.ilike.%[Periodisering]%,description.ilike.%Återföring%,description.ilike.%[Avsättning]%')
        .order('entry_date', { ascending: true })
        .limit(500);
      if (error) throw error;

      // Aggregera per månad
      const monthMap: Record<string, { period: number; reversal: number }> = {};
      for (const e of entries ?? []) {
        const month = e.entry_date.slice(0, 7); // YYYY-MM
        if (!monthMap[month]) monthMap[month] = { period: 0, reversal: 0 };
        const totalDebit = (e.journal_entry_lines || []).reduce((s: number, l: any) => s + (l.debit || 0), 0);
        if (e.description.includes('Återföring')) {
          monthMap[month].reversal += totalDebit;
        } else {
          monthMap[month].period += totalDebit;
        }
      }

      const timeline = Object.entries(monthMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, v]) => ({
          month,
          label: new Date(month + '-01').toLocaleDateString('sv-SE', { month: 'short', year: '2-digit' }),
          periodiseringar: v.period,
          aterforing: v.reversal,
          netto: v.period - v.reversal,
        }));

      return { timeline, hasData: timeline.length > 0 };
    },
  });
}
