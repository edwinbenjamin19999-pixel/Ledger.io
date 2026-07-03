import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ForecastAdjustment {
  id: string;
  company_id: string;
  budget_id: string | null;
  account_number: string;
  period_month: string;
  prior_value: number | null;
  new_value: number;
  source: 'manual' | 'ai' | 'reset';
  ai_suggestion_id: string | null;
  reasoning: string | null;
  applied_by: string | null;
  applied_at: string;
  undone_at: string | null;
}

export interface RecordAdjustmentInput {
  companyId: string;
  budgetId?: string | null;
  accountNumber: string;
  periodMonth: string;
  priorValue: number | null;
  newValue: number;
  source: 'manual' | 'ai' | 'reset';
  aiSuggestionId?: string | null;
  reasoning?: string | null;
}

export function useForecastAdjustments(companyId: string | null) {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ['forecast-adjustments', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('forecast_adjustments')
        .select('*')
        .eq('company_id', companyId)
        .is('undone_at', null)
        .order('applied_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as ForecastAdjustment[];
    },
  });

  const record = useMutation({
    mutationFn: async (input: RecordAdjustmentInput) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('forecast_adjustments')
        .insert({
          company_id: input.companyId,
          budget_id: input.budgetId ?? null,
          account_number: input.accountNumber,
          period_month: input.periodMonth,
          prior_value: input.priorValue,
          new_value: input.newValue,
          source: input.source,
          ai_suggestion_id: input.aiSuggestionId ?? null,
          reasoning: input.reasoning ?? null,
          applied_by: userId,
        })
        .select()
        .single();
      if (error) throw error;
      return data as ForecastAdjustment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['forecast-adjustments', companyId] });
    },
  });

  const undo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('forecast_adjustments')
        .update({ undone_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['forecast-adjustments', companyId] });
    },
  });

  return { list, record, undo };
}
