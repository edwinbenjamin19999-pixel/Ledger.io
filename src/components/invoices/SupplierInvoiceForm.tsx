import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Trash2, Search, Sparkles, Upload, FileText, Loader2, Maximize2, Minimize2, X, ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Info, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { checkInvoiceDuplicates, type DuplicateCheckResult, type DuplicateMatch } from "@/lib/invoices/duplicateCheck";
import { DuplicateInvoiceDialog } from "@/components/invoices/DuplicateInvoiceDialog";
import { useNavigate } from "react-router-dom";
import { AccountCombobox } from "@/components/invoices/AccountCombobox";
import { JournalEntryPreview, type JournalPreviewLine } from "@/components/invoices/JournalEntryPreview";

interface Supplier { id: string;
  name: string;
  org_number: string | null;
  email: string | null;
  bankgiro: string | null;
  plusgiro: string | null;
  default_account_id: string | null;
  default_vat_code: string | null;
  payment_terms_days: number | null;
}

interface Account { id: string;
  account_number: string;
  account_name: string;
}

interface InvoiceLine { id: string;
  description: string;
  amount_excl_vat: number;
  vat_rate: number;
  vat_amount: number;
  total: number;
  account_id: string | null;
  suggested_account?: { account_number: string; confidence?: number } | null;
}

