import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useIndustry } from "@/contexts/IndustryContext";
import { getIndustryIntegrations, type IntegrationRecommendation } from "@/lib/industry-integrations";
import { usePosConnection } from "@/hooks/useKassaregister";
import { CheckCircle2, Plug, AlertCircle, ExternalLink } from "lucide-react";
import { useState } from "react";

export const IntegrationStatusWidget = () => {
  const { industry } = useIndustry();
  const { connection } = usePosConnection();
  const integrations = getIndustryIntegrations(industry);
  const [selected, setSelected] = useState<IntegrationRecommendation | null>(null);

  const isConnected = (id: string) => {
    // For now: map only POS connection
    if (connection?.provider && connection.provider.toLowerCase() === id) return true;
    return false;
  };

  const priorityOrder = { critical: 0, recommended: 1, optional: 2 } as const;
  const sorted = [...integrations].sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Plug className="h-4 w-4" /> Integrationer för din bransch
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sorted.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Inga specifika integrationer rekommenderas ännu för denna bransch.
            </p>
          )}
          {sorted.map((integ) => {
            const connected = isConnected(integ.id);
            return (
              <div
                key={integ.id}
                className="flex items-center justify-between rounded-lg border bg-card p-3 transition hover:bg-accent/30"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                    {integ.logoInitials}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{integ.name}</p>
                      {integ.priority === "critical" && (
                        <Badge variant="outline" className="h-5 text-[10px]">
                          Kritisk
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{integ.description}</p>
                  </div>
                </div>
                {connected ? (
                  <Badge className="gap-1 bg-emerald-600">
                    <CheckCircle2 className="h-3 w-3" /> Ansluten
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    variant={integ.priority === "critical" ? "default" : "outline"}
                    onClick={() => setSelected(integ)}
                  >
                    Anslut
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                    {selected.logoInitials}
                  </div>
                  Anslut {selected.name}
                </DialogTitle>
                <DialogDescription>{selected.description}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="mb-2 text-sm font-medium">Så här gör du:</p>
                  <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                    {selected.setupSteps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>

                {selected.apiKeyName && (
                  <div className="rounded-lg border border-[#F0DDB7] bg-[#FAEEDA] p-3 text-sm dark:border-amber-900 dark:bg-amber-950/20">
                    <div className="flex gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 text-[#7A5417]" />
                      <div>
                        <p className="font-medium">API-nyckel krävs</p>
                        <p className="text-xs text-muted-foreground">
                          När du har din nyckel från {selected.name} — kontakta oss så
                          aktiverar vi integrationen. Nyckeln lagras krypterat som{" "}
                          <code className="rounded bg-background px-1 py-0.5">
                            {selected.apiKeyName}
                          </code>
                          .
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {selected.docsUrl && (
                    <Button asChild variant="outline" className="flex-1">
                      <a href={selected.docsUrl} target="_blank" rel="noopener noreferrer">
                        Öppna dokumentation <ExternalLink className="ml-2 h-3 w-3" />
                      </a>
                    </Button>
                  )}
                  <Button className="flex-1" onClick={() => setSelected(null)}>
                    Jag har förstått
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
