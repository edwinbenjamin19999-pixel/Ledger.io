import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ServiceAgreementSign } from "@/components/agreements/ServiceAgreementSign";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Agreement = () => { const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [alreadySigned, setAlreadySigned] = useState(false);

  useEffect(() => { if (!authLoading && !user) { navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => { if (user) { checkExistingAgreement();
    }
  }, [user]);

  const checkExistingAgreement = async () => { if (!user) return;
    
    try { // Get active agreement
      const { data: activeAgreement } = await supabase
        .from('service_agreements')
        .select('id')
        .eq('is_active', true)
        .order('effective_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeAgreement) { // Check if already signed
        const { data: userAgreement } = await supabase
          .from('user_agreements')
          .select('status')
          .eq('user_id', user.id)
          .eq('agreement_id', activeAgreement.id)
          .eq('status', 'signed')
          .maybeSingle();

        if (userAgreement) { setAlreadySigned(true);
        }
      }
    } catch (error) { console.error('Error checking agreement:', error);
    } finally { setChecking(false);
    }
  };

  const handleSigned = () => { navigate('/dashboard');
  };

  const handleSkip = () => { navigate('/dashboard');
  };

  if (authLoading || checking) { return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div>
<main className="container mx-auto px-4 py-12">
        {alreadySigned ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6 text-center">
              <CheckCircle2 className="h-12 w-12 text-[#085041] mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Avtal redan signerat</h2>
              <p className="text-muted-foreground mb-4">
                Du har redan signerat tjänsteavtalet.
              </p>
              <button 
                onClick={() => navigate('/dashboard')}
                className="text-primary hover:underline"
              >
                Tillbaka till dashboard
              </button>
            </CardContent>
          </Card>
        ) : (
          <ServiceAgreementSign 
            onSigned={handleSigned}
            onSkip={handleSkip}
          />
        )}
      </main>
    </div>
  );
};

export default Agreement;
