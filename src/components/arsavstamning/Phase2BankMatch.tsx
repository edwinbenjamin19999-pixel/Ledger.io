import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, ArrowLeft, Upload, CheckCircle2, HelpCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProcessedReceipt, BankTransaction } from "@/pages/ArsavstamningPage";

function formatKr(n: number) { return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n) + " kr";
}

interface Phase2Props { year: number;
  receipts: ProcessedReceipt[];
  bankTx: BankTransaction[];
  setBankTx: (t: BankTransaction[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Phase2BankMatch({ year, receipts, bankTx, setBankTx, onNext, onBack }: Phase2Props) { const [importing, setImporting] = useState(false);

  const handleImport = useCallback(
    async (files: FileList | null) => { if (!files || files.length === 0) return;
      setImporting(true);

      await new Promise((r) => setTimeout(r, 1200));

      const descriptions = [
        "Telia faktura", "IKEA köp", "SJ biljett", "Swish inbetalning",
        "Hyra kontor", "Amazon.se", "Webhallen", "Privatuttag",
        "Google Workspace", "Spotify Business", "Clas Ohlson", "Circle K"
      ];

      const txs: BankTransaction[] = Array.from({ length: 40 + Math.floor(Math.random() * 80) }, (_, i) => { const isExpense = Math.random() > 0.3;
        const desc = descriptions[Math.floor(Math.random() * descriptions.length)];
        const matchingReceipt = receipts.find(
          (r) => !bankTx.some((t) => t.matchedReceiptId === r.id) && Math.random() > 0.3
        );
        return { id: crypto.randomUUID(),
          date: `${year}-${String(Math.ceil(Math.random() * 12)).padStart(2, "0")}-${String(Math.ceil(Math.random() * 28)).padStart(2, "0")}`,
          description: desc,
          amount: isExpense
            ? -(100 + Math.round(Math.random() * 5000))
            : 1000 + Math.round(Math.random() * 20000),
          matchedReceiptId: matchingReceipt?.id ?? null,
          status: matchingReceipt ? "matched" as const : "unmatched" as const,
        };
      });

      setBankTx(txs);
      setImporting(false);
    },
    [year, receipts, bankTx, setBankTx]
  );

  const matched = bankTx.filter((t) => t.status === "matched").length;
  const unmatched = bankTx.filter((t) => t.status === "unmatched").length;
  const matchRate = bankTx.length > 0 ? Math.round((matched / bankTx.length) * 100) : 0;

  const markAs = (id: string, status: BankTransaction["status"]) => { setBankTx(bankTx.map((t) => (t.id === id ? { ...t, status } : t)));
  };

  return (
    <div className="space-y-6">
      {bankTx.length === 0 && (
        <Card>
          <CardContent className="py-12 flex flex-col items-center gap-4">
            <Upload className="h-10 w-10 text-primary" />
            <div className="text-center">
              <p className="text-lg font-semibold">Importera kontoutdrag</p>
              <p className="text-sm text-muted-foreground mt-1">
                CSV-filer från SEB, Swedbank, Handelsbanken eller Nordea
              </p>
            </div>
            <label>
              <input
                type="file"
                accept=".csv,.xlsx"
                className="hidden"
                onChange={(e) => handleImport(e.target.files)}
              />
              <Button variant="outline" asChild>
                <span>Välj kontoutdrag</span>
              </Button>
            </label>
          </CardContent>
        </Card>
      )}

      {importing && (
        <Card>
          <CardContent className="py-6 space-y-3">
            <p className="text-sm font-medium">Importerar och matchar transaktioner...</p>
            <Progress className="h-2" value={60} />
          </CardContent>
        </Card>
      )}

      {bankTx.length > 0 && !importing && (
        <>
          <Card>
            <CardContent className="py-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{bankTx.length}</p>
                  <p className="text-xs text-muted-foreground">Transaktioner</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#085041]">{matched}</p>
                  <p className="text-xs text-muted-foreground">Matchade ({matchRate}%)</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#7A5417]">{unmatched}</p>
                  <p className="text-xs text-muted-foreground">Omatchade</p>
                </div>
              </div>
              <Progress value={matchRate} className="h-2 mt-4" />
            </CardContent>
          </Card>

          {unmatched > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Omatchade transaktioner</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Datum</TableHead>
                        <TableHead>Beskrivning</TableHead>
                        <TableHead className="text-right">Belopp</TableHead>
                        <TableHead>Åtgärd</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bankTx
                        .filter((t) => t.status === "unmatched")
                        .slice(0, 20)
                        .map((t) => (
                          <TableRow key={t.id}>
                            <TableCell className="text-xs">{t.date}</TableCell>
                            <TableCell className="text-xs">{t.description}</TableCell>
                            <TableCell className={`text-xs text-right font-medium ${t.amount < 0 ? "text-destructive" : "text-[#085041]"}`}>
                              {formatKr(t.amount)}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => markAs(t.id, "private")}>
                                  Privat
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => markAs(t.id, "income")}>
                                  Inkomst
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tillbaka
        </Button>
        {bankTx.length > 0 && (
          <Button onClick={onNext}>
            Nästa steg
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
