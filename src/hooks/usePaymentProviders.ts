import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PaymentProviderConfig } from "@/lib/payments/providers";

export function usePaymentProviders(companyId: string | null) {
  return useQuery({
    queryKey: ["payment-providers", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<PaymentProviderConfig[]> => {
      const { data, error } = await supabase
        .from("payment_providers" as never)
        .select("id,company_id,provider_type,provider_name,display_name,supports_account_information,supports_payment_initiation,status")
        .eq("company_id", companyId!)
        .order("provider_type", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as PaymentProviderConfig[];
    },
  });
}
