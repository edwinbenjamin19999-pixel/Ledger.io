import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths, startOfMonth, startOfYear, endOfYear } from 'date-fns';
import { computeUnifiedRunway } from '@/lib/cash/getRunway';
import { getNetResult } from '@/lib/finance/getNetResult';
import type { JournalEntryJoin, ChartOfAccountsJoin } from "@/types/database-extensions";

export function useCFODashboard(companyId: string) {
  return useQuery({
    queryKey: ['cfo-dashboard', companyId],
    enabled: !!companyId,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const from = format(subMonths(startOfMonth(new Date()), 12), 'yyyy-MM-dd');

      const { data: lines, error } = await supabase
        .from('journal_entry_lines')
        .select(`
          debit, credit,
          chart_of_accounts!inner(account_number, company_id)
        `)
        .eq('chart_of_accounts.company_id', companyId)
        .gte('debit', 0);

      if (error) throw error;

      // We also need entry_date — fetch journal entries
      const { data: entryLines } = await supabase
        .from('journal_entry_lines')
        .select(`
          debit, credit,
          journal_entries!inner(entry_date, status, company_id),
          chart_of_accounts!inner(account_number, company_id)
        `)
        .eq('journal_entries.company_id', companyId)
        .in('journal_entries.status', ['posted', 'approved'])
        .gte('journal_entries.entry_date', from);

      const monthlyData: Record<string, { revenue: number; costs: number }> = {};
      for (const line of entryLines ?? []) {
        const month = (line.journal_entries as JournalEntryJoin | null)?.entry_date?.slice(0, 7);
        const accNum = parseInt((line.chart_of_accounts as ChartOfAccountsJoin | null)?.account_number ?? '0');
        if (!month || !accNum) continue;
        if (!monthlyData[month]) monthlyData[month] = { revenue: 0, costs: 0 };
        const d = Number(line.debit ?? 0);
        const c = Number(line.credit ?? 0);
        if (accNum >= 3000 && accNum <= 3999) monthlyData[month].revenue += c - d;
        else if (accNum >= 4000 && accNum <= 8999) monthlyData[month].costs += d - c;
      }

      const months = Object.keys(monthlyData).sort();
      const currentMonth = format(new Date(), 'yyyy-MM');
      const prevMonth = format(subMonths(new Date(), 1), 'yyyy-MM');

      const current = monthlyData[currentMonth] ?? { revenue: 0, costs: 0 };
      const prev = monthlyData[prevMonth] ?? { revenue: 0, costs: 0 };

      const currentEBITDA = current.revenue - current.costs;
      const ebitdaMargin = current.revenue > 0 ? (currentEBITDA / current.revenue) * 100 : 0;
      const revenueGrowth = prev.revenue > 0 ? ((current.revenue - prev.revenue) / prev.revenue) * 100 : 0;

      // Kanonisk runway + likvid kassa — samma källa som alla andra moduler.
      const unified = await computeUnifiedRunway(companyId);
      const cash = unified.liquidCash;
      // runway returneras i månader för bakåtkompatibilitet i konsumenter.
      const runway = unified.runwayDays === null ? 999 : Math.round(unified.runwayDays / 30);


      // Sparkline data (12 months)
      const sparkline = months.slice(-12).map(m => ({
        month: m,
        label: new Date(m + '-01').toLocaleDateString('sv-SE', { month: 'short' }),
        revenue: monthlyData[m]?.revenue ?? 0,
        costs: monthlyData[m]?.costs ?? 0,
        result: (monthlyData[m]?.revenue ?? 0) - (monthlyData[m]?.costs ?? 0),
      }));

      // Total year — KANONISK källa (samma som Resultat & balans + Kassaflödesanalys).
      // Tecken och belopp är identiska över alla moduler för samma period.
      const now = new Date();
      const yearNr = await getNetResult(companyId, startOfYear(now), endOfYear(now));

      return {
        currentRevenue: current.revenue,
        currentCosts: current.costs,
        ebitda: currentEBITDA,
        ebitdaMargin: Math.round(ebitdaMargin * 10) / 10,
        revenueGrowth: Math.round(revenueGrowth * 10) / 10,
        cash: Math.round(cash),
        runway: Math.min(Math.max(runway, 0), 36),
        sparkline,
        yearRevenue: Math.round(yearNr.revenue),
        yearCosts: Math.round(yearNr.costs),
        yearResult: Math.round(yearNr.netResult),
        hasData: months.length > 0,
      };
    },
  });
}
