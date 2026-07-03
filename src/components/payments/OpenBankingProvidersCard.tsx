import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link2, ShieldCheck, Sparkles, Loader2, ExternalLink } from "lucide-react";
import { OPEN_BANKING_CATALOG, type PaymentProviderName } from "@/lib/payments/providers";
import { useInitiateBankPayment } from "@/hooks/useInitiateBankPayment";

interface Props {
  /** Optional — when supplied, sandbox CTA is enabled. */
  companyId?: string | null;
}

export function OpenBankingProvidersCard({ companyId }: Props = {}) {
  const [openName, setOpenName] = useState<PaymentProviderName | null>(null);
  const { initiate, loading, result } = useInitiateBankPayment();

  const runSandbox = async () => {
    if (!companyId) return;
    const res = await initiate({
      companyId,
      amount: 1.0,
      currency: "SEK",
      creditorName: "Ledger.io Sandbox AB",
      creditorIban: "SE45 5000 0000 0583 9825 7466",
      reference: "Sandbox testbetalning",
      returnUrl: window.location.origin + "/direct-payment?sandbox=ok",
    });
    if (res?.redirectUrl) {
      // In sandbox we just open the mock URL — real flow would window.location.assign()
      window.open(res.redirectUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Link2 className="h-5 w-5 text-primary" />
              Open Banking-anslutning
            </CardTitle>
            <CardDescription>
              Anslut en licensierad PIS-leverantör för att godkänna betalningar direkt i din bank — utan filuppladdning.
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7]">
            Sandbox
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {OPEN_BANKING_CATALOG.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => setOpenName(p.name)}
              className="text-left p-4 border rounded-lg hover:border-primary/50 hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold">{p.displayName}</span>
                <Badge variant="secondary" className="text-xs">{p.region}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{p.description}</p>
              <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                Licensierad PSD2-leverantör
              </div>
            </button>
          ))}
        </div>

        {companyId && (
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="space-y-1">
                <p className="text-sm font-semibold">Testa PIS-flödet (sandbox)</p>
                <p className="text-xs text-muted-foreground max-w-md">
                  Initierar en mock-betalning på 1 SEK och öppnar Enable Bankings sandbox-redirect.
                  Inga riktiga pengar flyttas. Kräver att PIS-scope aktiveras innan produktion.
                </p>
                {result?.redirectUrl && (
                  <p className="text-xs text-muted-foreground break-all">
                    Senaste redirect: <span className="font-mono">{result.redirectUrl}</span>
                  </p>
                )}
              </div>
              <Button onClick={runSandbox} disabled={loading} size="sm">
                {loading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Initierar…</>
                ) : (
                  <><ExternalLink className="h-4 w-4 mr-2" /> Initiera sandbox-betalning</>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <Dialog open={!!openName} onOpenChange={(o) => !o && setOpenName(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Open Banking — kommer snart
            </DialogTitle>
            <DialogDescription>
              Open Banking-integrationen är under uppsättning. Den möjliggör hämtning av kontoinformation
              och bankgodkännande av betalningar via en licensierad leverantör — utan att Ledger.io någonsin
              hanterar dina banknycklar.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>När integrationen aktiveras får du:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Autohämtad kontoinformation för avstämning</li>
              <li>Direktbetalning godkänd med BankID i bankens egen miljö</li>
              <li>Realtidsmatchning mot leverantörsfakturor</li>
            </ul>
            <p className="pt-2 text-xs">
              Tills dess används säker filexport (ISO 20022 pain.001) som ni laddar upp i er bank.
            </p>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setOpenName(null)}>Stäng</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
