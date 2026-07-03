import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";
import { toast } from "sonner";

export type BureauAlert = {
  id: string;
  firm_id: string;
  firm_client_id: string | null;
  severity: "critical" | "warning" | "info";
  code: string;
  message: string;
  action_url: string | null;
  status: "open" | "dismissed" | "resolved";
  created_at: string;
  dismissed_at: string | null;
  dismissed_by: string | null;
  client_name?: string | null;
};

/** Read open bureau_alerts joined with the client name. */
export function useBureauAlerts() {
  const { firmId } = useAdvisorContext();

  return useQuery({
    queryKey: ["bureau-alerts", firmId],
    enabled: !!firmId,
    queryFn: async (): Promise<BureauAlert[]> => {
      const { data, error } = await supabase
        .from("bureau_alerts")
        .select(`
          id, firm_id, firm_client_id, severity, code, message,
          action_url, status, created_at, dismissed_at, dismissed_by,
          firm_clients:firm_client_id (
            companies:company_id ( name )
          )
        `)
        .eq("firm_id", firmId!)
        .eq("status", "open")
        .order("severity", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        ...row,
        client_name: row.firm_clients?.companies?.name ?? null,
      }));
    },
  });
}

/** Trigger backend scan to refresh alerts. */
export function useTriggerProactiveAlerts() {
  const { firmId } = useAdvisorContext();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("bureau-proactive-alerts", {
        body: { firm_id: firmId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Skanning klar");
      qc.invalidateQueries({ queryKey: ["bureau-alerts", firmId] });
    },
    onError: (e: any) => toast.error("Fel: " + (e?.message ?? "okänt")),
  });
}

/** Dismiss / resolve a single alert. */
export function useUpdateAlertStatus() {
  const { firmId } = useAdvisorContext();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "dismissed" | "resolved" }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("bureau_alerts")
        .update({
          status,
          dismissed_at: new Date().toISOString(),
          dismissed_by: user?.id ?? null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bureau-alerts", firmId] }),
    onError: (e: any) => toast.error("Fel: " + (e?.message ?? "okänt")),
  });
}
