// useAIReview — runs AI compliance review and exposes findings + actions.
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type FindingCategory = "narrative_mismatch" | "missing_disclosure" | "unusual_metric" | "tone" | "compliance";
export type FindingSeverity = "error" | "warning" | "info";
export type FindingStatus = "open" | "accepted" | "dismissed";

export interface ARFinding {
  id: string;
  annual_report_id: string;
  section_id: string | null;
  block_id: string | null;
  category: FindingCategory;
  severity: FindingSeverity;
  title: string;
  detail: string;
  suggested_fix: { type: string; payload?: Record<string, unknown> } | null;
  status: FindingStatus;
  ai_confidence: number | null;
  created_at: string;
}

export function useAIReview(annualReportId: string | null) {
  const qc = useQueryClient();
  const key = ["ar-v2-findings", annualReportId];

  const query = useQuery({
    queryKey: key,
    enabled: !!annualReportId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_ai_findings" as never)
        .select("*")
        .eq("annual_report_id", annualReportId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ARFinding[];
    },
  });

  useEffect(() => {
    if (!annualReportId) return;
    const ch = supabase
      .channel(`ar-findings-${annualReportId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ar_ai_findings", filter: `annual_report_id=eq.${annualReportId}` },
        () => qc.invalidateQueries({ queryKey: key }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [annualReportId, qc]);

  const runReview = useMutation({
    mutationFn: async () => {
      if (!annualReportId) throw new Error("Saknar utkast");
      const { data, error } = await supabase.functions.invoke("ar-ai-review", { body: { annualReportId } });
      if (error) throw error;
      return data as { created: number; updated: number; closed: number };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: key });
      toast.success(`AI-revision klar — ${r?.created ?? 0} nya fynd`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dismiss = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ar_ai_findings" as never)
        .update({ status: "dismissed" } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const accept = useMutation({
    mutationFn: async (id: string) => {
      // Marking as accepted; the actual fix application is up to the caller (uses suggested_fix).
      const { error } = await supabase
        .from("ar_ai_findings" as never)
        .update({ status: "accepted" } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { ...query, runReview, dismiss, accept };
}