interface SupplierInvoiceFormProps { companyId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const VAT_ACCOUNTS: Record<number, string> = { 25: "2640",
  12: "2641",
  6: "2642",
  0: "",
};

const CURRENCIES = ["SEK", "EUR", "USD", "GBP", "NOK", "DKK"];

export const SupplierInvoiceForm = ({ companyId, onSuccess, onCancel }: SupplierInvoiceFormProps) => { const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierName, setSupplierName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [currency, setCurrency] = useState("SEK");
  const [description, setDescription] = useState("");
  const [suggestedAccount, setSuggestedAccount] = useState<Account | null>(null);
  const [lines, setLines] = useState<InvoiceLine[]>([
    { id: "1", description: "", amount_excl_vat: 0, vat_rate: 25, vat_amount: 0, total: 0, account_id: null },
  ]);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiPrefilled, setAiPrefilled] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [fullscreenPreview, setFullscreenPreview] = useState(false);
  const [aiReview, setAiReview] = useState<any>(null);
  const [dupResult, setDupResult] = useState<DuplicateCheckResult | null>(null);
  const [dupOpen, setDupOpen] = useState(false);
  const [pendingAttest, setPendingAttest] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => { loadSuppliers();
    loadAccounts();
  }, [companyId]);

  const loadSuppliers = async () => { const { data } = await supabase
      .from("suppliers")
      .select("id, name, org_number, email, bankgiro, plusgiro, default_account_id, default_vat_code, payment_terms_days")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("name")
      .limit(200);
    setSuppliers(data || []);
  };

  const loadAccounts = async () => { const { data } = await supabase
      .from("chart_of_accounts")
      .select("id, account_number, account_name")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .gte("account_number", "4000")
      .lte("account_number", "7999")
      .order("account_number")
      .limit(500);
    setAccounts(data || []);
  };

  const findAccountByNumber = useCallback((accountNumber: string): Account | null => { return accounts.find(a => a.account_number === accountNumber) || null;
  }, [accounts]);

  const analyzeInvoice = async (uploadedFile: File) => { setAnalyzing(true);
    try { const reader = new FileReader();
      const fileBase64 = await new Promise<string>((resolve, reject) => { reader.onload = () => { const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(uploadedFile);
      });

      const { data, error } = await supabase.functions.invoke("analyze-supplier-invoice", { body: { fileBase64,
          mimeType: uploadedFile.type,
          fileName: uploadedFile.name,
        },
      });

      if (error || !data?.success) { throw new Error(data?.error || error?.message || "AI-analys misslyckades");
      }

      const result = data.data;

      // Pre-fill supplier
      if (result.supplier) { setSupplierName(result.supplier);
        // Try to match existing supplier
        const match = suppliers.find(s =>
          s.name.toLowerCase().includes(result.supplier.toLowerCase()) ||
          result.supplier.toLowerCase().includes(s.name.toLowerCase())
        );
        if (match) { setSelectedSupplier(match);
        }
      }

      // Pre-fill invoice details
      if (result.invoiceNumber) setInvoiceNumber(result.invoiceNumber);
      if (result.date) setInvoiceDate(result.date);
      if (result.dueDate) setDueDate(result.dueDate);
      if (result.currency) setCurrency(result.currency);
      if (result.description) setDescription(result.description);

      // Pre-fill lines
      const vatRate = result.vatRate || 25;
      const netAmount = result.netAmount || 0;
      const vatAmount = result.vatAmount || 0;
      const totalAmount = result.totalAmount || 0;

      // Find suggested account
      let accountId: string | null = null;
      if (result.suggestedAccount) { const acc = findAccountByNumber(result.suggestedAccount);
        if (acc) { accountId = acc.id;
          setSuggestedAccount(acc);
        }
      }

      const aiConfidence = typeof result.confidence === "number" ? result.confidence : 90;
      setLines([{ id: "1",
        description: result.lineDescription || result.description || "",
        amount_excl_vat: netAmount,
        vat_rate: vatRate,
        vat_amount: vatAmount,
        total: totalAmount || (netAmount + vatAmount),
        account_id: accountId,
        suggested_account: result.suggestedAccount
          ? { account_number: result.suggestedAccount, confidence: aiConfidence }
          : null,
      }]);

      setAiReview(result.review || null);
      setAiPrefilled(true);
      setShowForm(true);
      toast.success("Fakturan har analyserats och fälten är ifyllda. Granska och justera vid behov.");
    } catch (err: any) { console.error("AI analysis error:", err);
      toast.error(err.message || "Kunde inte analysera fakturan");
      // Show form anyway för manual entry
      setShowForm(true);
    } finally { setAnalyzing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);
    await analyzeInvoice(uploadedFile);
  };

  const selectSupplier = async (supplier: Supplier) => { setSelectedSupplier(supplier);
    setSupplierName(supplier.name);
    setSupplierSearch("");
    setShowSupplierDropdown(false);

    if (supplier.payment_terms_days) { const due = new Date();
      due.setDate(due.getDate() + supplier.payment_terms_days);
      setDueDate(due.toISOString().split("T")[0]);
    }

    if (supplier.default_account_id) { const acc = accounts.find((a) => a.id === supplier.default_account_id);
      if (acc) { setSuggestedAccount(acc);
        setLines((prev) =>
          prev.map((l, i) => (i === 0 ? { ...l, account_id: acc.id, suggested_account: { account_number: acc.account_number, confidence: 95 } } : l))
        );
      }
    } else { const { data: journalHistory } = await supabase
        .from("journal_entries")
        .select("id")
        .eq("company_id", companyId)
        .ilike("description", `%${supplier.name}%`)
        .order("created_at", { ascending: false })
        .limit(1);

      if (journalHistory?.length) { const { data: txLines } = await supabase
          .from("journal_entry_lines")
          .select("account_id")
          .eq("journal_entry_id", journalHistory[0].id)
          .gt("debit", 0)
          .limit(1);
        if (txLines?.length && txLines[0].account_id) { const acc = accounts.find((a) => a.id === txLines[0].account_id);
          if (acc && acc.account_number >= "4000" && acc.account_number <= "7999") { setSuggestedAccount(acc);
            setLines((prev) =>
              prev.map((l, i) => (i === 0 ? { ...l, account_id: acc.id, suggested_account: { account_number: acc.account_number, confidence: 80 } } : l))
            );
          }
        }
      }
    }

    if (supplier.default_vat_code) { const rate = parseInt(supplier.default_vat_code) || 25;
      updateLine("1", "vat_rate", rate);
    }
  };

  const filteredSuppliers = supplierSearch.length > 0
    ? suppliers.filter(
        (s) =>
          s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
          (s.org_number || "").includes(supplierSearch)
      )
    : suppliers;

  const updateLine = (id: string, field: keyof InvoiceLine, value: any) => { setLines((prev) =>
      prev.map((line) => { if (line.id !== id) return line;
        const updated = { ...line, [field]: value };
        if (["amount_excl_vat", "vat_rate"].includes(field)) { const amt = field === "amount_excl_vat" ? value : line.amount_excl_vat;
          const rate = field === "vat_rate" ? value : line.vat_rate;
          updated.vat_amount = amt * (rate / 100);
          updated.total = amt + updated.vat_amount;
        }
        return updated;
      })
    );
  };

  const addLine = () => { setLines([
      ...lines,
      { id: Date.now().toString(),
        description: "",
        amount_excl_vat: 0,
        vat_rate: 25,
        vat_amount: 0,
        total: 0,
        account_id: suggestedAccount?.id || null,
      },
    ]);
  };

  const removeLine = (id: string) => { if (lines.length > 1) setLines(lines.filter((l) => l.id !== id));
  };

  const totalExclVat = lines.reduce((s, l) => s + l.amount_excl_vat, 0);
  const totalVat = lines.reduce((s, l) => s + l.vat_amount, 0);
  const totalInclVat = totalExclVat + totalVat;

  const fmt = (n: number) =>
    new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  const handleSubmit = async (attestDirectly: boolean, opts: { skipDuplicateCheck?: boolean } = {}) => {
    if (saving) return; // prevent double-click
    if (!supplierName) return toast.error("Ange leverantör");
    if (!invoiceNumber) return toast.error("Ange fakturanummer");
    if (totalExclVat === 0) return toast.error("Belopp kan inte vara 0");
    if (attestDirectly && lines.some(l => !l.account_id)) return toast.error("Välj konto på alla rader innan attest (eller spara som inkommen).");

    setSaving(true);

    // Duplicate detection
    if (!opts.skipDuplicateCheck) {
      try {
        const dup = await checkInvoiceDuplicates({
          companyId,
          invoiceType: "incoming",
          counterpartyName: supplierName,
          counterpartyId: selectedSupplier?.id,
          invoiceNumber,
          totalAmount: totalInclVat,
          invoiceDate,
        });
        if (dup.blocking || dup.softMatches.length > 0) {
          setDupResult(dup);
          setPendingAttest(attestDirectly);
          setDupOpen(true);
          setSaving(false);
          return;
        }
      } catch (dupErr) {
        console.error("Duplicate check failed:", dupErr);
      }
    }

    try { const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Ej inloggad");

      let documentId: string | null = null;
      if (file) { const filePath = `${companyId}/invoices/${Date.now()}_${file.name}`;
        const { error: uploadErr } = await supabase.storage
          .from("documents")
          .upload(filePath, file);

        if (uploadErr) { throw new Error(uploadErr.message || "Kunde inte ladda upp originalfakturan");
        }

        const { data: doc, error: docError } = await supabase
          .from("documents")
          .insert([{ company_id: companyId,
            uploaded_by: user.id,
            file_name: file.name,
            file_url: filePath,
            mime_type: file.type,
            file_size: file.size,
            document_type: "invoice_incoming",
            processing_status: "processed",
            metadata: { supplier_name: supplierName,
              invoice_number: invoiceNumber,
              invoice_date: invoiceDate,
              due_date: dueDate,
              total_amount: totalInclVat,
              source: "manual_supplier_invoice",
            },
          }])
          .select("id")
          .maybeSingle();

        if (docError || !doc?.id) { throw new Error(docError?.message || "Kunde inte spara originalfakturan");
        }

        documentId = doc.id;
      }

      const invoiceData = { company_id: companyId,
        invoice_type: "incoming" as const,
        invoice_number: invoiceNumber,
        counterparty_name: supplierName,
        counterparty_org_number: selectedSupplier?.org_number || null,
        supplier_id: selectedSupplier?.id || null,
        invoice_date: invoiceDate,
        due_date: dueDate,
        total_amount: totalInclVat,
        vat_amount: totalVat,
        currency: currency,
        status: attestDirectly ? "attested" as const : "draft" as const,
        notes: description || null,
        document_id: documentId,
        created_by: user.id,
        ...(attestDirectly ? { attested_by: user.id, attested_at: new Date().toISOString() } : {}),
      };

      const { data: invoice, error } = await supabase
        .from("invoices")
        .insert([invoiceData])
        .select()
        .maybeSingle();
      if (error) throw error;

      const invoiceLines = lines.map((l) => ({ invoice_id: invoice.id,
        description: l.description || supplierName,
        quantity: 1,
        unit_price: l.amount_excl_vat,
        vat_rate: l.vat_rate,
        vat_amount: l.vat_amount,
        total_amount: l.total,
        account_id: l.account_id,
      }));
      await supabase.from("invoice_lines").insert(invoiceLines);

      if (attestDirectly) { await createJournalEntry(invoice.id, user.id, documentId);
      }

      toast.success(
        attestDirectly ? "Faktura registrerad och attesterad!" : "Faktura sparad som inkommen"
      );
      onSuccess();
    } catch (err: any) { toast.error(err.message || "Kunde inte spara faktura");
    } finally { setSaving(false);
    }
  };

  const createJournalEntry = async (invoiceId: string, userId: string, documentId: string | null) => { try { // Step 1: Create as draft
      const { data: je } = await supabase
        .from("journal_entries")
        .insert({ company_id: companyId,
          document_id: documentId,
          entry_date: invoiceDate,
          description: `Leverantörsfaktura ${invoiceNumber} - ${supplierName}`,
          created_by: userId,
          status: "draft",
          series_code: "L",
        })
        .select("id")
        .maybeSingle();

      if (!je) return;

      const jeLines: any[] = [];

      for (const line of lines) { if (line.amount_excl_vat > 0 && line.account_id) { jeLines.push({ journal_entry_id: je.id,
            account_id: line.account_id,
            debit: line.amount_excl_vat,
            credit: 0,
          });
        }

        if (line.vat_amount > 0) { const vatAccNum = VAT_ACCOUNTS[line.vat_rate] || "2640";
          const { data: vatAcc } = await supabase
            .from("chart_of_accounts")
            .select("id")
            .eq("company_id", companyId)
            .eq("account_number", vatAccNum)
            .limit(1)
            .maybeSingle();
          if (vatAcc) { jeLines.push({ journal_entry_id: je.id,
              account_id: vatAcc.id,
              debit: line.vat_amount,
              credit: 0,
              vat_amount: line.vat_amount,
              vat_code: `${line.vat_rate}`,
            });
          }
        }
      }

      const { data: apAcc } = await supabase
        .from("chart_of_accounts")
        .select("id")
        .eq("company_id", companyId)
        .eq("account_number", "2440")
        .limit(1)
        .maybeSingle();
      if (apAcc) { jeLines.push({ journal_entry_id: je.id,
          account_id: apAcc.id,
          debit: 0,
          credit: totalInclVat,
        });
      }

      // Step 2: Insert lines
      if (jeLines.length > 0) { await supabase.from("journal_entry_lines").insert(jeLines);
      }

      // Step 3: Approve (triggers balance check)
      await supabase.from("journal_entries").update({ status: "approved" }).eq("id", je.id);

      await supabase.from("invoices").update({ journal_entry_id: je.id }).eq("id", invoiceId);
    } catch (err) { console.error("Failed to create journal entry:", err);
    }
  };

  // Step 1: Upload-first view
  if (!showForm) { return (
      <div className="space-y-5">
        <Card className="border-2 border-dashed border-primary/30">
          <CardContent className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            {analyzing ? (
              <>
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <div>
                  <h3 className="text-lg font-semibold">Analyserar fakturan...</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    AI läser av belopp, moms, datum, leverantör och konterar automatiskt
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Ladda upp leverantörsfaktura</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Ladda upp en PDF eller bild – AI läser av och fyller i alla fält automatiskt
                  </p>
                </div>
                <label className="cursor-pointer">
                  <Button asChild variant="default" size="lg">
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      Välj fil (PDF, JPG, PNG)
                    </span>
                  </Button>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => setShowForm(true)}
                >
                  Eller fyll i manuellt →
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onCancel}>
            Avbryt
          </Button>
        </div>
      </div>
    );
  }

  // Generate object URL för file preview
  const filePreviewUrl = file ? URL.createObjectURL(file) : null;
  const isImageFile = file && /\.(jpg|jpeg|png|webp)$/i.test(file.name);
  const isPdfFile = file && /\.pdf$/i.test(file.name);

  // Step 2: Form view (pre-filled by AI or manual)
  return (
    <div className={`${file ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : ''}`}>
      {/* Fullscreen document overlay */}
      {file && filePreviewUrl && fullscreenPreview && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
          <div className="flex items-center justify-between p-3 border-b bg-background">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4" />
              {file.name}
            </div>
            <Button variant="ghost" size="icon" onClick={() => setFullscreenPreview(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {isPdfFile ? (
              <iframe
                src={filePreviewUrl}
                className="w-full h-full rounded-lg border"
                title="Faktura förhandsvisning"
              />
            ) : isImageFile ? (
              <div className="flex items-center justify-center h-full">
                <img src={filePreviewUrl} alt="Faktura" className="max-w-full max-h-full object-contain" />
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Left: Document preview */}
      {file && filePreviewUrl && !fullscreenPreview && (
        <div className="sticky top-4 h-fit">
          <Card className="overflow-hidden">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {file.name}
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setFullscreenPreview(true)}>
                <Maximize2 className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {isPdfFile ? (
                <iframe
                  src={filePreviewUrl}
                  className="w-full border-0"
                  style={{ height: 'calc(100vh - 200px)', minHeight: '600px' }}
                  title="Faktura förhandsvisning"
                />
              ) : isImageFile ? (
                <div className="p-2 flex items-center justify-center bg-muted/30 cursor-pointer" style={{ maxHeight: 'calc(100vh - 200px)', overflow: 'auto' }} onClick={() => setFullscreenPreview(true)}>
                  <img src={filePreviewUrl} alt="Faktura" className="max-w-full h-auto object-contain" />
                </div>
              ) : (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Förhandsvisning ej tillgänglig för denna filtyp
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Right: Form */}
      <div className="space-y-5">
      {aiPrefilled && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />
          <div>
            <p className="text-sm font-medium">AI har fyllt i fakturan</p>
            <p className="text-xs text-muted-foreground">Granska och justera eventuella fel innan du sparar eller attesterar.</p>
          </div>
        </div>
      )}

      {/* AI Review Panel */}
      {aiReview && (
        <Card className={`border-l-4 ${ aiReview.verdict === 'ok' ? 'border-l-green-500 bg-green-50/50 dark:bg-green-950/20' :
          aiReview.verdict === 'warning' ? 'border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20' :
          'border-l-red-500 bg-red-50/50 dark:bg-red-950/20'
        }`}>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm flex items-center gap-2">
              {aiReview.verdict === 'ok' ? (
                <CheckCircle2 className="h-4 w-4 text-[#085041]" />
              ) : aiReview.verdict === 'warning' ? (
                <AlertTriangle className="h-4 w-4 text-[#7A5417]" />
              ) : (
                <XCircle className="h-4 w-4 text-[#7A1A1A]" />
              )}
              AI-bedömning: {aiReview.verdict === 'ok' ? 'OK att bokföra' : aiReview.verdict === 'warning' ? 'Varning – granska' : 'Avvisad – åtgärd krävs'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pb-4">
            {/* Verdict text */}
            {aiReview.verdictText && (
              <p className="text-sm text-foreground">{aiReview.verdictText}</p>
            )}

            {/* Cost type & assessment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {aiReview.costType && (
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-muted-foreground">Kostnadstyp</p>
                  <p className="text-sm">{aiReview.costType}</p>
                </div>
              )}
              {aiReview.accountingAssessment && (
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-muted-foreground">Konteringsbedömning</p>
                  <p className="text-sm">{aiReview.accountingAssessment}</p>
                </div>
              )}
            </div>

            {/* Control checks */}
            {aiReview.controls && aiReview.controls.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Kontrollpunkter</p>
                <div className="space-y-1">
                  {aiReview.controls.map((c: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      {c.status === 'ok' ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#085041] flex-shrink-0" />
                      ) : c.status === 'warning' ? (
                        <AlertTriangle className="h-3.5 w-3.5 text-[#7A5417] flex-shrink-0" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-[#7A1A1A] flex-shrink-0" />
                      )}
                      <span className="font-medium">{c.check}:</span>
                      <span className="text-muted-foreground">{c.detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {aiReview.warnings && aiReview.warnings.length > 0 && (
              <div className="space-y-1">
                {aiReview.warnings.map((w: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-[#7A5417] dark:text-[#C28A2B]">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Periodization note */}
            {aiReview.needsPeriodization && (
              <div className="flex items-start gap-2 text-sm text-blue-700 dark:text-[#1E3A5F] p-2 rounded bg-[#EFF6FF] dark:bg-blue-950/30">
                <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>Behöver periodiseras{aiReview.periodizationMonths ? ` (${aiReview.periodizationMonths} månader)` : ''}</span>
              </div>
            )}

            {/* Suggested action */}
            {aiReview.suggestedAction && (
              <div className="flex items-center gap-2 pt-1">
                <ArrowRight className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                <span className="text-sm font-medium">
                  {aiReview.suggestedAction === 'book_directly' ? 'Rekommendation: Bokför direkt' :
                   aiReview.suggestedAction === 'send_to_attestation' ? 'Rekommendation: Skicka till attest' :
                   'Rekommendation: Begär mer info'}
                </span>
              </div>
            )}
            {aiReview.suggestedActionText && (
              <p className="text-xs text-muted-foreground ml-5">{aiReview.suggestedActionText}</p>
            )}
          </CardContent>
        </Card>
      )}

      {file && (
        <div className="flex items-center gap-2 p-2 rounded-md bg-muted text-sm">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="truncate flex-1">{file.name}</span>
          <Badge variant="outline" className="text-xs">Bifogad</Badge>
        </div>
      )}

      {/* Supplier */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Leverantörsinformation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Label>Leverantör *</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={supplierName}
                onChange={(e) => { setSupplierName(e.target.value);
                  setSupplierSearch(e.target.value);
                  setShowSupplierDropdown(true);
                  setSelectedSupplier(null);
                }}
                onFocus={() => setShowSupplierDropdown(true)}
                onBlur={() => setTimeout(() => setShowSupplierDropdown(false), 200)}
                placeholder="Sök leverantör..."
                className="pl-9"
              />
            </div>
            {showSupplierDropdown && filteredSuppliers.length > 0 && (
              <div className="absolute left-0 right-0 bg-popover border rounded-md shadow-md z-50 max-h-48 overflow-y-auto mt-1">
                {filteredSuppliers.slice(0, 10).map((s) => (
                  <button
                    key={s.id}
                    className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex items-center justify-between"
                    onMouseDown={() => selectSupplier(s)}
                  >
                    <span className="font-medium">{s.name}</span>
                    {s.org_number && (
                      <span className="text-xs text-muted-foreground">{s.org_number}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {suggestedAccount && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-primary/5 border border-primary/20">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm">
                AI-förslag: <strong>{suggestedAccount.account_number}</strong> –{" "}
                {suggestedAccount.account_name}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Fakturanummer *</Label>
              <Input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="123456"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Fakturadatum</Label>
              <Input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label>Förfallodatum</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Valuta</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Bifoga faktura</Label>
              <div className="mt-1">
                <label className="flex items-center gap-2 cursor-pointer border rounded-md px-3 py-2 hover:bg-accent/50 transition-colors text-sm">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground truncate">
                    {file ? file.name : "Välj fil..."}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0];
                      if (f) { setFile(f);
                        analyzeInvoice(f);
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lines */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Fakturarader</span>
            <Button type="button" size="sm" variant="outline" onClick={addLine}>
              <Plus className="w-4 h-4 mr-1" />
              Rad
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {lines.map((line, idx) => (
            <div key={line.id} className="p-3 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Rad {idx + 1}</span>
                {lines.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => removeLine(line.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Beskrivning</Label>
                  <Input
                    value={line.description}
                    onChange={(e) => updateLine(line.id, "description", e.target.value)}
                    placeholder="T.ex. kontorsmaterial"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Konto</Label>
                  <div className="mt-1">
                    <AccountCombobox
                      accounts={accounts}
                      value={line.account_id}
                      onChange={(id) => updateLine(line.id, "account_id", id)}
                      suggestion={line.suggested_account || null}
                      placeholder="Välj konto…"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Belopp exkl. moms</Label>
                  <Input
                    type="text"
                    value={line.amount_excl_vat === 0 ? "" : line.amount_excl_vat}
                    onChange={(e) => { const v = e.target.value.replace(/\s/g, "").replace(",", ".");
                      updateLine(line.id, "amount_excl_vat", parseFloat(v) || 0);
                    }}
                    placeholder="0,00"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Momssats</Label>
                  <Select
                    value={String(line.vat_rate)}
                    onValueChange={(v) => updateLine(line.id, "vat_rate", parseFloat(v))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0%</SelectItem>
                      <SelectItem value="6">6%</SelectItem>
                      <SelectItem value="12">12%</SelectItem>
                      <SelectItem value="25">25%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Totalt inkl. moms</Label>
                  <Input value={fmt(line.total)} disabled className="mt-1 bg-muted" />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardContent className="pt-4">
          <Label>Intern notering</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Kommentar eller referens..."
            rows={2}
            className="mt-1"
          />
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardContent className="pt-4 space-y-2 text-right">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Exkl. moms:</span>
            <span className="font-mono">{fmt(totalExclVat)} {currency}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Moms:</span>
            <span className="font-mono">{fmt(totalVat)} {currency}</span>
          </div>
          <div className="flex justify-between text-lg font-bold border-t pt-2">
            <span>Totalt:</span>
            <span className="font-mono">{fmt(totalInclVat)} {currency}</span>
          </div>
        </CardContent>
      </Card>

      <JournalEntryPreview
        currency={currency}
        lines={(() => {
          const out: JournalPreviewLine[] = [];
          // Cost lines
          const byAcc = new Map<string, number>();
          for (const l of lines) {
            if (l.amount_excl_vat <= 0) continue;
            const key = l.account_id || "__none__";
            byAcc.set(key, (byAcc.get(key) || 0) + l.amount_excl_vat);
          }
          for (const [accId, amt] of byAcc) {
            const acc = accId === "__none__" ? null : accounts.find(a => a.id === accId) || null;
            out.push({ account: acc, debit: amt, credit: 0 });
          }
          // Ingående moms (264x) per rate
          const vatByRate = new Map<number, number>();
          for (const l of lines) {
            if (l.vat_amount > 0) vatByRate.set(l.vat_rate, (vatByRate.get(l.vat_rate) || 0) + l.vat_amount);
          }
          for (const [rate, v] of vatByRate) {
            out.push({ account: null, fallbackNumber: VAT_ACCOUNTS[rate] || "2640", fallbackName: `Ingående moms ${rate}%`, debit: v, credit: 0 });
          }
          // Leverantörsskuld 2440
          out.push({ account: null, fallbackNumber: "2440", fallbackName: "Leverantörsskuld", debit: 0, credit: totalInclVat });
          return out;
        })()}
      />
      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Avbryt
        </Button>
        <Button variant="secondary" onClick={() => handleSubmit(false)} disabled={saving}>
          Spara som inkommen
        </Button>
        <Button onClick={() => handleSubmit(true)} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
          Attestera direkt
        </Button>
      </div>

      <DuplicateInvoiceDialog
        open={dupOpen}
        onOpenChange={setDupOpen}
        result={dupResult}
        invoiceType="incoming"
        onViewExisting={(m) => navigate(`/leverantorsfakturor?invoice=${m.id}`)}
        onConfirmSoft={() => {
          setDupOpen(false);
          handleSubmit(pendingAttest, { skipDuplicateCheck: true });
        }}
        onCancel={() => setDupOpen(false)}
      />
    </div>
    </div>
  );
};
