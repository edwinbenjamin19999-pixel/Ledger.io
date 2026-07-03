import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";
import { toast } from "sonner";

export type FirmInsightSeverity = "critical" | "warning" | "opportunity" | "info";

export interface FirmInsight {
  id: string;
  firm_id: string;
  client_id: string | null;
  company_id: string | null;
  severity: FirmInsightSeverity;
  insight_type: string;
  category: string | null;
  title: string;
  explanation: string | null;
  impact_value: number | null;
  confidence: number;
  action_payload: Record<string, unknown>;
  status: "open" | "snoozed" | "resolved" | "dismissed";
  created_at: string;
}

/** Read all open firm-wide insights, newest first, sorted by severity. */
export function useFirmInsights() {
  const { firmId } = useAdvisorContext();
  return useQuery({
    queryKey: ["firm-insights", firmId],
    enabled: !!firmId,
    queryFn: async (): Promise<FirmInsight[]> => {
      const { data, error } = await supabase
        .from("firm_insights")
        .select("*")
        .eq("firm_id", firmId!)
        .eq("status", "open")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as FirmInsight[];
    },
  });
}

/** Resolve / dismiss a firm insight. */
export function useResolveFirmInsight() {
  const qc = useQueryClient();
  const { firmId } = useAdvisorContext();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "resolved" | "dismissed" }) => {
      const { error } = await supabase
        .from("firm_insights")
        .update({ status, resolved_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["firm-insights", firmId] });
      toast.success("Insikt uppdaterad");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
