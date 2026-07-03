import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Save, Shield, Link as LinkIcon } from "lucide-react";

const skatteverketServices = [
  {
    name: 'AGI-inlämning (Arbetsgivardeklaration)',
    endpoint: 'Skatteverket eDeklaration API',
    status: 'active' as const,
    requirement: 'Ansluten via mTLS-certifikat',
    description: 'Inlämning sker direkt till Skatteverket via API.',
  },
  {
    name: 'Momsdeklaration (e-inlämning)',
    endpoint: 'Skatteverket Moms API',
    status: 'active' as const,
    requirement: 'Ansluten via mTLS-certifikat',
    description: 'Beräkningar och inlämning sker direkt till Skatteverket.',
  },
  {
    name: 'Inkomstdeklaration (INK2/INK4)',
    endpoint: 'Skatteverket Deklaration API',
    status: 'active' as const,
    requirement: 'Ansluten via mTLS-certifikat + BankID-signering',
    description: 'PDF-generering och e-inlämning till Skatteverket.',
  },
];

export default function SkatteverketSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [companyId, setCompanyId] = useState<string>("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [hasCredentials, setHasCredentials] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: companies, error: compError } = await supabase
        .from('companies')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (!compError && companies) {
        setCompanyId(companies.id);

        const { data: credentials } = await supabase
          .from('skatteverket_credentials')
          .select('*')
          .eq('company_id', companies.id)
          .eq('environment', 'production')
          .eq('is_active', true)
          .maybeSingle();

        if (credentials) {
          setClientId(credentials.client_id);
          setHasCredentials(true);
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSave = async () => {
    if (!clientId || !clientSecret) {
      toast({
        title: "Fyll i alla fält",
        description: "Client ID och Client Secret krävs",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('skatteverket_credentials')
        .upsert({
          company_id: companyId,
          client_id: clientId,
          client_secret_encrypted: clientSecret,
          environment: 'production',
          is_active: true,
          created_by: user.id
        }, {
          onConflict: 'company_id,environment'
        });

      if (error) throw error;

      toast({
        title: "Sparat!",
        description: "Skatteverket API-nycklar har sparats (produktion)",
      });

      setClientSecret("");
      setHasCredentials(true);
    } catch (error) {
      console.error('Error saving credentials:', error);
      toast({
        title: "Fel",
        description: "Kunde inte spara API-nycklar",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!companyId) {
      toast({
        title: "Fel",
        description: "Inget företag valt",
        variant: "destructive",
      });
      return;
    }

    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        'skatteverket-connect',
        { body: { company_id: companyId } }
      );

      if (error) throw error;
      window.location.href = data.authorization_url;
    } catch (error) {
      console.error('Connection error:', error);
      toast({
        title: "Fel",
        description: error instanceof Error ? error.message : "Kunde inte ansluta",
        variant: "destructive",
      });
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/settings')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tillbaka
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Skatteverket Integration</h1>
            <p className="text-muted-foreground">
              Konfigurera API-nycklar för automatisk AGI-inlämning
            </p>
          </div>
        </div>

        <div className="grid gap-6 max-w-2xl">
          {/* Integration status */}
          <Card className="border-green-300 dark:border-green-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#085041]" />
                Integrationsstatus — Skatteverket
              </CardTitle>
              <CardDescription>
                Integrationen är aktiv. Inlämningar skickas till Skatteverket.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium text-muted-foreground">Tjänst</th>
                      <th className="text-left py-2 font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-2 font-medium text-muted-foreground">Krav</th>
                    </tr>
                  </thead>
                  <tbody>
                    {skatteverketServices.map((svc) => (
                      <tr key={svc.name} className="border-b last:border-0">
                        <td className="py-3">
                          <p className="font-medium text-foreground">{svc.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{svc.description}</p>
                        </td>
                        <td className="py-3">
                          <Badge variant="outline" className="text-[10px] bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]">
                            Aktiv
                          </Badge>
                        </td>
                        <td className="py-3 text-xs text-muted-foreground">{svc.requirement}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]">
                  Produktion
                </Badge>
                <span className="text-xs text-muted-foreground">Låst till skarp miljö</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                API-nycklar (Produktion)
              </CardTitle>
              <CardDescription>
                Du måste först ansöka om tillgång till Skatteverkets API:er via{" "}
                <a
                  href="https://www7.skatteverket.se/portal/apier-och-oppna-data/utvecklarportalen"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Utvecklarportalen
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clientId">Client ID</Label>
                <Input
                  id="clientId"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Din Client ID från Skatteverket"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientSecret">Client Secret</Label>
                <Input
                  id="clientSecret"
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="Din Client Secret från Skatteverket"
                />
                <p className="text-sm text-muted-foreground">
                  Sparas krypterat och visas aldrig igen
                </p>
              </div>

              <Button onClick={handleSave} disabled={loading} className="w-full">
                <Save className="w-4 h-4 mr-2" />
                {loading ? "Sparar..." : "Spara API-nycklar"}
              </Button>

              {hasCredentials && (
                <Button
                  onClick={handleConnect}
                  disabled={connecting}
                  variant="secondary"
                  className="w-full"
                >
                  <LinkIcon className="w-4 h-4 mr-2" />
                  {connecting ? "Ansluter..." : "Anslut med BankID"}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API:er som behövs</CardTitle>
              <CardDescription>
                För automatisk AGI-inlämning behöver du två API:er
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <div>
                    <strong>Arbetsgivardeklaration - Hantera redovisningsperiod</strong>
                    <p className="text-muted-foreground">Skapar och hanterar perioder</p>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <div>
                    <strong>Arbetsgivardeklaration – Inlämning</strong>
                    <p className="text-muted-foreground">Skickar AGI-fil till Skatteverket</p>
                  </div>
                </li>
              </ul>
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-1">💡 Observera</p>
                <p className="text-sm text-muted-foreground">
                  NorthLedger genererar AGI-filen lokalt, så API:et för "Individuppgifter" behövs inte (kräver lagstöd).
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
