import { useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ConsolidationAISuggestion {
  id: string;
  consolidation_period_id: string;
  suggestion_type: string;
  title: string;
  explanation: string;
  financial_impact: number | null;
  affected_section: string | null;
  affected_companies: any;
  proposed_journal: any;
  confidence: number;
  severity: string;
  source_refs: any;
  status: string;
  applied_adjustment_id: string | null;
  model_version: string | null;
  created_at: string;
}

export function useConsolidationAISuggestions(periodId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['consolidation-ai-suggestions', periodId],
    enabled: !!periodId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consolidation_ai_suggestions')
        .select('*')
        .eq('consolidation_period_id', periodId!)
        .order('confidence', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ConsolidationAISuggestion[];
    },
  });

  useEffect(() => {
    if (!periodId) return;
    const channel = supabase
      .channel(`cons-sugg-${periodId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'consolidation_ai_suggestions', filter: `consolidation_period_id=eq.${periodId}` },
        () => qc.invalidateQueries({ queryKey: ['consolidation-ai-suggestions', periodId] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [periodId, qc]);

  const dismiss = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('consolidation_ai_suggestions')
        .update({ status: 'dismissed' as any })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Förslag avvisat');
      qc.invalidateQueries({ queryKey: ['consolidation-ai-suggestions', periodId] });
    },
  });

  const detect = useMutation({
    mutationFn: async () => {
      if (!periodId) throw new Error('No period');
      const { data, error } = await supabase.functions.invoke('detect-group-adjustments', {
        body: { period_id: periodId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('AI-analys klar');
      qc.invalidateQueries({ queryKey: ['consolidation-ai-suggestions', periodId] });
    },
    onError: (e: any) => toast.error(e.message ?? 'Kunde inte köra AI-analys'),
  });

  return { ...query, dismiss, detect };
}
