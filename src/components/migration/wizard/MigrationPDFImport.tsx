import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Upload, Loader2, FileText, AlertTriangle, CheckCircle2, X, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { checkForDuplicates, type ExtractedInvoice, type DuplicateCheckResult } from "@/lib/migration/duplicateDetector";

interface Props {
  companyId: string;
  onImported?: (count: number) => void;
}

type FileStatus = "pending" | "processing" | "done" | "error";

interface PdfFile {
  id: string;
  file: File;
  status: FileStatus;
  errorMsg?: string;
  extracted?: ExtractedInvoice;
  selected: boolean;
  duplicate?: DuplicateCheckResult;
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

export const MigrationPDFImport = ({ companyId, onImported }: Props) => {
  const [invoiceType, setInvoiceType] = useState<"supplier" | "customer">("supplier");
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const addFiles = (incoming: File[]) => {
    const valid = incoming.filter((f) => {
      const ok = /\.(pdf|jpe?g|png)$/i.test(f.name) && f.size <= 20 * 1024 * 1024;
      if (!ok) toast.error(`${f.name}: ej stödd eller för stor (max 20 MB)`);
      return ok;
    });
    if (files.length + valid.length > 200) {
      toast.error("Max 200 filer åt gången");
      return;
    }
    setFiles((prev) => [
      ...prev,
      ...valid.map((file) => ({
        id: crypto.randomUUID(),
        file,
        status: "pending" as FileStatus,
        selected: false,
      })),
    ]);
  };

  const handleAnalyze = async () => {
    if (!files.length) return;
    setAnalyzing(true);
    setProgress(0);
    let done = 0;

    for (const pdf of files) {
      if (pdf.status === "done") { done++; continue; }
      setFiles((prev) =>
        prev.map((f) => (f.id === pdf.id ? { ...f, status: "processing" } : f)),
      );

      try {
        const base64 = await fileToBase64(pdf.file);
        const mediaType = pdf.file.type || "application/pdf";
        const { data, error } = await supabase.functions.invoke("parse-pdf-invoice", {
          body: { fileBase64: base64, fileName: pdf.file.name, mediaType },
        });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || "Okänt fel");

        const extracted: ExtractedInvoice = { ...data.data, invoiceType };

        setFiles((prev) =>
          prev.map((f) =>
            f.id === pdf.id
              ? {
                  ...f,
                  status: "done",
                  extracted,
                  selected: (extracted.confidence ?? 0) >= 85,
                }
              : f,
          ),
        );
      } catch (err: any) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === pdf.id
              ? { ...f, status: "error", errorMsg: err.message || "Fel" }
              : f,
          ),
        );
      }
      done++;
      setProgress(Math.round((done / files.length) * 100));
    }

    // Run duplicate check on successful extractions
    const successful = files
      .map((f) => f.extracted)
      .filter(Boolean) as ExtractedInvoice[];
    if (successful.length) {
      try {
        const dupResults = await checkForDuplicates(successful, companyId);
        setFiles((prev) =>
          prev.map((f) => {
            if (!f.extracted) return f;
            const match = dupResults.find(
              (d) => d.invoice.invoiceNumber === f.extracted!.invoiceNumber,
            );
            return match ? { ...f, duplicate: match, selected: f.selected && !match.isDuplicate } : f;
          }),
        );
      } catch (e) {
        console.warn("Duplicate check failed:", e);
      }
    }

    setAnalyzing(false);
    toast.success("AI-analys klar");
  };

  const updateExtracted = (id: string, patch: Partial<ExtractedInvoice>) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === id && f.extracted
          ? { ...f, extracted: { ...f.extracted, ...patch } }
          : f,
      ),
    );
  };

  const selectedFiles = useMemo(
    () => files.filter((f) => f.selected && f.extracted && !f.duplicate?.isDuplicate),
    [files],
  );

  const selectedTotal = useMemo(
    () => selectedFiles.reduce((s, f) => s + (f.extracted?.amountInclVat || 0), 0),
    [selectedFiles],
  );

  const highConfidenceCount = useMemo(
    () => selectedFiles.filter((f) => (f.extracted?.confidence ?? 0) >= 85).length,
    [selectedFiles],
  );

  const handleSelectAllHighConf = () => {
    setFiles((prev) =>
      prev.map((f) => ({
        ...f,
        selected:
          !!f.extracted &&
          (f.extracted.confidence ?? 0) >= 85 &&
          !f.duplicate?.isDuplicate,
      })),
    );
  };

  const handleImport = async () => {
    if (!selectedFiles.length) return;
    setImporting(true);
    try {
      // Create migration job
      const { data: job, error: jobErr } = await supabase
        .from("migration_jobs")
        .insert([{
          company_id: companyId,
          source_system: "pdf_invoices",
          source_format: "pdf",
          status: "complete",
          completed_at: new Date().toISOString(),
          stats: {
            method: "pdf_ai_extraction",
            invoices: selectedFiles.length,
            total: selectedTotal,
          } as any,
        }])
        .select("id")
        .single();
      if (jobErr) throw jobErr;
      const jobId = job!.id;

      // Group rows
      const supplierRows = selectedFiles
        .filter((f) => f.extracted!.invoiceType === "supplier")
        .map((f) => ({
          company_id: companyId,
          migration_job_id: jobId,
          external_invoice_number: f.extracted!.invoiceNumber,
          invoice_date: f.extracted!.invoiceDate,
          due_date: f.extracted!.dueDate || null,
          amount_excl_vat: f.extracted!.amountExclVat,
          vat_amount: f.extracted!.vatAmount,
          amount_incl_vat: f.extracted!.amountInclVat,
          currency: f.extracted!.currency || "SEK",
          status: "unpaid" as const,
          account_code: f.extracted!.accountSuggestion || null,
          description: f.extracted!.description || null,
          source_system: "pdf_ai",
        }));

      const customerRows = selectedFiles
        .filter((f) => f.extracted!.invoiceType === "customer")
        .map((f) => ({
          company_id: companyId,
          migration_job_id: jobId,
          external_invoice_number: f.extracted!.invoiceNumber,
          invoice_date: f.extracted!.invoiceDate,
          due_date: f.extracted!.dueDate || null,
          amount_excl_vat: f.extracted!.amountExclVat,
          vat_amount: f.extracted!.vatAmount,
          amount_incl_vat: f.extracted!.amountInclVat,
          currency: f.extracted!.currency || "SEK",
          status: "unpaid" as const,
          description: f.extracted!.description || null,
          source_system: "pdf_ai",
        }));

      if (supplierRows.length) {
        const { error } = await supabase
          .from("imported_supplier_invoices")
          .insert(supplierRows as any);
        if (error) throw error;
      }
      if (customerRows.length) {
        const { error } = await supabase
          .from("imported_customer_invoices")
          .insert(customerRows as any);
        if (error) throw error;
      }

      toast.success(`${selectedFiles.length} fakturor importerade`);
      onImported?.(selectedFiles.length);
      setFiles((prev) => prev.filter((f) => !f.selected));
    } catch (err: any) {
      toast.error(err.message || "Import misslyckades");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-sm">PDF-fakturaimport med AI</p>
              <p className="text-xs text-muted-foreground">
                AI extraherar leverantör, belopp, datum och moms automatiskt
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant={invoiceType === "supplier" ? "default" : "outline"}
              size="sm"
              onClick={() => setInvoiceType("supplier")}
            >
              Leverantörsfakturor
            </Button>
            <Button
              type="button"
              variant={invoiceType === "customer" ? "default" : "outline"}
              size="sm"
              onClick={() => setInvoiceType("customer")}
            >
              Kundfakturor
            </Button>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              addFiles(Array.from(e.dataTransfer.files));
            }}
            className={`bg-white border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
              dragOver ? "border-[#0B4F6C] bg-[#F5F9FF]" : "border-[#E2E8F0]"
            }`}
          >
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium mb-1">Dra och släpp PDF-fakturor här</p>
            <p className="text-xs text-muted-foreground mb-3">
              Upp till 200 filer åt gången · max 20 MB per fil
            </p>
            <div className="flex justify-center gap-2 mb-3">
              <Badge variant="outline" className="text-[10px]">PDF</Badge>
              <Badge variant="outline" className="text-[10px]">JPG</Badge>
              <Badge variant="outline" className="text-[10px]">PNG</Badge>
            </div>
            <Label className="inline-block">
              <Input
                type="file"
                multiple
                accept=".pdf,image/jpeg,image/png"
                className="hidden"
                onChange={(e) => addFiles(Array.from(e.target.files || []))}
              />
              <span className="inline-block px-4 py-2 border rounded-md text-sm cursor-pointer hover:bg-muted">
                Välj filer
              </span>
            </Label>
          </div>

          {files.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{files.length} filer</p>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setFiles([])} disabled={analyzing}>
                    Rensa
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAnalyze}
                    disabled={analyzing || importing}
                    className="bg-[#0B4F6C] hover:bg-[#093e56]"
                  >
                    {analyzing ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyserar... {progress}%</>
                    ) : (
                      <><Sparkles className="h-4 w-4 mr-2" />Starta AI-analys</>
                    )}
                  </Button>
                </div>
              </div>
              {analyzing && <Progress value={progress} />}
            </>
          )}
        </CardContent>
      </Card>

      {files.length > 0 && (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <Checkbox
                      checked={
                        files.filter((f) => f.extracted).length > 0 &&
                        files.filter((f) => f.extracted).every((f) => f.selected)
                      }
                      onCheckedChange={(v) =>
                        setFiles((prev) =>
                          prev.map((f) =>
                            f.extracted && !f.duplicate?.isDuplicate
                              ? { ...f, selected: !!v }
                              : f,
                          ),
                        )
                      }
                    />
                  </TableHead>
                  <TableHead>Fil</TableHead>
                  <TableHead>Leverantör/Kund</TableHead>
                  <TableHead>Fakturanr</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead className="text-right">Belopp</TableHead>
                  <TableHead className="text-right">Moms</TableHead>
                  <TableHead>Konto</TableHead>
                  <TableHead>Konfidens</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((f) => {
                  const ex = f.extracted;
                  const conf = ex?.confidence ?? 0;
                  const rowClass = f.duplicate?.isDuplicate
                    ? "bg-red-50/50"
                    : f.duplicate?.isPossibleDuplicate
                    ? "bg-[#FAEEDA]"
                    : conf >= 85
                    ? ""
                    : conf >= 70
                    ? "bg-amber-50/40"
                    : conf > 0
                    ? "bg-red-50/40"
                    : "";

                  return (
                    <TableRow key={f.id} className={rowClass}>
                      <TableCell>
                        <Checkbox
                          checked={f.selected}
                          disabled={!ex || f.duplicate?.isDuplicate}
                          onCheckedChange={(v) =>
                            setFiles((prev) =>
                              prev.map((x) => (x.id === f.id ? { ...x, selected: !!v } : x)),
                            )
                          }
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs max-w-[180px] truncate">
                        <FileText className="h-3 w-3 inline mr-1" />
                        {f.file.name}
                      </TableCell>
                      <TableCell>
                        {ex ? (
                          <Input
                            value={ex.invoiceType === "customer" ? (ex.customerName || "") : (ex.supplierName || "")}
                            onChange={(e) =>
                              updateExtracted(
                                f.id,
                                ex.invoiceType === "customer"
                                  ? { customerName: e.target.value }
                                  : { supplierName: e.target.value },
                              )
                            }
                            className="h-7 text-xs"
                          />
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        {ex ? (
                          <Input
                            value={ex.invoiceNumber || ""}
                            onChange={(e) => updateExtracted(f.id, { invoiceNumber: e.target.value })}
                            className="h-7 text-xs w-24"
                          />
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {ex ? (
                          <Input
                            type="date"
                            value={ex.invoiceDate || ""}
                            onChange={(e) => updateExtracted(f.id, { invoiceDate: e.target.value })}
                            className="h-7 text-xs w-32"
                          />
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {ex ? (
                          <Input
                            type="number"
                            value={ex.amountInclVat}
                            onChange={(e) =>
                              updateExtracted(f.id, { amountInclVat: parseFloat(e.target.value) || 0 })
                            }
                            className="h-7 text-xs w-24 text-right"
                          />
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {ex ? `${ex.vatAmount?.toFixed(2)}` : "—"}
                      </TableCell>
                      <TableCell>
                        {ex ? (
                          <Input
                            value={ex.accountSuggestion || ""}
                            onChange={(e) => updateExtracted(f.id, { accountSuggestion: e.target.value })}
                            className="h-7 text-xs w-16"
                          />
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        {ex ? (
                          <Badge
                            className={
                              conf >= 85
                                ? "bg-emerald-100 text-emerald-800"
                                : conf >= 70
                                ? "bg-amber-100 text-amber-800"
                                : "bg-red-100 text-red-800"
                            }
                          >
                            {conf}%
                          </Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        {f.status === "pending" && <Badge variant="secondary">Väntar</Badge>}
                        {f.status === "processing" && (
                          <Badge className="bg-blue-100 text-blue-800">
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />Bearbetar
                          </Badge>
                        )}
                        {f.status === "done" && !f.duplicate?.isDuplicate && !f.duplicate?.isPossibleDuplicate && (
                          <Badge className="bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="h-3 w-3 mr-1" />Klar
                          </Badge>
                        )}
                        {f.duplicate?.isDuplicate && (
                          <Badge className="bg-red-100 text-red-800">
                            <X className="h-3 w-3 mr-1" />Dubblett
                          </Badge>
                        )}
                        {f.duplicate?.isPossibleDuplicate && !f.duplicate?.isDuplicate && (
                          <Badge className="bg-amber-100 text-amber-800">
                            <AlertTriangle className="h-3 w-3 mr-1" />Möjlig dubblett
                          </Badge>
                        )}
                        {f.status === "error" && (
                          <Badge className="bg-red-100 text-red-800" title={f.errorMsg}>
                            Kunde inte läsa
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Bottom action bar */}
      {selectedFiles.length > 0 && (
        <Card className="sticky bottom-4 border-primary/30 shadow-lg">
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div className="text-sm">
              <p className="font-medium">
                {selectedFiles.length} fakturor valda · {highConfidenceCount} med hög konfidens
              </p>
              <p className="text-xs text-muted-foreground">
                Totalt: {selectedTotal.toLocaleString("sv-SE", { minimumFractionDigits: 2 })} kr
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSelectAllHighConf}>
                Välj alla (≥85%)
              </Button>
              <Button
                onClick={handleImport}
                disabled={importing}
                className="bg-[#0B4F6C] hover:bg-[#093e56]"
              >
                {importing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importerar...</>
                ) : (
                  <>Importera {selectedFiles.length} fakturor</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
