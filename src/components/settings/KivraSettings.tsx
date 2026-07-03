import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save, ExternalLink, Mail, FileText, Banknote } from "lucide-react";

interface KivraSettingsProps { companyId: string;
}

export const KivraSettings = ({ companyId }: KivraSettingsProps) => { const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({ tenant_key: "",
    is_active: false,
    send_invoices: true,
    send_payroll_slips: true,
    send_documents: false,
  });

  useEffect(() => { fetchSettings();
  }, [companyId]);

  const fetchSettings = async () => { setLoading(true);
    const { data } = await supabase
      .from("kivra_settings")
      .select("*")
      .eq("company_id", companyId)
      .maybeSingle();

    if (data) { setSettings({ tenant_key: data.tenant_key || "",
        is_active: data.is_active || false,
        send_invoices: data.send_invoices !== false,
        send_payroll_slips: data.send_payroll_slips !== false,
        send_documents: data.send_documents || false,
      });
    }
    setLoading(false);
  };

  const saveSettings = async () => { setSaving(true);
    try { const { error } = await supabase
        .from("kivra_settings")
        .upsert({ company_id: companyId,
          tenant_key: settings.tenant_key || null,
          is_active: settings.is_active,
          send_invoices: settings.send_invoices,
          send_payroll_slips: settings.send_payroll_slips,
          send_documents: settings.send_documents,
          updated_at: new Date().toISOString(),
        }, { onConflict: "company_id" });

      if (error) throw error;
      toast.success("Kivra-inställningar sparade");
    } catch (e: any) { toast.error(`Kunde inte spara: ${e.message}`);
    } finally { setSaving(false);
    }
  };

  if (loading) { return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Kivra-integration
            </CardTitle>
            <CardDescription>
              Skicka fakturor, lönespecifikationer och dokument direkt till mottagarens digitala brevlåda i Kivra.
            </CardDescription>
          </div>
          <Badge variant={settings.is_active ? "default" : "secondary"}>
            {settings.is_active ? "Aktiv" : "Inaktiv"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label>Aktivera Kivra</Label>
            <p className="text-sm text-muted-foreground">
              Slå på för att kunna skicka innehåll via Kivra
            </p>
          </div>
          <Switch
            checked={settings.is_active}
            onCheckedChange={(checked) => setSettings(s => ({ ...s, is_active: checked }))}
          />
        </div>

        <Separator />

        <div className="space-y-2">
          <Label>Tenant Key</Label>
          <Input
            value={settings.tenant_key}
            onChange={(e) => setSettings(s => ({ ...s, tenant_key: e.target.value }))}
            placeholder="Er Kivra tenant key (fås vid onboarding)"
            type="password"
          />
          <p className="text-xs text-muted-foreground">
            Tenant Key fås efter godkänd onboarding hos Kivra. Autentisering (Client ID/Secret) konfigureras separat som projektnycklar.{" "}
            <a
              href="https://developer.kivra.com/#section/API-Authentication"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              API-dokumentation <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>

        <Separator />

        <div className="space-y-4">
          <Label className="text-base font-semibold">Leveranstyper</Label>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Banknote className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Fakturor</p>
                <p className="text-xs text-muted-foreground">Skicka kundfakturor med betalinfo via Kivra</p>
              </div>
            </div>
            <Switch
              checked={settings.send_invoices}
              onCheckedChange={(checked) => setSettings(s => ({ ...s, send_invoices: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Lönespecifikationer</p>
                <p className="text-xs text-muted-foreground">Skicka lönebesked till anställda med personnummer</p>
              </div>
            </div>
            <Switch
              checked={settings.send_payroll_slips}
              onCheckedChange={(checked) => setSettings(s => ({ ...s, send_payroll_slips: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Övriga dokument</p>
                <p className="text-xs text-muted-foreground">Skicka avtal, besked och andra dokument</p>
              </div>
            </div>
            <Switch
              checked={settings.send_documents}
              onCheckedChange={(checked) => setSettings(s => ({ ...s, send_documents: checked }))}
            />
          </div>
        </div>

        <Separator />

        <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
          <p className="font-medium">Så kommer du igång med Kivra:</p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Kontakta <a href="mailto:avsandare.support@kivra.com" className="text-primary hover:underline">avsandare.support@kivra.com</a> för att få client credentials</li>
            <li>Genomgå Kivras onboarding (legal + teknisk)</li>
            <li>Klistra in er Tenant Key ovan</li>
            <li>Konfigurera Client ID och Client Secret som projektnycklar</li>
            <li>Aktivera integrationen</li>
          </ol>
        </div>

        <Button onClick={saveSettings} disabled={saving} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Spara Kivra-inställningar
        </Button>
      </CardContent>
    </Card>
  );
};
