import { Lock, CreditCard, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

interface AccountLockedScreenProps {
  userEmail?: string;
  onSignOut: () => Promise<void>;
}

export const AccountLockedScreen = ({ userEmail, onSignOut }: AccountLockedScreenProps) => {
  const [loading, setLoading] = useState(false);

  const handleActivate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      } else {
        // No existing Stripe customer — try checkout
        const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke("create-checkout");
        if (checkoutError) throw checkoutError;
        if (checkoutData?.url) {
          window.open(checkoutData.url, "_blank");
        }
      }
    } catch (error) {
      console.error("Error opening payment:", error);
      toast.error("Kunde inte öppna betalning. Försök igen.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full border-destructive/30 shadow-lg">
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <Lock className="h-8 w-8 text-destructive" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Kontot är pausat</h1>
            <p className="text-muted-foreground">
              Din provperiod har gått ut och ingen aktiv prenumeration hittades. 
              Aktivera din prenumeration för att få tillgång till Cogniq igen.
            </p>
          </div>

          <div className="rounded-lg bg-muted p-4 text-left space-y-2">
            <p className="text-sm font-medium">Vad händer med din data?</p>
            <p className="text-sm text-muted-foreground">
              All din data finns kvar och är säker. Så snart du aktiverar din prenumeration 
              får du full tillgång igen — precis som förut.
            </p>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={handleActivate} 
              disabled={loading} 
              className="w-full" 
              size="lg"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              {loading ? "Laddar..." : "Aktivera prenumeration — 399 kr/mån"}
            </Button>
            
            <Button 
              variant="ghost" 
              onClick={onSignOut} 
              className="w-full text-muted-foreground"
              size="sm"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logga ut
            </Button>
          </div>

          {userEmail && (
            <p className="text-xs text-muted-foreground">
              Inloggad som {userEmail}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
