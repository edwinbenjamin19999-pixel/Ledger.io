import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePosZReports } from "@/hooks/useKassaregister";
import { ACTIVE_COMPANY_STORAGE_KEY } from "@/lib/company-selection";
import { Upload, FileText, CheckCircle, AlertCircle, Plus, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function PosCSVImport() { const { addReport } = usePosZReports();
  const companyId = localStorage.getItem(ACTIVE_COMPANY_STORAGE_KEY);
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"csv" | "manual">("csv");
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);

  // Manual entry state
  const [reportDate, setReportDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [reportNumber, setReportNumber] = useState("");
  const [totalSales, setTotalSales] = useState("");
  const [cash, setCash] = useState("");
  const [card, setCard] = useState("");
  const [swish, setSwish] = useState("");
  const [returns, setReturns] = useState("");
  const [notes, setNotes] = useState("");

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) { toast.error("Filen verkar tom eller har fel format");
      return;
    }

    // Parse CSV (assume header: date, total, cash, card, swish, returns)
    const headers = lines[0].split(/[,;]/).map((h) => h.trim().toLowerCase());
    const rows = lines.slice(1).map((line) => { const vals = line.split(/[,;]/);
      return { date: vals[0]?.trim() || "",
        total: parseFloat(vals[1]?.trim() || "0"),
        cash: parseFloat(vals[2]?.trim() || "0"),
        card: parseFloat(vals[3]?.trim() || "0"),
        swish: parseFloat(vals[4]?.trim() || "0"),
        returns: parseFloat(vals[5]?.trim() || "0"),
      };
    }).filter((r) => r.date && r.total > 0);

    setCsvPreview(rows);
    toast.success(`${rows.length} rader tolkade från CSV`);
  };

  const handleImportCSV = async () => { if (!companyId || csvPreview.length === 0) return;
    setImporting(true);

    for (const row of csvPreview) { await new Promise<void>((resolve) => { addReport.mutate(
          { company_id: companyId,
            report_date: row.date,
            report_number: null,
            total_sales: row.total,
            cash_amount: row.cash || null,
            card_amount: row.card || null,
            swish_amount: row.swish || null,
            returns_amount: row.returns || 0,
            source: "csv_import",
            notes: null,
          },
          { onSuccess: () => resolve(), onError: () => resolve() }
        );
      });
    }

    setImporting(false);
    setCsvPreview([]);
    toast.success(`${csvPreview.length} Z-rapporter importerade`);
  };

  const handleManualAdd = () => { if (!companyId || !totalSales) return;
    addReport.mutate(
      { company_id: companyId,
        report_date: reportDate,
        report_number: reportNumber || null,
        total_sales: parseFloat(totalSales),
        cash_amount: cash ? parseFloat(cash) : null,
        card_amount: card ? parseFloat(card) : null,
        swish_amount: swish ? parseFloat(swish) : null,
        returns_amount: returns ? parseFloat(returns) : 0,
        source: "manual",
        notes: notes || null,
      },
      { onSuccess: () => { setTotalSales(""); setCash(""); setCard(""); setSwish("");
          setReturns(""); setNotes(""); setReportNumber("");
          toast.success("Z-rapport sparad");
        },
      }
    );
  };

  return (
    <div className="space-y-4 mt-4">
      {/* Mode selector */}
      <div className="flex gap-2">
        <Button variant={mode === "csv" ? "default" : "outline"} size="sm" onClick={() => setMode("csv")} className="gap-1.5">
          <Upload className="h-3.5 w-3.5" />
          CSV / Filimport
        </Button>
        <Button variant={mode === "manual" ? "default" : "outline"} size="sm" onClick={() => setMode("manual")} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Manuell inmatning
        </Button>
      </div>

      {mode === "csv" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" />
              Importera Z-rapporter från CSV
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border-2 border-dashed rounded-lg text-center">
              <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileSelect} />
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-2">
                Dra och släpp en CSV-fil, eller klicka för att välja
              </p>
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                Välj fil
              </Button>
              <p className="text-xs text-muted-foreground mt-3">
                Format: datum, total, kontant, kort, swish, returer (semikolon- eller kommaseparerad)
              </p>
            </div>

            {csvPreview.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium">{csvPreview.length} rader att importera:</p>
                <div className="rounded-lg border overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 sticky top-0">
                        <th className="px-3 py-1.5 text-left text-xs">Datum</th>
                        <th className="px-3 py-1.5 text-right text-xs">Total</th>
                        <th className="px-3 py-1.5 text-right text-xs">Kontant</th>
                        <th className="px-3 py-1.5 text-right text-xs">Kort</th>
                        <th className="px-3 py-1.5 text-right text-xs">Swish</th>
                        <th className="px-3 py-1.5 text-right text-xs">Returer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvPreview.slice(0, 10).map((r, i) => (
                        <tr key={i} className="border-t border-border/50">
                          <td className="px-3 py-1.5">{r.date}</td>
                          <td className="px-3 py-1.5 text-right font-medium">{r.total.toLocaleString("sv-SE")} kr</td>
                          <td className="px-3 py-1.5 text-right">{r.cash.toLocaleString("sv-SE")}</td>
                          <td className="px-3 py-1.5 text-right">{r.card.toLocaleString("sv-SE")}</td>
                          <td className="px-3 py-1.5 text-right">{r.swish.toLocaleString("sv-SE")}</td>
                          <td className="px-3 py-1.5 text-right">{r.returns.toLocaleString("sv-SE")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {csvPreview.length > 10 && <p className="text-xs text-muted-foreground">...och {csvPreview.length - 10} fler rader</p>}
                <Button onClick={handleImportCSV} disabled={importing} className="gap-1.5">
                  <CheckCircle className="h-4 w-4" />
                  {importing ? "Importerar..." : `Importera ${csvPreview.length} rapporter`}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {mode === "manual" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              Lägg till Z-rapport manuellt
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Datum</Label>
                <Input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
              </div>
              <div>
                <Label>Rapportnummer</Label>
                <Input value={reportNumber} onChange={(e) => setReportNumber(e.target.value)} placeholder="Valfritt" />
              </div>
            </div>
            <div>
              <Label>Total försäljning inkl moms (kr)</Label>
              <Input type="number" value={totalSales} onChange={(e) => setTotalSales(e.target.value)} placeholder="0" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Kontant</Label>
                <Input type="number" value={cash} onChange={(e) => setCash(e.target.value)} placeholder="0" className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Kort</Label>
                <Input type="number" value={card} onChange={(e) => setCard(e.target.value)} placeholder="0" className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Swish</Label>
                <Input type="number" value={swish} onChange={(e) => setSwish(e.target.value)} placeholder="0" className="h-8 text-sm" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Returer (kr)</Label>
              <Input type="number" value={returns} onChange={(e) => setReturns(e.target.value)} placeholder="0" className="h-8 text-sm" />
            </div>
            <div>
              <Label>Anteckningar</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Valfritt" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button onClick={handleManualAdd} disabled={addReport.isPending || !totalSales} className="gap-1.5">
                {addReport.isPending ? "Sparar..." : "Spara Z-rapport"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI tip */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
        <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground">
          Tips: Exportera dagliga Z-rapporter från ditt kassasystem som CSV. Ledger.io tolkar automatiskt belopp per betalmetod
          och skapar bokföringsunderlag enligt BAS 2026.
        </p>
      </div>
    </div>
  );
}
