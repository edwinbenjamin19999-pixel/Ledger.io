import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Shield, CheckCircle2, Loader2, ExternalLink, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { generateAgreementPDF } from "@/lib/generate-agreement-pdf";
import { getSafeStorage } from "@/lib/safe-browser";

interface ServiceAgreement { id: string;
  version: string;
  title: string;
  content: string;
  effective_date: string;
}

interface ServiceAgreementSignProps { onSigned?: () => void;
  onSkip?: () => void;
  companyId?: string;
}

export const ServiceAgreementSign = ({ onSigned, onSkip, companyId }: ServiceAgreementSignProps) => { const { user } = useAuth();
  const [agreement, setAgreement] = useState<ServiceAgreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [hasRead, setHasRead] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [signMethod, setSignMethod] = useState<'bankid' | 'electronic'>('bankid');

  useEffect(() => { loadActiveAgreement();
  }, []);

  const loadActiveAgreement = async () => { try { const { data, error } = await supabase
        .from('service_agreements')
        .select('*')
        .eq('is_active', true)
        .order('effective_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setAgreement(data);
    } catch (error) { console.error('Error loading agreement:', error);
      toast.error('Kunde inte ladda avtalet');
    } finally { setLoading(false);
    }
  };

  const handleBankIDSign = async () => { if (!agreement || !user) return;
    
    setSigning(true);
    try { // First create the pending agreement record
      const { error: insertError } = await supabase
        .from('user_agreements')
        .upsert({ user_id: user.id,
          agreement_id: agreement.id,
          company_id: companyId || null,
          status: 'pending',
          signature_method: 'bankid'
        }, { onConflict: 'user_id,agreement_id'
        });

      if (insertError) throw insertError;

      // Initiate BankID signing via Signicat
      const { data, error } = await supabase.functions.invoke('signicat-auth', { body: { returnUrl: `${window.location.origin}/agreement-callback`,
          purpose: 'agreement_signing',
          agreementId: agreement.id
        }
      });

      if (error) throw error;

      if (data?.authUrl) { // Store agreement ID för callback
        const storage = getSafeStorage('sessionStorage');
        storage.setItem('pending_agreement_id', agreement.id);
        storage.setItem('pending_agreement_company', companyId || '');
        window.location.href = data.authUrl;
      }
    } catch (error: any) { console.error('Error initiating BankID:', error);
      toast.error('Kunde inte starta BankID-signering', { description: error.message
      });
    } finally { setSigning(false);
    }
  };

  const handleElectronicSign = async () => { if (!agreement || !user || !acceptTerms) return;
    
    setSigning(true);
    try { const { error } = await supabase
        .from('user_agreements')
        .upsert({ user_id: user.id,
          agreement_id: agreement.id,
          company_id: companyId || null,
          signed_at: new Date().toISOString(),
          signature_method: 'electronic',
          ip_address: null, // Could be fetched from an API
          user_agent: navigator.userAgent,
          status: 'signed'
        }, { onConflict: 'user_id,agreement_id'
        });

      if (error) throw error;

      toast.success('Avtal signerat!', { description: 'Tack för att du godkände tjänsteavtalet.'
      });
      
      onSigned?.();
    } catch (error: any) { console.error('Error signing agreement:', error);
      toast.error('Kunde inte signera avtalet', { description: error.message
      });
    } finally { setSigning(false);
    }
  };

  if (loading) { return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!agreement) { return (
      <Alert>
        <AlertDescription>Inget aktivt avtal hittades.</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {agreement.title}
            </CardTitle>
            <CardDescription>
              Version {agreement.version} • Giltigt från {new Date(agreement.effective_date).toLocaleDateString('sv-SE')}
            </CardDescription>
          </div>
          <Badge variant="outline">Kräver signatur</Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            För att använda Bokfy:s tjänster behöver du godkänna vårt tjänsteavtal. 
            Vi rekommenderar signering med BankID för högsta säkerhet.
          </AlertDescription>
        </Alert>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <FileText className="h-4 w-4 mr-2" />
              Läs fullständigt avtal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[85vh]">
            <DialogHeader>
              <DialogTitle>{agreement.title}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[65vh] pr-4">
              <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">
                {agreement.content}
              </pre>
            </ScrollArea>
            <div className="flex justify-between pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => generateAgreementPDF(agreement.content, agreement.title)}
              >
                <Download className="h-4 w-4 mr-2" />
                Ladda ned PDF
              </Button>
              <Button onClick={() => setHasRead(true)}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Jag har läst avtalet
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {hasRead && (
          <div className="p-4 bg-[#E1F5EE] border border-green-500/20 rounded-lg flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#085041]" />
            <span className="text-sm text-[#085041] dark:text-[#1D9E75]">Du har läst avtalet</span>
          </div>
        )}

        <div className="space-y-4">
          <p className="text-sm font-medium">Välj signeringsmetod:</p>
          
          <div className="grid gap-3">
            <button
              onClick={() => setSignMethod('bankid')}
              className={`p-4 border rounded-lg text-left transition-colors ${ signMethod === 'bankid' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#193E4F] rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xs">BID</span>
                </div>
                <div>
                  <p className="font-medium">BankID (Rekommenderas)</p>
                  <p className="text-sm text-muted-foreground">Säker digital signatur med juridisk giltighet</p>
                </div>
              </div>
            </button>
            
            <button
              onClick={() => setSignMethod('electronic')}
              className={`p-4 border rounded-lg text-left transition-colors ${ signMethod === 'electronic' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">Elektronisk godkännande</p>
                  <p className="text-sm text-muted-foreground">Godkänn genom att kryssa i rutan nedan</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {signMethod === 'electronic' && (
          <div className="flex items-start gap-3 p-4 border rounded-lg">
            <Checkbox
              id="accept-terms"
              checked={acceptTerms}
              onCheckedChange={(checked) => setAcceptTerms(checked === true)}
            />
            <label htmlFor="accept-terms" className="text-sm leading-relaxed cursor-pointer">
              Jag har läst och accepterar tjänsteavtalet. Jag bekräftar att jag har rätt att 
              ingå detta avtal för egen del eller för det företag jag representerar.
            </label>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-3">
        {signMethod === 'bankid' ? (
          <Button 
            onClick={handleBankIDSign} 
            disabled={signing}
            className="w-full"
            size="lg"
          >
            {signing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Startar BankID...
              </>
            ) : (
              <>
                <ExternalLink className="h-4 w-4 mr-2" />
                Signera med BankID
              </>
            )}
          </Button>
        ) : (
          <Button 
            onClick={handleElectronicSign} 
            disabled={signing || !acceptTerms}
            className="w-full"
            size="lg"
          >
            {signing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Signerar...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Godkänn och signera
              </>
            )}
          </Button>
        )}

        {onSkip && (
          <Button variant="ghost" onClick={onSkip} className="w-full">
            Påminn mig senare
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
