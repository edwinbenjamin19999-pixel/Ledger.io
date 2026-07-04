import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { FileSpreadsheet, Upload, Info, CheckCircle, ArrowRight, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SIE4ImportProps { companyId: string;
  onComplete: () => void;
}

interface ImportSummary { accounts: number;
  openingBalances: number;
  verifications: number;
  transactionLines: number;
  historicalYears: number;
  companyName: string;
  orgNumber: string;
  sourceProgram: string;
  sieType: string;
  fiscalYears: { index: number; period: string }[];
  errors?: string[];
}

export const SIE4Import = ({ companyId, onComplete }: SIE4ImportProps) => { const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const selectedFile = e.target.files?.[0];
    if (selectedFile) { if (!selectedFile.name.toLowerCase().endsWith('.se') && 
          !selectedFile.name.toLowerCase().endsWith('.si') &&
          !selectedFile.name.toLowerCase().endsWith('.sie')) { toast.error("Endast SIE-filer (.se, .si, .sie) stöds");
        return;
      }
      if (selectedFile.size > 50 * 1024 * 1024) { toast.error("Filen är för stor (max 50MB)");
        return;
      }
      setFile(selectedFile);
      setSummary(null);
    }
  };

  const handleImport = async () => { if (!file) { toast.error("Välj en SIE-fil först");
      return;
    }

    setImporting(true);
    setProgress(10);
    setCurrentStep("Läser SIE-fil...");

    try { const fileContent = await file.text();
      
      setProgress(20);
      setCurrentStep("Laddar upp originalfil...");

      const timestamp = Date.now();
      const fileName = `${companyId}/${timestamp}-${file.name}`;
      
      await supabase.storage.from('documents').upload(fileName, file);

      setProgress(40);
      setCurrentStep("Importerar kontoplan & historik...");

      const { data, error } = await supabase.functions.invoke('import-sie4', { body: { companyId, fileContent, fileName }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setProgress(90);
      setCurrentStep("Slutför import...");

      const result = data?.summary as ImportSummary;
      setSummary(result);
      
      setProgress(100);
      setCurrentStep("Klart!");

      const historicalMsg = result?.historicalYears > 0 
        ? ` + ${result.historicalYears} historiska år` 
        : '';
      toast.success(
        `Import slutförd! ${result?.accounts || 0} konton, ${result?.verifications || 0} verifikat${historicalMsg}`,
        { duration: 6000 }
      );

      setTimeout(() => { onComplete();
        setImporting(false);
        setProgress(0);
      }, 2000);

    } catch (error: any) { console.error('SIE import error:', error);
      toast.error(error.message || "Import misslyckades. Kontrollera att filen är en giltig SIE-fil.");
      setImporting(false);
      setProgress(0);
      setCurrentStep("");
    }
  };

  const sourcePrograms = [
    { name: "Fortnox", steps: "Bokföring → Exportera → Välj SIE4 → Ladda ner" },
    { name: "Visma/Spcs", steps: "Administration → SIE/Export → Välj SIE4" },
    { name: "Björn Lundén", steps: "Arkiv → Exportera → SIE-fil → Typ 4" },
    { name: "SpeedLedger", steps: "Inställningar → Export → SIE4" },
    { name: "Bokio", steps: "Inställningar → Exportera data → SIE4" },
  ];

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-primary" />
          Systembyte — Importera från annat bokföringsprogram
        </CardTitle>
        <CardDescription>
          Importera hela din bokföring med historik. Stöder SIE1–SIE4 från alla svenska bokföringsprogram.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Source program guide */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <p className="font-medium text-sm flex items-center gap-2">
            <Info className="w-4 h-4 text-primary" />
            Exportera SIE-fil från ditt nuvarande system:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {sourcePrograms.map(sp => (
              <div key={sp.name} className="flex items-start gap-2 text-sm">
                <ArrowRight className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                <span><strong>{sp.name}:</strong> {sp.steps}</span>
              </div>
            ))}
          </div>
        </div>

        {/* What gets imported */}
        <Alert className="border-[#BFE6D6] bg-[#E1F5EE] dark:bg-green-950/20">
          <CheckCircle className="w-4 h-4 text-[#085041]" />
          <AlertDescription className="text-[#085041] dark:text-green-200">
            <strong>Allt importeras automatiskt:</strong> Kontoplan, ingående/utgående balanser, 
            resultaträkning, alla verifikationer — även från <strong>tidigare räkenskapsår</strong>. 
            Ingen ombokföring behövs!
          </AlertDescription>
        </Alert>

        {/* File upload */}
        <div className="space-y-2">
          <Label htmlFor="sie-file">Välj SIE-fil (.se, .si eller .sie)</Label>
          <Input
            id="sie-file"
            type="file"
            accept=".se,.si,.sie"
            onChange={handleFileChange}
            disabled={importing}
          />
          {file && (
            <p className="text-sm text-muted-foreground">
              ✓ {file.name} ({(file.size / 1024).toFixed(0)} KB)
            </p>
          )}
        </div>

        {/* Progress */}
        {importing && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground">{currentStep}</p>
          </div>
        )}

        {/* Import result summary */}
        {summary && (
          <div className="bg-[#E1F5EE] dark:bg-green-950/20 border border-[#BFE6D6] dark:border-green-800 rounded-lg p-4 space-y-3">
            <p className="font-medium text-[#085041] dark:text-green-200 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Import slutförd!
            </p>
            
            {summary.companyName && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{summary.companyName}</span>
                {summary.orgNumber && <span className="text-muted-foreground">({summary.orgNumber})</span>}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="bg-background/80 rounded p-2 text-center">
                <p className="text-xl font-bold text-primary">{summary.accounts}</p>
                <p className="text-muted-foreground text-xs">Konton</p>
              </div>
              <div className="bg-background/80 rounded p-2 text-center">
                <p className="text-xl font-bold text-primary">{summary.verifications}</p>
                <p className="text-muted-foreground text-xs">Verifikationer</p>
              </div>
              <div className="bg-background/80 rounded p-2 text-center">
                <p className="text-xl font-bold text-primary">{summary.transactionLines}</p>
                <p className="text-muted-foreground text-xs">Konteringsrader</p>
              </div>
              <div className="bg-background/80 rounded p-2 text-center">
                <p className="text-xl font-bold text-primary">{summary.historicalYears}</p>
                <p className="text-muted-foreground text-xs">Historiska år</p>
              </div>
            </div>

            {summary.fiscalYears && summary.fiscalYears.length > 0 && (
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Importerade räkenskapsår:</p>
                {summary.fiscalYears.map(fy => (
                  <p key={fy.index}>
                    {fy.index === 0 ? '● Innevarande: ' : `● Historik (${fy.index}): `}
                    {fy.period}
                  </p>
                ))}
              </div>
            )}

            {summary.sourceProgram && (
              <p className="text-xs text-muted-foreground">
                Källa: {summary.sourceProgram} • Format: SIE{summary.sieType || '4'}
              </p>
            )}

            {summary.errors && summary.errors.length > 0 && (
              <div className="text-sm text-[#7A5417] dark:text-[#C28A2B] bg-[#FAEEDA] dark:bg-amber-950/30 rounded p-2">
                <p className="font-medium">Varningar ({summary.errors.length}):</p>
                {summary.errors.slice(0, 5).map((e, i) => (
                  <p key={i} className="text-xs">• {e}</p>
                ))}
              </div>
            )}
          </div>
        )}

        <Button
          onClick={handleImport}
          disabled={!file || importing}
          className="w-full"
          size="lg"
        >
          {importing ? (
            <>Importerar... {progress}%</>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Importera & migrera bokföring
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
