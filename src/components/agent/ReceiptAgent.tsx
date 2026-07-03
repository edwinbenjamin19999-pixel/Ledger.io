import { useState, useCallback, useRef, useEffect } from "react";
// jsPDF & autoTable loaded lazily via dynamic import
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { ScanLine, Upload, CheckCircle, AlertTriangle, FileText, Car, Loader2, Camera, Sparkles,
  Link2, Zap, FileBarChart, Edit3, Layers, CreditCard,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { agentClassify, logAgentBooking } from "@/lib/autonomous-booking-agent";
import { detectPaymentMethod, type PaymentMethod, type PaymentMethodResult, getBalancingAccount } from "@/lib/payment-method-engine";
import { PaymentMethodBadge } from "./PaymentMethodBadge";
import { PaymentMethodPreview } from "./PaymentMethodPreview";
import { MileageLog } from "./MileageLog";
import { ReceiptChannelModals } from "./ReceiptChannelModals";
import { ReceiptExpenseReport } from "./ReceiptExpenseReport";
import { ReceiptBatchProcessor } from "./ReceiptBatchProcessor";

interface ReceiptAgentProps { companyId: string;
  userId: string;
}

interface ScanResult { id: string;
  fileName: string;
  data: any;
  bankMatch: any | null;
  ccMatch: any | null;
  paymentMethodResult?: PaymentMethodResult;
  status: "scanning" | "scanned" | "booked" | "error";
  error?: string;
  agentResult?: any;
}

interface SplitLine { amount: string;
  account: string;
  project: string;
}

export function ReceiptAgent({ companyId, userId }: ReceiptAgentProps) { const [results, setResults] = useState<ScanResult[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [accounts, setAccountsState] = useState<any[]>([]);
  const [accountsLoaded, setAccountsLoaded] = useState(false);

  // Split state
  const [splitTarget, setSplitTarget] = useState<ScanResult | null>(null);
  const [splitLines, setSplitLines] = useState<SplitLine[]>([
    { amount: "", account: "", project: "" },
    { amount: "", account: "", project: "" },
  ]);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAccount, setEditAccount] = useState("");

  const loadAccounts = async () => { if (accountsLoaded) return;
    const { data } = await supabase
      .from("chart_of_accounts")
      .select("id, account_number, account_name")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("account_number")
      .limit(200);
    setAccountsState(data || []);
    setAccountsLoaded(true);
  };

  const processFile = async (file: File) => { const id = crypto.randomUUID();
    const entry: ScanResult = { id, fileName: file.name, data: null, bankMatch: null, ccMatch: null, status: "scanning" };
    setResults(prev => [entry, ...prev]);
    loadAccounts();

    try { const base64 = await new Promise<string>((resolve) => { const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke("analyze-expense-receipt", { body: { fileBase64: base64, mimeType: file.type, fileName: file.name, companyId, matchBankTransaction: true },
      });

      if (error || !data?.success) throw new Error(data?.error || error?.message || "Scan failed");

      const agentResult = await agentClassify(
        companyId, data.data.supplier || "", data.data.description || "",
        -(data.data.totalAmount || 0), data.data.currency || "SEK"
      );

      // Detect payment method
      const pmResult = await detectPaymentMethod(
        companyId,
        {
          totalAmount: data.data.totalAmount,
          date: data.data.date,
          supplier: data.data.supplier,
          paymentMethod: data.data.paymentMethod,
          description: data.data.description,
          dueDate: data.data.dueDate,
          invoiceNumber: data.data.invoiceNumber,
          paymentTerms: data.data.paymentTerms,
        },
        data.bankMatch || null,
        data.ccMatch || null,
        { documentType: data.data.documentType || "receipt" }
      );

      // Enrich agent result with payment method
      agentResult.balancingAccount = pmResult.balancingAccount;
      agentResult.balancingAccountName = pmResult.balancingAccountName;
      agentResult.paymentMethod = pmResult.method;
      agentResult.paymentMethodConfidence = pmResult.confidence;

      setResults(prev => prev.map(r =>
        r.id === id ? { ...r, data: data.data, bankMatch: data.bankMatch, ccMatch: data.ccMatch, paymentMethodResult: pmResult, agentResult, status: "scanned" } : r
      ));

      if (agentResult.confidence >= 0.92 && pmResult.confidence >= 0.7) { await autoBook(id, data.data, agentResult);
      }
    } catch (err: any) { setResults(prev => prev.map(r =>
        r.id === id ? { ...r, status: "error", error: err.message } : r
      ));
      toast({ title: "Skanningsfel", description: err.message, variant: "destructive" });
    }
  };

  const autoBook = async (id: string, receiptData: any, agentResult: any) => { try { await logAgentBooking(companyId, agentResult, "receipt", id, receiptData.supplier || "Okand", -(receiptData.totalAmount || 0));
      setResults(prev => prev.map(r => r.id === id ? { ...r, status: "booked" } : r));
    } catch { /* leave as scanned */ }
  };

  const manualBook = async (result: ScanResult, accountOverride?: string) => { if (!result.agentResult) return;
    const ar = accountOverride
      ? { ...result.agentResult, accountNumber: accountOverride, accountName: accounts.find((a: any) => a.account_number === accountOverride)?.account_name || accountOverride }
      : result.agentResult;
    try { await logAgentBooking(companyId, ar, "receipt", result.id, result.data?.supplier || "Okänd", -(result.data?.totalAmount || 0));
      setResults(prev => prev.map(r => r.id === result.id ? { ...r, status: "booked", agentResult: ar } : r));
      setEditingId(null);
      toast({ title: "Bokförd!", description: `${ar.accountNumber} ${ar.accountName}` });
    } catch (err: any) { toast({ title: "Fel", description: err.message, variant: "destructive" });
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault();
    setDragOver(false);
    Array.from(e.dataTransfer.files)
      .filter(f => f.type.startsWith("image/") || f.type === "application/pdf")
      .forEach(processFile);
  }, [companyId]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => { Array.from(e.target.files || []).forEach(processFile);
    e.target.value = "";
  };

  const handlePaste = useCallback((e: React.ClipboardEvent) => { Array.from(e.clipboardData.items)
      .filter(i => i.type.startsWith("image/"))
      .forEach(item => { const file = item.getAsFile(); if (file) processFile(file); });
  }, [companyId]);

  // Split functions
  const openSplit = (result: ScanResult) => { loadAccounts();
    setSplitTarget(result);
    const total = result.data?.totalAmount || 0;
    setSplitLines([
      { amount: String(Math.round(total / 2)), account: result.agentResult?.accountNumber || "", project: "" },
      { amount: String(total - Math.round(total / 2)), account: "", project: "" },
    ]);
  };

  const splitSum = splitLines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
  const splitBalanced = splitTarget ? Math.abs(splitSum - (splitTarget.data?.totalAmount || 0)) < 1 : false;

  const bookSplit = async () => { if (!splitTarget || !splitBalanced) return;
    try { for (const line of splitLines) { if (!line.amount || !line.account) continue;
        const acct = accounts.find((a: any) => a.account_number === line.account);
        await logAgentBooking(companyId, { accountNumber: line.account,
          accountName: acct?.account_name || line.account,
          vatCode: splitTarget.agentResult?.vatCode || "25",
          confidence: 1,
          explanation: `Split-bokföring: ${parseFloat(line.amount)} kr`,
          category: splitTarget.agentResult?.category || "unknown",
          alternatives: [],
          transactionType: "purchase" as const,
          isRecurring: false,
        }, "receipt", splitTarget.id, splitTarget.data?.supplier || "Okand", -(parseFloat(line.amount)));
      }
      setResults(prev => prev.map(r => r.id === splitTarget.id ? { ...r, status: "booked" } : r));
      setSplitTarget(null);
      toast({ title: "Split bokford!", description: `${splitLines.length} rader bokforda` });
    } catch (err: any) { toast({ title: "Fel", description: err.message, variant: "destructive" });
    }
  };

  const getConfidenceColor = (c: number) => { if (c >= 0.92) return "hsl(142, 71%, 45%)";
    if (c >= 0.60) return "hsl(38, 92%, 50%)";
    return "hsl(0, 84%, 60%)";
  };

  // Compute AI insights from results
  const insightsProcessed = results.filter(r => r.status !== "scanning").length;
  const insightsReview = results.filter(r => r.status === "scanned" && r.agentResult && r.agentResult.confidence < 0.92).length;
  const insightsTotalVat = results.reduce((sum, r) => {
    if (r.data?.vatAmount) return sum + r.data.vatAmount;
    if (r.data?.totalAmount && r.data?.vatRate) return sum + (r.data.totalAmount * r.data.vatRate / (100 + r.data.vatRate));
    return sum;
  }, 0);

  return (
    <div className="space-y-8" onPaste={handlePaste}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ScanLine className="h-6 w-6 text-primary" />
            Kvitto och Faktura AI-agent
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Dra och slapp, e-posta eller fota kvitton — AI:n extraherar, matchar och bokför automatiskt
          </p>
        </div>
        <ReceiptExpenseReport companyId={companyId} />
      </div>

      <Tabs defaultValue="upload">
        <TabsList className="flex-wrap h-auto gap-0 rounded-none bg-transparent p-0 border-b-[0.5px] border-[#E2E8F0] w-full justify-start">
          <TabsTrigger value="upload" className="gap-1.5 rounded-none bg-transparent text-[#475569] border-b-2 border-transparent px-[14px] py-[8px] data-[state=active]:bg-transparent data-[state=active]:text-[#0B4F6C] data-[state=active]:font-medium data-[state=active]:border-[#0B4F6C] data-[state=active]:shadow-none -mb-px"><Upload className="h-4 w-4" />Kvittohantering</TabsTrigger>
          <TabsTrigger value="batch" className="gap-1.5 rounded-none bg-transparent text-[#475569] border-b-2 border-transparent px-[14px] py-[8px] data-[state=active]:bg-transparent data-[state=active]:text-[#0B4F6C] data-[state=active]:font-medium data-[state=active]:border-[#0B4F6C] data-[state=active]:shadow-none -mb-px"><Layers className="h-4 w-4" />Batchbearbetning</TabsTrigger>
          <TabsTrigger value="mileage" className="gap-1.5 rounded-none bg-transparent text-[#475569] border-b-2 border-transparent px-[14px] py-[8px] data-[state=active]:bg-transparent data-[state=active]:text-[#0B4F6C] data-[state=active]:font-medium data-[state=active]:border-[#0B4F6C] data-[state=active]:shadow-none -mb-px"><Car className="h-4 w-4" />Körjournal</TabsTrigger>
          <TabsTrigger value="reports" className="gap-1.5 rounded-none bg-transparent text-[#475569] border-b-2 border-transparent px-[14px] py-[8px] data-[state=active]:bg-transparent data-[state=active]:text-[#0B4F6C] data-[state=active]:font-medium data-[state=active]:border-[#0B4F6C] data-[state=active]:shadow-none -mb-px"><FileBarChart className="h-4 w-4" />Utläggsrapporter</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-4 space-y-6">
          {/* Premium Drop zone */}
          <Card
            className={`group border-[2px] border-dashed transition-all duration-300 cursor-pointer rounded-[12px] ${ dragOver
              ? "border-[#0B4F6C] bg-[#F5F9FF]"
              : "border-[#E2E8F0] bg-white hover:border-[#0B4F6C] hover:bg-[#F5F9FF]"
            }`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <CardContent className="py-16 text-center">
              <div className="flex flex-col items-center gap-4">
                <Upload size={32} strokeWidth={1} className="text-[#94A3B8] group-hover:text-[#0B4F6C] transition-colors" />
                <div>
                  <p className="text-[13px] font-medium text-[#0F172A]">Släpp kvitton — AI hanterar allt</p>
                  <p className="text-[11px] text-[#94A3B8] mt-1">Extraherar data, matchar transaktioner och bokför automatiskt</p>
                  <p className="text-[10px] text-[#94A3B8] mt-1">Ctrl+V/Cmd+V för att klistra in | JPG, PNG, HEIC, PDF</p>
                </div>
                {/* Step pills */}
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <span className="px-[10px] py-[3px] rounded-full bg-[#0B4F6C] text-[#E6F4FA] text-[11px] font-medium flex items-center gap-1.5">
                    <span className="w-[18px] h-[18px] rounded-full bg-[#E6F4FA] text-[#0B4F6C] text-[10px] font-medium flex items-center justify-center">1</span>
                    Extrahera data
                  </span>
                  <span className="text-[#E2E8F0]">→</span>
                  <span className="px-[10px] py-[3px] rounded-full bg-[#0B4F6C] text-[#E6F4FA] text-[11px] font-medium flex items-center gap-1.5">
                    <span className="w-[18px] h-[18px] rounded-full bg-[#E6F4FA] text-[#0B4F6C] text-[10px] font-medium flex items-center justify-center">2</span>
                    Detektera moms
                  </span>
                  <span className="text-[#E2E8F0]">→</span>
                  <span className="px-[10px] py-[3px] rounded-full bg-[#0B4F6C] text-[#E6F4FA] text-[11px] font-medium flex items-center gap-1.5">
                    <span className="w-[18px] h-[18px] rounded-full bg-[#E6F4FA] text-[#0B4F6C] text-[10px] font-medium flex items-center justify-center">3</span>
                    Föreslå konton
                  </span>
                  <span className="text-[#E2E8F0]">→</span>
                  <span className="px-[10px] py-[3px] rounded-full bg-[#0B4F6C] text-[#E6F4FA] text-[11px] font-medium flex items-center gap-1.5">
                    <span className="w-[18px] h-[18px] rounded-full bg-[#E6F4FA] text-[#0B4F6C] text-[10px] font-medium flex items-center justify-center">4</span>
                    Matcha betalning
                  </span>
                </div>
                <Button className="bg-[#0B4F6C] hover:bg-[#1074A0] text-[#E6F4FA] rounded-[8px] text-[12px] font-medium px-[14px] h-[34px]" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                  <Camera className="h-4 w-4 mr-1.5" />Välj filer
                </Button>
              </div>
              <input ref={fileInputRef} type="file" className="hidden" accept="image/*,application/pdf" multiple onChange={handleFileInput} />
            </CardContent>
          </Card>

          {/* Channels */}
          <ReceiptChannelModals companyId={companyId} />

          {/* AI Insights Bar */}
          {results.length > 0 && (
            <div className="bg-[#0F1F3D] border border-cyan-100/50 rounded-2xl px-5 py-3">
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#3b82f6]" />
                  <span className="text-sm font-medium text-[#3b82f6]">AI-insikter</span>
                </div>
                <div className="flex items-center gap-5 text-sm text-muted-foreground">
                  <span><span className="font-semibold text-foreground">{insightsProcessed}</span> kvitton bearbetade</span>
                  {insightsReview > 0 && (
                    <span className="text-[#7A5417]"><span className="font-semibold">{insightsReview}</span> kräver granskning</span>
                  )}
                  {insightsTotalVat > 0 && (
                    <span>Total moms: <span className="font-semibold text-foreground">{Math.round(insightsTotalVat).toLocaleString("sv-SE")} kr</span></span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Skannade kvitton ({results.length})
              </h3>
              {results.map(result => (
                <Card key={result.id} className={`overflow-hidden transition-all rounded-2xl shadow-sm hover:shadow-md ${ result.status === "booked" ? "border-l-4 border-l-[hsl(142,71%,45%)]" :
                  result.status === "error" ? "border-l-4 border-l-destructive" :
                  result.agentResult ? `border-l-4` : ""
                }`} style={result.agentResult && result.status !== "booked" && result.status !== "error" ? { borderLeftColor: getConfidenceColor(result.agentResult.confidence) } : {}}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className="font-semibold text-lg">
                            {result.status === "scanning" ? result.fileName : (result.data?.supplier || result.fileName)}
                          </span>
                          <StatusBadge status={result.status} />
                        </div>

                        {result.status === "scanning" && (
                          <ScanningAnimation />
                        )}

                        {result.status === "error" && (
                          <p className="text-sm text-destructive mt-1">{result.error}</p>
                        )}

                        {result.data && result.status !== "scanning" && (
                          <>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                              <span>{result.data.date}</span>
                              <span className="font-semibold text-foreground">
                                {result.data.totalAmount?.toLocaleString("sv-SE")} {result.data.currency || "SEK"}
                              </span>
                              <span>Moms {result.data.vatRate}%</span>
                            </div>

                            {result.agentResult && (
                              <div className="bg-muted/50 rounded-lg p-3 mb-3">
                                <p className="text-xs text-muted-foreground mb-1">AI-förslag:</p>
                                <div className="flex items-center gap-3 flex-wrap">
                                  {editingId === result.id ? (
                                    <Select value={editAccount} onValueChange={setEditAccount}>
                                      <SelectTrigger className="h-8 text-xs w-64">
                                        <SelectValue placeholder="Valj konto..." />
                                      </SelectTrigger>
                                      <SelectContent className="max-h-60">
                                        {accounts.slice(0, 80).map((a: any) => (
                                          <SelectItem key={a.account_number} value={a.account_number} className="text-xs">
                                            {a.account_number} -- {a.account_name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <span className="text-sm font-medium">
                                      Debet: {result.agentResult.accountNumber} {result.agentResult.accountName}
                                      {result.agentResult.balancingAccount && (
                                        <span className="text-muted-foreground"> / Kredit: {result.agentResult.balancingAccount} {result.agentResult.balancingAccountName}</span>
                                      )}
                                    </span>
                                  )}
                                  {result.data.description && (
                                    <Badge variant="outline" className="text-xs">{result.data.description}</Badge>
                                  )}
                                </div>

                                {/* Payment method badge */}
                                {result.paymentMethodResult && result.status !== "booked" && (
                                  <div className="mt-2">
                                    <PaymentMethodBadge
                                      result={result.paymentMethodResult}
                                      onMethodChange={(method, account, accountName) => {
                                        setResults(prev => prev.map(r => {
                                          if (r.id !== result.id) return r;
                                          const updatedPM: PaymentMethodResult = {
                                            ...r.paymentMethodResult!,
                                            method,
                                            balancingAccount: account,
                                            balancingAccountName: accountName,
                                            confidence: 1,
                                            needsClarification: false,
                                            evidence: "Manuellt vald av användaren",
                                          };
                                          const updatedAgent = r.agentResult ? {
                                            ...r.agentResult,
                                            balancingAccount: account,
                                            balancingAccountName: accountName,
                                            paymentMethod: method,
                                            paymentMethodConfidence: 1,
                                          } : r.agentResult;
                                          return { ...r, paymentMethodResult: updatedPM, agentResult: updatedAgent };
                                        }));
                                      }}
                                    />
                                  </div>
                                )}

                                <div className="mt-2 flex items-center gap-2">
                                  <div className="flex items-center gap-1.5 mr-1">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getConfidenceColor(result.agentResult.confidence) }} />
                                    <span className="text-[10px] font-medium" style={{ color: getConfidenceColor(result.agentResult.confidence) }}>
                                      {result.agentResult.confidence >= 0.92 ? "Hög konfidens" : result.agentResult.confidence >= 0.6 ? "Granskning behövs" : "Låg konfidens"}
                                    </span>
                                  </div>
                                  <div className="flex-1 bg-border rounded-full h-2 overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all"
                                      style={{ width: `${(result.agentResult.confidence * 100).toFixed(0)}%`,
                                        backgroundColor: getConfidenceColor(result.agentResult.confidence),
                                      }}
                                    />
                                  </div>
                                  <span className="text-xs font-mono font-medium" style={{ color: getConfidenceColor(result.agentResult.confidence) }}>
                                    {(result.agentResult.confidence * 100).toFixed(0)}%
                                  </span>
                                </div>
                              </div>
                            )}

                            {result.data.lineItems?.length > 0 && (
                              <details className="mb-2">
                                <summary className="text-xs text-primary cursor-pointer hover:underline">
                                  {result.data.lineItems.length} radposter
                                </summary>
                                <div className="mt-2 space-y-1">
                                  {result.data.lineItems.map((item: any, i: number) => (
                                    <div key={i} className="text-xs flex justify-between text-muted-foreground border-b border-border/50 pb-1">
                                      <span className="truncate">{item.description}</span>
                                      <span className="shrink-0 ml-2">{item.total?.toLocaleString("sv-SE")} kr</span>
                                    </div>
                                  ))}
                                </div>
                              </details>
                            )}

                            {result.data.validationWarnings?.length > 0 && (
                              <div className="flex items-start gap-1.5 text-xs text-[#7A5417] mb-2">
                                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                                <span>{result.data.validationWarnings.join("; ")}</span>
                              </div>
                            )}

                            {result.bankMatch && (
                              <div className="flex items-center gap-1.5 text-xs text-primary mb-2">
                                <Link2 className="h-3 w-3" />
                                <span>
                                  Bankmatchning: {result.bankMatch.counterparty || result.bankMatch.description} ({Math.abs(result.bankMatch.amount).toLocaleString("sv-SE")} kr) — {(result.bankMatch.confidence * 100).toFixed(0)}%
                                </span>
                              </div>
                            )}

                            {result.ccMatch && (
                              <div className="flex items-center gap-1.5 text-xs text-purple-600 dark:text-[#1E3A5F] mb-2">
                                <CreditCard className="h-3 w-3" />
                                <span>
                                  Kreditkortsmatchning: {result.ccMatch.merchantName || "Korttransaktion"} ({Math.abs(result.ccMatch.amount).toLocaleString("sv-SE")} kr) — {(result.ccMatch.confidence * 100).toFixed(0)}%
                                </span>
                              </div>
                            )}

                            {result.agentResult && result.paymentMethodResult && result.status !== "booked" && (
                              <div className="mb-2">
                                <PaymentMethodPreview
                                  debitAccount={result.agentResult.accountNumber}
                                  debitAccountName={result.agentResult.accountName}
                                  creditAccount={result.paymentMethodResult.balancingAccount}
                                  creditAccountName={result.paymentMethodResult.balancingAccountName}
                                  amount={result.data?.totalAmount || 0}
                                  vatRate={result.data?.vatRate}
                                />
                              </div>
                            )}

                            {result.agentResult?.explanation && (
                              <details className="mb-3">
                                <summary className="text-xs text-primary cursor-pointer hover:underline">Varfor detta konto?</summary>
                                <p className="text-xs text-muted-foreground mt-1 pl-3 border-l-2 border-primary/20">
                                  {result.agentResult.explanation}
                                </p>
                              </details>
                            )}

                            {result.status === "scanned" && result.agentResult && (
                              <div className="flex items-center gap-2 flex-wrap">
                                {editingId === result.id ? (
                                  <>
                                    <Button size="sm" onClick={() => manualBook(result, editAccount)} disabled={!editAccount} className="gap-1">
                                      <CheckCircle className="h-3.5 w-3.5" /> Bokfor med valt konto
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Avbryt</Button>
                                  </>
                                ) : (
                                  <>
                                    <Button size="sm" onClick={() => manualBook(result)} className="gap-1">
                                      <CheckCircle className="h-3.5 w-3.5" /> Godkann och bokfor
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => { loadAccounts(); setEditingId(result.id); setEditAccount(result.agentResult.accountNumber); }} className="gap-1">
                                      <Edit3 className="h-3.5 w-3.5" /> Redigera
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => openSplit(result)} className="gap-1">
                                      <Zap className="h-3.5 w-3.5" /> Split kvitto
                                    </Button>
                                  </>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {results.length === 0 && (
            <Card className="rounded-[12px] bg-white border-[2px] border-dashed border-[#E2E8F0] hover:border-[#0B4F6C] hover:bg-[#F5F9FF] transition-colors overflow-hidden relative">
              <CardContent className="py-16 text-center relative z-10">
                {/* AI illustration */}
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <div className="absolute inset-2 rounded-xl bg-[#F5F9FF] flex items-center justify-center">
                    <ScanLine className="h-10 w-10 text-[#0B4F6C] animate-[pulse_2s_ease-in-out_infinite]" />
                  </div>
                  {/* Floating mini receipt */}
                  <div className="absolute -right-6 -top-2 w-14 bg-white rounded-lg shadow-lg p-1.5 border-[0.5px] border-[#E2E8F0] animate-[bounce_3s_ease-in-out_infinite]">
                    <div className="space-y-1">
                      <div className="h-1 w-8 bg-slate-200 rounded" />
                      <div className="h-1 w-6 bg-slate-200 rounded" />
                      <div className="h-1 w-10 bg-[#C7DCFA] rounded" />
                      <div className="text-[6px] font-bold text-[#0B4F6C] text-right">1 249 kr</div>
                    </div>
                  </div>
                </div>

                <h3 className="text-[13px] font-medium text-[#0F172A] mb-1">AI väntar på ditt första kvitto</h3>
                <p className="text-[11px] text-[#94A3B8] mb-6 max-w-sm mx-auto">
                  Släpp ett kvitto eller en faktura — AI:n extraherar, kategoriserar och bokför automatiskt
                </p>

                {/* 3-step onboarding */}
                <div className="flex items-center justify-center gap-2 mb-6">
                  <div className="flex items-center gap-1.5 px-[10px] py-[3px] rounded-full bg-[#0B4F6C] text-[#E6F4FA] text-[11px] font-medium">
                    <span className="w-[18px] h-[18px] rounded-full bg-[#E6F4FA] text-[#0B4F6C] text-[10px] font-medium flex items-center justify-center">1</span>
                    Släpp kvitto
                  </div>
                  <span className="text-[#E2E8F0]">→</span>
                  <div className="flex items-center gap-1.5 px-[10px] py-[3px] rounded-full bg-[#0B4F6C] text-[#E6F4FA] text-[11px] font-medium">
                    <span className="w-[18px] h-[18px] rounded-full bg-[#E6F4FA] text-[#0B4F6C] text-[10px] font-medium flex items-center justify-center">2</span>
                    AI analyserar
                  </div>
                  <span className="text-[#E2E8F0]">→</span>
                  <div className="flex items-center gap-1.5 px-[10px] py-[3px] rounded-full bg-[#0B4F6C] text-[#E6F4FA] text-[11px] font-medium">
                    <span className="w-[18px] h-[18px] rounded-full bg-[#E6F4FA] text-[#0B4F6C] text-[10px] font-medium flex items-center justify-center">3</span>
                    Automatiskt bokfört
                  </div>
                </div>

                <Button
                  className="bg-white border-[0.5px] border-[#E2E8F0] text-[#475569] rounded-[8px] text-[12px] px-[14px] h-[34px] hover:bg-[#F8FAFB]"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-1.5" /> Testa demo-kvitto
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="batch" className="mt-4">
          <ReceiptBatchProcessor companyId={companyId} userId={userId} />
        </TabsContent>

        <TabsContent value="mileage" className="mt-4">
          <MileageLog companyId={companyId} userId={userId} />
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <ReceiptExpenseReportsTab companyId={companyId} />
        </TabsContent>
      </Tabs>

      {/* Split Receipt Sheet */}
      <Sheet open={!!splitTarget} onOpenChange={open => !open && setSplitTarget(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Split kvitto
            </SheetTitle>
          </SheetHeader>

          {splitTarget && (
            <div className="mt-4 space-y-4">
              <div className="text-sm">
                <span className="font-semibold">{splitTarget.data?.supplier}</span>
                <span className="text-muted-foreground ml-2">
                  {splitTarget.data?.totalAmount?.toLocaleString("sv-SE")} {splitTarget.data?.currency || "SEK"}
                </span>
              </div>

              {/* Common split presets */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Snabbval:</p>
                <div className="flex gap-1 flex-wrap">
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { const total = splitTarget.data?.totalAmount || 0;
                    setSplitLines([
                      { amount: String(Math.round(total * 0.5)), account: "6072", project: "" },
                      { amount: String(Math.round(total * 0.33)), account: "7690", project: "" },
                      { amount: String(total - Math.round(total * 0.5) - Math.round(total * 0.33)), account: "6993", project: "" },
                    ]);
                  }}>
                    Representation (3 delar)
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { const total = splitTarget.data?.totalAmount || 0;
                    setSplitLines([
                      { amount: String(Math.round(total / 2)), account: splitTarget.agentResult?.accountNumber || "", project: "" },
                      { amount: String(total - Math.round(total / 2)), account: "", project: "" },
                    ]);
                  }}>
                    50/50
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {splitLines.map((line, i) => (
                  <div key={i} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-medium">Del {i + 1}</span>
                      {splitLines.length > 2 && (
                        <Button size="sm" variant="ghost" className="h-6 text-xs"
                          onClick={() => setSplitLines(splitLines.filter((_, j) => j !== i))}>
                          Ta bort
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <div className="w-24">
                        <Input
                          type="number"
                          placeholder="Belopp"
                          className="h-8 text-xs"
                          value={line.amount}
                          onChange={e => { const l = [...splitLines];
                            l[i].amount = e.target.value;
                            setSplitLines(l);
                          }}
                        />
                      </div>
                      <Select value={line.account} onValueChange={v => { const l = [...splitLines];
                        l[i].account = v;
                        setSplitLines(l);
                      }}>
                        <SelectTrigger className="h-8 text-xs flex-1">
                          <SelectValue placeholder="Konto..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {accounts.slice(0, 80).map((a: any) => (
                            <SelectItem key={a.account_number} value={a.account_number} className="text-xs">
                              {a.account_number} -- {a.account_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>

              <Button size="sm" variant="ghost" className="text-xs"
                onClick={() => setSplitLines([...splitLines, { amount: "", account: "", project: "" }])}>
                + Lägg till rad
              </Button>

              <div className={`flex items-center justify-between text-sm p-2 rounded-lg ${splitBalanced ? "bg-[hsl(142,71%,45%)]/10 text-[hsl(142,76%,36%)]" : "bg-destructive/10 text-destructive"}`}>
                <span>Summa: {splitSum.toLocaleString("sv-SE")} kr</span>
                <span>{splitBalanced ? "Balanserar" : `Differens: ${(splitSum - (splitTarget.data?.totalAmount || 0)).toLocaleString("sv-SE")} kr`}</span>
              </div>

              <Button onClick={bookSplit} disabled={!splitBalanced} className="w-full gap-1.5">
                <CheckCircle className="h-4 w-4" /> Bokfor split
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) { switch (status) { case "scanning":
      return <Badge variant="secondary" className="text-xs gap-1"><Loader2 className="h-3 w-3 animate-spin" />Skannar</Badge>;
    case "scanned":
      return <Badge variant="secondary" className="text-xs gap-1"><Sparkles className="h-3 w-3" />Analyserad</Badge>;
    case "booked":
      return <Badge className="text-xs gap-1 bg-[hsl(142,71%,45%)]/10 text-[hsl(142,76%,36%)] border-[hsl(142,71%,45%)]/20"><CheckCircle className="h-3 w-3" />Bokford</Badge>;
    case "error":
      return <Badge variant="destructive" className="text-xs gap-1"><AlertTriangle className="h-3 w-3" />Fel</Badge>;
    default:
      return null;
  }
}

function ScanningAnimation() {
  const [phase, setPhase] = useState(0);
  const phases = ["Läser dokument…", "Identifierar betalmetod…", "Förbereder bokföring…"];

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1200);
    const t2 = setTimeout(() => setPhase(2), 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="mt-3 rounded-xl border bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 p-3 animate-fade-in">
      <div className="flex items-center gap-2.5">
        <div className="relative w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Loader2 className="h-4 w-4 text-primary animate-spin" />
        </div>
        <div className="flex-1">
          <div className="h-1.5 rounded-full bg-border overflow-hidden mb-1.5">
            <div
              className="h-full bg-primary/60 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${(phase + 1) * 33}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground transition-all">
            {phases[phase]}
          </p>
        </div>
      </div>
    </div>
  );
}

function ReceiptExpenseReportsTab({ companyId }: { companyId: string }) { const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadReports();
  }, [companyId]);

  const loadReports = async () => { try { const { data } = await supabase
        .from("agent_bookings")
        .select("counterparty, amount, created_at, account_number, account_name, vat_code, status")
        .eq("company_id", companyId)
        .eq("source_type", "receipt")
        .order("created_at", { ascending: false })
        .limit(100);
      setReports(data || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  if (loading) { return <div className="h-40 bg-muted/50 rounded-lg animate-pulse" />;
  }

  // Group by month
  const grouped: Record<string, { entries: any[]; total: number }> = {};
  for (const r of reports) { const month = r.created_at?.slice(0, 7) || "unknown";
    if (!grouped[month]) grouped[month] = { entries: [], total: 0 };
    grouped[month].entries.push(r);
    grouped[month].total += Math.abs(r.amount || 0);
  }

  const generateReport = async (monthKey: string, entries: any[]) => {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);
    const doc = new jsPDF();
    const monthLabel = new Date(monthKey + "-01").toLocaleDateString("sv-SE", { year: "numeric", month: "long" });

    doc.setFontSize(16);
    doc.text("Utlaggsrapport", 14, 20);
    doc.setFontSize(10);
    doc.text(`Period: ${monthLabel}`, 14, 28);
    doc.text(`Genererad: ${new Date().toLocaleDateString("sv-SE")}`, 14, 34);
    doc.text("Signatur: ____________________", 14, 42);

    const body = entries.map((e: any) => [
      new Date(e.created_at).toLocaleDateString("sv-SE"),
      e.counterparty || "Okand",
      `${e.account_number} ${e.account_name}`,
      `${Math.abs(e.amount || 0).toLocaleString("sv-SE")} kr`,
      e.vat_code ? `${e.vat_code}%` : "--",
    ]);

    const total = entries.reduce((s: number, e: any) => s + Math.abs(e.amount || 0), 0);
    body.push(["", "TOTALT", "", `${total.toLocaleString("sv-SE")} kr`, ""]);

    autoTable(doc, { startY: 50,
      head: [["Datum", "Leverantör", "Konto", "Belopp", "Moms"]],
      body,
      theme: "striped",
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    window.open(URL.createObjectURL(doc.output("blob")), "_blank");
    toast({ title: "Rapport genererad" });
  };

  if (reports.length === 0) { return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileBarChart className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Inga bokforda kvitton ännu</p>
          <p className="text-xs text-muted-foreground mt-1">Godkann kvitton i Kvittohantering för att skapa rapporter</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a)).map(([month, data]) => (
        <Card key={month}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">
                  {new Date(month + "-01").toLocaleDateString("sv-SE", { year: "numeric", month: "long" })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {data.entries.length} kvitton | Totalt: {data.total.toLocaleString("sv-SE")} kr
                </p>
              </div>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => generateReport(month, data.entries)}>
                <FileBarChart className="h-4 w-4" /> Generera PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
