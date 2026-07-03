import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns last-12-months revenue per company (sum of credit-debit on 3xxx accounts).
 * Uses the get_client_revenues RPC.
 */
export function useClientRevenue(companyIds: string[]) {
  const key = [...companyIds].sort().join(",");
  return useQuery({
    queryKey: ["client-revenue-12m", key],
    enabled: companyIds.length > 0,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const map = new Map<string, number>();
      const { data, error } = await supabase.rpc("get_client_revenues", {
        company_ids: companyIds,
      });
      if (error) {
        console.warn("[useClientRevenue]", error.message);
        return map;
      }
      (data ?? []).forEach((row: { company_id: string; revenue: number }) => {
        map.set(row.company_id, Number(row.revenue) || 0);
      });
      return map;
    },
  });
}
