/**
 * useRollingForecast — auto-refresh rolling forecast cache.
 * Triggers edge function on mount; surfaces freshness & payload.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RollingForecastPayload {
  forecast: Record<string, number[]>;
  latest_month: number;
  generated_at: string;
}

interface Args {
  companyId: string | null;
  budgetId: string | null;
  fiscalYear: number;
}

export function useRollingForecast({ companyId, budgetId, fiscalYear }: Args) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["budget-rolling-forecast", budgetId],
    enabled: !!companyId && !!budgetId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!companyId || !budgetId) return null;

      // Read existing cache
      const { data: cache } = await supabase
        .from("budget_rolling_forecasts")
        .select("payload, computed_at")
        .eq("budget_id", budgetId)
        .maybeSingle();

      const ageH = cache
        ? (Date.now() - new Date(cache.computed_at).getTime()) / 3_600_000
        : Infinity;

      // Refresh if >6h or missing
      if (ageH > 6) {
        try {
          await supabase.functions.invoke("budget-rolling-forecast", {
            body: { company_id: companyId, budget_id: budgetId, fiscal_year: fiscalYear },
          });
          const { data: fresh } = await supabase
            .from("budget_rolling_forecasts")
            .select("payload, computed_at")
            .eq("budget_id", budgetId)
            .maybeSingle();
          return fresh;
        } catch (e) {
          console.error("rolling forecast refresh failed", e);
          return cache;
        }
      }
      return cache;
    },
  });

  // Realtime: refresh when journal_entries for company change
  useEffect(() => {
    if (!companyId || !budgetId) return;
    const ch = supabase
      .channel(`rf-${budgetId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "journal_entries", filter: `company_id=eq.${companyId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["budget-rolling-forecast", budgetId] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [companyId, budgetId, qc]);

  return {
    payload: (query.data?.payload ?? null) as unknown as RollingForecastPayload | null,
    computedAt: query.data?.computed_at ?? null,
    isLoading: query.isLoading,
    refresh: () => qc.invalidateQueries({ queryKey: ["budget-rolling-forecast", budgetId] }),
  };
}
