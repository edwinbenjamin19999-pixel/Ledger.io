import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Upload, FileUp, ArrowRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProcessedReceipt } from "@/pages/ArsavstamningPage";

function formatKr(n: number) { return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n) + " kr";
}

interface Phase1UploadProps { year: number;
  receipts: ProcessedReceipt[];
  setReceipts: (r: ProcessedReceipt[]) => void;
  onNext: () => void;
}

export function Phase1Upload({ year, receipts, setReceipts, onNext }: Phase1UploadProps) { const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [dragOver, setDragOver] = useState(false);

  const processFiles = useCallback(
    async (files: FileList | File[]) => { const fileArr = Array.from(files).filter((f) =>
        ["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(f.type)
      );
      if (fileArr.length === 0) return;

      setProcessing(true);
      setProgress({ current: 0, total: fileArr.length });

      const categories = ["Kontorsmaterial", "Resor", "Telefon/internet", "Representation", "Programvara", "Övrigt"];
      const suppliers = ["IKEA", "Clas Ohlson", "Telia", "SJ", "Webhallen", "Amazon", "Wolt", "Circle K"];
      const newReceipts: ProcessedReceipt[] = [];

      for (let i = 0; i < fileArr.length; i++) { await new Promise((r) => setTimeout(r, 80));
        const confidence = 0.6 + Math.random() * 0.4;
        newReceipts.push({ id: crypto.randomUUID(),
          fileName: fileArr[i].name,
          date: `${year}-${String(Math.ceil(Math.random() * 12)).padStart(2, "0")}-${String(Math.ceil(Math.random() * 28)).padStart(2, "0")}`,
          amount: Math.round(100 + Math.random() * 5000),
          supplier: suppliers[Math.floor(Math.random() * suppliers.length)],
          category: categories[Math.floor(Math.random() * categories.length)],
          confidence,
          status: confidence < 0.75 ? "review" : "ok",
        });
        setProgress({ current: i + 1, total: fileArr.length });
      }

      setReceipts([...receipts, ...newReceipts]);
      setProcessing(false);
    },
    [receipts, setReceipts, year]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => { e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files);
    },
    [processFiles]
  );

  const reviewCount = receipts.filter((r) => r.status === "review").length;

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <Card
        className={`border-2 border-dashed transition-colors ${ dragOver ? "border-primary bg-primary/5" : "border-border"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <CardContent className="py-16 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold">
              Dra hit alla dina kvitton och fakturor för {year}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              JPG, PNG eller PDF — upp till 200 filer åt gången
            </p>
          </div>
          <label>
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(e) => e.target.files && processFiles(e.target.files)}
            />
            <Button variant="outline" asChild>
              <span>
                <FileUp className="mr-2 h-4 w-4" />
                Välj filer
              </span>
            </Button>
          </label>
        </CardContent>
      </Card>

      {/* Processing progress */}
      {processing && (
        <Card>
          <CardContent className="py-6 space-y-3">
            <p className="text-sm font-medium">
              Bearbetar {progress.current} av {progress.total} filer...
            </p>
            <Progress value={(progress.current / progress.total) * 100} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Results table */}
      {receipts.length > 0 && !processing && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {receipts.length} kvitton bearbetade
              </CardTitle>
              {reviewCount > 0 && (
                <Badge variant="outline" className="text-[#7A5417] border-[#F0DDB7] bg-[#FAEEDA] dark:bg-amber-950/30">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {reviewCount} behöver granskas
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-80 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fil</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Leverantör</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Belopp</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipts.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs max-w-[120px] truncate">{r.fileName}</TableCell>
                      <TableCell className="text-xs">{r.date}</TableCell>
                      <TableCell className="text-xs">{r.supplier}</TableCell>
                      <TableCell className="text-xs">{r.category}</TableCell>
                      <TableCell className="text-xs text-right font-medium">{formatKr(r.amount)}</TableCell>
                      <TableCell>
                        {r.status === "ok" ? (
                          <CheckCircle2 className="h-4 w-4 text-[#085041]" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-[#7A5417]" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {receipts.length > 0 && !processing && (
        <div className="flex justify-end">
          <Button onClick={onNext}>
            Nästa steg
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
