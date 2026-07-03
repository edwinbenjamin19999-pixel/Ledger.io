import { useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ConsolidationAdjustmentLine {
  id?: string;
  line_no: number;
  company_id?: string | null;
  account_no: string;
  account_name?: string | null;
  debit: number;
  credit: number;
  description?: string | null;
}

export interface ConsolidationAdjustment {
  id: string;
  consolidation_period_id: string;
  adjustment_type: string;
  affected_company_ids: string[];
  description: string | null;
  source: string;
  ai_suggestion_id: string | null;
  confidence: number | null;
  total_amount: number;
  status: string;
  created_by: string;
  created_at: string;
  applied_at: string | null;
  reverted_at: string | null;
  lines?: ConsolidationAdjustmentLine[];
}

export function useConsolidationAdjustments(periodId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['consolidation-adjustments', periodId],
    enabled: !!periodId,
    queryFn: async () => {
      const { data: adjustments, error } = await supabase
        .from('consolidation_adjustments')
        .select('*')
        .eq('consolidation_period_id', periodId!)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const ids = (adjustments ?? []).map(a => a.id);
      if (ids.length === 0) return [] as ConsolidationAdjustment[];

      const { data: lines } = await supabase
        .from('consolidation_adjustment_lines')
        .select('*')
        .in('adjustment_id', ids);

      return (adjustments ?? []).map(a => ({
        ...a,
        lines: (lines ?? []).filter(l => l.adjustment_id === a.id),
      })) as ConsolidationAdjustment[];
    },
  });

  useEffect(() => {
    if (!periodId) return;
    const channel = supabase
      .channel(`cons-adj-${periodId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'consolidation_adjustments', filter: `consolidation_period_id=eq.${periodId}` },
        () => qc.invalidateQueries({ queryKey: ['consolidation-adjustments', periodId] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'consolidation_adjustment_lines' },
        () => qc.invalidateQueries({ queryKey: ['consolidation-adjustments', periodId] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [periodId, qc]);

  const create = useMutation({
    mutationFn: async (payload: {
      adjustment_type: string;
      description?: string;
      affected_company_ids?: string[];
      source?: string;
      ai_suggestion_id?: string;
      confidence?: number;
      lines: ConsolidationAdjustmentLine[];
    }) => {
      if (!periodId) throw new Error('No period');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const totalDebit = payload.lines.reduce((s, l) => s + Number(l.debit || 0), 0);
      const totalCredit = payload.lines.reduce((s, l) => s + Number(l.credit || 0), 0);
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error(`Debet (${totalDebit}) och kredit (${totalCredit}) balanserar inte`);
      }

      const { data: adj, error } = await supabase
        .from('consolidation_adjustments')
        .insert({
          consolidation_period_id: periodId,
          adjustment_type: payload.adjustment_type as any,
          description: payload.description ?? null,
          affected_company_ids: payload.affected_company_ids ?? [],
          source: (payload.source ?? 'manual') as any,
          ai_suggestion_id: payload.ai_suggestion_id ?? null,
          confidence: payload.confidence ?? null,
          total_amount: totalDebit,
          status: 'applied' as any,
          created_by: user.id,
          applied_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      if (error) throw error;

      const linesPayload = payload.lines.map((l, i) => ({
        adjustment_id: adj.id,
        line_no: l.line_no ?? i + 1,
        company_id: l.company_id ?? null,
        account_no: l.account_no,
        account_name: l.account_name ?? null,
        debit: Number(l.debit || 0),
        credit: Number(l.credit || 0),
        description: l.description ?? null,
      }));
      const { error: linesErr } = await supabase
        .from('consolidation_adjustment_lines')
        .insert(linesPayload);
      if (linesErr) throw linesErr;

      return adj.id;
    },
    onSuccess: () => {
      toast.success('Justering skapad');
      qc.invalidateQueries({ queryKey: ['consolidation-adjustments', periodId] });
    },
    onError: (e: any) => toast.error(e.message ?? 'Kunde inte skapa justering'),
  });

  const revert = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('consolidation_adjustments')
        .update({ status: 'reverted' as any, reverted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Justering återförd');
      qc.invalidateQueries({ queryKey: ['consolidation-adjustments', periodId] });
    },
  });

  return { ...query, create, revert };
}
