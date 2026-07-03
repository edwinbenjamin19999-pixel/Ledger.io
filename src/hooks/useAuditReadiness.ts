import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getStoredActiveCompanyId } from '@/lib/company-selection';

export interface AuditCheck {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
  action: string;
}

export function useAuditReadinessChecks() {
  const companyId = getStoredActiveCompanyId();
  return useQuery({
    queryKey: ['audit-readiness-checks', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const [
        draftRes,
        unmatchedBankRes,
        overdueRes,
        openPeriodsRes,
        lastPeriodRes,
        missingReceiptsRes,
      ] = await Promise.all([
        supabase.from('journal_entries').select('id', { count: 'exact', head: true })
          .eq('company_id', companyId!).eq('status', 'draft'),
        supabase.from('bank_transactions').select('id', { count: 'exact', head: true })
          .eq('company_id', companyId!).eq('status', 'pending'),
        supabase.from('invoices').select('id', { count: 'exact', head: true })
          .eq('company_id', companyId!).eq('status', 'overdue'),
        supabase.from('accounting_periods').select('id', { count: 'exact', head: true })
          .eq('company_id', companyId!).eq('status', 'open'),
        supabase.from('accounting_periods').select('locked_at')
          .eq('company_id', companyId!).eq('status', 'locked')
          .order('locked_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('expense_claims').select('id', { count: 'exact', head: true })
          .eq('company_id', companyId!).is('receipt_url', null),
      ]);

      const draftEntries = draftRes.count ?? 0;
      const unmatchedBank = unmatchedBankRes.count ?? 0;
      const overdueInvoices = overdueRes.count ?? 0;
      const openPeriods = openPeriodsRes.count ?? 0;
      const lastPeriodClose = lastPeriodRes.data;
      const missingReceipts = missingReceiptsRes.count ?? 0;

      const checks: AuditCheck[] = [
        {
          id: 'no_drafts', label: 'Inga utkast-verifikationer',
          ok: draftEntries === 0,
          detail: `${draftEntries} utkast väntande`,
          action: '/accounting',
        },
        {
          id: 'bank_matched', label: 'Alla banktransaktioner avstämda',
          ok: unmatchedBank === 0,
          detail: `${unmatchedBank} ej matchade`,
          action: '/bankavstamning',
        },
        {
          id: 'no_overdue', label: 'Inga förfallna kundfakturor',
          ok: overdueInvoices === 0,
          detail: `${overdueInvoices} förfallna fakturor`,
          action: '/ar-agent',
        },
        {
          id: 'periods_closed', label: 'Alla perioder stängda',
          ok: openPeriods === 0,
          detail: `${openPeriods} öppna perioder`,
          action: '/closing',
        },
        {
          id: 'receipts', label: 'Alla utlägg har kvitto',
          ok: missingReceipts === 0,
          detail: `${missingReceipts} utlägg saknar kvitto`,
          action: '/expenses',
        },
        {
          id: 'period_close', label: 'Månadsavstämning genomförd',
          ok: !!lastPeriodClose?.locked_at,
          detail: lastPeriodClose?.locked_at
            ? `Senast: ${new Date(lastPeriodClose.locked_at).toLocaleDateString('sv-SE')}`
            : 'Aldrig utförd',
          action: '/closing',
        },
      ];

      const score = checks.filter(c => c.ok).length;
      const total = checks.length;
      const percent = Math.round((score / total) * 100);

      return { checks, score, total, percent };
    },
  });
}
