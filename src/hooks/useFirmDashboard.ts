import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FirmClientEnriched {
  id: string;
  name: string;
  org_number: string;
  created_at: string;
  draftEntries: number;
  overdueInvoices: number;
  pendingExpenses: number;
  alerts: number;
  urgency: 'high' | 'medium' | 'low';
}

export function useFirmClients(firmId: string) {
  return useQuery({
    queryKey: ['firm-clients-enriched', firmId],
    enabled: !!firmId,
    queryFn: async () => {
      // Fetch firm_clients with company info
      const { data: clients, error } = await supabase
        .from('firm_clients')
        .select(`
          id, company_id, mandate_status, is_active,
          companies:company_id (id, name, org_number, created_at)
        `)
        .eq('firm_id', firmId)
        .eq('is_active', true);

      if (error) throw error;

      const activeClients = (clients ?? []).filter((c) => c.companies);
      const uniqueMap = new Map<string, Record<string, unknown>>();
      for (const c of activeClients) {
        const co = c.companies as unknown as { id: string; name: string; org_number: string; [k: string]: unknown };
        if (co && !uniqueMap.has(co.id)) {
          uniqueMap.set(co.id, co);
        }
      }

      const companies = Array.from(uniqueMap.values());

      const todayIso = new Date().toISOString().slice(0, 10);

      // Enrich each company with alert counts
      const enriched: FirmClientEnriched[] = await Promise.all(
        companies.map(async (company: any) => {
          const [
            { count: draftEntries },
            { data: arInvoices },
            { count: pendingExpenses },
          ] = await Promise.all([
            supabase.from('journal_entries').select('id', { count: 'exact', head: true })
              .eq('company_id', company.id).eq('status', 'draft'),
            // Real overdue: any unpaid AR invoice with due_date in the past
            supabase.from('invoices').select('id, status, due_date, paid_at')
              .eq('company_id', company.id)
              .eq('invoice_direction', 'outgoing')
              .not('status', 'in', '(paid,cancelled,void)')
              .is('paid_at', null)
              .lt('due_date', todayIso),
            supabase.from('expense_claims').select('id', { count: 'exact', head: true })
              .eq('company_id', company.id).eq('status', 'submitted'),
          ]);

          const overdueInvoices = arInvoices?.length ?? 0;
          const alerts = (draftEntries ?? 0) + overdueInvoices + (pendingExpenses ?? 0);
          return {
            id: company.id,
            name: company.name,
            org_number: company.org_number,
            created_at: company.created_at,
            draftEntries: draftEntries ?? 0,
            overdueInvoices,
            pendingExpenses: pendingExpenses ?? 0,
            alerts,
            urgency: alerts > 5 ? 'high' as const : alerts > 0 ? 'medium' as const : 'low' as const,
          };
        })
      );

      return enriched.sort((a, b) => b.alerts - a.alerts);
    },
  });
}
