import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionData { tier: string;
  status: string;
  hasFeature: (feature: string) => boolean;
}

export const useSubscription = (companyId?: string) => { const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!companyId) { setLoading(false);
      return;
    }
    loadSubscription();
  }, [companyId]);

  const loadSubscription = async () => { if (!companyId) return;

    try { // Per-company subscription: check company's own subscription_status
      const { data: company, error } = await supabase
        .from("companies")
        .select("subscription_tier, subscription_status")
        .eq("id", companyId)
        .maybeSingle();

      if (error) throw error;

      // Defensive: company can be null if RLS hides the row or it was deleted.
      if (!company) {
        setSubscription({ tier: 'standard', status: 'active', hasFeature: () => true });
        return;
      }

      const status = company.subscription_status || 'trialing';
      const tier = company.subscription_tier || 'standard';

      setSubscription({ tier,
        status,
        // Single plan: all features included if active/trialing
        hasFeature: () => ["active", "trialing"].includes(status),
      });
    } catch (error) { console.error("Error loading subscription:", error);
      // Default to allow access on error
      setSubscription({ tier: 'standard',
        status: 'active',
        hasFeature: () => true,
      });
    } finally { setLoading(false);
    }
  };

  return { subscription, loading };
};
