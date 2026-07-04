import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";

export const NorthLedgerLogo = () => { const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const generateLogo = async () => { setLoading(true);
    try { const { data, error } = await supabase.functions.invoke('generate-northledger-logo');
      
      if (error) throw error;
      
      if (data?.logoUrl) { setLogoUrl(data.logoUrl);
        toast.success("Logotyp genererad!");
      }
    } catch (error) { console.error('Error generating logo:', error);
      toast.error("Kunde inte generera logotyp");
    } finally { setLoading(false);
    }
  };

  const downloadLogo = () => { if (!logoUrl) return;
    
    const link = document.createElement('a');
    link.href = logoUrl;
    link.download = 'ledger-io-logo.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Laddar ner logotyp...");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cogniq Logotyp</CardTitle>
        <CardDescription>
          Generera och ladda ner Cogniq-logotyp för branding
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!logoUrl ? (
          <Button 
            onClick={generateLogo} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Genererar...
              </>
            ) : (
              'Generera Logotyp'
            )}
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="border rounded-lg p-4 bg-white">
              <img 
                src={logoUrl} 
                alt="Cogniq Logo" 
                className="w-full h-auto max-w-md mx-auto"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={downloadLogo}
                className="flex-1"
              >
                <Download className="mr-2 h-4 w-4" />
                Ladda ner
              </Button>
              <Button 
                onClick={generateLogo}
                variant="outline"
                disabled={loading}
              >
                Generera ny
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Ladda upp denna logotyp för branding av er bankintegration
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
