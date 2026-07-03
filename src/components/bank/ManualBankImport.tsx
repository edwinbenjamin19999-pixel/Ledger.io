import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, FileSpreadsheet, X, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { categorizeExpense } from "@/lib/expense-ai-categorization";

interface ManualBankImportProps { companyId: string;
  bankAccountId?: string;
  onImportComplete: () => void;
}

interface ParsedTransaction { date: string;
  description: string;
  amount: number;
  balance?: number;
  reference?: string;
}

export function ManualBankImport({ companyId, bankAccountId, onImportComplete }: ManualBankImportProps) { const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedTransaction[]>([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const acceptedTypes = [
    "text/csv",
    "application/csv",
    "text/plain",
    "application/xml",
    "text/xml",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];

  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) processFile(dropped);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { const selected = e.target.files?.[0];
    if (selected) processFile(selected);
  };

  const processFile = async (f: File) => { setFile(f);
    setError(null);
    setParsed([]);

    const ext = f.name.toLowerCase().split(".").pop();

    try { if (ext === "csv" || ext === "txt") { await parseCSV(f);
      } else if (ext === "ofx" || ext === "qfx") { await parseOFX(f);
      } else if (ext === "xml") { await parseCAMT054(f);
      } else { setError(`Filformatet .${ext} stöds inte. Använd CSV, OFX eller CAMT.054 (XML).`);
      }
    } catch (err: any) { setError(err.message || "Kunde inte läsa filen");
    }
  };

  const parseCSV = async (f: File) => { const text = await f.text();
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) throw new Error("Filen verkar tom");

    const delimiter = lines[0].includes(";") ? ";" : ",";
    const headers = lines[0].split(delimiter).map((h) => h.trim().toLowerCase().replace(/"/g, ""));

    const dateIdx = headers.findIndex((h) => h.includes("datum") || h.includes("date") || h === "bokföringsdag");
    const descIdx = headers.findIndex((h) => h.includes("text") || h.includes("beskrivning") || h.includes("description") || h.includes("mottagare"));
    const amountIdx = headers.findIndex((h) => h.includes("belopp") || h.includes("amount") || h.includes("summa"));
    const balanceIdx = headers.findIndex((h) => h.includes("saldo") || h.includes("balance"));

    if (dateIdx === -1 || amountIdx === -1) { throw new Error("Kunde inte identifiera kolumner (datum/belopp). Kontrollera att filen har rätt format.");
    }

    const transactions: ParsedTransaction[] = [];
    for (let i = 1; i < lines.length; i++) { const cols = lines[i].split(delimiter).map((c) => c.trim().replace(/"/g, ""));
      if (cols.length <= amountIdx) continue;

      const rawAmount = cols[amountIdx].replace(/\s/g, "").replace(",", ".");
      const amount = parseFloat(rawAmount);
      if (isNaN(amount)) continue;

      const rawDate = cols[dateIdx];
      const date = normalizeDate(rawDate);
      if (!date) continue;

      transactions.push({ date,
        description: descIdx >= 0 ? cols[descIdx] : "",
        amount,
        balance: balanceIdx >= 0 ? parseFloat(cols[balanceIdx].replace(/\s/g, "").replace(",", ".")) : undefined,
      });
    }

    if (transactions.length === 0) throw new Error("Inga transaktioner hittades i filen");
    setParsed(transactions);
  };

  const parseOFX = async (f: File) => { const text = await f.text();
    const txRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
    const transactions: ParsedTransaction[] = [];

    let match;
    while ((match = txRegex.exec(text)) !== null) { const block = match[1];
      const getTag = (tag: string) => { const m = block.match(new RegExp(`<${tag}>([^<\\n]+)`, "i"));
        return m ? m[1].trim() : "";
      };

      const dtPosted = getTag("DTPOSTED");
      const amount = parseFloat(getTag("TRNAMT").replace(",", "."));
      const name = getTag("NAME") || getTag("MEMO");

      if (dtPosted && !isNaN(amount)) { transactions.push({ date: `${dtPosted.slice(0, 4)}-${dtPosted.slice(4, 6)}-${dtPosted.slice(6, 8)}`,
          description: name,
          amount,
        });
      }
    }

    if (transactions.length === 0) throw new Error("Inga transaktioner hittades i OFX-filen");
    setParsed(transactions);
  };

  const parseCAMT054 = async (f: File) => { const text = await f.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "text/xml");

    const entries = doc.querySelectorAll("Ntry");
    const transactions: ParsedTransaction[] = [];

    entries.forEach((entry) => { const dateEl = entry.querySelector("BookgDt Dt") || entry.querySelector("ValDt Dt");
      const amountEl = entry.querySelector("Amt");
      const cdtDbt = entry.querySelector("CdtDbtInd")?.textContent;
      const infoEl = entry.querySelector("AddtlNtryInf") || entry.querySelector("RmtInf Ustrd");
      const nameEl = entry.querySelector("RltdPties Cdtr Nm") || entry.querySelector("RltdPties Dbtr Nm");

      if (dateEl && amountEl) { let amount = parseFloat(amountEl.textContent || "0");
        if (cdtDbt === "DBIT") amount = -Math.abs(amount);
        else amount = Math.abs(amount);

        transactions.push({ date: dateEl.textContent || "",
          description: (nameEl?.textContent || "") + " " + (infoEl?.textContent || ""),
          amount,
        });
      }
    });

    if (transactions.length === 0) throw new Error("Inga transaktioner hittades i XML-filen");
    setParsed(transactions);
  };

  const normalizeDate = (raw: string): string | null => { // Try YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    // Try DD/MM/YYYY or DD.MM.YYYY
    const m1 = raw.match(/^(\d{2})[./](\d{2})[./](\d{4})$/);
    if (m1) return `${m1[3]}-${m1[2]}-${m1[1]}`;
    // Try YYYYMMDD
    const m2 = raw.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`;
    return null;
  };

  const handleImport = async () => { if (!parsed.length) return;
    setImporting(true);

    try { const txToInsert = parsed.map((tx) => { const cat = categorizeExpense(tx.description, undefined, Math.abs(tx.amount));
        return { company_id: companyId,
          bank_account_id: bankAccountId || companyId,
          transaction_id: `manual-${tx.date}-${tx.amount}-${Math.random().toString(36).slice(2, 8)}`,
          booking_date: tx.date,
          value_date: tx.date,
          amount: tx.amount,
          currency: "SEK",
          description: tx.description,
          counterparty_name: tx.description.split(" ").slice(0, 3).join(" "),
          status: "pending",
          ai_confidence: cat.confidence,
          ai_explanation: `AI: ${cat.accountName} (${cat.account}) – ${cat.category}`,
        };
      });

      const { error: insertError } = await supabase
        .from("bank_transactions")
        .upsert(txToInsert, { onConflict: "transaction_id", ignoreDuplicates: true });

      if (insertError) throw insertError;

      toast.success(`${txToInsert.length} transaktioner importerade med AI-kategorisering`);
      setFile(null);
      setParsed([]);
      onImportComplete();
    } catch (err: any) { toast.error(err.message || "Import misslyckades");
    } finally { setImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" />
          Manuell import av kontoutdrag
        </CardTitle>
        <CardDescription>
          Dra och släpp en fil i formaten CSV, OFX eller CAMT.054 (ISO 20022 XML)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${ dragOver
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-muted-foreground/25 hover:border-primary/50"
          }`}
        >
          <input
            type="file"
            accept=".csv,.ofx,.qfx,.xml,.txt"
            onChange={handleFileSelect}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <Upload className={`h-10 w-10 mx-auto mb-3 ${dragOver ? "text-primary" : "text-muted-foreground/40"}`} />
          <p className="font-medium text-sm">Dra och släpp kontoutdrag här</p>
          <p className="text-xs text-muted-foreground mt-1">eller klicka för att välja fil</p>
          <div className="flex justify-center gap-2 mt-3">
            <Badge variant="outline" className="text-[10px]">CSV</Badge>
            <Badge variant="outline" className="text-[10px]">OFX</Badge>
            <Badge variant="outline" className="text-[10px]">CAMT.054</Badge>
            <Badge variant="outline" className="text-[10px]">ISO 20022</Badge>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {file && !error && (
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <FileSpreadsheet className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {parsed.length > 0 ? `${parsed.length} transaktioner identifierade` : "Bearbetar..."}
              </p>
            </div>
            <Button size="icon" variant="ghost" onClick={() => { setFile(null); setParsed([]); setError(null); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {parsed.length > 0 && (
          <>
            <div className="max-h-48 overflow-y-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="p-2 text-left font-medium">Datum</th>
                    <th className="p-2 text-left font-medium">Beskrivning</th>
                    <th className="p-2 text-right font-medium">Belopp</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.slice(0, 20).map((tx, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2 font-mono">{tx.date}</td>
                      <td className="p-2 truncate max-w-[200px]">{tx.description}</td>
                      <td className={`p-2 text-right font-mono ${tx.amount >= 0 ? "text-[#085041]" : "text-[#7A1A1A]"}`}>
                        {tx.amount.toLocaleString("sv-SE", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsed.length > 20 && (
                <p className="text-xs text-center text-muted-foreground py-2">
                  ... och {parsed.length - 20} till
                </p>
              )}
            </div>

            <Button onClick={handleImport} disabled={importing} className="w-full" size="lg">
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Importerar med AI-kategorisering...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Importera {parsed.length} transaktioner
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
