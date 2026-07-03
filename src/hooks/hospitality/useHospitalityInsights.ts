import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIndustry } from "@/contexts/IndustryContext";
import { toast } from "@/hooks/use-toast";

export function useHospitalityInsights() {
  const { companyId } = useIndustry();

  return useQuery({
    queryKey: ["hospitality-insights", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hospitality_insights")
        .select("*")
        .eq("company_id", companyId!)
        .is("dismissed_at", null)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}

export function useGenerateInsights() {
  const { companyId, industry } = useIndustry();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("hospitality-ai-insights", {
        body: { company_id: companyId, industry },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast({
        title: "AI-insikter genererade",
        description: `${data?.created ?? 0} nya insikter`,
      });
      qc.invalidateQueries({ queryKey: ["hospitality-insights", companyId] });
    },
    onError: (e: any) => {
      toast({ title: "Generering misslyckades", description: String(e?.message ?? e), variant: "destructive" });
    },
  });
}

export function useDismissInsight() {
  const { companyId } = useIndustry();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("hospitality_insights")
        .update({ dismissed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hospitality-insights", companyId] });
    },
  });
}
