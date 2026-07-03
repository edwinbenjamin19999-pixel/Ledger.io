import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ACTIVE_COMPANY_STORAGE_KEY } from '@/lib/company-selection';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

function useCompanyId() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  useEffect(() => {
    const stored = localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY);
    if (stored) setCompanyId(stored);
  }, []);
  return companyId;
}

export function useCorporateEvents() {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ['corporate-events', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('corporate_events')
        .select('*')
        .eq('company_id', companyId!)
        .order('event_date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useShareholders() {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ['shareholders', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shareholders')
        .select('*')
        .eq('company_id', companyId!)
        .order('shares', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateCorporateEvent() {
  const qc = useQueryClient();
  const companyId = useCompanyId();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (event: {
      event_type: string;
      title: string;
      description?: string;
      amount?: number;
      event_date: string;
      participants?: object[];
    }) => {
      if (!companyId) throw new Error('Inget företag valt');

      const { data: ev, error: evError } = await supabase
        .from('corporate_events')
        .insert([{
          company_id: companyId,
          status: 'draft' as const,
          created_by: user?.id,
          event_type: event.event_type,
          title: event.title,
          description: event.description,
          amount: event.amount,
          event_date: event.event_date,
          participants: event.participants as any,
        }])
        .select()
        .maybeSingle();
      if (evError) throw evError;

      // Auto-create journal entry for financial events
      if (event.amount && event.amount > 0) {
        let debitAcc = 0, creditAcc = 0;
        switch (event.event_type) {
          case 'dividend_agm':
          case 'utdelning':
            debitAcc = 2091; creditAcc = 2898; break;
          case 'unconditional_contribution':
          case 'tillskott':
            debitAcc = 1930; creditAcc = 2083; break;
          case 'conditional_contribution':
            debitAcc = 1930; creditAcc = 2093; break;
          case 'shareholder_loan_in':
          case 'aktieagarlaan':
            debitAcc = 1930; creditAcc = 2393; break;
          case 'new_share_issue':
          case 'nyemission':
            debitAcc = 1930; creditAcc = 2081; break;
        }

        if (debitAcc > 0) {
          const { data: je, error: jeError } = await supabase
            .from('journal_entries')
            .insert({
              company_id: companyId,
              entry_date: event.event_date,
              description: event.title,
              status: 'draft',
              created_by: user?.id,
            })
            .select()
            .maybeSingle();

          if (!jeError && je) {
            // Get or create accounts
            const getAccountId = async (accNum: string) => {
              const { data } = await supabase
                .from('chart_of_accounts')
                .select('id')
                .eq('company_id', companyId)
                .eq('account_number', String(accNum))
                .limit(1)
                .maybeSingle();
              return data?.id;
            };

            const debitAccId = await getAccountId(String(debitAcc));
            const creditAccId = await getAccountId(String(creditAcc));

            if (debitAccId && creditAccId) {
              await supabase.from('journal_entry_lines').insert([
                { journal_entry_id: je.id, account_id: debitAccId, debit: event.amount, credit: 0, description: event.title },
                { journal_entry_id: je.id, account_id: creditAccId, debit: 0, credit: event.amount, description: event.title },
              ]);
            }

            await supabase.from('corporate_events')
              .update({ journal_entry_id: je.id })
              .eq('id', ev.id);
          }
        }
      }
      return ev;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['corporate-events', companyId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Bolagshändelsen sparades inte");
    },
  });
}

export function useUpdateEventStatus() {
  const qc = useQueryClient();
  const companyId = useCompanyId();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('corporate_events')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['corporate-events', companyId] }),
    onError: (error: Error) => {
      toast.error(error.message || "Bolagshändelsen sparades inte");
    },
  });
}

export function useCreateShareholder() {
  const qc = useQueryClient();
  const companyId = useCompanyId();
  return useMutation({
    mutationFn: async (shareholder: {
      name: string;
      shares: number;
      share_class?: string;
      personal_org_number?: string;
      acquisition_date?: string;
      acquisition_price?: number;
    }) => {
      if (!companyId) throw new Error('Inget företag valt');
      const { data, error } = await supabase
        .from('shareholders')
        .insert({ company_id: companyId, ...shareholder })
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shareholders', companyId] }),
    onError: (error: Error) => {
      toast.error(error.message || "Bolagshändelsen sparades inte");
    },
  });
}

export function useDeleteShareholder() {
  const qc = useQueryClient();
  const companyId = useCompanyId();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('shareholders').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shareholders', companyId] }),
    onError: (error: Error) => {
      toast.error(error.message || "Bolagshändelsen sparades inte");
    },
  });
}

export function useCorporateEventStats() {
  const { data: events, isLoading } = useCorporateEvents();

  const stats = {
    total: events?.length ?? 0,
    draft: events?.filter(e => e.status === 'draft').length ?? 0,
    pending: events?.filter(e => e.status === 'pending').length ?? 0,
    completed: events?.filter(e => e.status === 'completed').length ?? 0,
    cancelled: events?.filter(e => e.status === 'cancelled').length ?? 0,
  };

  return { stats, isLoading };
}
