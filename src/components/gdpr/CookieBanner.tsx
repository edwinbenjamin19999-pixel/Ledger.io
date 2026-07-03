import { useState, useEffect, memo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import { Cookie, X } from "lucide-react";
import { getSafeStorage, safariDebugError } from "@/lib/safe-browser";
import { Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface ConsentPreferences { necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  data_processing: boolean;
}

export const CookieBanner = () => { const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [preferences, setPreferences] = useState<ConsentPreferences>({ necessary: true,
    analytics: false,
    marketing: false,
    data_processing: false,
  });

  // Check localStorage only once on mount - no auth dependency för initial render
  useEffect(() => { if (hasChecked) return;

    try { const localConsent = getSafeStorage('localStorage').getItem('cookie_consent');
      if (!localConsent) { setShowBanner(true);
      }
    } catch (error) { safariDebugError('cookie banner storage read failed', error);
      setShowBanner(true);
    }

    setHasChecked(true);
  }, [hasChecked]);

  const saveConsents = (consents: ConsentPreferences) => { try { getSafeStorage('localStorage').setItem('cookie_consent', JSON.stringify({ timestamp: new Date().toISOString(),
        preferences: consents
      }));
    } catch (error) { safariDebugError('cookie banner storage write failed', error);
    }

    setShowBanner(false);
    setShowDetails(false);
  };

  const handleAcceptAll = () => { const allAccepted: ConsentPreferences = { necessary: true,
      analytics: true,
      marketing: true,
      data_processing: true,
    };
    saveConsents(allAccepted);
  };

  const handleAcceptNecessary = () => { const necessaryOnly: ConsentPreferences = { necessary: true,
      analytics: false,
      marketing: false,
      data_processing: false,
    };
    saveConsents(necessaryOnly);
  };

  const handleSavePreferences = () => { saveConsents(preferences);
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Slim bottom bar — spans the width so it never covers page CTAs or content */}
      <div className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-4 animate-in slide-in-from-bottom-5">
        <Card className="mx-auto max-w-3xl p-4 shadow-lg border-[0.5px] border-[#E2E8F0]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <Cookie className="h-5 w-5 mt-0.5 flex-shrink-0 text-primary" />
              <div>
                <h3 className="font-semibold text-sm mb-0.5">
                  Vi använder cookies
                </h3>
                <p className="text-xs text-muted-foreground">
                  För att förbättra din upplevelse. Vissa cookies är nödvändiga.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:flex-shrink-0">
              <Button size="sm" onClick={handleAcceptAll}>
                Acceptera alla
              </Button>
              <Button size="sm" variant="outline" onClick={handleAcceptNecessary}>
                Endast nödvändiga
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowDetails(true)}>
                Anpassa
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
                aria-label="Stäng"
                onClick={() => handleAcceptNecessary()}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <Sheet open={showDetails} onOpenChange={setShowDetails}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Anpassa cookie-inställningar</SheetTitle>
            <SheetDescription>
              Välj vilka typer av cookies du vill tillåta
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-4">
                  <Label className="text-base font-medium">
                    Nödvändiga cookies
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Dessa cookies är nödvändiga för att webbplatsen ska fungera och 
                    kan inte inaktiveras. De används för säkerhet, autentisering och 
                    grundläggande funktionalitet.
                  </p>
                </div>
                <Checkbox checked={true} disabled />
              </div>

              <div className="flex items-start justify-between">
                <div className="flex-1 pr-4">
                  <Label className="text-base font-medium">
                    Analys och prestanda
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Hjälper oss förstå hur besökare interagerar med webbplatsen genom 
                    att samla in och rapportera information anonymt.
                  </p>
                </div>
                <Checkbox
                  checked={preferences.analytics}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, analytics: checked as boolean })
                  }
                />
              </div>

              <div className="flex items-start justify-between">
                <div className="flex-1 pr-4">
                  <Label className="text-base font-medium">
                    Marknadsföring
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Används för att visa relevanta annonser och kampanjer baserat 
                    på dina intressen.
                  </p>
                </div>
                <Checkbox
                  checked={preferences.marketing}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, marketing: checked as boolean })
                  }
                />
              </div>

              <div className="flex items-start justify-between">
                <div className="flex-1 pr-4">
                  <Label className="text-base font-medium">
                    Databehandling
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Tillåter avancerade funktioner som AI-assistans och automatisk 
                    bokföring genom att behandla din data.
                  </p>
                </div>
                <Checkbox
                  checked={preferences.data_processing}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, data_processing: checked as boolean })
                  }
                />
              </div>
            </div>

            <div className="pt-4 space-y-3">
              <Button onClick={handleSavePreferences} className="w-full">
                Spara mina val
              </Button>
              <Button
                variant="outline"
                onClick={handleAcceptAll}
                className="w-full"
              >
                Acceptera alla
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
