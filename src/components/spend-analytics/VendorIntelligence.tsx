import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building2, Mail, Sparkles, ExternalLink } from "lucide-react";

interface Vendor { name: string;
  total: number;
  count: number;
  avgPaymentDays?: number;
}

interface Props { vendors: Vendor[];
  totalSpend: number;
}

export function VendorIntelligence({ vendors, totalSpend }: Props) { const [negotiationTarget, setNegotiationTarget] = useState<Vendor | null>(null);

  const topVendors = vendors.sort((a, b) => b.total - a.total).slice(0, 10);

  const generateNegotiationEmail = (v: Vendor) => { const discount = Math.round(v.total * 0.15);
    const subject = encodeURIComponent(`Prisförfrågan — fortsatt samarbete`);
    const body = encodeURIComponent(
      `Hej,\n\nVi har varit kund hos er och uppskattar samarbetet. ` +
      `Under det senaste året har vi haft en total volym på ${v.total.toLocaleString("sv-SE")} kr.\n\n` +
      `Vi ser nu över våra leverantörsavtal och undrar om det finns möjlighet till en volymrabatt ` +
      `eller bättre villkor vid ett förlängt avtal?\n\n` +
      `Vi är öppna för att diskutera ett 2-årsavtal om det ger bättre prissättning.\n\n` +
      `Tack på förhand och ser fram emot ert svar.\n\nMed vänlig hälsning`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {topVendors.map((v, i) => { const pctOfTotal = totalSpend > 0 ? Math.round((v.total / totalSpend) * 100) : 0;
          const canNegotiate = v.total > 5000;

          return (
            <Card key={i} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{v.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {v.count} transaktioner • {pctOfTotal}% av totala kostnader
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-mono font-bold">{v.total.toLocaleString("sv-SE")} kr</p>
                </div>

                {/* Spend bar */}
                <div className="mt-3">
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${Math.min(100, pctOfTotal * 3)}%` }}
                    />
                  </div>
                </div>

                {canNegotiate && (
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => setNegotiationTarget(v)}
                    >
                      <Sparkles className="h-3 w-3 mr-1" /> Förhandlingstips
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Negotiation Dialog */}
      <Dialog open={!!negotiationTarget} onOpenChange={() => setNegotiationTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Förhandlingsstrategi — {negotiationTarget?.name}
            </DialogTitle>
          </DialogHeader>
          {negotiationTarget && (
            <div className="space-y-4 mt-2">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <p>• Du betalar <strong>{negotiationTarget.total.toLocaleString("sv-SE")} kr/år</strong> ({negotiationTarget.count} transaktioner)</p>
                <p>• <strong>15-20% rabatt</strong> möjlig vid 2-årsavtal eller volymförhandling</p>
                <p>• Bäst tid att förhandla: vid avtalsförnyelse</p>
                <p>• Argument: Lojal kund, betalar alltid i tid</p>
                <p className="text-primary font-medium">
                  → Potentiell besparing: {Math.round(negotiationTarget.total * 0.15).toLocaleString("sv-SE")}–{Math.round(negotiationTarget.total * 0.2).toLocaleString("sv-SE")} kr/år
                </p>
              </div>

              <Button className="w-full" onClick={() => generateNegotiationEmail(negotiationTarget)}>
                <Mail className="h-4 w-4 mr-2" /> Generera förhandlingsmejl
              </Button>
              <p className="text-[10px] text-muted-foreground text-center">Öppnar din e-post med ett färdigskrivet professionellt mejl</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
