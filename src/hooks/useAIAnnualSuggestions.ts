import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AIAnnualSuggestion {
  id: string;
  annual_report_id: string;
  company_id: string;
  suggestion_type: "accrual" | "depreciation" | "variance" | "missing_note" | string;
  title: string;
  explanation: string;
  impact_amount: number | null;
  affected_accounts: string[];
  proposed_adjustment: {
    account_number: string;
    debit: number;
    credit: number;
    description?: string;
    affected_areas?: string[];
  } | null;
  confidence: number;
  severity: "low" | "medium" | "high" | string;
  status: "pending" | "applied" | "dismissed";
  source_refs: Record<string, unknown>;
  model_version: string | null;
  applied_adjustment_id: string | null;
  dismissed_reason: string | null;
  created_at: string;
}

export function useAIAnnualSuggestions(annualReportId: string | null) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["ar-ai-suggestions", annualReportId],
    enabled: !!annualReportId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("annual_report_ai_suggestions")
        .select("*")
        .eq("annual_report_id", annualReportId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as AIAnnualSuggestion[];
    },
  });

  useEffect(() => {
    if (!annualReportId) return;
    const channel = supabase
      .channel(`ar-sug-${annualReportId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "annual_report_ai_suggestions", filter: `annual_report_id=eq.${annualReportId}` },
        () => qc.invalidateQueries({ queryKey: ["ar-ai-suggestions", annualReportId] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [annualReportId, qc]);

  const dismiss = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { error } = await supabase
        .from("annual_report_ai_suggestions")
        .update({ status: "dismissed", dismissed_reason: reason ?? null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ar-ai-suggestions", annualReportId] });
      toast.success("Förslaget avfärdat");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const detect = useMutation({
    mutationFn: async (input: { companyId: string; fiscalYear: number }) => {
      const { data, error } = await supabase.functions.invoke("detect-adjustment-suggestions", {
        body: { annual_report_id: annualReportId, company_id: input.companyId, fiscal_year: input.fiscalYear },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ar-ai-suggestions", annualReportId] });
      toast.success("AI-analys klar");
    },
    onError: (e: Error) => toast.error(e.message || "Kunde inte köra AI-analys"),
  });

  return { ...query, dismiss, detect };
}
