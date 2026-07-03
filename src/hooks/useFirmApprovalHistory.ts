import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";

export interface FirmApprovalHistoryItem {
  id: string;
  company_id: string;
  company_name: string;
  entity_type: string;
  entity_id: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  metadata: Record<string, unknown>;
}

/**
 * Loads completed (signed/rejected) approval requests across the firm's portfolio
 * for the timeline + history tabs.
 */
export function useFirmApprovalHistory(limit = 100) {
  const { firmId, clients } = useAdvisorContext();
  const companyIds = clients.map((c) => c.id);

  return useQuery({
    queryKey: ["firm-approval-history", firmId, companyIds.join(","), limit],
    enabled: !!firmId && companyIds.length > 0,
    queryFn: async (): Promise<FirmApprovalHistoryItem[]> => {
      const { data, error } = await supabase
        .from("approval_requests")
        .select("id, company_id, entity_type, entity_id, status, created_at, completed_at, metadata")
        .in("company_id", companyIds)
        .in("status", ["approved", "rejected", "signed"])
        .order("completed_at", { ascending: false, nullsFirst: false })
        .limit(limit);
      if (error) {
        console.warn("[useFirmApprovalHistory]", error.message);
        return [];
      }
      const nameById = new Map(clients.map((c) => [c.id, c.name] as const));
      return (data ?? []).map((r) => ({
        id: r.id,
        company_id: r.company_id,
        company_name: nameById.get(r.company_id) ?? "Okänd klient",
        entity_type: r.entity_type,
        entity_id: r.entity_id,
        status: r.status,
        created_at: r.created_at,
        completed_at: r.completed_at,
        metadata: (r.metadata as Record<string, unknown>) ?? {},
      }));
    },
  });
}
