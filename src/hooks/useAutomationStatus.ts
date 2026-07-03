import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ACTIVE_COMPANY_STORAGE_KEY } from '@/lib/company-selection';
import { useState, useEffect } from 'react';
import { addDays, isAfter, isBefore, parseISO } from 'date-fns';

function useCompanyId() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  useEffect(() => {
    const stored = localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY);
    if (stored) setCompanyId(stored);
  }, []);
  return companyId;
}

const TAX_DEADLINES = [
  { id: 'moms-q1', label: 'Momsdeklaration Q1 2026', date: '2026-05-12', type: 'moms', route: '/vat-reports' },
  { id: 'agi-apr', label: 'AGI April 2026', date: '2026-05-12', type: 'agi', route: '/agi-submission' },
  { id: 'moms-q2', label: 'Momsdeklaration Q2 2026', date: '2026-08-17', type: 'moms', route: '/vat-reports' },
  { id: 'agi-jul', label: 'AGI Juli 2026', date: '2026-08-12', type: 'agi', route: '/agi-submission' },
  { id: 'ink2-2025', label: 'Inkomstdeklaration 2025 (AB)', date: '2026-07-01', type: 'ink2', route: '/tax' },
  { id: 'moms-q3', label: 'Momsdeklaration Q3 2026', date: '2026-11-12', type: 'moms', route: '/vat-reports' },
  { id: 'agi-okt', label: 'AGI Oktober 2026', date: '2026-11-12', type: 'agi', route: '/agi-submission' },
];

export interface AutomationStatusData {
  unbookedBank: number;
  draftEntries: number;
  overdueInvoices: number;
  pendingExpenses: number;
  upcomingDeadlines: typeof TAX_DEADLINES;
  overdueDeadlines: typeof TAX_DEADLINES;
  totalActions: number;
}

export function useAutomationStatus() {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: ['automation-status', companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<AutomationStatusData> => {
      const today = new Date();

      const [bankRes, draftRes, overdueRes, expenseRes] = await Promise.all([
        supabase
          .from('bank_transactions')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId!)
          .eq('status', 'pending'),
        supabase
          .from('journal_entries')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId!)
          .eq('status', 'draft'),
        supabase
          .from('invoices')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId!)
          .eq('status', 'overdue'),
        supabase
          .from('expense_claims')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId!)
          .eq('status', 'pending'),
      ]);

      const unbookedBank = bankRes.count ?? 0;
      const draftEntries = draftRes.count ?? 0;
      const overdueInvoices = overdueRes.count ?? 0;
      const pendingExpenses = expenseRes.count ?? 0;

      const upcoming = TAX_DEADLINES.filter(d => {
        const deadline = parseISO(d.date);
        return isAfter(deadline, today) && isBefore(deadline, addDays(today, 60));
      });

      const overdue = TAX_DEADLINES.filter(d => isBefore(parseISO(d.date), today));

      return {
        unbookedBank,
        draftEntries,
        overdueInvoices,
        pendingExpenses,
        upcomingDeadlines: upcoming,
        overdueDeadlines: overdue,
        totalActions: unbookedBank + draftEntries + pendingExpenses,
      };
    },
    refetchInterval: 5 * 60 * 1000,
  });
}
