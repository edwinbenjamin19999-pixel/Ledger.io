import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";
import { toast } from "sonner";

export interface FirmSettings {
  id: string;
  name: string;
  logo_url: string | null;
  brand_primary_color: string;
  brand_accent_color: string;
  support_email: string | null;
  website: string | null;
  client_portal_enabled: boolean;
  allow_client_self_signup: boolean;
  subtitle: string | null;
  show_powered_by: boolean;
  custom_domain: string | null;
  custom_domain_status: "none" | "pending" | "verified" | "failed";
  portal_name: string | null;
  portal_logo_url: string | null;
  portal_welcome_message: string | null;
}

export function useFirmSettings() {
  const { firmId } = useAdvisorContext();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["firm-settings", firmId],
    enabled: !!firmId,
    queryFn: async (): Promise<FirmSettings | null> => {
      const { data, error } = await supabase
        .from("accounting_firms")
        .select("id, name, logo_url, brand_primary_color, brand_accent_color, support_email, website, client_portal_enabled, allow_client_self_signup, subtitle, show_powered_by, custom_domain, custom_domain_status, portal_name, portal_logo_url, portal_welcome_message")
        .eq("id", firmId!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as FirmSettings | null;
    },
  });

  const update = useMutation({
    mutationFn: async (patch: Partial<FirmSettings>) => {
      if (!firmId) throw new Error("Saknar byrå-ID");
      const { error } = await supabase
        .from("accounting_firms")
        .update(patch)
        .eq("id", firmId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["firm-settings", firmId] });
      qc.invalidateQueries({ queryKey: ["advisor-firm"] });
      qc.invalidateQueries({ queryKey: ["bureau-branding", firmId] });
      toast.success("Inställningar sparade");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { firm: query.data, isLoading: query.isLoading, update };
}
