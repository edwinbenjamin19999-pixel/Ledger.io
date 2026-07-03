import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIndustry } from "@/contexts/IndustryContext";
import { toast } from "@/hooks/use-toast";

export function useSupplierIntelligence() {
  const { companyId } = useIndustry();

  return useQuery({
    queryKey: ["hospitality-suppliers", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hospitality_supplier_intelligence")
        .select("*")
        .eq("company_id", companyId!)
        .order("rolling_30d_total", { ascending: false, nullsFirst: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}

export function useAnalyzeSuppliers() {
  const { companyId } = useIndustry();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("hospitality-supplier-anomaly", {
        body: { company_id: companyId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast({
        title: "Leverantörsanalys klar",
        description: `${data?.analyzed ?? 0} leverantörer, ${data?.alerts ?? 0} avvikelser`,
      });
      qc.invalidateQueries({ queryKey: ["hospitality-suppliers", companyId] });
    },
    onError: (e: any) => {
      toast({ title: "Analys misslyckades", description: String(e?.message ?? e), variant: "destructive" });
    },
  });
}
