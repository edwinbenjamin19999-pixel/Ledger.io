import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, Loader2, FileJson } from "lucide-react";

export const DataExport = () => { const [exporting, setExporting] = useState(false);

  const handleExport = async () => { setExporting(true);
    try { const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) { toast.error("Du måste vara inloggad");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-user-data`,
        { method: 'POST',
          headers: { 'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) { const error = await response.json();
        throw new Error(error.error || 'Export misslyckades');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `min-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Din data har exporterats");
    } catch (error: any) { toast.error("Kunde inte exportera data: " + error.message);
    } finally { setExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileJson className="h-5 w-5" />
          <CardTitle>Exportera min data</CardTitle>
        </div>
        <CardDescription>
          Ladda ner all din data i JSON-format enligt GDPR artikel 20 (Rätt till dataportabilitet)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground space-y-2">
          <p>Din export kommer att innehålla:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Profilinformation</li>
            <li>Företagsdata du har tillgång till</li>
            <li>Roller och behörigheter</li>
            <li>Aktivitetsloggar</li>
            <li>Samtyckesinställningar</li>
            <li>Annan data kopplad till ditt konto</li>
          </ul>
        </div>

        <Button 
          onClick={handleExport} 
          disabled={exporting}
          className="w-full"
        >
          {exporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exporterar...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Exportera min data
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground">
          Filen kommer att laddas ner direkt till din enhet. 
          Data är giltig i 7 dagar efter export.
        </p>
      </CardContent>
    </Card>
  );
};
