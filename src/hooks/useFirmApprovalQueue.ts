import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";

export interface FirmApprovalItem {
  id: string;
  company_id: string;
  company_name: string;
  entity_type: string;
  entity_id: string;
  status: string;
  created_at: string;
  ageDays: number;
  metadata: Record<string, unknown>;
}

/**
 * Aggregates pending approval_requests across every client the advisor's firm
 * has access to. RLS automatically filters to authorized companies via the
 * advisor's user_roles entries created when a firm-client mandate is granted.
 */
export function useFirmApprovalQueue() {
  const { firmId, clients } = useAdvisorContext();
  const companyIds = clients.map((c) => c.id);

  return useQuery({
    queryKey: ["firm-approval-queue", firmId, companyIds.join(",")],
    enabled: !!firmId && companyIds.length > 0,
    queryFn: async (): Promise<FirmApprovalItem[]> => {
      const { data, error } = await supabase
        .from("approval_requests")
        .select("id, company_id, entity_type, entity_id, status, created_at, metadata")
        .in("company_id", companyIds)
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) {
        console.warn("[useFirmApprovalQueue]", error.message);
        return [];
      }
      const nameById = new Map(clients.map((c) => [c.id, c.name] as const));
      const now = Date.now();
      return (data ?? []).map((r) => ({
        id: r.id,
        company_id: r.company_id,
        company_name: nameById.get(r.company_id) ?? "Okänd klient",
        entity_type: r.entity_type,
        entity_id: r.entity_id,
        status: r.status,
        created_at: r.created_at,
        ageDays: Math.floor(
          (now - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24),
        ),
        metadata: (r.metadata as Record<string, unknown>) ?? {},
      }));
    },
  });
}
