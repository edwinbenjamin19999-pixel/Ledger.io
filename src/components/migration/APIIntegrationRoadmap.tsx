import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Clock, CheckCircle2, Info, Mail, Loader2, Zap } from "lucide-react";

interface Props {
  companyId?: string;
}

export function APIIntegrationRoadmap({ companyId }: Props) {
  const [platform, setPlatform] = useState<"fortnox" | "visma">("fortnox");
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);

  const registerInterest = async () => {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Inte inloggad");

      const { error } = await supabase.from("integration_interest").insert({
        user_id: user.id,
        company_id: companyId ?? null,
        platform,
      });
      if (error) throw error;

      setRegistered(true);
      toast.success("Tack! Vi hör av oss så fort integrationen är klar.");
    } catch (e: any) {
      toast.error(e.message || "Något gick fel. Försök igen.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-[#F0DDB7] bg-amber-50/50 dark:bg-amber-950/10 dark:border-amber-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#7A5417]" />
          Direkt API-migrering
          <Badge variant="outline" className="ml-2 border-[#F0DDB7] text-[#7A5417] dark:text-amber-300">
            Under utveckling
          </Badge>
        </CardTitle>
        <CardDescription>
          Helautomatisk synkronisering via Fortnox/Visma API — kommer Q2 2025
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="w-4 h-4" />
          <AlertDescription className="text-sm">
            <strong>Varför inte tillgängligt idag?</strong>
            <p className="mt-1.5">
              Fortnox och Visma kräver sedan 2024 OAuth 2.0 och godkännande som officiell{" "}
              <em>Integration Partner</em>. Vi är i ansökningsprocessen — beräknad lansering inom 4–6 veckor.
            </p>
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <p className="text-sm font-medium">Vad du får när det lanseras:</p>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#085041] mt-0.5 shrink-0" />
              <span>Engångsklick-koppling via Fortnox/Visma-inloggning (ingen API-nyckel att hantera)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#085041] mt-0.5 shrink-0" />
              <span>Kontinuerlig synk av verifikationer, kunder, leverantörer, fakturor</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#085041] mt-0.5 shrink-0" />
              <span>Parallell drift under övergångsperiod — ingen risk för dataförlust</span>
            </li>
          </ul>
        </div>

        <Alert className="border-primary/30 bg-primary/5">
          <Zap className="w-4 h-4 text-primary" />
          <AlertDescription className="text-sm">
            <strong>Använd SIE-import idag</strong> — det fungerar på alla plan, tar 5 minuter och importerar
            samma data som API:et kommer att göra.
          </AlertDescription>
        </Alert>

        {!registered ? (
          <div className="space-y-3 pt-2 border-t">
            <p className="text-sm font-medium">Vill du bli notifierad när det är klart?</p>
            <div className="flex gap-2">
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as "fortnox" | "visma")}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={submitting}
              >
                <option value="fortnox">Fortnox</option>
                <option value="visma">Visma</option>
              </select>
              <Button onClick={registerInterest} disabled={submitting} className="flex-1">
                {submitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                Anmäl intresse
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 rounded-md bg-[#E1F5EE] dark:bg-emerald-950/30 text-[#085041] dark:text-emerald-300 text-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span>Du står på listan. Vi mejlar så fort {platform === "fortnox" ? "Fortnox" : "Visma"}-integrationen är live.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
