import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TaxMandateConsentProps { onAccept: (mandateType: 'full' | 'agi' | 'vat') => void;
  onSkip?: () => void;
  loading?: boolean;
}

export const TaxMandateConsent = ({ onAccept, onSkip, loading }: TaxMandateConsentProps) => { const [acceptedFullMandate, setAcceptedFullMandate] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const mandateText = `
FULLMAKT FÖR SKATTEÄRENDEN

Jag/Vi ger härmed NorthLedger AB (org.nr 559999-9999) fullmakt att företräda mitt/vårt företag hos Skatteverket avseende:

1. ARBETSGIVARDEKLARATION (AGI)
   - Skicka in månatliga arbetsgivardeklarationer
   - Hämta och granska tidigare inlämnade deklarationer
   - Rätta felaktiga uppgifter i tidigare inlämnade deklarationer

2. MOMSDEKLARATION
   - Skicka in momsdeklarationer
   - Hämta och granska tidigare inlämnade deklarationer
   - Rätta felaktiga uppgifter i tidigare inlämnade deklarationer

3. INKOMSTDEKLARATION (INK2)
   - Skicka in årlig inkomstdeklaration för aktiebolag (INK2)
   - Hämta och granska tidigare inlämnade deklarationer
   - Rätta felaktiga uppgifter i tidigare inlämnade deklarationer

4. ÅRSREDOVISNING (BOLAGSVERKET)
   - Skicka in årsredovisning till Bolagsverket
   - Hämta och granska tidigare inlämnade årsredovisningar

5. LÄSÅTKOMST
   - Läsa information om företagets skattekonto
   - Hämta uppgifter från Skatteverkets och Bolagsverkets register

FULLMAKTENS OMFATTNING:
NorthLedger AB får endast:
- Läsa och hämta information från Skatteverket
- Skicka in deklarationer som godkänts av behörig firmatecknare
- INTE göra betalningar eller andra dispositioner

GILTIGHET:
Fullmakten gäller tillsvidare och kan när som helst återkallas via NorthLedger:s inställningar.

ÅTERKALLELSE:
Fullmakten kan återkallas genom att:
1. Logga in på NorthLedger
2. Gå till Inställningar > Skatteverket
3. Klicka på "Återkalla fullmakt"

DATASKYDD:
NorthLedger hanterar dina uppgifter enligt GDPR och vår integritetspolicy.

KONTAKT:
Vid frågor kontakta support@northledger.se

Genom att acceptera denna fullmakt bekräftar jag att jag är behörig firmatecknare och har rätt att ge denna fullmakt.
`;

  const handleAccept = () => { if (acceptedFullMandate && acceptedTerms) { onAccept('full');
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Fullmakt för Skatteärenden
        </CardTitle>
        <CardDescription>
          För att NorthLedger ska kunna skicka deklarationer till Skatteverket behöver vi din fullmakt
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Fullmakten gör det möjligt för NorthLedger att automatiskt skicka in AGI, momsdeklarationer, inkomstdeklaration (INK2) samt årsredovisning till Skatteverket och Bolagsverket. 
            Du behåller full kontroll och kan återkalla fullmakten när som helst.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="border rounded-lg p-4 bg-muted/30">
            <h3 className="font-semibold mb-2">Vad omfattar fullmakten?</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">✓</span>
                <span>Skicka in arbetsgivardeklarationer (AGI)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">✓</span>
                <span>Skicka in momsdeklarationer</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">✓</span>
                <span>Skicka in inkomstdeklaration (INK2)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">✓</span>
                <span>Skicka in årsredovisning till Bolagsverket</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">✓</span>
                <span>Läsa information från Skatteverket och Bolagsverket</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive mt-0.5">✗</span>
                <span>Göra betalningar (detta kan INTE NorthLedger göra)</span>
              </li>
            </ul>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <FileText className="h-4 w-4 mr-2" />
                Läs fullständig fullmakt
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>Fullmakt för Skatteärenden</DialogTitle>
              </DialogHeader>
              <ScrollArea className="h-[60vh] pr-4">
                <pre className="whitespace-pre-wrap text-sm font-mono">
                  {mandateText}
                </pre>
              </ScrollArea>
            </DialogContent>
          </Dialog>

          <div className="space-y-3">
            <div
              className="flex items-start gap-3 cursor-pointer rounded-md p-1 -m-1 hover:bg-muted/40"
              onClick={() => setAcceptedFullMandate((v) => !v)}
            >
              <Checkbox
                id="mandate-consent"
                checked={acceptedFullMandate}
                onCheckedChange={(checked) => setAcceptedFullMandate(checked === true)}
                onClick={(e) => e.stopPropagation()}
              />
              <label
                htmlFor="mandate-consent"
                className="text-sm leading-relaxed cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              >
                Jag ger NorthLedger fullmakt att företräda mitt företag hos Skatteverket enligt ovanstående villkor.
                Jag bekräftar att jag är behörig firmatecknare.
              </label>
            </div>

            <div
              className="flex items-start gap-3 cursor-pointer rounded-md p-1 -m-1 hover:bg-muted/40"
              onClick={() => setAcceptedTerms((v) => !v)}
            >
              <Checkbox
                id="terms-consent"
                checked={acceptedTerms}
                onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                onClick={(e) => e.stopPropagation()}
              />
              <label
                htmlFor="terms-consent"
                className="text-sm leading-relaxed cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              >
                Jag har läst och godkänner NorthLedger:s{" "}
                <a href="/terms" target="_blank" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                  användarvillkor
                </a>{" "}
                och{" "}
                <a href="/privacy" target="_blank" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                  integritetspolicy
                </a>
              </label>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleAccept}
            disabled={!acceptedFullMandate || !acceptedTerms || loading}
            className="flex-1"
          >
            {loading ? "Sparar fullmakt..." : "Godkänn fullmakt"}
          </Button>
          {onSkip && (
            <Button
              variant="outline"
              onClick={onSkip}
              disabled={loading}
            >
              Hoppa över (kan läggas till senare)
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Du kan när som helst återkalla fullmakten via Inställningar
        </p>
      </CardContent>
    </Card>
  );
};
