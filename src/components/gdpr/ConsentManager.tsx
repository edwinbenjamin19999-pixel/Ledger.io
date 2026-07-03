import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Shield } from "lucide-react";

interface Consent { consent_type: string;
  consent_given: boolean;
  consent_date: string;
}

const CONSENT_TYPES = { necessary: { title: "Nödvändiga cookies",
    description: "Krävs för att plattformen ska fungera. Kan inte inaktiveras.",
    required: true
  },
  analytics: { title: "Analysverktyg",
    description: "Hjälper oss förstå hur du använder plattformen för att förbättra den.",
    required: false
  },
  marketing: { title: "Marknadsföring",
    description: "Används för att visa relevanta annonser och kampanjer.",
    required: false
  },
  data_processing: { title: "Databehandling",
    description: "Tillåter oss att behandla din data för förbättrade funktioner och AI-assistans.",
    required: false
  }
};

export const ConsentManager = () => { const { user } = useAuth();
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadConsents();
  }, [user]);

  const loadConsents = async () => { if (!user) return;

    try { const { data, error } = await supabase
        .from('user_consents')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      const consentMap: Record<string, boolean> = {};
      data?.forEach((consent: Consent) => { consentMap[consent.consent_type] = consent.consent_given;
      });

      // Set defaults för missing consents
      Object.keys(CONSENT_TYPES).forEach(type => { if (!(type in consentMap)) { consentMap[type] = type === 'necessary';
        }
      });

      setConsents(consentMap);
    } catch (error: any) { toast.error("Kunde inte ladda samtycken: " + error.message);
    } finally { setLoading(false);
    }
  };

  const handleConsentChange = async (consentType: string, value: boolean) => { if (CONSENT_TYPES[consentType as keyof typeof CONSENT_TYPES]?.required && !value) { toast.error("Detta samtycke är nödvändigt och kan inte inaktiveras");
      return;
    }

    setSaving(true);
    try { const { error } = await supabase
        .from('user_consents')
        .upsert({ user_id: user?.id,
          consent_type: consentType,
          consent_given: value,
          consent_date: new Date().toISOString(),
          withdrawn_at: value ? null : new Date().toISOString()
        }, { onConflict: 'user_id,consent_type'
        });

      if (error) throw error;

      setConsents(prev => ({ ...prev, [consentType]: value }));
      toast.success(value ? "Samtycke givet" : "Samtycke återkallat");
    } catch (error: any) { toast.error("Kunde inte uppdatera samtycke: " + error.message);
    } finally { setSaving(false);
    }
  };

  if (loading) { return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <CardTitle>Samtyckesinställningar</CardTitle>
        </div>
        <CardDescription>
          Hantera hur vi får använda din data enligt GDPR
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(CONSENT_TYPES).map(([type, config]) => (
          <div key={type} className="flex items-start justify-between space-x-4">
            <div className="flex-1 space-y-1">
              <Label htmlFor={type} className="text-base font-medium">
                {config.title}
              </Label>
              <p className="text-sm text-muted-foreground">
                {config.description}
              </p>
            </div>
            <Switch
              id={type}
              checked={consents[type] || false}
              onCheckedChange={(checked) => handleConsentChange(type, checked)}
              disabled={config.required || saving}
            />
          </div>
        ))}

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Du kan när som helst ändra dina samtyckesinställningar. 
            Ändringar träder i kraft omedelbart.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
