import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ARValidation {
  id: string;
  annual_report_id: string;
  company_id: string;
  rule_code: string;
  severity: "error" | "warning" | "info";
  section_id: string | null;
  message: string;
  fix_action: { type: string; payload?: Record<string, unknown> } | null;
  resolved_at: string | null;
  created_at: string;
}

export function useValidations(annualReportId: string | null) {
  const qc = useQueryClient();
  const key = ["ar-v2-validations", annualReportId];

  const query = useQuery({
    queryKey: key,
    enabled: !!annualReportId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_validations")
        .select("*")
        .eq("annual_report_id", annualReportId!)
        .is("resolved_at", null)
        .order("severity", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as ARValidation[];
    },
  });

  useEffect(() => {
    if (!annualReportId) return;
    const ch = supabase
      .channel(`ar-validations-${annualReportId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ar_validations", filter: `annual_report_id=eq.${annualReportId}` },
        () => qc.invalidateQueries({ queryKey: key }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [annualReportId, qc]);

  const runValidation = useMutation({
    mutationFn: async () => {
      if (!annualReportId) throw new Error("Saknar utkast");
      const { data, error } = await supabase.functions.invoke("ar-validate", {
        body: { annualReportId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Validering klar");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { ...query, runValidation };
}
