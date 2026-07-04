import { ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Lock, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

interface SubscriptionGateProps { children: ReactNode;
  subscriptionStatus: string | null;
  feature?: string;
  fallback?: ReactNode;
}

/**
 * SubscriptionGate provides soft blocking för users with expired trials.
 * - Users with active/trialing status: full access
 * - Users with past_due/unpaid/cancelled: shows upgrade prompt instead of children
 */
export const SubscriptionGate = ({ children, 
  subscriptionStatus, 
  feature = "denna funktion",
  fallback
}: SubscriptionGateProps) => { const [loading, setLoading] = useState(false);

  const isBlocked = subscriptionStatus && 
    !["active", "trialing"].includes(subscriptionStatus);

  const handleUpgrade = async () => { setLoading(true);
    try { const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) { window.open(data.url, "_blank");
      }
    } catch (error) { console.error("Error opening portal:", error);
      toast.error("Kunde inte öppna prenumerationshantering");
    } finally { setLoading(false);
    }
  };

  if (!isBlocked) { return <>{children}</>;
  }

  if (fallback) { return <>{fallback}</>;
  }

  return (
    <Alert className="border-amber-500/50 bg-[#FAEEDA]">
      <Lock className="h-4 w-4 text-[#7A5417]" />
      <AlertTitle className="text-[#7A5417] dark:text-[#C28A2B]">
        Prenumeration krävs
      </AlertTitle>
      <AlertDescription className="mt-2">
        <p className="text-sm text-muted-foreground mb-4">
          För att använda {feature} behöver du aktivera din prenumeration. 
          Din provperiod har gått ut, men all din data finns kvar.
        </p>
        <Button onClick={handleUpgrade} disabled={loading} size="sm">
          <CreditCard className="h-4 w-4 mr-2" />
          {loading ? "Laddar..." : "Aktivera prenumeration"}
        </Button>
      </AlertDescription>
    </Alert>
  );
};

/**
 * Hook to check if creation actions should be blocked
 */
export const useSubscriptionGate = (subscriptionStatus: string | null) => { const isBlocked = subscriptionStatus && 
    !["active", "trialing"].includes(subscriptionStatus);
  
  const showBlockedMessage = () => { toast.error("Din provperiod har gått ut. Aktivera prenumeration för att fortsätta.", { action: { label: "Aktivera",
        onClick: async () => { const { data } = await supabase.functions.invoke("customer-portal");
          if (data?.url) window.open(data.url, "_blank");
        },
      },
    });
  };

  return { isBlocked,
    showBlockedMessage,
  };
};
