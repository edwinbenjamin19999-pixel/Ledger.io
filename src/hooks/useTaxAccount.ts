import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getStoredActiveCompanyId } from '@/lib/company-selection';
import { toast } from 'sonner';

export function useTaxAccountEntries() {
  const companyId = getStoredActiveCompanyId();
  return useQuery({
    queryKey: ['tax-account-entries', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tax_account_entries')
        .select('*')
        .eq('company_id', companyId!)
        .order('entry_date', { ascending: true });
      if (error) throw error;

      // Compute running balance
      let balance = 0;
      const entries = (data ?? []).map(e => {
        const sign = ['inbetalning', 'ränta'].includes(e.type) ? 1 : -1;
        balance += sign * Number(e.amount);
        return { ...e, runningBalance: balance };
      });

      return { entries, currentBalance: balance, hasData: entries.length > 0 };
    },
  });
}

export function useCreateTaxEntry() {
  const qc = useQueryClient();
  const companyId = getStoredActiveCompanyId();
  return useMutation({
    mutationFn: async (params: {
      entry_date: string;
      type: string;
      amount: number;
      description?: string;
      reference?: string;
    }) => {
      const { error } = await supabase
        .from('tax_account_entries')
        .insert({ ...params, company_id: companyId! });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tax-account-entries', companyId] }),
    onError: (error: Error) => {
      toast.error(error.message || "Skattekonto-posten sparades inte");
    },
  });
}
