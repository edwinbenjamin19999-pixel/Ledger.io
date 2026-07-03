import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileCheck, ShieldAlert, ExternalLink, CheckCircle2, XCircle, Loader2, Banknote } from "lucide-react";

interface Props { companyId: string;
}

interface IntegrationConfig { provider: string;
  title: string;
  description: string;
  icon: React.ElementType;
  fields: { key: string; label: string; type: string; placeholder: string }[];
  docsUrl: string;
}

const INTEGRATIONS: IntegrationConfig[] = [
  { provider: "inkassogram",
    title: "Inkassogram – Inkasso",
    description: "Automatisk inkassohantering för förfallna fakturor. Kopplas till påminnelseflödet och eskalerar automatiskt.",
    icon: ShieldAlert,
    fields: [
      { key: "client_id", label: "Klient-ID", type: "text", placeholder: "LEDGER.IO" },
      { key: "api_key", label: "API-nyckel", type: "password", placeholder: "ink_..." },
    ],
    docsUrl: "https://www.inkassogram.se",
  },
  { provider: "invoier",
    title: "INVOIER – Fakturaköp",
    description: "Sälj dina fakturor och få betalt direkt. API-integration för automatiserat fakturaköp och finansiering.",
    icon: Banknote,
    fields: [
      { key: "api_key", label: "API-nyckel", type: "password", placeholder: "inv_..." },
      { key: "partner_id", label: "Partner-ID", type: "text", placeholder: "" },
    ],
    docsUrl: "https://invoier.com",
  },
  { provider: "scrive",
    title: "Scrive – E-signering",
    description: "Professionell avtalshantering med BankID. Skicka avtal, fullmakter och dokument för signering.",
    icon: FileCheck,
    fields: [
      { key: "api_token", label: "API Token (Consumer Key)", type: "password", placeholder: "" },
      { key: "api_secret", label: "API Secret (Consumer Secret)", type: "password", placeholder: "" },
      { key: "access_token", label: "Access Token", type: "password", placeholder: "" },
      { key: "access_secret", label: "Access Secret", type: "password", placeholder: "" },
    ],
    docsUrl: "https://apidocs.scrive.com",
  },
];

export const PartnerIntegrations = ({ companyId }: Props) => { const [configs, setConfigs] = useState<Record<string, { is_active: boolean; config: Record<string, string> }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => { loadConfigs(); }, [companyId]);

  const loadConfigs = async () => { const { data } = await supabase
      .from("integration_credentials")
      .select("*")
      .eq("company_id", companyId)
      .in("provider", ["inkassogram", "invoier", "scrive"]);

    const map: Record<string, any> = {};
    (data || []).forEach(d => { map[d.provider] = { is_active: d.is_active, config: (d.config as Record<string, string>) || {} };
    });
    setConfigs(map);
  };

  const saveConfig = async (provider: string) => { setSaving(provider);
    try { const current = configs[provider] || { is_active: false, config: {} };
      const { error } = await supabase
        .from("integration_credentials")
        .upsert({ company_id: companyId,
          provider,
          is_active: current.is_active,
          config: current.config,
          last_verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "company_id,provider" });

      if (error) throw error;
      toast.success(`${provider} konfiguration sparad`);
    } catch (err: any) { toast.error(err.message);
    } finally { setSaving(null);
    }
  };

  const updateField = (provider: string, key: string, value: string) => { setConfigs(prev => ({ ...prev,
      [provider]: { ...prev[provider],
        config: { ...(prev[provider]?.config || {}), [key]: value },
      },
    }));
  };

  const toggleActive = (provider: string) => { setConfigs(prev => ({ ...prev,
      [provider]: { ...prev[provider],
        is_active: !prev[provider]?.is_active,
        config: prev[provider]?.config || {},
      },
    }));
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Partnerintegrationer</h3>
        <p className="text-sm text-muted-foreground">Koppla på finansiering, inkasso och e-signering direkt i plattformen.</p>
      </div>

      {INTEGRATIONS.map(integration => { const config = configs[integration.provider];
        const isActive = config?.is_active || false;
        const Icon = integration.icon;

        return (
          <Card key={integration.provider} className={isActive ? "border-primary/30" : ""}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isActive ? "bg-primary/10" : "bg-muted"}`}>
                    <Icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <CardTitle className="text-sm flex items-center gap-2">
                      {integration.title}
                      {isActive && <Badge variant="secondary" className="text-[10px]"><CheckCircle2 className="w-3 h-3 mr-1" />Aktiv</Badge>}
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">{integration.description}</CardDescription>
                  </div>
                </div>
                <Switch checked={isActive} onCheckedChange={() => toggleActive(integration.provider)} />
              </div>
            </CardHeader>

            {isActive && (
              <CardContent className="pt-0 space-y-3">
                <Separator />
                <div className="grid gap-3 sm:grid-cols-2">
                  {integration.fields.map(field => (
                    <div key={field.key} className="space-y-1">
                      <Label className="text-xs">{field.label}</Label>
                      <Input
                        type={field.type}
                        placeholder={field.placeholder}
                        value={config?.config?.[field.key] || ""}
                        onChange={e => updateField(integration.provider, field.key, e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <a href={integration.docsUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" />Dokumentation
                  </a>
                  <Button size="sm" className="text-xs" onClick={() => saveConfig(integration.provider)} disabled={saving === integration.provider}>
                    {saving === integration.provider && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                    Spara
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
};
