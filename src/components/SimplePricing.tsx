import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { isIframeEnvironment, safariDebugLog } from "@/lib/safe-browser";

const features = [
  "AI-driven bokföring",
  "Bankintegration (PSD2)",
  "Momsrapportering",
  "Fakturahantering",
  "Kvittohantering med AI",
  "Real-time rapporter",
  "Export till SIE4/SAF-T",
  "Användarroller & behörigheter",
  "Prioriterad support",
];

export const SimplePricing = () => { const navigate = useNavigate();
  const iframePreview = isIframeEnvironment();
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => { if (iframePreview) { safariDebugLog("4. API/config loading", { action: "create-checkout:skipped-iframe-preview",
      });
      toast.info("Checkout är avstängt i previewläge");
      navigate('/auth');
      return;
    }

    setLoading(true);
    try { const { supabase } = await import("@/integrations/supabase/client");
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) { navigate('/auth');
        return;
      }

      navigate('/pricing');
    } catch (error) { console.error('Error:', error);
      toast.error('Något gick fel. Försök igen.');
    } finally { setLoading(false);
    }
  };

  return (
    <section id="pricing" className="py-24">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Enkel prissättning. Inga överraskningar.
          </h2>
          <p className="text-lg text-muted-foreground">
            14 dagars gratis provperiod – 399 kr/bolag/månad därefter.
          </p>
        </div>
        
        <Card className="max-w-md mx-auto border-2 border-primary shadow-lg">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">Bokfy Komplett</CardTitle>
            <div className="mt-2">
              <span className="text-5xl font-bold">399</span>
              <span className="text-muted-foreground ml-1">kr/bolag/mån</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">exkl. moms</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              {features.map((feature, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button 
              className="w-full group"
              size="lg"
              onClick={handleSubscribe}
              disabled={loading}
            >
              {loading ? 'Laddar...' : 'Starta gratis i 14 dagar'}
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </CardContent>
        </Card>

        <div className="text-center mt-8 space-y-2">
          <p className="text-sm text-muted-foreground">
            Lägg enkelt till fler bolag – varje bolag får sin egen prenumeration.
          </p>
          <p className="text-muted-foreground">
            Behöver du Enterprise?{' '}
            <button 
              onClick={() => navigate('/contact')}
              className="text-primary hover:underline"
            >
              Kontakta oss
            </button>
          </p>
        </div>
      </div>
    </section>
  );
};
