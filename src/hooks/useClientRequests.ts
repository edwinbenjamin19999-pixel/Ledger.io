import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";

export interface ClientRequestRow {
  id: string;
  firm_id: string;
  company_id: string;
  client_name: string;
  title: string;
  message: string | null;
  module: string;
  request_type: string;
  status: string;
  priority: string;
  due_date: string | null;
  ai_generated: boolean;
  ai_suggestion: string | null;
  created_at: string;
  responded_at: string | null;
  resolved_at: string | null;
}

/**
 * Cross-client follow-up / client-request inbox for the WL workspace.
 * Reads `client_requests` scoped to the active firm.
 */
export function useClientRequests() {
  const { firmId, clients } = useAdvisorContext();

  return useQuery({
    queryKey: ["client-requests", firmId],
    enabled: !!firmId,
    queryFn: async (): Promise<ClientRequestRow[]> => {
      const { data, error } = await supabase
        .from("client_requests")
        .select(
          "id, firm_id, company_id, title, message, module, request_type, status, priority, due_date, ai_generated, ai_suggestion, created_at, responded_at, resolved_at",
        )
        .eq("firm_id", firmId!)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const nameMap = new Map(clients.map((c) => [c.id, c.name]));
      return (data ?? []).map((r) => ({
        ...r,
        client_name: nameMap.get(r.company_id) ?? "Okänd klient",
      })) as ClientRequestRow[];
    },
  });
}
