import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Clock, CreditCard, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TrialBannerProps { companyId: string;
}

export const TrialBanner = ({ companyId }: TrialBannerProps) => { const [trialInfo, setTrialInfo] = useState<{ isTrialing: boolean;
    daysLeft: number;
    endDate: string | null;
  } | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadTrialInfo();
  }, [companyId]);

  const loadTrialInfo = async () => { try { const { data: company, error } = await supabase
        .from("companies")
        .select("subscription_status, subscription_end_date, stripe_subscription_id")
        .eq("id", companyId)
        .maybeSingle();

      if (error) throw error;

      if (company?.subscription_status === "trialing" && company.stripe_subscription_id) { // Check subscription end date from Stripe via check-subscription
        const { data: subData } = await supabase.functions.invoke("check-subscription");
        
        if (subData?.subscription_end) { const endDate = new Date(subData.subscription_end);
          const now = new Date();
          const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          setTrialInfo({ isTrialing: true,
            daysLeft: Math.max(0, daysLeft),
            endDate: subData.subscription_end,
          });
        }
      } else if (company?.subscription_status === "past_due" || company?.subscription_status === "unpaid") { setTrialInfo({ isTrialing: false,
          daysLeft: 0,
          endDate: null,
        });
      }
    } catch (error) { console.error("Error loading trial info:", error);
    }
  };

  const handleManageSubscription = async () => { setLoading(true);
    try { const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) { window.open(data.url, "_blank");
      }
    } catch (error) { console.error("Error opening portal:", error);
      toast.error("Kunde inte öppna prenumerationshantering");
    } finally { setLoading(false);
    }
  };

  if (dismissed || !trialInfo) return null;

  // Show urgent banner only when 7 days or less
  if (trialInfo.isTrialing && trialInfo.daysLeft > 7) return null;

  const getAlertVariant = () => { if (!trialInfo.isTrialing) return "destructive";
    if (trialInfo.daysLeft <= 1) return "destructive";
    if (trialInfo.daysLeft <= 3) return "destructive";
    return "default";
  };

  const getMessage = () => { if (!trialInfo.isTrialing) { return { title: "Din provperiod har gått ut",
        description: "Lägg till en betalningsmetod för att fortsätta använda Bokfy fullt ut. Du kan fortfarande se din data.",
      };
    }
    
    if (trialInfo.daysLeft === 0) { return { title: "Din provperiod avslutas idag!",
        description: "Lägg till en betalningsmetod nu för att fortsätta använda Bokfy utan avbrott.",
      };
    }
    
    if (trialInfo.daysLeft === 1) { return { title: "1 dag kvar av din provperiod",
        description: "Lägg till en betalningsmetod för att fortsätta använda alla funktioner efter imorgon.",
      };
    }
    
    return { title: `${trialInfo.daysLeft} dagar kvar av din provperiod`,
      description: "Lägg till en betalningsmetod för att fortsätta använda Bokfy efter provperioden.",
    };
  };

  const { title, description } = getMessage();

  return (
    <Alert variant={getAlertVariant()} className="relative mb-4">
      <Clock className="h-4 w-4" />
      <AlertTitle className="font-semibold">{title}</AlertTitle>
      <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-4 mt-2">
        <span className="flex-1">{description}</span>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            onClick={handleManageSubscription}
            disabled={loading}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            {loading ? "Laddar..." : "Lägg till betalmetod"}
          </Button>
          {trialInfo.isTrialing && trialInfo.daysLeft > 1 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDismissed(true)}
              className="px-2"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};
