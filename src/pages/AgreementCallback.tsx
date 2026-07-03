import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getSafeStorage } from "@/lib/safe-browser";

const AgreementCallback = () => { const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => { if (authLoading) return;
    handleCallback();
  }, [authLoading, searchParams]);

  const handleCallback = async () => { // Check för BankID result from Signicat callback redirect
    const bankidStatus = searchParams.get('bankid');
    const message = searchParams.get('message');
    const agreementId = searchParams.get('agreement');

    console.log('AgreementCallback params:', { bankidStatus, message, agreementId });

    if (bankidStatus === 'success') { // The signicat-callback edge function already updated the database
      setStatus('success');
      toast.success('Avtal signerat med BankID!');
      
      // Clean up session storage
      const storage = getSafeStorage('sessionStorage');
      storage.removeItem('pending_agreement_id');
      storage.removeItem('pending_agreement_company');
      return;
    }

    if (bankidStatus === 'error') { setStatus('error');
      setErrorMessage(message || 'BankID-signering misslyckades');
      return;
    }

    // If we don't have bankid status, check för error from Signicat
    const error = searchParams.get('error');
    if (error) { setStatus('error');
      setErrorMessage('BankID-signering avbröts');
      return;
    }

    // No relevant params - might be direct navigation
    if (!user) { setStatus('error');
      setErrorMessage('Du måste vara inloggad');
      return;
    }

    // Check if we're waiting för callback (shouldn't happen normally)
    setStatus('error');
    setErrorMessage('Ingen signeringsstatus mottagen');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">
            {status === 'processing' && 'Bearbetar signering...'}
            {status === 'success' && 'Avtal signerat!'}
            {status === 'error' && 'Signeringen misslyckades'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          {status === 'processing' && (
            <>
              <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground">
                Verifierar BankID-signering...
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 className="h-16 w-16 text-[#085041] mx-auto" />
              <div>
                <p className="font-medium">Tack för att du signerade tjänsteavtalet!</p>
                <p className="text-muted-foreground mt-2">
                  Du kan nu använda alla funktioner i Bokfy.
                </p>
              </div>
              <Button onClick={() => navigate('/dashboard')} className="w-full">
                Gå till Dashboard
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="h-16 w-16 text-destructive mx-auto" />
              <div>
                <p className="font-medium text-destructive">{errorMessage}</p>
                <p className="text-muted-foreground mt-2">
                  Vänligen försök igen eller kontakta support.
                </p>
              </div>
              <div className="space-y-2">
                <Button onClick={() => navigate('/agreement')} className="w-full">
                  Försök igen
                </Button>
                <Button variant="outline" onClick={() => navigate('/dashboard')} className="w-full">
                  Tillbaka till Dashboard
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AgreementCallback;
