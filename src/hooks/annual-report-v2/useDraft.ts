import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ARDraft {
  id: string;
  company_id: string;
  fiscal_year: number;
  fiscal_year_start: string;
  fiscal_year_end: string;
  report_type: string;
  status: string;
}

/**
 * Loads (or creates) the annual_reports row for the active company + fiscal year.
 * v2 reuses the existing annual_reports table.
 */
export function useDraft(companyId: string | null, fiscalYear: number, framework: "K2" | "K3" = "K2") {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["ar-v2-draft", companyId, fiscalYear],
    enabled: !!companyId,
    queryFn: async (): Promise<ARDraft | null> => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from("annual_reports")
        .select("id, company_id, fiscal_year, fiscal_year_start, fiscal_year_end, report_type, status")
        .eq("company_id", companyId)
        .eq("fiscal_year", fiscalYear)
        .maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      return (data as ARDraft) ?? null;
    },
  });

  const ensure = useMutation({
    mutationFn: async (): Promise<ARDraft> => {
      if (!companyId) throw new Error("Inget bolag valt");
      const existing = query.data;
      if (existing) return existing;
      const { data, error } = await supabase
        .from("annual_reports")
        .insert({
          company_id: companyId,
          fiscal_year: fiscalYear,
          fiscal_year_start: `${fiscalYear}-01-01`,
          fiscal_year_end: `${fiscalYear}-12-31`,
          report_type: framework,
          status: "draft",
        })
        .select("id, company_id, fiscal_year, fiscal_year_start, fiscal_year_end, report_type, status")
        .single();
      if (error) throw error;
      return data as ARDraft;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ar-v2-draft", companyId, fiscalYear] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const updateFramework = useMutation({
    mutationFn: async (next: "K2" | "K3") => {
      if (!query.data) throw new Error("Saknar utkast");
      const { error } = await supabase
        .from("annual_reports")
        .update({ report_type: next })
        .eq("id", query.data.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ar-v2-draft", companyId, fiscalYear] }),
  });

  return { ...query, ensure, updateFramework };
}
