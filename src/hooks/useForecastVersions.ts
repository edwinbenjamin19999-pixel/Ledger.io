/**
 * useForecastVersions — list / lock / unlock / restore forecast snapshots.
 * Backed by the `forecast_versions` table.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ForecastSnapshot } from "@/lib/forecast/versionEngine";

export type ForecastVersionKind = "rolling" | "monthly" | "quarterly" | "custom";

export interface ForecastVersion {
  id: string;
  company_id: string;
  budget_id: string | null;
  fiscal_year: number;
  label: string;
  kind: ForecastVersionKind;
  snapshot: ForecastSnapshot;
  base_confidence: number | null;
  parent_version_id: string | null;
  locked_at: string;
  locked_by: string | null;
  created_at: string;
  updated_at: string;
}

interface Args {
  companyId: string | null;
  budgetId: string | null;
  fiscalYear: number;
}

export function useForecastVersions({ companyId, budgetId, fiscalYear }: Args) {
  const qc = useQueryClient();
  const queryKey = ["forecast-versions", companyId, budgetId, fiscalYear];

  const list = useQuery({
    queryKey,
    enabled: !!companyId,
    queryFn: async () => {
      if (!companyId) return [] as ForecastVersion[];
      let q = supabase
        .from("forecast_versions")
        .select("*")
        .eq("company_id", companyId)
        .eq("fiscal_year", fiscalYear)
        .order("locked_at", { ascending: false });
      if (budgetId) q = q.eq("budget_id", budgetId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as ForecastVersion[];
    },
  });

  const lock = useMutation({
    mutationFn: async (input: {
      label: string;
      kind: ForecastVersionKind;
      snapshot: ForecastSnapshot;
      baseConfidence?: number | null;
    }) => {
      if (!companyId) throw new Error("Missing companyId");
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("forecast_versions")
        .insert([{
          company_id: companyId,
          budget_id: budgetId,
          fiscal_year: fiscalYear,
          label: input.label,
          kind: input.kind,
          snapshot: input.snapshot as never,
          base_confidence: input.baseConfidence ?? null,
          locked_by: auth.user?.id ?? null,
        }])
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ForecastVersion;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("forecast_versions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  return { list, lock, remove };
}
