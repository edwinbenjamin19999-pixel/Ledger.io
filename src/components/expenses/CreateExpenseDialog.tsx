import { useState, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Loader2, Sparkles, Check, AlertTriangle, HelpCircle, ScanLine } from "lucide-react";
import { categorizeExpense, EXPENSE_ACCOUNTS, EXPENSE_CATEGORIES } from "@/lib/expense-ai-categorization";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";

interface Props { open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  userId: string;
  users: { id: string; name: string }[];
  onCreated: () => void;
}

export default function CreateExpenseDialog({ open, onOpenChange, companyId, userId, users, onCreated }: Props) { const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [description, setDescription] = useState("");
  const [memo, setMemo] = useState("");
  const [amount, setAmount] = useState("");
  const [vatAmount, setVatAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [category, setCategory] = useState("");
  const [account, setAccount] = useState("6990");
  const [vatCode, setVatCode] = useState("25");
  const [country, setCountry] = useState("Sverige");
  const [currency, setCurrency] = useState("SEK");
  const [paymentMethod, setPaymentMethod] = useState("employee");
  const [billable, setBillable] = useState(false);
  const [costCenter, setCostCenter] = useState("");
  const [project, setProject] = useState("");
  const [approverId, setApproverId] = useState("");
  const [aiConfidence, setAiConfidence] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [ocrDone, setOcrDone] = useState(false);

  // AI categorization based on text fields (runs when description/memo change manually)
  useEffect(() => { if (ocrDone) return; // Skip if OCR already set everything
    if (!description && !memo) return;
    const result = categorizeExpense(description, memo, parseFloat(amount) || 0, country, currency);
    setAccount(result.account);
    setVatCode(result.vatCode);
    if (result.category !== "Övrigt") setCategory(result.category);
    setAiConfidence(result.confidence);

    const gross = parseFloat(amount) || 0;
    const rate = parseFloat(result.vatCode) || 0;
    if (rate > 0) { setVatAmount((gross * rate / (100 + rate)).toFixed(2));
    } else { setVatAmount("0");
    }
  }, [description, memo, amount, country, currency, ocrDone]);

  // When user manually edits description/memo after OCR, re-enable AI categorization
  const handleDescriptionChange = (val: string) => { setDescription(val);
    setOcrDone(false);
  };
  const handleMemoChange = (val: string) => { setMemo(val);
    setOcrDone(false);
  };

  // OCR: read receipt with AI when file is selected
  const handleFileSelected = async (selectedFile: File | null) => { setFile(selectedFile);
    if (!selectedFile) return;

    setScanning(true);
    setScanProgress(10);
    const toastId = toast.loading("AI läser av kvittot...");

    try { // Convert file to base64
      const arrayBuffer = await selectedFile.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) { binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      setScanProgress(30);

      // Determine mime type
      let mime = selectedFile.type || "application/octet-stream";
      const name = selectedFile.name.toLowerCase();
      if (name.endsWith(".pdf")) mime = "application/pdf";
      else if (name.endsWith(".png")) mime = "image/png";
      else if (name.endsWith(".jpg") || name.endsWith(".jpeg")) mime = "image/jpeg";
      else if (name.endsWith(".webp")) mime = "image/webp";

      setScanProgress(50);

      const { data, error } = await supabase.functions.invoke("analyze-expense-receipt", { body: { fileBase64: base64, mimeType: mime, fileName: selectedFile.name },
      });

      setScanProgress(90);

      if (error || !data?.success) { throw new Error(data?.error || error?.message || "OCR misslyckades");
      }

      const result = data.data;

      // Populate form fields from OCR
      if (result.totalAmount) setAmount(String(result.totalAmount));
      if (result.vatAmount != null) setVatAmount(String(result.vatAmount));
      if (result.date) setExpenseDate(result.date);
      if (result.currency) setCurrency(result.currency);
      if (result.description) setDescription(result.description);
      if (result.memo) setMemo(result.memo);
      if (result.supplier) { // Use supplier in description if description is short
        if (!result.description || result.description.length < 5) { setDescription(result.supplier);
        }
      }

      // Set VAT code from OCR
      if (result.vatRate != null) { setVatCode(String(result.vatRate));
      }

      // Run AI categorization on the extracted text
      const catResult = categorizeExpense(
        result.description || result.supplier || "",
        result.memo || "",
        result.totalAmount || 0,
        country,
        result.currency || "SEK"
      );
      setAccount(catResult.account);
      if (catResult.category !== "Övrigt") setCategory(catResult.category);
      setAiConfidence(result.confidence || catResult.confidence);

      setOcrDone(true);
      setScanProgress(100);
      toast.success("Kvitto avläst! Kontrollera uppgifterna nedan.", { id: toastId });
    } catch (err: any) { console.error("OCR error:", err);
      toast.error(`Kunde inte läsa kvittot: ${err.message}`, { id: toastId });
    } finally { setScanning(false);
      setScanProgress(0);
    }
  };

  const handleSave = async (submitForApproval: boolean) => { if (!amount || !description) { toast.error("Fyll i belopp och beskrivning");
      return;
    }
    setSaving(true);
    try { const { data: claim, error } = await supabase
        .from("expense_claims")
        .insert({ company_id: companyId,
          user_id: userId,
          description,
          category,
          country,
          expense_date: expenseDate,
          amount: parseFloat(amount),
          vat_amount: parseFloat(vatAmount) || 0,
          currency,
          cost_center: costCenter || null,
          project: project || null,
          memo: memo || null,
          payment_method: paymentMethod,
          billable,
          account_number: account,
          vat_code: vatCode,
          ai_confidence: aiConfidence,
          ai_suggested_account: account,
          approver_id: approverId || null,
          status: submitForApproval ? "pending_approval" : "draft",
        })
        .select("id")
        .maybeSingle();

      if (error) throw error;

      // Upload file if present
      if (file && claim) { const path = `${companyId}/${claim.id}/${file.name}`;
        const { error: uploadErr } = await supabase.storage.from("expense-receipts").upload(path, file);
        if (!uploadErr) {
          await supabase.from("expense_claim_files").insert({ expense_claim_id: claim.id,
            file_name: file.name,
            file_url: path,
            file_type: file.type,
            file_size: file.size,
          });
        }
      }

      toast.success(submitForApproval ? "Utlägg skickat för attest!" : "Utlägg sparat som utkast!");
      onOpenChange(false);
      resetForm();
      onCreated();
    } catch (err: any) { toast.error(err.message || "Kunde inte skapa utlägg");
    } finally { setSaving(false);
    }
  };

  const resetForm = () => { setDescription("");
    setMemo("");
    setAmount("");
    setVatAmount("");
    setCategory("");
    setAccount("6990");
    setVatCode("25");
    setFile(null);
    setApproverId("");
    setCostCenter("");
    setProject("");
    setOcrDone(false);
  };

  const confidenceIndicator = aiConfidence > 0.9 ? (
    <span className="flex items-center gap-1 text-xs text-[#085041]"><Check className="w-3 h-3" /> AI säker</span>
  ) : aiConfidence > 0.5 ? (
    <span className="flex items-center gap-1 text-xs text-[#7A5417]"><AlertTriangle className="w-3 h-3" /> AI förslag – kontrollera</span>
  ) : (
    <span className="flex items-center gap-1 text-xs text-muted-foreground"><HelpCircle className="w-3 h-3" /> Välj manuellt</span>
  );

  const gross = parseFloat(amount) || 0;
  const vat = parseFloat(vatAmount) || 0;
  const net = gross - vat;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nytt utlägg</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File upload with OCR */}
          <div>
            <Label>Ladda upp kvitto</Label>
            <div
              className={`mt-1 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${ scanning ? "bg-primary/5 border-primary/40" : "hover:bg-accent/30"
              }`}
              onClick={() => !scanning && document.getElementById("expense-file-input")?.click()}
            >
              {scanning ? (
                <div className="space-y-3">
                  <ScanLine className="w-8 h-8 mx-auto text-primary animate-pulse" />
                  <p className="text-sm font-medium">AI läser av kvittot...</p>
                  <Progress value={scanProgress} className="h-2 max-w-xs mx-auto" />
                  <p className="text-xs text-muted-foreground">Extraherar belopp, moms, datum och leverantör</p>
                </div>
              ) : (
                <>
                  <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {file ? (
                      <span className="flex items-center justify-center gap-2">
                        {ocrDone && <Check className="w-4 h-4 text-[#085041]" />}
                        {file.name}
                      </span>
                    ) : (
                      "Dra och släpp eller klicka – AI läser av kvittot automatiskt"
                    )}
                  </p>
                </>
              )}
              <input
                id="expense-file-input"
                type="file"
                className="hidden"
                accept="image/*,application/pdf"
                onChange={(e) => handleFileSelected(e.target.files?.[0] || null)}
              />
            </div>
            {ocrDone && (
              <p className="text-xs text-[#085041] mt-1 flex items-center gap-1">
                <Check className="w-3 h-3" /> Kvitto avläst – granska och justera uppgifterna nedan vid behov
              </p>
            )}
          </div>

          {/* Description and memo */}
          <div className="space-y-1">
            <Label>Beskrivning *</Label>
            <Input value={description} onChange={(e) => handleDescriptionChange(e.target.value)} placeholder="T.ex. Lunch med kund" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Belopp inkl. moms *</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-1">
              <Label>Momsbelopp</Label>
              <Input type="number" value={vatAmount} onChange={(e) => setVatAmount(e.target.value)} placeholder="0.00" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Datum</Label>
              <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Kategori</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Välj kategori" /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Valuta</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SEK">SEK</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="NOK">NOK</SelectItem>
                  <SelectItem value="DKK">DKK</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Land</Label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Betalningssätt</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Anställd betalat</SelectItem>
                <SelectItem value="company">Företaget betalat</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Memo</Label>
            <Textarea value={memo} onChange={(e) => handleMemoChange(e.target.value)} placeholder="AI fyller i automatiskt från kvittot..." rows={3} />
          </div>

          {/* AI-driven account */}
          <div className="border rounded-lg p-3 space-y-3 bg-accent/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">AI-kontering</span>
              </div>
              {confidenceIndicator}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Konto</Label>
                <Select value={account} onValueChange={setAccount}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPENSE_ACCOUNTS.map((a) => (
                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Momskod</Label>
                <Select value={vatCode} onValueChange={(v) => { setVatCode(v);
                  const rate = parseFloat(v) || 0;
                  setVatAmount(rate > 0 ? (gross * rate / (100 + rate)).toFixed(2) : "0");
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25%</SelectItem>
                    <SelectItem value="12">12%</SelectItem>
                    <SelectItem value="6">6%</SelectItem>
                    <SelectItem value="0">0% (momsfritt)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Preview */}
            {gross > 0 && (
              <div className="text-xs space-y-1 mt-2 border-t pt-2">
                <div className="font-semibold mb-1">Konteringsförslag:</div>
                <div className="grid grid-cols-3 gap-1">
                  <span>Debet {account}</span>
                  <span>{EXPENSE_ACCOUNTS.find(a => a.value === account)?.label.split(" – ")[1] || ""}</span>
                  <span className="text-right">{net.toFixed(2)} kr</span>
                </div>
                {vat > 0 && (
                  <div className="grid grid-cols-3 gap-1">
                    <span>Debet 2640</span>
                    <span>Ingående moms</span>
                    <span className="text-right">{vat.toFixed(2)} kr</span>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-1">
                  <span>Kredit 2893</span>
                  <span>Löneskulder/utlägg</span>
                  <span className="text-right">{gross.toFixed(2)} kr</span>
                </div>
              </div>
            )}
          </div>

          {/* Approver */}
          <div className="space-y-1">
            <Label>Attestant</Label>
            <Select value={approverId} onValueChange={setApproverId}>
              <SelectTrigger><SelectValue placeholder="Välj attestant" /></SelectTrigger>
              <SelectContent>
                {users.filter(u => u.id !== userId).map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => handleSave(false)} disabled={saving || scanning} className="flex-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Spara utkast
            </Button>
            <Button onClick={() => handleSave(true)} disabled={saving || scanning || !approverId} className="flex-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Skicka för attest
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
