import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";

const PLAN_PRICE_ID = "northledger_standard_monthly";

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

const Pricing = () => { const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => { if (!loading && !user) { navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) { return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  if (showCheckout) { return (
      <div className="min-h-screen bg-background">
        <PaymentTestModeBanner />
        <div className="container mx-auto px-4 py-12 max-w-2xl">
          <Button variant="ghost" onClick={() => setShowCheckout(false)} className="mb-4">
            ← Tillbaka
          </Button>
          <StripeEmbeddedCheckout
            priceId={PLAN_PRICE_ID}
            quantity={1}
            customerEmail={user.email}
            userId={user.id}
            returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Enkel prissättning</h1>
          <p className="text-xl text-muted-foreground mb-2">
            Allt du behöver – ett pris per bolag.
          </p>
          <p className="text-sm text-muted-foreground">
            14 dagars gratis testperiod – ingen bindningstid
          </p>
        </div>

        <Card className="max-w-md mx-auto border-primary shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Ledger.io Komplett</CardTitle>
            <div className="mt-4">
              <span className="text-5xl font-bold">399 kr</span>
              <span className="text-muted-foreground">/bolag/månad</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">exkl. moms</p>
            <p className="text-xs text-muted-foreground mt-2">
              Koncern med 5 bolag = 5 × 399 kr = 1 995 kr/mån
            </p>
          </CardHeader>

          <CardContent>
            <ul className="space-y-3">
              {features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>

          <CardFooter>
            <Button className="w-full" size="lg" onClick={() => setShowCheckout(true)}>
              Starta gratis testperiod
            </Button>
          </CardFooter>
        </Card>

        <div className="mt-12 text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Lägg enkelt till fler bolag direkt i appen – varje bolag får sin egen prenumeration.
          </p>
          <p className="text-sm text-muted-foreground">
            Behöver du Enterprise?{" "}
            <a href="mailto:info@northledger.se" className="text-primary hover:underline">
              Kontakta oss
            </a>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Pricing;
