import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Counts journal entries created by AI in the last 24h across the firm's clients.
 * Polls every 60 seconds.
 */
export function useAutomationStats(companyIds: string[]) {
  const key = [...companyIds].sort().join(",");
  return useQuery({
    queryKey: ["automation-stats", key],
    enabled: companyIds.length > 0,
    refetchInterval: 60_000,
    staleTime: 30_000,
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { count, error } = await supabase
        .from("journal_entries")
        .select("id", { count: "exact", head: true })
        .in("company_id", companyIds)
        .eq("status", "approved")
        .gte("created_at", since)
        .not("ai_confidence", "is", null);
      if (error) {
        console.warn("[useAutomationStats]", error.message);
        return { autoHandledToday: 0 };
      }
      return { autoHandledToday: count ?? 0 };
    },
  });
}
