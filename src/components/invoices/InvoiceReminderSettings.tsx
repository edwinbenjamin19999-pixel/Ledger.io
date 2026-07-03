import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Save, Bell, AlertTriangle, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ReminderSettings { id?: string;
  company_id: string;
  days_until_first_reminder: number;
  days_until_second_reminder: number;
  days_until_third_reminder: number;
  days_until_collection: number;
  late_payment_interest_rate: number;
  reminder_email_subject_1: string;
  reminder_email_subject_2: string;
  reminder_email_subject_3: string;
  reminder_template_1: string;
  reminder_template_2: string;
  reminder_template_3: string;
  collection_provider: string;
  is_automatic_reminders_enabled: boolean;
  is_automatic_collection_enabled: boolean;
}

interface InvoiceReminderSettingsProps { companyId: string;
}

export const InvoiceReminderSettings = ({ companyId }: InvoiceReminderSettingsProps) => { const [settings, setSettings] = useState<ReminderSettings>({ company_id: companyId,
    days_until_first_reminder: 3,
    days_until_second_reminder: 14,
    days_until_third_reminder: 30,
    days_until_collection: 10,
    late_payment_interest_rate: 11,
    reminder_email_subject_1: 'Påminnelse: Faktura förfaller till betalning',
    reminder_email_subject_2: 'Andra påminnelse: Faktura är förfallen',
    reminder_email_subject_3: 'Inkassovarsel: Faktura förfallen för betalning',
    reminder_template_1: '',
    reminder_template_2: '',
    reminder_template_3: '',
    collection_provider: 'billecta',
    is_automatic_reminders_enabled: true,
    is_automatic_collection_enabled: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadSettings();
  }, [companyId]);

  const loadSettings = async () => { try { const { data, error } = await supabase
        .from('invoice_reminder_settings')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) throw error;
      
      if (data) { setSettings(data);
      }
    } catch (error) { console.error('Error loading reminder settings:', error);
    } finally { setLoading(false);
    }
  };

  const saveSettings = async () => { setSaving(true);
    try { const { error } = await supabase
        .from('invoice_reminder_settings')
        .upsert({ ...settings,
          company_id: companyId,
          updated_at: new Date().toISOString()
        }, { onConflict: 'company_id'
        });

      if (error) throw error;
      
      toast.success('Inställningar sparade');
    } catch (error: any) { console.error('Error saving settings:', error);
      toast.error('Kunde inte spara inställningar', { description: error.message
      });
    } finally { setSaving(false);
    }
  };

  if (loading) { return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Automatiska påminnelser
          </CardTitle>
          <CardDescription>
            Konfigurera automatisk påminnelsehantering för förfallna kundfakturor
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Aktivera automatiska påminnelser</Label>
              <p className="text-sm text-muted-foreground">
                Skicka e-postpåminnelser automatiskt när kundfakturor förfaller
              </p>
            </div>
            <Switch
              checked={settings.is_automatic_reminders_enabled}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, is_automatic_reminders_enabled: checked })
              }
            />
          </div>

          {settings.is_automatic_reminders_enabled && (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="days1">Nivå 1 – Vänlig påminnelse (dagar)</Label>
                  <Input
                    id="days1" type="number" min={1} max={30}
                    value={settings.days_until_first_reminder}
                    onChange={(e) => setSettings({ ...settings, days_until_first_reminder: parseInt(e.target.value) || 3 })}
                  />
                  <p className="text-xs text-muted-foreground">Skickas automatiskt</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="days2">Nivå 2 – Uppföljning (dagar)</Label>
                  <Input
                    id="days2" type="number" min={1} max={60}
                    value={settings.days_until_second_reminder}
                    onChange={(e) => setSettings({ ...settings, days_until_second_reminder: parseInt(e.target.value) || 14 })}
                  />
                  <p className="text-xs text-muted-foreground">Kräver godkännande</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="days3">Nivå 3 – Inkassovarsel (dagar)</Label>
                  <Input
                    id="days3" type="number" min={15} max={90}
                    value={settings.days_until_third_reminder}
                    onChange={(e) => setSettings({ ...settings, days_until_third_reminder: parseInt(e.target.value) || 30 })}
                  />
                  <p className="text-xs text-muted-foreground">Kräver explicit godkännande</p>
                </div>
              </div>

              <div className="space-y-2 max-w-sm">
                <Label htmlFor="interest">Dröjsmålsränta (% per år)</Label>
                <Input
                  id="interest" type="number" min={0} max={50} step={0.25}
                  value={settings.late_payment_interest_rate}
                  onChange={(e) => setSettings({ ...settings, late_payment_interest_rate: parseFloat(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">
                  Standard: Riksbankens referensränta + 8 procentenheter (enligt räntelagen § 6).
                </p>
              </div>

              <div className="space-y-4">
                {([1, 2, 3] as const).map(lvl => (
                  <div key={lvl} className="space-y-2 border-l-2 border-muted pl-4">
                    <Label className="font-medium">
                      {lvl === 1 ? "Nivå 1 – Vänlig" : lvl === 2 ? "Nivå 2 – Uppföljning" : "Nivå 3 – Inkassovarsel"}
                    </Label>
                    <Input
                      placeholder="Ämnesrad"
                      value={(settings as any)[`reminder_email_subject_${lvl}`] || ""}
                      onChange={(e) =>
                        setSettings({ ...settings, [`reminder_email_subject_${lvl}`]: e.target.value } as any)
                      }
                    />
                    <textarea
                      className="w-full min-h-[140px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                      placeholder="Mall – platshållare: {invoice_number} {amount} {due_date} {days_overdue} {interest_rate} {company_name}"
                      value={(settings as any)[`reminder_template_${lvl}`] || ""}
                      onChange={(e) =>
                        setSettings({ ...settings, [`reminder_template_${lvl}`]: e.target.value } as any)
                      }
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Inkassohantering
          </CardTitle>
          <CardDescription>
            Konfigurera automatisk inkassohantering för obetalda fakturor
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Aktivera automatisk inkasso</Label>
              <p className="text-sm text-muted-foreground">
                Skicka automatiskt obetalda fakturor till inkassobolag
              </p>
            </div>
            <Switch
              checked={settings.is_automatic_collection_enabled}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, is_automatic_collection_enabled: checked })
              }
            />
          </div>

          {settings.is_automatic_collection_enabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="provider">Inkassoleverantör</Label>
                <Select
                  value={settings.collection_provider}
                  onValueChange={(value) => 
                    setSettings({ ...settings, collection_provider: value })
                  }
                >
                  <SelectTrigger id="provider">
                    <SelectValue placeholder="Välj leverantör" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="billecta">Billecta</SelectItem>
                    <SelectItem value="intrum">Intrum</SelectItem>
                    <SelectItem value="sergel">Sergel</SelectItem>
                    <SelectItem value="visma">Visma Collectors</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  För att aktivera automatisk inkasso behöver du konfigurera API-nycklar 
                  för din valda inkassoleverantör. Kontakta {settings.collection_provider} 
                  för att få tillgång till deras API.
                </AlertDescription>
              </Alert>
            </>
          )}

          {!settings.is_automatic_collection_enabled && (
            <Alert>
              <AlertDescription>
                När automatisk inkasso är avstängt kommer fakturor att markeras som 
                "Inkassoklar" för manuell hantering efter att båda påminnelserna skickats.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sparar...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Spara inställningar
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
