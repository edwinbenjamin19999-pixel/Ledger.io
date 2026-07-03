import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFirmClients, type FirmClientEnriched } from "@/hooks/useFirmDashboard";

export interface AdvisorContext {
  firmId: string | null;
  firmName: string | null;
  firmLogo: string | null;
  isAdvisor: boolean;
  clients: FirmClientEnriched[];
  isLoading: boolean;
}

export function useAdvisorContext(): AdvisorContext {
  const { user } = useAuth();

  const { data: firm, isLoading: firmLoading } = useQuery({
    queryKey: ["advisor-firm", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: membership } = await supabase
        .from("firm_members")
        .select("firm_id, accounting_firms:firm_id (id, name, logo_url)")
        .eq("user_id", user!.id)
        .eq("is_active", true)
        .maybeSingle();
      if (!membership) return null;
      const f = membership.accounting_firms as unknown as
        { id: string; name: string; logo_url: string | null } | null;
      return f ? { id: f.id, name: f.name, logo: f.logo_url } : null;
    },
  });

  const { data: clients = [], isLoading: clientsLoading } = useFirmClients(firm?.id ?? "");

  return {
    firmId: firm?.id ?? null,
    firmName: firm?.name ?? null,
    firmLogo: firm?.logo ?? null,
    isAdvisor: !!firm?.id,
    clients,
    isLoading: firmLoading || (!!firm && clientsLoading),
  };
}
