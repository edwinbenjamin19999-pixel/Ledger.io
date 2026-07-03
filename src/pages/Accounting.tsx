import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, CheckCircle, AlertCircle, Loader2, Trash2, Clock, Eye, CreditCard, Receipt, FileCheck, Upload, PenLine, Sparkles, ShieldCheck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { guardJournalEntry, type GuardResult } from "@/lib/validators/financial-guard";
import { FinancialGuardDialog } from "@/components/common/FinancialGuardDialog";
import { AccountingSubNav } from "@/components/accounting/AccountingSubNav";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SimplifiedUpload } from "@/components/SimplifiedUpload";
import { ManualJournalEntry } from "@/components/accounting/ManualJournalEntry";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { pickDefaultCompanyId } from "@/lib/company-selection";

interface Company { id: string; name: string; }

interface PendingJournalEntry { id: string;
  description: string | null;
  entry_date: string;
  status: string;
  created_at: string;
  ai_confidence: number | null;
  payment_status: string | null;
  supplier_name: string | null;
  supplier_iban: string | null;
  document?: { document_category: string | null; } | null;
  lines: { id: string;
    debit: number | null;
    credit: number | null;
    account: { account_number: string; account_name: string; } | null;
  }[];
}

// Inline editable amount
const EditableAmount = ({ lineId, field, value, onSave }: { lineId: string; field: "debit" | "credit"; value: number; onSave: () => void }) => { const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value.toString());

  if (value === 0 && !editing) return <span className="text-muted-foreground">-</span>;

  if (editing) { return (
      <Input
        type="number"
        className="w-24 h-7 text-right text-sm ml-auto"
        value={editValue}
        autoFocus
        onChange={e => setEditValue(e.target.value)}
        onBlur={async () => { const newVal = parseFloat(editValue) || 0;
          if (newVal !== value) { await supabase.from("journal_entry_lines").update({ [field]: newVal }).eq("id", lineId);
            onSave();
          }
          setEditing(false);
        }}
        onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setEditing(false); }}
      />
    );
  }

  return (
    <span
      className="cursor-pointer hover:bg-accent/50 px-1 py-0.5 rounded transition-colors"
      onClick={() => { setEditValue(value.toString()); setEditing(true); }}
    >
      {value.toLocaleString("sv-SE")} kr
    </span>
  );
};

