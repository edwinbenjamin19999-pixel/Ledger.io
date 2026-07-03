import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getStoredActiveCompanyId } from '@/lib/company-selection';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

function useCompanyId() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  useEffect(() => {
    const stored = getStoredActiveCompanyId();
    if (stored) setCompanyId(stored);
  }, []);
  return companyId;
}

export function useMyApprovalRequests() {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ['my-approvals', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      const userId = user.user?.id;

      const { data, error } = await supabase
        .from('approval_requests')
        .select('*')
        .eq('company_id', companyId!)
        .in('status', ['pending', 'approved', 'rejected'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const all = (data ?? []) ;
      const mine = all.filter((r: any) => r.requested_by === userId);
      const pending = all.filter((r: any) => r.status === 'pending');

      return { mine, pending, all };
    },
  });
}

export function useApproveRequest() {
  const qc = useQueryClient();
  const companyId = useCompanyId();
  return useMutation({
    mutationFn: async ({ requestId, comment }: { requestId: string; comment?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from('approval_decisions').insert({
        request_id: requestId,
        step_order: 1,
        decided_by: user.user!.id,
        decision: 'approved',
        comment: comment || null,
      });
      if (error) throw error;

      await supabase.from('approval_requests')
        .update({ status: 'approved', updated_at: new Date().toISOString(), completed_at: new Date().toISOString() })
        .eq('id', requestId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-approvals', companyId] }),
    onError: (error: Error) => {
      toast.error(error.message || "Godkännandet misslyckades");
    },
  });
}

export function useRejectRequest() {
  const qc = useQueryClient();
  const companyId = useCompanyId();
  return useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason: string }) => {
      const { data: user } = await supabase.auth.getUser();
      await supabase.from('approval_decisions').insert({
        request_id: requestId,
        step_order: 1,
        decided_by: user.user!.id,
        decision: 'rejected',
        comment: reason,
      });
      await supabase.from('approval_requests')
        .update({ status: 'rejected', updated_at: new Date().toISOString(), completed_at: new Date().toISOString() })
        .eq('id', requestId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-approvals', companyId] }),
    onError: (error: Error) => {
      toast.error(error.message || "Avvisningen misslyckades");
    },
  });
}
