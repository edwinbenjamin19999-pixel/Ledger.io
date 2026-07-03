/**
 * Materializer — calls the materialize-financial-values edge function and
 * exposes a hook for reading materialized rows directly from financial_values.
 *
 * Phase 4: active.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MaterializeInput {
  companyId: string;
  periodId: string;
  templateId: string;
  layers?: Array<"actual" | "budget" | "forecast">;
  /** Force recompute even if a fresh snapshot exists. */
  force?: boolean;
}

export interface MaterializeResult {
  success: boolean;
  cached?: boolean;
  rowsWritten: number;
  validationsWritten?: number;
  durationMs: number;
  dataVersion?: number;
  message?: string;
  error?: string;
}

/**
 * Trigger materialization for a (company, period, template). Idempotent:
 * a fresh snapshot (<5min, no data_version bump) returns `cached: true`
 * without recomputing. Pass `force: true` to bypass the cache.
 */
export async function materializeForPeriod(
  input: MaterializeInput,
): Promise<MaterializeResult> {
  const { data, error } = await supabase.functions.invoke(
    "materialize-financial-values",
    { body: input },
  );
  if (error) {
    return {
      success: false,
      rowsWritten: 0,
      durationMs: 0,
      error: error.message,
    };
  }
  return data as MaterializeResult;
}

export interface MaterializedRow {
  row_id: string;
  amount: number;
  value_layer: string;
  source_type: string;
  computed_at: string;
}

/**
 * Read materialized financial_values directly from DB (fast path).
 * Returns rows for all layers; consumers filter as needed.
 */
export function useMaterializedValues(
  companyId: string | null,
  periodId: string | null,
  templateId: string | null,
) {
  return useQuery<MaterializedRow[]>({
    queryKey: ["materialized-values", companyId, periodId, templateId],
    enabled: !!companyId && !!periodId && !!templateId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_values")
        .select("row_id, amount, value_layer, source_type, computed_at")
        .eq("company_id", companyId!)
        .eq("period_id", periodId!)
        .in(
          "row_id",
          (
            await supabase
              .from("report_rows")
              .select("id")
              .eq("template_id", templateId!)
          ).data?.map((r) => r.id) ?? [],
        );
      if (error) throw error;
      return (data ?? []) as MaterializedRow[];
    },
  });
}
