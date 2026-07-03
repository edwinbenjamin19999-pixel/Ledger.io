import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Save, Check, X, Sparkles, AlertTriangle, HelpCircle, Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, MessageSquare, FileText, Loader2 } from "lucide-react";
import { categorizeExpense, EXPENSE_ACCOUNTS, EXPENSE_CATEGORIES } from "@/lib/expense-ai-categorization";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

interface Props { claimId: string;
  companyId: string;
  userId: string;
  onBack: () => void;
  onNavigate: (direction: "prev" | "next") => void;
  currentIndex: number;
  totalCount: number;
}

export default function ExpenseDetailView({ claimId, companyId, userId, onBack, onNavigate, currentIndex, totalCount }: Props) { const [claim, setClaim] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [currentFileIdx, setCurrentFileIdx] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [submitterName, setSubmitterName] = useState<string>("");
  const [approverName, setApproverName] = useState<string>("");

  // Form fields
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [country, setCountry] = useState("Sverige");
  const [expenseDate, setExpenseDate] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [amount, setAmount] = useState("");
  const [vatAmount, setVatAmount] = useState("");
  const [currency, setCurrency] = useState("SEK");
  const [costCenter, setCostCenter] = useState("");
  const [project, setProject] = useState("");
  const [memo, setMemo] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("employee");
  const [billable, setBillable] = useState(false);
  const [account, setAccount] = useState("6990");
  const [vatCode, setVatCode] = useState("25");
  const [aiConfidence, setAiConfidence] = useState(0);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  useEffect(() => { loadClaim();
  }, [claimId]);

  const loadClaim = async () => { setLoading(true);
    try { const { data, error } = await supabase
        .from("expense_claims")
        .select("*")
        .eq("id", claimId)
        .maybeSingle();
      if (error) throw error;
      setClaim(data);
      setDescription(data.description || "");
      setCategory(data.category || "");
      setCountry(data.country || "Sverige");
      setExpenseDate(data.expense_date || "");
      setPaymentDate(data.payment_date || "");
      setAmount(String(data.amount || ""));
      setVatAmount(String(data.vat_amount || "0"));
      setCurrency(data.currency || "SEK");
      setCostCenter(data.cost_center || "");
      setProject(data.project || "");
      setMemo(data.memo || "");
      setPaymentMethod(data.payment_method || "employee");
      setBillable(data.billable || false);
      setAccount(data.account_number || "6990");
      setVatCode(data.vat_code || "25");
      setAiConfidence(data.ai_confidence || 0);

      // Load submitter + approver display names
      const idsToLookup = [data.user_id, data.approver_id].filter(Boolean) as string[];
      if (idsToLookup.length > 0) {
        const { toDisplayName } = await import("@/lib/format/displayName");
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email")
          .in("id", idsToLookup);
        const map = new Map<string, string>();
        (profiles || []).forEach((p: any) => {
          const full = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
          map.set(p.id, toDisplayName(full) || p.email || "Okänd");
        });
        setSubmitterName(data.user_id ? map.get(data.user_id) || "" : "");
        setApproverName(data.approver_id ? map.get(data.approver_id) || "" : "");
      } else {
        setSubmitterName("");
        setApproverName("");
      }

      const { data: fileData } = await supabase
        .from("expense_claim_files")
        .select("*")
        .eq("expense_claim_id", claimId);
      
      const filesWithUrls = await Promise.all(
        (fileData || []).map(async (f: any) => {
          // Extract storage path from file_url (may be full URL or just path)
          let storagePath = f.file_url || "";
          const bucketPrefix = "/storage/v1/object/public/expense-receipts/";
          const idx = storagePath.indexOf(bucketPrefix);
          if (idx !== -1) {
            storagePath = storagePath.substring(idx + bucketPrefix.length);
          }
          // Also handle render/sign prefix
          const renderPrefix = "/storage/v1/object/sign/expense-receipts/";
          const ridx = storagePath.indexOf(renderPrefix);
          if (ridx !== -1) {
            storagePath = storagePath.substring(ridx + renderPrefix.length);
          }
          
          const { data: signedData } = await supabase.storage
            .from("expense-receipts")
            .createSignedUrl(storagePath, 3600); // 1 hour
          
          return {
            ...f,
            file_url: signedData?.signedUrl || f.file_url,
          };
        })
      );
      setFiles(filesWithUrls);

      // Load comments
      const { data: commentData } = await supabase
        .from("expense_claim_comments")
        .select("*")
        .eq("expense_claim_id", claimId)
        .order("created_at", { ascending: true });
      setComments(commentData || []);
    } catch (err) { console.error(err);
    } finally { setLoading(false);
    }
  };

  const handleSave = async () => { setSaving(true);
    try { const { error } = await supabase
        .from("expense_claims")
        .update({ description,
          category,
          country,
          expense_date: expenseDate,
          payment_date: paymentDate || null,
          amount: parseFloat(amount) || 0,
          vat_amount: parseFloat(vatAmount) || 0,
          currency,
          cost_center: costCenter || null,
          project: project || null,
          memo: memo || null,
          payment_method: paymentMethod,
          billable,
          account_number: account,
          vat_code: vatCode,
        })
        .eq("id", claimId);
      if (error) throw error;
      toast.success("Utlägg sparat!");
    } catch (err: any) { toast.error(err.message || "Kunde inte spara");
    } finally { setSaving(false);
    }
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      const gross = Math.round((parseFloat(amount) || 0) * 100) / 100;
      const vat = Math.round((parseFloat(vatAmount) || 0) * 100) / 100;
      const net = Math.round((gross - vat) * 100) / 100;

      if (!expenseDate) throw new Error("Utgiftsdatum saknas");
      if (!description.trim()) throw new Error("Beskrivning saknas");
      if (gross <= 0) throw new Error("Belopp måste vara större än 0");

      const savePayload = {
        description,
        category,
        country,
        expense_date: expenseDate,
        payment_date: paymentDate || null,
        amount: gross,
        vat_amount: vat,
        currency,
        cost_center: costCenter || null,
        project: project || null,
        memo: memo || null,
        payment_method: paymentMethod,
        billable,
        account_number: account,
        vat_code: vatCode,
      };

      const { error: saveErr } = await supabase
        .from("expense_claims")
        .update(savePayload)
        .eq("id", claimId);
      if (saveErr) throw saveErr;

      const { data: accounts, error: accountsErr } = await supabase
        .from("chart_of_accounts")
        .select("id, account_number")
        .eq("company_id", companyId)
        .in("account_number", vat > 0 ? [account, "2893", "2640"] : [account, "2893"]);
      if (accountsErr) throw accountsErr;

      const acctMap = new Map((accounts || []).map((a: any) => [a.account_number, a.id]));
      const expAcctId = acctMap.get(account);
      const liabAcctId = acctMap.get("2893");
      const vatAcctId = acctMap.get("2640");

      if (!expAcctId) throw new Error(`Konto ${account} saknas i kontoplanen`);
      if (!liabAcctId) throw new Error("Konto 2893 saknas i kontoplanen");
      if (vat > 0 && !vatAcctId) throw new Error("Konto 2640 saknas i kontoplanen");

      const { data: je, error: jeErr } = await supabase
        .from("journal_entries")
        .insert({
          company_id: companyId,
          entry_date: expenseDate,
          description: `Utlägg: ${description}`,
          created_by: userId,
          status: "draft",
          series_code: "B",
        })
        .select("id")
        .maybeSingle();
      if (jeErr) throw jeErr;
      if (!je) throw new Error("Kunde inte skapa verifikation");

      const lines: any[] = [
        {
          journal_entry_id: je.id,
          account_id: expAcctId,
          debit: net,
          credit: 0,
          vat_code: vat > 0 ? vatCode : null,
          vat_amount: 0,
        },
      ];

      if (vat > 0 && vatAcctId) {
        lines.push({
          journal_entry_id: je.id,
          account_id: vatAcctId,
          debit: vat,
          credit: 0,
          vat_code: vatCode,
          vat_amount: vat,
        });
      }

      lines.push({
        journal_entry_id: je.id,
        account_id: liabAcctId,
        debit: 0,
        credit: gross,
        vat_code: null,
        vat_amount: 0,
      });

      const { error: lineErr } = await supabase.from("journal_entry_lines").insert(lines);
      if (lineErr) throw lineErr;

      const { error: approveJeErr } = await supabase
        .from("journal_entries")
        .update({ status: "approved", approved_by: userId })
        .eq("id", je.id);
      if (approveJeErr) throw approveJeErr;

      const { error: updateErr } = await supabase
        .from("expense_claims")
        .update({ status: "approved", journal_entry_id: je.id, approver_id: userId })
        .eq("id", claimId);
      if (updateErr) throw updateErr;

      toast.success("Utlägg attesterat! Verifikation skapad.");
      await loadClaim();
    } catch (err: any) {
      toast.error(err.message || "Kunde inte attestera");
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => { if (!rejectReason) { toast.error("Ange en anledning");
      return;
    }
    try { await supabase
        .from("expense_claims")
        .update({ status: "rejected" })
        .eq("id", claimId);

      await supabase.from("expense_claim_comments").insert({ expense_claim_id: claimId,
        user_id: userId,
        comment: `Avvisad: ${rejectReason}`,
      });

      toast.success("Utlägg avvisat");
      setShowReject(false);
      loadClaim();
    } catch (err: any) { toast.error(err.message);
    }
  };

  const addComment = async () => { if (!newComment.trim()) return;
    await supabase.from("expense_claim_comments").insert({ expense_claim_id: claimId,
      user_id: userId,
      comment: newComment,
    });
    setNewComment("");
    loadClaim();
  };

  const gross = parseFloat(amount) || 0;
  const vat = parseFloat(vatAmount) || 0;
  const net = gross - vat;

  const confidenceIndicator = aiConfidence > 0.9 ? (
    <span className="flex items-center gap-1 text-xs text-[#085041]"><Check className="w-3 h-3" /> AI säker</span>
  ) : aiConfidence > 0.5 ? (
    <span className="flex items-center gap-1 text-xs text-[#7A5417]"><AlertTriangle className="w-3 h-3" /> AI förslag</span>
  ) : (
    <span className="flex items-center gap-1 text-xs text-muted-foreground"><HelpCircle className="w-3 h-3" /> Manuellt</span>
  );

  const statusBadge = (status: string) => { const map: Record<string, string> = { draft: "Utkast",
      pending_approval: "Under attest",
      approved: "Attesterad",
      rejected: "Avvisad",
      paid: "Betald",
      paid_via_salary: "Betald via lön",
    };
    return <Badge variant={status === "rejected" ? "destructive" : "outline"}>{map[status] || status}</Badge>;
  };

  if (loading) { return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Tillbaka
          </Button>
          <h2 className="text-lg font-bold">Utläggsgranskning</h2>
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1}/{totalCount}
          </span>
          {claim && statusBadge(claim.status)}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onNavigate("prev")} disabled={currentIndex === 0}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onNavigate("next")} disabled={currentIndex >= totalCount - 1}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          {claim?.status === "draft" || claim?.status === "pending_approval" ? (
            <>
              <Button size="sm" onClick={handleApprove} disabled={approving || saving}>
                {approving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                {approving ? "Attesterar..." : "Attestera"}
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setShowReject(true)} disabled={approving || saving}>
                <X className="w-4 h-4 mr-1" /> Avvisa
              </Button>
            </>
          ) : null}
          <Button size="sm" onClick={handleSave} disabled={saving || approving}>
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            {saving ? "Sparar..." : "Spara"}
          </Button>
        </div>
      </div>

      {/* Reject dialog inline */}
      {showReject && (
        <Card className="border-destructive">
          <CardContent className="p-4 space-y-2">
            <Label>Anledning till avvisning</Label>
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Beskriv varför utlägget avvisas..." />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowReject(false)}>Avbryt</Button>
              <Button variant="destructive" size="sm" onClick={handleReject}>Avvisa</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Form */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              {/* Status steps */}
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className="bg-[#E1F5EE] text-[#085041]">Inskickad</Badge>
                <span className="text-muted-foreground">→</span>
                <Badge variant="outline">{claim?.approver_id ? "Attestant tilldelad" : "Väntar på attestant"}</Badge>
                <span className="text-muted-foreground">→</span>
                <Badge variant={claim?.status === "approved" ? "default" : "outline"}>
                  {claim?.status === "approved" ? "Godkänd" : "Väntar"}
                </Badge>
              </div>

              {/* Vem-rader: inlämnare, attestant, utbetalning */}
              <div className="text-xs text-muted-foreground space-y-1 border-t pt-3">
                {submitterName && (
                  <div>
                    <span className="font-medium text-foreground">Inlämnat av:</span> {submitterName}
                    {claim?.created_at && (
                      <span> · {format(new Date(claim.created_at), "d MMM yyyy", { locale: sv })}</span>
                    )}
                  </div>
                )}
                {approverName && (claim?.status === "approved" || claim?.status === "paid" || claim?.status === "paid_via_salary" || claim?.status === "reimbursed") && (
                  <div>
                    <span className="font-medium text-foreground">Godkänt av:</span> {approverName}
                  </div>
                )}
                {(claim?.status === "paid" || claim?.status === "reimbursed" || claim?.status === "paid_via_salary") && claim?.payment_date && (
                  <div className="text-[#085041]">
                    <span className="font-medium">Utbetalt:</span> {format(new Date(claim.payment_date), "d MMM yyyy", { locale: sv })}
                  </div>
                )}
                {claim?.status === "approved" && claim?.payment_method === "employee" && (
                  <div className="text-[#9A6300]">
                    Väntar på utbetalning – hanteras via <span className="font-medium">Direktbetalning</span>.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Beskrivning</Label>
                  <Input value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Kategori</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue placeholder="Välj" /></SelectTrigger>
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
                  <Label>Land</Label>
                  <Input value={country} onChange={(e) => setCountry(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Datum</Label>
                  <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Utbetalningsdatum</Label>
                  <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Valuta</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SEK">SEK</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Belopp exkl. moms</Label>
                  <Input type="number" value={net.toFixed(2)} readOnly className="bg-muted" />
                </div>
                <div className="space-y-1">
                  <Label>Momsbelopp</Label>
                  <Input type="number" value={vatAmount} onChange={(e) => setVatAmount(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Totalbelopp inkl. moms</Label>
                <Input type="number" value={amount} onChange={(e) => { setAmount(e.target.value);
                  const g = parseFloat(e.target.value) || 0;
                  const rate = parseFloat(vatCode) || 0;
                  setVatAmount(rate > 0 ? (g * rate / (100 + rate)).toFixed(2) : "0");
                }} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Kostnadsställe</Label>
                  <Input value={costCenter} onChange={(e) => setCostCenter(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Projekt</Label>
                  <Input value={project} onChange={(e) => setProject(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Memo</Label>
                <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={2} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Betalningssätt</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={paymentMethod === "company" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPaymentMethod("company")}
                    >
                      Företaget betalat
                    </Button>
                    <Button
                      variant={paymentMethod === "employee" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPaymentMethod("employee")}
                    >
                      Anställd betalat
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Fakturerbar</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={billable ? "default" : "outline"}
                      size="sm"
                      onClick={() => setBillable(true)}
                    >Ja</Button>
                    <Button
                      variant={!billable ? "default" : "outline"}
                      size="sm"
                      onClick={() => setBillable(false)}
                    >Nej</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Accounting */}
          <Card className="border-primary/20">
            <CardContent className="p-4 space-y-3">
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
                    const g = parseFloat(amount) || 0;
                    setVatAmount(rate > 0 ? (g * rate / (100 + rate)).toFixed(2) : "0");
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25%</SelectItem>
                      <SelectItem value="12">12%</SelectItem>
                      <SelectItem value="6">6%</SelectItem>
                      <SelectItem value="0">0% – Ej avdragsgill</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {gross > 0 && (
                <div className="text-xs border-t pt-2 space-y-1">
                  <div className="font-semibold">Konteringsrad:</div>
                  <div className="grid grid-cols-3">
                    <span>Debet {account}</span>
                    <span>{EXPENSE_ACCOUNTS.find(a => a.value === account)?.label.split(" – ")[1]}</span>
                    <span className="text-right">{net.toFixed(2)} kr</span>
                  </div>
                  {vat > 0 && (
                    <div className="grid grid-cols-3">
                      <span>Debet 2640</span>
                      <span>Ingående moms</span>
                      <span className="text-right">{vat.toFixed(2)} kr</span>
                    </div>
                  )}
                  <div className="grid grid-cols-3">
                    <span>Kredit 2893</span>
                    <span>Löneskulder/utlägg</span>
                    <span className="text-right">{gross.toFixed(2)} kr</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Document viewer */}
        <div>
          <Card className="h-full">
            <CardContent className="p-0">
              <Tabs defaultValue="files">
                <TabsList className="w-full rounded-none border-b">
                  <TabsTrigger value="files" className="flex-1">
                    <FileText className="w-4 h-4 mr-1" /> Filer ({files.length})
                  </TabsTrigger>
                  <TabsTrigger value="comments" className="flex-1">
                    <MessageSquare className="w-4 h-4 mr-1" /> Kommentar ({comments.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="files" className="p-4">
                  {files.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Inga filer bifogade</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{files[currentFileIdx]?.file_name}</span>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}>
                            <ZoomOut className="w-4 h-4" />
                          </Button>
                          <span className="text-xs w-10 text-center">{Math.round(zoom * 100)}%</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.min(3, z + 0.25))}>
                            <ZoomIn className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(1)}>↺</Button>
                        </div>
                      </div>
                      <div className="border rounded-lg overflow-auto max-h-[500px] bg-muted/30 flex justify-center p-4">
                        {files[currentFileIdx]?.file_type?.includes("image") ? (
                          <img
                            src={files[currentFileIdx].file_url}
                            alt="Kvitto"
                            style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
                            className="max-w-full transition-transform"
                          />
                        ) : (
                          <iframe
                            src={files[currentFileIdx]?.file_url}
                            className="w-full h-[500px]"
                            style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
                          />
                        )}
                      </div>
                      {files.length > 1 && (
                        <div className="flex items-center justify-between">
                          <Button variant="ghost" size="sm" onClick={() => setCurrentFileIdx(i => Math.max(0, i - 1))} disabled={currentFileIdx === 0}>
                            <ChevronLeft className="w-4 h-4" /> Föregående
                          </Button>
                          <span className="text-xs text-muted-foreground">{currentFileIdx + 1}/{files.length}</span>
                          <Button variant="ghost" size="sm" onClick={() => setCurrentFileIdx(i => Math.min(files.length - 1, i + 1))} disabled={currentFileIdx >= files.length - 1}>
                            Nästa <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                      <Button variant="outline" size="sm" asChild>
                        <a href={files[currentFileIdx]?.file_url} download={files[currentFileIdx]?.file_name} target="_blank" rel="noreferrer">
                          <Download className="w-4 h-4 mr-1" /> Ladda ner
                        </a>
                      </Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="comments" className="p-4">
                  <div className="space-y-3">
                    {comments.map((c: any) => (
                      <div key={c.id} className="border rounded-lg p-3 text-sm">
                        <p>{c.comment}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(c.created_at), "d MMM yyyy HH:mm", { locale: sv })}
                        </p>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Skriv en kommentar..."
                        onKeyDown={(e) => e.key === "Enter" && addComment()}
                      />
                      <Button size="sm" onClick={addComment}>Skicka</Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
