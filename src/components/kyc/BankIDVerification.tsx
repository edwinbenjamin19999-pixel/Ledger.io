import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, CheckCircle2, AlertCircle, Smartphone, Fingerprint } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type EidMethod = 'bankid' | 'freja';

interface BankIDVerificationProps { companyId: string;
  onSuccess: () => void;
  onSkip?: () => void;
}

export const BankIDVerification = ({ companyId, onSuccess, onSkip }: BankIDVerificationProps) => { const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'redirecting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<EidMethod | null>(null);

  const startVerification = async (method: EidMethod) => { setLoading(true);
    setStatus('redirecting');
    setErrorMessage(null);
    setSelectedMethod(method);

    try { const { data, error } = await supabase.functions.invoke('signicat-auth', { body: { action: 'start',
          companyId,
          method,
        },
      });

      if (error) throw error;

      if (data?.authUrl) { window.location.href = data.authUrl;
      } else { throw new Error('Ingen autentiserings-URL mottogs');
      }
    } catch (error: any) { console.error('eID error:', error);
      setStatus('error');
      setErrorMessage(error.message || 'Kunde inte starta verifiering');
      toast.error("Verifieringsfel", { description: error.message,
      });
    } finally { setLoading(false);
    }
  };

  if (status === 'success') { return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="mx-auto w-16 h-16 mb-6 flex items-center justify-center rounded-full bg-[#E1F5EE]">
            <CheckCircle2 className="h-10 w-10 text-[#085041]" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Identitet verifierad!</h3>
          <p className="text-muted-foreground mb-4">
            Din identitet har bekräftats
          </p>
          <Button onClick={onSuccess} className="w-full">
            Fortsätt
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-xl">Välj e-legitimation</CardTitle>
        <CardDescription>
          Verifiera din identitet med BankID eller Freja eID+
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {status === 'error' && errorMessage && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* BankID option */}
        <button
          onClick={() => startVerification('bankid')}
          disabled={loading}
          className="w-full border rounded-lg p-4 hover:bg-muted/50 transition-colors text-left flex items-center gap-4 disabled:opacity-50"
        >
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Smartphone className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold">BankID</p>
              <Badge variant="secondary" className="text-xs">Populärast</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Svenskt BankID via Signicat
            </p>
          </div>
          {loading && selectedMethod === 'bankid' && (
            <Loader2 className="h-5 w-5 animate-spin text-primary flex-shrink-0" />
          )}
        </button>

        {/* Freja eID+ option */}
        <button
          onClick={() => startVerification('freja')}
          disabled={loading}
          className="w-full border rounded-lg p-4 hover:bg-muted/50 transition-colors text-left flex items-center gap-4 disabled:opacity-50"
        >
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-accent/50 flex items-center justify-center">
            <Fingerprint className="h-6 w-6 text-accent-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold">Freja eID+</p>
              <Badge variant="outline" className="text-xs">eIDAS-godkänd</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Godkänd e-legitimation — fungerar i hela EU
            </p>
          </div>
          {loading && selectedMethod === 'freja' && (
            <Loader2 className="h-5 w-5 animate-spin text-primary flex-shrink-0" />
          )}
        </button>

        {onSkip && (
          <Button
            variant="ghost"
            onClick={onSkip}
            disabled={loading}
            className="w-full text-muted-foreground"
          >
            Hoppa över (endast test)
          </Button>
        )}

        <p className="text-xs text-center text-muted-foreground">
          Båda metoderna är godkända på tillitsnivå 3 enligt eIDAS.
          Du omdirigeras till Signicat för säker identifiering.
        </p>
      </CardContent>
    </Card>
  );
};