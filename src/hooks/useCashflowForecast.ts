import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { addMonths, format, startOfMonth, subMonths } from 'date-fns';
import type { JournalEntryJoin } from "@/types/database-extensions";

/**
 * Cashflow forecast hook. companyId MUST be passed explicitly by the caller —
 * we never read from localStorage here, to guarantee that no widget can ever
 * mix data across companies. If companyId is falsy, the query is disabled.
 */
export function useCashflowForecast(months = 12, companyId?: string | null) {

  return useQuery({
    queryKey: ['cashflow-forecast-monthly', companyId, months],
    enabled: !!companyId,
    queryFn: async () => {
      const histFrom = format(subMonths(startOfMonth(new Date()), 6), 'yyyy-MM-dd');

      // Get cash account IDs (1910-1950)
      const { data: cashAccounts } = await supabase
        .from('chart_of_accounts')
        .select('id, account_number')
        .eq('company_id', companyId!)
        .gte('account_number', '1910')
        .lte('account_number', '1950');

      const cashAccountIds = (cashAccounts ?? []).map(a => a.id);

      if (cashAccountIds.length === 0) {
        return { currentCash: 0, avgMonthlyFlow: 0, forecast: [], runway: months, hasData: false };
      }

      // Historical cash-account movements (last 6 months). Approved entries are
      // ledger-affecting in this project; drafts/pending approvals are excluded.
      const { data: lines, error } = await supabase
        .from('journal_entry_lines')
        .select('account_id, debit, credit, journal_entries!inner(company_id, status, entry_date)')
        .eq('journal_entries.company_id', companyId!)
        .in('journal_entries.status', ['approved', 'posted'])
        .gte('journal_entries.entry_date', histFrom)
        .in('account_id', cashAccountIds);
      if (error) throw error;

      // Net cash flow per month (historical)
      const historicalMap: Record<string, number> = {};
      for (const l of lines ?? []) {
        const month = (l.journal_entries as JournalEntryJoin | null).entry_date?.slice(0, 7);
        if (!month) continue;
        historicalMap[month] = (historicalMap[month] ?? 0) + Number(l.debit ?? 0) - Number(l.credit ?? 0);
      }

      const histMonths = Object.keys(historicalMap).sort();
      const avgMonthlyFlow = histMonths.length > 0
        ? histMonths.reduce((s, m) => s + historicalMap[m], 0) / histMonths.length
        : 0;

      // Current cash balance (all-time)
      const { data: balanceLines } = await supabase
        .from('journal_entry_lines')
        .select('debit, credit, journal_entries!inner(company_id, status)')
        .eq('journal_entries.company_id', companyId!)
        .in('journal_entries.status', ['approved', 'posted'])
        .in('account_id', cashAccountIds);

      const currentCash = (balanceLines ?? []).reduce(
        (s, l) => s + Number(l.debit ?? 0) - Number(l.credit ?? 0), 0
      );

      // Open invoices (expected inflows by month)
      const { data: openInvoices } = await supabase
        .from('invoices')
        .select('total_amount, due_date')
        .eq('company_id', companyId!)
        .in('status', ['sent', 'overdue']);

      const expectedInflow: Record<string, number> = {};
      for (const inv of openInvoices ?? []) {
        const month = inv.due_date?.slice(0, 7);
        if (month) expectedInflow[month] = (expectedInflow[month] ?? 0) + Number(inv.total_amount ?? 0);
      }

      // Build 12-month forecast with 3 scenarios
      let runningBalance = currentCash;
      const forecast = [];
      for (let i = 0; i < months; i++) {
        const month = format(addMonths(new Date(), i), 'yyyy-MM');
        const label = new Date(month + '-01').toLocaleDateString('sv-SE', { month: 'short', year: '2-digit' });
        const inflow = (expectedInflow[month] ?? 0) + Math.max(0, avgMonthlyFlow);
        const outflow = Math.abs(Math.min(0, avgMonthlyFlow)) * 0.9;
        runningBalance += inflow - outflow;

        forecast.push({
          month, label,
          base: Math.round(runningBalance),
          optimistic: Math.round(runningBalance * 1.15),
          pessimistic: Math.round(runningBalance * 0.80),
          inflow: Math.round(inflow),
          outflow: Math.round(outflow),
        });
      }

      const runway = forecast.findIndex(f => f.pessimistic < 0);

      return {
        currentCash,
        avgMonthlyFlow,
        forecast,
        runway: runway === -1 ? months : runway,
        hasData: (lines?.length ?? 0) > 0,
      };
    },
  });
}
