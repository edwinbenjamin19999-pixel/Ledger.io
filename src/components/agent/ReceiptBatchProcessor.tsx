import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, CheckCircle, AlertTriangle, Loader2, FileText, Check, X, Edit3,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { agentClassify, logAgentBooking } from "@/lib/autonomous-booking-agent";

interface Props { companyId: string;
  userId: string;
}

interface BatchItem { id: string;
  file: File;
  fileName: string;
  status: "queued" | "processing" | "done" | "error";
  amount?: number;
  supplier?: string;
  date?: string;
  category?: string;
  accountNumber?: string;
  accountName?: string;
  confidence?: number;
  error?: string;
  selected: boolean;
  data?: any;
  agentResult?: any;
}

export function ReceiptBatchProcessor({ companyId, userId }: Props) { const [items, setItems] = useState<BatchItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: FileList | File[]) => { const validFiles = Array.from(files)
      .filter(f => f.type.startsWith("image/") || f.type === "application/pdf")
      .slice(0, 50);

    if (validFiles.length === 0) return;

    const newItems: BatchItem[] = validFiles.map(f => ({ id: crypto.randomUUID(),
      file: f,
      fileName: f.name,
      status: "queued",
      selected: true,
    }));

    setItems(prev => [...prev, ...newItems]);
    toast({ title: `${validFiles.length} filer tillagda`, description: "Klicka Bearbeta alla för att starta." });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const processAll = async () => { setProcessing(true);
    const queued = items.filter(i => i.status === "queued");

    // Process in batches of 5
    for (let i = 0; i < queued.length; i += 5) { const batch = queued.slice(i, i + 5);
      await Promise.all(batch.map(item => processItem(item)));
    }
    setProcessing(false);
    toast({ title: "Batchbearbetning klar" });
  };

  const processItem = async (item: BatchItem) => { setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: "processing" } : i));

    try { const base64 = await new Promise<string>((resolve) => { const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
        reader.readAsDataURL(item.file);
      });

      const { data, error } = await supabase.functions.invoke("analyze-expense-receipt", { body: { fileBase64: base64, mimeType: item.file.type, fileName: item.fileName, companyId, matchBankTransaction: false },
      });

      if (error || !data?.success) throw new Error(data?.error || error?.message || "Analys misslyckades");

      const agentResult = await agentClassify(
        companyId,
        data.data.supplier || "",
        data.data.description || "",
        -(data.data.totalAmount || 0),
        data.data.currency || "SEK"
      );

      setItems(prev => prev.map(i => i.id === item.id ? { ...i,
        status: "done",
        amount: data.data.totalAmount,
        supplier: data.data.supplier || "Okand",
        date: data.data.date,
        category: agentResult.category,
        accountNumber: agentResult.accountNumber,
        accountName: agentResult.accountName,
        confidence: agentResult.confidence,
        data: data.data,
        agentResult,
      } : i));
    } catch (err: any) { setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: "error", error: err.message } : i));
    }
  };

  const bulkApprove = async () => { const selected = items.filter(i => i.selected && i.status === "done" && i.agentResult);
    for (const item of selected) { try { await logAgentBooking(companyId, item.agentResult, "receipt", item.id, item.supplier || "Okand", -(item.amount || 0));
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: "done" as const, selected: false } : i));
      } catch { /* skip */ }
    }
    toast({ title: `${selected.length} kvitton godkanda och bokforda` });
  };

  const bulkReject = () => { setItems(prev => prev.filter(i => !i.selected || i.status !== "done"));
    toast({ title: "Markerade kvitton borttagna" });
  };

  const toggleSelect = (id: string) => { setItems(prev => prev.map(i => i.id === id ? { ...i, selected: !i.selected } : i));
  };

  const toggleAll = () => { const allSelected = items.filter(i => i.status === "done").every(i => i.selected);
    setItems(prev => prev.map(i => i.status === "done" ? { ...i, selected: !allSelected } : i));
  };

  const doneItems = items.filter(i => i.status === "done");
  const processingItems = items.filter(i => i.status === "processing");
  const queuedItems = items.filter(i => i.status === "queued");
  const errorItems = items.filter(i => i.status === "error");
  const totalAmount = doneItems.reduce((s, i) => s + (i.amount || 0), 0);
  const progressPct = items.length > 0 ? ((doneItems.length + errorItems.length) / items.length) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <Card
        className={`border-2 border-dashed transition-colors cursor-pointer ${ dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
        }`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <CardContent className="py-8 text-center">
          <Upload className="h-10 w-10 text-primary mx-auto mb-3" />
          <p className="font-semibold">Dra och slapp upp till 50 filer</p>
          <p className="text-sm text-muted-foreground mt-1">JPG, PNG, PDF, HEIC -- bearbetas parallellt</p>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,application/pdf"
            multiple
            onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
          />
        </CardContent>
      </Card>

      {items.length > 0 && (
        <>
          {/* Summary bar */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-4 text-sm">
                  <span><strong>{doneItems.length}</strong> av <strong>{items.length}</strong> bearbetade</span>
                  {processingItems.length > 0 && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" /> {processingItems.length} pagar
                    </span>
                  )}
                  {errorItems.length > 0 && (
                    <span className="text-destructive">{errorItems.length} fel</span>
                  )}
                  <span className="font-semibold">Totalt: {totalAmount.toLocaleString("sv-SE")} kr</span>
                </div>

                <div className="flex gap-2">
                  {queuedItems.length > 0 && (
                    <Button size="sm" onClick={processAll} disabled={processing} className="gap-1.5">
                      {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                      Bearbeta alla ({queuedItems.length})
                    </Button>
                  )}
                  {doneItems.length > 0 && (
                    <>
                      <Button size="sm" variant="outline" onClick={bulkApprove} className="gap-1">
                        <Check className="h-3.5 w-3.5" /> Godkann markerade
                      </Button>
                      <Button size="sm" variant="ghost" onClick={bulkReject} className="gap-1 text-destructive">
                        <X className="h-3.5 w-3.5" /> Avvisa markerade
                      </Button>
                    </>
                  )}
                </div>
              </div>
              {processing && <Progress value={progressPct} className="mt-2 h-1.5" />}
            </CardContent>
          </Card>

          {/* Processing queue table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-3 py-2 w-10">
                      <Checkbox
                        checked={doneItems.length > 0 && doneItems.every(i => i.selected)}
                        onCheckedChange={toggleAll}
                      />
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Filnamn</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Status</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Belopp</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Leverantör</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Datum</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Kategori</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr
                      key={item.id}
                      className={`border-b last:border-b-0 transition-colors ${ item.status === "processing" ? "animate-pulse bg-primary/5" : ""
                      } ${idx % 2 === 0 ? "bg-background" : "bg-muted/20"}`}
                    >
                      <td className="px-3 py-2.5">
                        <Checkbox
                          checked={item.selected}
                          onCheckedChange={() => toggleSelect(item.id)}
                          disabled={item.status !== "done"}
                        />
                      </td>
                      <td className="px-3 py-2.5 font-medium truncate max-w-[200px]">{item.fileName}</td>
                      <td className="px-3 py-2.5">
                        <BatchStatus status={item.status} confidence={item.confidence} />
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                        {item.amount ? `${item.amount.toLocaleString("sv-SE")} kr` : "--"}
                      </td>
                      <td className="px-3 py-2.5 truncate max-w-[150px]">{item.supplier || "--"}</td>
                      <td className="px-3 py-2.5 text-xs">{item.date || "--"}</td>
                      <td className="px-3 py-2.5">
                        {item.accountNumber ? (
                          <Badge variant="secondary" className="text-[10px]">
                            {item.accountNumber} {item.accountName}
                          </Badge>
                        ) : "--"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {items.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Dra och slapp filer ovan för att starta batchbearbetning</p>
            <p className="text-xs text-muted-foreground mt-1">Upp till 50 filer per batch -- JPG, PNG, PDF, HEIC</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function BatchStatus({ status, confidence }: { status: string; confidence?: number }) { switch (status) { case "queued":
      return <Badge variant="outline" className="text-[10px]">I ko</Badge>;
    case "processing":
      return <Badge variant="secondary" className="text-[10px] gap-1"><Loader2 className="h-3 w-3 animate-spin" />Bearbetar</Badge>;
    case "done": { const pct = (confidence || 0) * 100;
      const color = pct >= 90 ? "hsl(var(--primary))" : pct >= 60 ? "hsl(38, 92%, 50%)" : "hsl(var(--destructive))";
      return (
        <div className="flex items-center gap-1.5">
          <CheckCircle className="h-3.5 w-3.5" style={{ color }} />
          <span className="text-xs font-mono" style={{ color }}>{pct.toFixed(0)}%</span>
        </div>
      );
    }
    case "error":
      return <Badge variant="destructive" className="text-[10px] gap-1"><AlertTriangle className="h-3 w-3" />Fel</Badge>;
    default:
      return null;
  }
}
