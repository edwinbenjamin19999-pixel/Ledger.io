import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";
import { toast } from "sonner";

export interface FirmDeadline {
  id: string;
  firm_id: string;
  client_id: string | null;
  company_id: string | null;
  deadline_type: string;
  label: string;
  due_date: string;
  status: "pending" | "in_progress" | "submitted" | "overdue";
  related_task_id: string | null;
  metadata: Record<string, unknown>;
}

/** Persistent firm-wide deadlines (replaces ad-hoc compute). */
export function useFirmDeadlines() {
  const { firmId } = useAdvisorContext();
  return useQuery({
    queryKey: ["firm-deadlines", firmId],
    enabled: !!firmId,
    queryFn: async (): Promise<FirmDeadline[]> => {
      const { data, error } = await supabase
        .from("firm_deadlines")
        .select("*")
        .eq("firm_id", firmId!)
        .neq("status", "submitted")
        .order("due_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as FirmDeadline[];
    },
  });
}

export function useUpdateFirmDeadline() {
  const qc = useQueryClient();
  const { firmId } = useAdvisorContext();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: FirmDeadline["status"] }) => {
      const { error } = await supabase.from("firm_deadlines").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["firm-deadlines", firmId] });
      toast.success("Deadline uppdaterad");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
