import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useConsolidationLock(periodId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['consolidation-lock', periodId],
    enabled: !!periodId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consolidation_periods')
        .select('id, status, locked_at, locked_by')
        .eq('id', periodId!)
        .maybeSingle();
      if (error) throw error;
      return {
        isLocked: data?.status === 'locked',
        locked_at: data?.locked_at,
        locked_by: data?.locked_by,
        status: data?.status ?? 'draft',
      };
    },
  });

  const toggle = useMutation({
    mutationFn: async (lock: boolean) => {
      if (!periodId) throw new Error('No period');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const updates: any = lock
        ? { status: 'locked', locked_at: new Date().toISOString(), locked_by: user.id }
        : { status: 'in_progress', locked_at: null, locked_by: null };

      const { error } = await supabase
        .from('consolidation_periods')
        .update(updates)
        .eq('id', periodId);
      if (error) throw error;
    },
    onSuccess: (_, lock) => {
      toast.success(lock ? 'Konsolidering låst' : 'Konsolidering upplåst — redigeringsläge aktivt');
      qc.invalidateQueries({ queryKey: ['consolidation-lock', periodId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { ...query, toggle };
}
