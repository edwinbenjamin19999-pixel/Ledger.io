import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIndustry } from "@/contexts/IndustryContext";
import { toast } from "@/hooks/use-toast";

export function useReconciliationQueue() {
  const { companyId } = useIndustry();

  return useQuery({
    queryKey: ["hospitality-reconciliation", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hospitality_reconciliation")
        .select("*")
        .eq("company_id", companyId!)
        .order("sale_date", { ascending: false })
        .limit(60);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

export function useRunReconciliation() {
  const { companyId } = useIndustry();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("hospitality-reconcile-pos", {
        body: { company_id: companyId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast({
        title: "Avstämning klar",
        description: `${data?.matched ?? 0} dagar matchade, ${data?.flagged ?? 0} flaggade`,
      });
      qc.invalidateQueries({ queryKey: ["hospitality-reconciliation", companyId] });
    },
    onError: (e: any) => {
      toast({ title: "Avstämning misslyckades", description: String(e?.message ?? e), variant: "destructive" });
    },
  });
}

export function useApproveReconciliation() {
  const { companyId } = useIndustry();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("hospitality_reconciliation")
        .update({
          status: "matched",
          reconciled_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hospitality-reconciliation", companyId] });
    },
  });
}
