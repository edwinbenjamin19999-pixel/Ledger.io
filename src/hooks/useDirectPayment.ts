import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getStoredActiveCompanyId } from '@/lib/company-selection';
import { toast } from 'sonner';

export function usePendingPayments() {
  const companyId = getStoredActiveCompanyId();
  return useQuery({
    queryKey: ['pending-payments', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('payment_proposals')
        .select('*')
        .eq('company_id', companyId!))
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) ;
    },
  });
}

export function useApprovePayment() {
  const qc = useQueryClient();
  const companyId = getStoredActiveCompanyId();
  return useMutation({
    mutationFn: async ({ proposalId, level }: { proposalId: string; level: '2-eye' | '4-eye' }) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error('Ej inloggad');

      const { data: proposal } = await (supabase
        .from('payment_proposals')
        .select('*')
        .eq('id', proposalId)
        .maybeSingle());

      const newStatus = level === '4-eye' && proposal?.status === 'pending_approval'
        ? 'approved_1'
        : 'approved';

      const update: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (proposal?.status === 'pending_approval') {
        update.approver_1_id = userId;
      } else {
        update.approver_2_id = userId;
      }

      const { error } = await (supabase
        .from('payment_proposals')
        .update(update)
        .eq('id', proposalId));
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pending-payments', companyId] }),
    onError: (error: Error) => {
      toast.error(error.message || "Betalningen kunde inte sparas");
    },
  });
}

export function useRejectPayment() {
  const qc = useQueryClient();
  const companyId = getStoredActiveCompanyId();
  return useMutation({
    mutationFn: async ({ proposalId, reason }: { proposalId: string; reason: string }) => {
      const { error } = await (supabase
        .from('payment_proposals')
        .update({
          status: 'rejected',
          rejection_comment: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', proposalId));
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pending-payments', companyId] }),
    onError: (error: Error) => {
      toast.error(error.message || "Betalningen kunde inte sparas");
    },
  });
}
