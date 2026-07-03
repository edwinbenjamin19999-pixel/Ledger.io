import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Loader2, Info, FileSpreadsheet, Zap, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MigrationState } from "../MigrationWizard";
import { SIEExportGuide } from "../SIEExportGuide";
import { SIEImportPreview, type SIEPreviewData } from "../SIEImportPreview";
import { SIEOrgMismatchDialog } from "../SIEOrgMismatchDialog";
import { MigrationCSVImport } from "./MigrationCSVImport";
import { FortnoxConnectCard } from "./FortnoxConnectCard";
import { VismaConnectCard } from "./VismaConnectCard";
import { MigrationPDFImport } from "./MigrationPDFImport";

interface Props {
  state: MigrationState;
  updateState: (u: Partial<MigrationState>) => void;
  companyId: string;
}

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)) as any);
  }
  return btoa(bin);
}

export const MigrationUploadStep = ({ state, updateState, companyId }: Props) => {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stepLabel, setStepLabel] = useState("");
  const [preview, setPreview] = useState<SIEPreviewData | null>(null);
  const [base64, setBase64] = useState<string>("");
  const [showOrgMismatch, setShowOrgMismatch] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.toLowerCase().match(/\.(se|si|sie)$/)) {
      toast.error("Endast SIE-filer (.se, .si, .sie) stöds");
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      toast.error("Filen är för stor (max 50 MB)");
      return;
    }
    updateState({ file: f, importSummary: null });
    setPreview(null);
  };

  const handleParse = async () => {
    if (!state.file) return;
    setImporting(true);
    setProgress(15);
    setStepLabel("Läser och hashar fil...");
    try {
      const b64 = await fileToBase64(state.file);
      setBase64(b64);

      setProgress(45);
      setStepLabel("Parsar SIE och kör validering...");
      const { data, error } = await supabase.functions.invoke("import-sie4", {
        body: {
          action: "parse",
          companyId,
          fileName: state.file.name,
          fileContentBase64: b64,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setProgress(85);
      setStepLabel("Färdigställer förhandsgranskning...");

      const previewData = data as SIEPreviewData;
      setPreview(previewData);

      // Org-nr mismatch?
      const hasOrgMismatch = previewData.validation.blockers.some(
        (b) => b.code === "org_number_mismatch",
      );
      if (hasOrgMismatch) setShowOrgMismatch(true);

      setProgress(100);
      setStepLabel("Klar");
      toast.success("Fil analyserad — granska innan import.");
    } catch (err: any) {
      toast.error(err.message || "Analys misslyckades");
      updateState({ error: err.message });
    } finally {
      setImporting(false);
    }
  };

  const handleAPIImport = async () => {
    if (!state.apiKey.trim()) { toast.error("Ange API-nyckel"); return; }
    setImporting(true);
    setProgress(15);
    setStepLabel(`Ansluter till ${state.source}...`);
    try {
      setProgress(40);
      setStepLabel("Hämtar data...");
      const { data, error } = await supabase.functions.invoke("migrate-from-platform", {
        body: { companyId, platform: state.source, apiKey: state.apiKey, migrationData: { employees: true, customers: true, suppliers: true, accounts: true, transactions: true, invoices: true, documents: false } },
      });
      if (error) throw error;
      setProgress(100);
      setStepLabel("Klart!");
      updateState({ importSummary: data?.summary || { accounts: 0, verifications: 0, source: state.source } });
      toast.success("Migrering slutförd!");
    } catch (err: any) {
      toast.error(err.message || "API-anslutning misslyckades");
    } finally {
      setImporting(false);
    }
  };

  // Preview view
  if (preview && (state.method === "file" || state.source === "sie")) {
    return (
      <>
        <SIEImportPreview
          data={preview}
          fileContentBase64={base64}
          onCommitted={(result?: any) => {
            if (!result?.committed) {
              toast.error("Import bekräftades inte — försök igen.");
              return;
            }
            updateState({
              importSummary: {
                committed: true,
                sessionId: preview.sessionId,
                accounts: result.accounts ?? preview.parsedSummary.accounts,
                verifications: result.verifications ?? preview.parsedSummary.verifications,
                transactionLines: result.transactionLines ?? preview.parsedSummary.transactions,
                openingBalances: result.openingBalances ?? 0,
                companyName: preview.company.fileCompanyName ?? undefined,
                orgNumber: preview.company.fileOrgNumber ?? undefined,
                importedAccounts: (result.mappings ?? preview.mappings ?? []).map((m: any) => ({
                  number: m.account_number,
                  name: m.account_name,
                  mapped_row_code: m.mapped_row_code,
                  confidence: m.confidence,
                })),
                errors: result.errors ?? [],
              },
            });
            setPreview(null);
          }}
          onCancel={() => setPreview(null)}
        />
        <SIEOrgMismatchDialog
          open={showOrgMismatch}
          fileOrgNumber={preview.company.fileOrgNumber}
          fileCompanyName={preview.company.fileCompanyName}
          expectedOrgNumber={preview.company.expectedOrgNumber}
          expectedCompanyName={preview.company.expectedCompanyName}
          onCancel={() => {
            setShowOrgMismatch(false);
            setPreview(null);
          }}
        />
      </>
    );
  }

  // PDF flow — separate experience
  if (state.source === "pdf") {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">Importera PDF-fakturor</h2>
          <p className="text-muted-foreground text-sm">
            Ladda upp fakturor som PDF — AI extraherar leverantör, belopp, datum och moms automatiskt
          </p>
        </div>
        <MigrationPDFImport
          companyId={companyId}
          onImported={(count) =>
            updateState({
              importSummary: {
                ...(state.importSummary || {}),
                pdfInvoices: ((state.importSummary?.pdfInvoices as number) || 0) + count,
              },
            })
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Importera data</h2>
        <p className="text-muted-foreground text-sm">
          {state.source === "fortnox"
            ? "Anslut Fortnox direkt eller ladda upp en SIE-fil"
            : state.source === "visma"
            ? "Anslut Visma eEkonomi direkt eller ladda upp en SIE-fil"
            : "Ladda upp din SIE-fil för säker analys, validering och AI-mappning"}
        </p>
      </div>

      {state.source === "fortnox" && (
        <FortnoxConnectCard
          companyId={companyId}
          onFetched={(stats, jobId) =>
            updateState({
              importSummary: {
                ...(state.importSummary || {}),
                fortnoxJobId: jobId,
                fortnoxStats: stats,
              },
            })
          }
        />
      )}

      {state.source === "visma" && (
        <VismaConnectCard
          companyId={companyId}
          onFetched={(stats, jobId) =>
            updateState({
              importSummary: {
                ...(state.importSummary || {}),
                vismaJobId: jobId,
                vismaStats: stats,
              },
            })
          }
        />
      )}

      {(state.source === "fortnox" || state.source === "visma") && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">eller via SIE-fil</span>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-sm">SIE-filimport (säker pipeline)</p>
              <p className="text-xs text-muted-foreground">Org-nr verifieras • debit/credit valideras • AI-mappning innan import</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 mb-1">
            <Label>Välj SIE-fil</Label>
            <SIEExportGuide
              defaultSource={(state.source || "fortnox") as any}
              trigger={
                <button type="button" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  Hur exporterar jag från {state.source === "visma" ? "Visma" : state.source === "bokio" ? "Bokio" : state.source === "sie" ? "mitt system" : "Fortnox"}?
                </button>
              }
            />
          </div>
          <div>
            <Input type="file" accept=".se,.si,.sie" onChange={handleFileChange} disabled={importing} />
            {state.file && <p className="text-xs text-muted-foreground mt-1">{state.file.name} ({(state.file.size / 1024).toFixed(0)} KB)</p>}
          </div>

          {importing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />{stepLabel}
              </p>
            </div>
          )}

          <Button onClick={handleParse} disabled={!state.file || importing} className="w-full">
            <Upload className="h-4 w-4 mr-2" />Analysera & förhandsgranska
          </Button>
        </CardContent>
      </Card>

      <div className="relative">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">eller importera register från CSV / Excel</span>
        </div>
      </div>

      <MigrationCSVImport
        companyId={companyId}
        onImported={({ rows, targetType }) =>
          updateState({
            importSummary: {
              ...(state.importSummary || {}),
              csvImports: [
                ...((state.importSummary?.csvImports as any[]) || []),
                { rows, targetType, at: new Date().toISOString() },
              ],
            },
          })
        }
      />
    </div>
  );
};
