import { useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ConsolidationVersion {
  id: string;
  consolidation_period_id: string;
  version_number: number;
  label: string;
  snapshot: any;
  created_by: string;
  created_at: string;
  is_locked: boolean;
}

export function useConsolidationVersions(periodId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['consolidation-versions', periodId],
    enabled: !!periodId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consolidation_versions')
        .select('*')
        .eq('consolidation_period_id', periodId!)
        .order('version_number', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ConsolidationVersion[];
    },
  });

  useEffect(() => {
    if (!periodId) return;
    const channel = supabase
      .channel(`cons-ver-${periodId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'consolidation_versions', filter: `consolidation_period_id=eq.${periodId}` },
        () => qc.invalidateQueries({ queryKey: ['consolidation-versions', periodId] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [periodId, qc]);

  const snapshot = useMutation({
    mutationFn: async (label: string) => {
      if (!periodId) throw new Error('No period');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: existing } = await supabase
        .from('consolidation_versions')
        .select('version_number')
        .eq('consolidation_period_id', periodId)
        .order('version_number', { ascending: false })
        .limit(1);
      const nextVersion = (existing?.[0]?.version_number ?? 0) + 1;

      const { data: adjustments } = await supabase
        .from('consolidation_adjustments')
        .select('*')
        .eq('consolidation_period_id', periodId);

      const snapshot = {
        adjustments: adjustments ?? [],
        captured_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('consolidation_versions')
        .insert({
          consolidation_period_id: periodId,
          version_number: nextVersion,
          label,
          snapshot,
          created_by: user.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Snapshot skapad');
      qc.invalidateQueries({ queryKey: ['consolidation-versions', periodId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { ...query, snapshot };
}
