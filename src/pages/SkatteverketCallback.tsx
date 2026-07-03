import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function SkatteverketCallback() { const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Bearbetar svar från Skatteverket...');

  useEffect(() => { handleCallback();
  }, []);

  const handleCallback = async () => { try { const code = searchParams.get('code');
      const error = searchParams.get('error');
      const state = searchParams.get('state');

      if (error) { throw new Error(`Skatteverket error: ${error}`);
      }

      if (!code) { throw new Error('Ingen auktoriseringskod mottagen');
      }

      setMessage('Verifierar med Skatteverket...');

      // Exchange code för token via edge function
      const { data, error: exchangeError } = await supabase.functions.invoke(
        'skatteverket-oauth-callback',
        { body: { code, state }
        }
      );

      if (exchangeError) { throw new Error(exchangeError.message);
      }

      setStatus('success');
      setMessage('Anslutning klar!');

      toast({ title: "Anslutning lyckades",
        description: "Du är nu ansluten till Skatteverket",
      });

      // Redirect after 2 seconds
      setTimeout(() => { navigate('/settings/skatteverket');
      }, 2000);

    } catch (error) { console.error('Callback error:', error);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Okänt fel');
      
      toast({ title: "Fel vid anslutning",
        description: error instanceof Error ? error.message : "Okänt fel",
        variant: "destructive",
      });

      // Redirect after 3 seconds
      setTimeout(() => { navigate('/settings/skatteverket');
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status === 'processing' && <Loader2 className="w-5 h-5 animate-spin" />}
            {status === 'success' && <CheckCircle2 className="w-5 h-5 text-[#085041]" />}
            {status === 'error' && <XCircle className="w-5 h-5 text-[#7A1A1A]" />}
            {status === 'processing' ? 'Ansluter till Skatteverket' : 
             status === 'success' ? 'Anslutning lyckades' : 
             'Anslutning misslyckades'}
          </CardTitle>
          <CardDescription>
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === 'processing' && (
            <div className="space-y-2">
              <div className="h-2 bg-primary/20 rounded-full overflow-hidden">
                <div className="h-full bg-primary animate-pulse w-2/3" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Detta kan ta några sekunder...
              </p>
            </div>
          )}
          {status === 'success' && (
            <p className="text-sm text-center text-muted-foreground">
              Omdirigerar till inställningar...
            </p>
          )}
          {status === 'error' && (
            <p className="text-sm text-center text-muted-foreground">
              Omdirigerar tillbaka...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}