// Pending entry detail dialog
const EntryDetailDialog = ({ entry, onApprove, onDelete, approvingId, loadPendingEntries }: { entry: PendingJournalEntry;
  onApprove: (id: string, pay: boolean) => void;
  onDelete: (id: string) => void;
  approvingId: string | null;
  loadPendingEntries: () => void;
}) => { const totalDebit = entry.lines.reduce((sum, l) => sum + (l.debit || 0), 0);
  const category = entry.document?.document_category;
  const requiresPayment = category === 'supplier_invoice' && entry.payment_status !== 'payment_completed';

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 text-xs">
          <Eye className="h-3 w-3 mr-1" />Detaljer
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {requiresPayment ? <FileCheck className="h-5 w-5" /> : <Receipt className="h-5 w-5" />}
            {entry.supplier_name || entry.description || 'Verifikation'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className={`p-[14px] rounded-[12px] border-[0.5px] ${requiresPayment ? 'bg-[#FAEEDA] border-[#F0DDB7]' : 'bg-[#E1F5EE] border-[#BFE6D6]'}`}>
            <div className="flex items-center gap-2">
              {requiresPayment ? (
                <>
                  <CreditCard className="h-5 w-5 text-[#7A5417]" />
                  <div>
                    <p className="font-medium text-[12px] text-[#7A5417]">Leverantörsfaktura – betalning krävs</p>
                    <p className="text-[12px] text-[#7A5417]/80">
                      {entry.supplier_iban ? `IBAN: ${entry.supplier_iban}` : 'Ingen IBAN tillgänglig'}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Receipt className="h-5 w-5 text-[#1D9E75]" />
                  <div>
                    <p className="font-medium text-[12px] text-[#085041]">Kvitto – redan betalt</p>
                    <p className="text-[12px] text-[#085041]/80">Endast bokföring behövs</p>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">Datum:</span><p className="font-medium">{new Date(entry.entry_date).toLocaleDateString('sv-SE')}</p></div>
            <div><span className="text-muted-foreground">Belopp:</span><p className="font-medium">{totalDebit.toLocaleString('sv-SE')} kr</p></div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Konteringsrader:</p>
              <p className="text-xs text-muted-foreground">Klicka på belopp för att redigera</p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Konto</TableHead>
                  <TableHead className="text-right">Debet</TableHead>
                  <TableHead className="text-right">Kredit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entry.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="text-sm">{line.account?.account_number} – {line.account?.account_name}</TableCell>
                    <TableCell className="text-right"><EditableAmount lineId={line.id} field="debit" value={line.debit || 0} onSave={loadPendingEntries} /></TableCell>
                    <TableCell className="text-right"><EditableAmount lineId={line.id} field="credit" value={line.credit || 0} onSave={loadPendingEntries} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end gap-2">
            {requiresPayment ? (
              <>
                <Button variant="outline" onClick={() => onApprove(entry.id, false)} disabled={approvingId === entry.id}>
                  <CheckCircle className="h-4 w-4 mr-2" />Endast bokföring
                </Button>
                <Button onClick={() => onApprove(entry.id, true)} disabled={approvingId === entry.id || !entry.supplier_iban}>
                  {approvingId === entry.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
                  Godkänn & betala
                </Button>
              </>
            ) : (
              <Button onClick={() => onApprove(entry.id, false)} disabled={approvingId === entry.id}>
                {approvingId === entry.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                Godkänn bokföring
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Accounting = () => { const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [processingDocs, setProcessingDocs] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [pendingEntries, setPendingEntries] = useState<PendingJournalEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [_showManual, _setShowManual] = useState(false); // kept för compat
  const [guardResult, setGuardResult] = useState<GuardResult | null>(null);
  const [guardOpen, setGuardOpen] = useState(false);
  const [pendingApproveId, setPendingApproveId] = useState<string | null>(null);
  const [pendingPayment, setPendingPayment] = useState(false);

  useEffect(() => { if (!loading && !user) navigate("/auth"); }, [user, loading, navigate]);
  useEffect(() => { if (user) loadCompanies(); }, [user]);
  useEffect(() => { if (selectedCompany) loadPendingEntries(); }, [selectedCompany]);

  const loadPendingEntries = async () => { if (!selectedCompany) return;
    setLoadingEntries(true);
    try { const { data, error } = await supabase
        .from('journal_entries')
        .select(`id, description, entry_date, status, created_at, ai_confidence, payment_status, supplier_name, supplier_iban,
          documents (document_category),
          journal_entry_lines (id, debit, credit, chart_of_accounts (account_number, account_name))`)
        .eq('company_id', selectedCompany)
        .in('status', ['draft', 'pending_approval'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPendingEntries((data || []).map((entry: any) => ({ ...entry,
        document: entry.documents,
        lines: (entry.journal_entry_lines || []).map((line: any) => ({ id: line.id, debit: line.debit, credit: line.credit, account: line.chart_of_accounts
        }))
      })));
    } catch (error: any) { console.error('Error loading pending entries:', error);
    } finally { setLoadingEntries(false);
    }
  };

  const runGuardAndApprove = (entryId: string, initiatePayment: boolean = false) => { const entry = pendingEntries.find(e => e.id === entryId);
    if (!entry) return;
    const result = guardJournalEntry({ description: entry.description || "",
      entry_date: entry.entry_date,
      lines: entry.lines.map(l => ({ account_number: l.account?.account_number || "0000",
        debit: l.debit || 0,
        credit: l.credit || 0,
      })),
    });
    setGuardResult(result);
    setPendingApproveId(entryId);
    setPendingPayment(initiatePayment);
    setGuardOpen(true);
  };

  const confirmApprove = async () => { if (!pendingApproveId || !user) return;
    setGuardOpen(false);
    setApprovingId(pendingApproveId);
    try { const updateData: any = { status: 'approved', approved_by: user.id };
      if (pendingPayment) updateData.payment_status = 'pending_payment';
      const { error } = await supabase.from('journal_entries').update(updateData).eq('id', pendingApproveId);
      if (error) { const msg = error.message || '';
        if (msg.includes('balanserar inte') || msg.includes('konteringsrader')) { toast.error(msg);
        } else { throw error;
        }
        return;
      }
      toast.success(pendingPayment ? 'Godkänd! Betalning registrerad.' : 'Verifikation godkänd!');
      loadPendingEntries();
    } catch (error: any) { toast.error('Kunde inte godkänna: ' + error.message);
    } finally { setApprovingId(null);
      setPendingApproveId(null);
    }
  };

  const deleteEntry = async (entryId: string) => { if (!confirm("Vill du radera denna verifikation? Åtgärden kan inte ångras.")) return;
    setApprovingId(entryId);
    try { await supabase.from('journal_entry_lines').delete().eq('journal_entry_id', entryId);
      const { error } = await supabase.from('journal_entries').delete().eq('id', entryId);
      if (error) throw error;
      toast.success('Verifikation raderad');
      loadPendingEntries();
    } catch (error: any) { toast.error('Kunde inte radera: ' + error.message);
    } finally { setApprovingId(null);
    }
  };

  const isNonReceipt = (entry: PendingJournalEntry): boolean => { const desc = (entry.description || '').toLowerCase();
    return desc.includes('ej ett kvitto') || desc.includes('inte ett kvitto') || desc.includes('okänt dokument') || (entry.ai_confidence !== null && entry.ai_confidence < 0.3);
  };

  const loadCompanies = async () => { try { const { data, error } = await supabase.from("companies").select("id, name").order("name");
      if (error) throw error;
      setCompanies(data || []);
      if (data?.length) setSelectedCompany(pickDefaultCompanyId(data));
    } catch (error: any) { toast.error(error.message || "Kunde inte ladda företag");
    }
  };

  const cleanupDuplicates = async () => { if (!selectedCompany) return;
    setIsCleaningUp(true);
    try { const { data, error } = await supabase.functions.invoke("cleanup-duplicates", { body: { companyId: selectedCompany } });
      if (error) throw error;
      toast.success(`Städning klar! Tog bort ${data.deletedEntriesWithoutLines} trasiga och ${data.deletedDuplicates} dubbletter.`);
      loadPendingEntries();
    } catch (error: any) { toast.error(error.message || "Kunde inte städa upp");
    } finally { setIsCleaningUp(false);
    }
  };

  const handleFileUpload = async (files: File[]) => { if (!files?.length || !selectedCompany) { if (!selectedCompany) toast.error("Välj ett företag först");
      return;
    }
    setIsUploading(true);
    for (let i = 0; i < files.length; i++) { const file = files[i];
      const docId = `temp-${Date.now()}-${i}`;
      setProcessingDocs(prev => [...prev, { id: docId, fileName: file.name, status: "uploading" }]);
      try { const fileExt = file.name.split(".").pop()?.toLowerCase();
        const fileName = `${Date.now()}-${i}.${fileExt}`;
        const filePath = `${selectedCompany}/${fileName}`;
        const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, file);
        if (uploadError) throw uploadError;
        // Resolve MIME type from extension if file.type is empty (mobile cameras)
        const mimeMap: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", pdf: "application/pdf", heic: "image/heic" };
        const resolvedMime = file.type || mimeMap[fileExt || ""] || "application/octet-stream";
        const { data: document, error: docError } = await supabase
          .from("documents")
          .insert({ company_id: selectedCompany, document_type: "receipt", file_url: filePath, file_name: file.name, file_size: file.size, mime_type: resolvedMime, uploaded_by: user!.id })
          .select().maybeSingle();
        if (docError) throw docError;
        if (!document) throw new Error('Failed to create document');
        setProcessingDocs(prev => prev.map(d => d.id === docId ? { ...d, id: document.id, status: "processing" } : d));
        const { data: aiResult, error: aiError } = await supabase.functions.invoke("ai-process-document", { body: { documentId: document.id, companyId: selectedCompany } });
        if (aiError) throw new Error(aiError.message || "AI processing failed");
        setProcessingDocs(prev => prev.map(d => d.id === document.id ? { ...d, status: "completed", result: aiResult } : d));
        if (aiResult?.noBooking) {
          toast.info(`${file.name}: ${aiResult.message || "Sparat som underlag"}`);
        } else {
          toast.success(`${file.name} bokförd ✓`);
        }
      } catch (error: any) { setProcessingDocs(prev => prev.map(d => d.id === docId ? { ...d, status: "error", error: error.message } : d));
        toast.error(`Fel: ${file.name}: ${error.message}`);
      }
    }
    setIsUploading(false);
    loadPendingEntries();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return null;

  return (
    <div>
      <main className="container mx-auto px-4 py-6 space-y-6 max-w-6xl">
        <AccountingSubNav />

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
              <Receipt className="h-6 w-6 text-primary" />
              Registrera verifikation
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Bokför via AI eller registrera manuellt
            </p>
          </div>
          <div className="flex items-center gap-2">
            {companies.length > 1 && (
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Välj företag" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Button variant="outline" size="sm" onClick={cleanupDuplicates} disabled={isCleaningUp || !selectedCompany}>
              {isCleaningUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {selectedCompany && (
          <Tabs defaultValue="ai" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="ai" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                AI-Bokföring
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <PenLine className="h-4 w-4" />
                Manuell verifikation
              </TabsTrigger>
            </TabsList>

            {/* AI-Bokföring tab */}
            <TabsContent value="ai" className="space-y-6 mt-0">
              {/* Quick stats — neutral KPI cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] p-[14px]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">Väntande</span>
                    <Clock className="w-3.5 h-3.5 text-[#94A3B8]" />
                  </div>
                  <p className={`text-[20px] font-medium tabular-nums ${pendingEntries.length > 0 ? "text-[#7A5417]" : "text-[#0F172A]"}`}>{pendingEntries.length}</p>
                </div>
                <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] p-[14px]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">Fakturor</span>
                    <FileCheck className="w-3.5 h-3.5 text-[#94A3B8]" />
                  </div>
                  <p className="text-[20px] font-medium tabular-nums text-[#0F172A]">
                    {pendingEntries.filter(e => e.document?.document_category === 'supplier_invoice').length}
                  </p>
                </div>
                <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] p-[14px]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">Kvitton</span>
                    <Receipt className="w-3.5 h-3.5 text-[#94A3B8]" />
                  </div>
                  <p className="text-[20px] font-medium tabular-nums text-[#0F172A]">
                    {pendingEntries.filter(e => e.document?.document_category !== 'supplier_invoice').length}
                  </p>
                </div>
                <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] p-[14px]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8]">Bearbetade</span>
                    <CheckCircle className="w-3.5 h-3.5 text-[#94A3B8]" />
                  </div>
                  <p className="text-[20px] font-medium tabular-nums text-[#0F172A]">
                    {processingDocs.filter(d => d.status === "completed").length}
                  </p>
                </div>
              </div>

              {/* Upload section */}
              <SimplifiedUpload companyId={selectedCompany} onUploadComplete={handleFileUpload} />

              {/* Pending approvals */}
              {pendingEntries.length > 0 && (
                <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] overflow-hidden">
                  <div className="flex items-center justify-between px-[14px] py-[12px] border-b border-[#E2E8F0]">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-[#64748B]" />
                      <h3 className="text-[13px] font-medium text-[#0F172A]">Väntar på godkännande</h3>
                    </div>
                    <span className="inline-flex items-center rounded-full text-[10px] font-medium uppercase tracking-[0.07em] px-[8px] py-px border-[0.5px] bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]">
                      {pendingEntries.length} st
                    </span>
                  </div>
                  <div className="p-[10px] space-y-[6px]">
                    {pendingEntries.map((entry) => { const totalDebit = entry.lines.reduce((sum, l) => sum + (l.debit || 0), 0);
                      const totalCredit = entry.lines.reduce((sum, l) => sum + (l.credit || 0), 0);
                      const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
                      const hasMinLines = entry.lines.length >= 2;
                      const category = entry.document?.document_category;
                      const isInvoice = category === 'supplier_invoice';
                      const requiresPayment = isInvoice && entry.payment_status !== 'payment_completed';

                      return (
                        <div key={entry.id} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-[12px] rounded-[8px] border-[0.5px] bg-white hover:bg-[#F8FAFC] transition-colors ${!isBalanced || !hasMinLines ? 'border-[#F4C8C8]' : 'border-[#E2E8F0]'}`}>
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className={`p-1.5 rounded-[6px] ${!isBalanced ? 'bg-[#FCE8E8]' : isInvoice ? 'bg-[#EFF6FF]' : 'bg-[#E1F5EE]'}`}>
                              {!isBalanced ? <AlertCircle className="h-4 w-4 text-[#B43A3A]" /> : isInvoice ? <FileCheck className="h-4 w-4 text-[#1E3A5F]" /> : <Receipt className="h-4 w-4 text-[#1D9E75]" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[12px] font-medium text-[#0F172A] truncate">{entry.supplier_name || entry.description || 'Utan beskrivning'}</p>
                              <div className="flex items-center gap-1.5 text-[11px] text-[#64748B] mt-0.5">
                                <span>{new Date(entry.entry_date).toLocaleDateString('sv-SE')}</span>
                                {entry.ai_confidence && (
                                  <span className={`inline-flex items-center rounded-full text-[10px] font-medium uppercase tracking-[0.07em] px-[6px] py-px border-[0.5px] ${entry.ai_confidence > 0.8 ? 'bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]' : 'bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7]'}`}>
                                    AI {(entry.ai_confidence * 100).toFixed(0)}%
                                  </span>
                                )}
                                {!isBalanced && (
                                  <span className="inline-flex items-center rounded-full text-[10px] font-medium uppercase tracking-[0.07em] px-[6px] py-px border-[0.5px] bg-[#FCE8E8] text-[#7A1F1E] border-[#F4C8C8]">
                                    Obalans {Math.abs(totalDebit - totalCredit).toFixed(2)}
                                  </span>
                                )}
                                {!hasMinLines && (
                                  <span className="inline-flex items-center rounded-full text-[10px] font-medium uppercase tracking-[0.07em] px-[6px] py-px border-[0.5px] bg-[#FCE8E8] text-[#7A1F1E] border-[#F4C8C8]">
                                    &lt;2 rader
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 justify-between sm:justify-end">
                            <span className="font-mono font-medium text-[13px] text-[#0F172A] tabular-nums">{totalDebit.toLocaleString('sv-SE')} kr</span>
                            <div className="flex items-center gap-1">
                              <EntryDetailDialog entry={entry} onApprove={runGuardAndApprove} onDelete={deleteEntry} approvingId={approvingId} loadPendingEntries={loadPendingEntries} />
                              {requiresPayment ? (
                                <div className="flex gap-1">
                                  <Button size="sm" variant="outline" onClick={() => runGuardAndApprove(entry.id, false)} disabled={approvingId === entry.id} className="h-[28px] rounded-[6px] text-[11px] px-2 border-[#E2E8F0]">
                                    <CheckCircle className="h-3 w-3" />
                                  </Button>
                                  <Button size="sm" onClick={() => runGuardAndApprove(entry.id, true)} disabled={approvingId === entry.id || !entry.supplier_iban} className="h-[28px] rounded-[6px] text-[11px] px-2 bg-[#0F1F3D] hover:bg-[#15294D] text-white">
                                    {approvingId === entry.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><CreditCard className="h-3 w-3 mr-1" />Betala</>}
                                  </Button>
                                </div>
                              ) : isNonReceipt(entry) ? (
                                <Button size="sm" onClick={() => deleteEntry(entry.id)} disabled={approvingId === entry.id} className="h-[28px] rounded-[6px] text-[11px] px-2 bg-white text-[#7A1F1E] border-[0.5px] border-[#F4C8C8] hover:bg-[#FCE8E8]">
                                  {approvingId === entry.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Trash2 className="h-3 w-3 mr-1" />Radera</>}
                                </Button>
                              ) : (
                                <Button size="sm" onClick={() => runGuardAndApprove(entry.id, false)} disabled={approvingId === entry.id} className="h-[28px] rounded-[6px] text-[11px] px-2 bg-[#0F1F3D] hover:bg-[#15294D] text-white">
                                  {approvingId === entry.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><CheckCircle className="h-3 w-3 mr-1" />Godkänn</>}
                                </Button>
                              )}
                            </div>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Processing results */}
              {processingDocs.length > 0 && (
                <div className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] overflow-hidden">
                  <div className="px-[14px] py-[12px] border-b border-[#E2E8F0]">
                    <h3 className="text-[13px] font-medium text-[#0F172A]">Bearbetade dokument</h3>
                  </div>
                  <div className="p-[10px] space-y-[6px]">
                    {processingDocs.map((doc) => (
                      <div key={doc.id} className="flex items-center gap-3 p-[12px] rounded-[8px] border-[0.5px] border-[#E2E8F0]">
                        {doc.status === "completed" ? <CheckCircle className="w-4 h-4 text-[#1D9E75] shrink-0" /> :
                         doc.status === "error" ? <AlertCircle className="w-4 h-4 text-[#B43A3A] shrink-0" /> :
                         <Loader2 className="w-4 h-4 animate-spin text-[#1E3A5F] shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium text-[#0F172A] truncate">{doc.fileName}</p>
                          {doc.error && <p className="text-[11px] text-[#B43A3A]">{doc.error}</p>}
                          {doc.result?.aiAnalysis && (
                            <p className="text-[11px] text-[#64748B]">
                              {doc.result.aiAnalysis.supplier} · {doc.result.aiAnalysis.totalAmount} kr · Konto {doc.result.aiAnalysis.suggestedAccount}
                            </p>
                          )}
                        </div>
                        <span className={`inline-flex items-center rounded-full text-[10px] font-medium uppercase tracking-[0.07em] px-[8px] py-px border-[0.5px] ${
                          doc.status === "completed" ? "bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]" :
                          doc.status === "error" ? "bg-[#FCE8E8] text-[#7A1F1E] border-[#F4C8C8]" :
                          "bg-[#EFF6FF] text-[#1E3A5F] border-[#C8DDF5]"
                        }`}>
                          {doc.status === "completed" ? "Klar" : doc.status === "error" ? "Fel" : doc.status === "processing" ? "AI analyserar" : "Laddar upp"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Manuell verifikation tab */}
            <TabsContent value="manual" className="mt-0">
              <ManualJournalEntry companyId={selectedCompany} />
            </TabsContent>
          </Tabs>
        )}

        <FinancialGuardDialog
          open={guardOpen}
          onOpenChange={setGuardOpen}
          result={guardResult}
          title="Säkerhetskontroll — Verifikation"
          onConfirm={confirmApprove}
          confirmLabel="Godkänn bokföring"
        />
      </main>
    </div>
  );
};

export default Accounting;
