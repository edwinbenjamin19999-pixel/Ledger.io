import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ConfidenceHistoryPoint {
  id: string;
  computed_at: string;
  overall_score: number;
  level: string;
  components: Record<string, number>;
  weak_signals: Array<{ account: string; variance: number; reason: string }>;
}

export function useConfidenceTrend(companyId: string | null, budgetId: string | null) {
  return useQuery({
    queryKey: ["confidence-trend", companyId, budgetId],
    enabled: !!companyId,
    queryFn: async () => {
      if (!companyId) return [] as ConfidenceHistoryPoint[];
      let q = supabase
        .from("forecast_confidence_history")
        .select("*")
        .eq("company_id", companyId)
        .order("computed_at", { ascending: false })
        .limit(30);
      if (budgetId) q = q.eq("budget_id", budgetId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map((r: any) => ({
        id: r.id,
        computed_at: r.computed_at,
        overall_score: Number(r.overall_score),
        level: r.level,
        components: r.components || {},
        weak_signals: r.weak_signals || [],
      })) as ConfidenceHistoryPoint[];
    },
  });
}
