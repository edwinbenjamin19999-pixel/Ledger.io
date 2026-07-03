import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle, XCircle, Eye, FileWarning,
  ArrowLeft, BarChart3, FileText, Clock, Pencil, Save, Trash2, Plus
} from "lucide-react";

interface FlaggedTransaction { id: string;
  company_id: string;
  journal_entry_id: string | null;
  flag_type: string;
  severity: string;
  description: string;
  is_reviewed: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  journal_number?: string;
  entry_date?: string;
}

interface EntryLine { id?: string;
  account_id: string;
  account_number: string;
  account_name: string;
  debit: number;
  credit: number;
}

interface JournalEntry { id: string;
  description: string | null;
  entry_date: string;
  status: string;
  created_at: string;
  lines: EntryLine[];
}

interface CompanyDetail { id: string;
  name: string;
  org_number: string;
  subscription_tier: string | null;
  subscription_status: string | null;
  industry: string | null;
  created_at: string;
}

interface AccountOption { id: string;
  account_number: string;
  account_name: string;
}

const severityConfig: Record<string, { color: string; label: string }> = { critical: { color: "bg-destructive text-destructive-foreground", label: "Kritisk" },
  high: { color: "bg-[#FCE8E8] text-[#7A1A1A] dark:bg-red-900 dark:text-red-200", label: "Hög" },
  medium: { color: "bg-[#FAEEDA] text-[#7A5417] dark:bg-yellow-900 dark:text-yellow-200", label: "Medium" },
  low: { color: "bg-[#EFF6FF] text-blue-800 dark:bg-blue-900 dark:text-blue-200", label: "Låg" },
};

const flagTypeLabels: Record<string, string> = { imbalanced: "Obalanserad",
  unusual_amount: "Ovanligt belopp",
  round_number: "Jämnt belopp",
  missing_document: "Saknar underlag",
  duplicate_suspect: "Möjlig dubblett",
};

interface AdminCompanyDetailProps { companyId: string;
  onBack: () => void;
}

export const AdminCompanyDetail = ({ companyId, onBack }: AdminCompanyDetailProps) => { const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [flags, setFlags] = useState<FlaggedTransaction[]>([]);
  const [recentEntries, setRecentEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewDialog, setReviewDialog] = useState<FlaggedTransaction | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [entryDetail, setEntryDetail] = useState<JournalEntry | null>(null);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);

  // Editing state
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [editLines, setEditLines] = useState<EntryLine[]>([]);
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadAll();
  }, [companyId]);

  const loadAll = async () => { setLoading(true);
    try { const [compRes, flagRes, entriesRes, accountsRes] = await Promise.all([
        supabase.from("companies")
          .select("id, name, org_number, subscription_tier, subscription_status, industry, created_at")
          .eq("id", companyId).maybeSingle(),
        supabase.from("flagged_transactions")
          .select("*, journal_entries!flagged_transactions_journal_entry_id_fkey(journal_number, entry_date)")
          .eq("company_id", companyId)
          .eq("is_reviewed", false)
          .order("created_at", { ascending: false }).limit(50),
        supabase.from("journal_entries")
          .select("id, description, entry_date, status, created_at")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false }).limit(30),
        supabase.from("chart_of_accounts")
          .select("id, account_number, account_name")
          .eq("company_id", companyId).eq("is_active", true)
          .order("account_number"),
      ]);

      setCompany(compRes.data);
      setFlags((flagRes.data || []).map((f: any) => ({
        ...f,
        journal_number: f.journal_entries?.journal_number || null,
        entry_date: f.journal_entries?.entry_date || null,
      })));
      setAccounts(accountsRes.data || []);
      setRecentEntries((entriesRes.data || []).map(e => ({ ...e, lines: [],
      })));
    } catch (err: any) { toast.error("Kunde inte ladda data: " + err.message);
    } finally { setLoading(false);
    }
  };

  const loadEntryLines = async (entryId: string) => { const entry = recentEntries.find(e => e.id === entryId);
    if (!entry) return;

    const { data: lines } = await supabase
      .from("journal_entry_lines")
      .select("id, account_id, debit, credit, account:chart_of_accounts(account_number, account_name)")
      .eq("journal_entry_id", entryId);

    const mapped = (lines || []).map((l: any) => ({ id: l.id,
      account_id: l.account_id,
      account_number: l.account?.account_number || "",
      account_name: l.account?.account_name || "",
      debit: Number(l.debit) || 0,
      credit: Number(l.credit) || 0,
    }));

    setEntryDetail({ ...entry, lines: mapped });
  };

  const startEditing = (entry: JournalEntry) => { setEditingEntry(entry);
    setEditLines(entry.lines.map(l => ({ ...l })));
    setEditDescription(entry.description || "");
  };

  const updateLine = (index: number, field: keyof EntryLine, value: any) => { setEditLines(prev => { const updated = [...prev];
      if (field === "account_id") { const acc = accounts.find(a => a.id === value);
        updated[index] = { ...updated[index], account_id: value, account_number: acc?.account_number || "", account_name: acc?.account_name || "" };
      } else { updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  };

  const addLine = () => { setEditLines(prev => [...prev, { account_id: "", account_number: "", account_name: "", debit: 0, credit: 0 }]);
  };

  const removeLine = (index: number) => { setEditLines(prev => prev.filter((_, i) => i !== index));
  };

  const saveEntry = async () => { if (!editingEntry) return;
    const totalDebit = editLines.reduce((s, l) => s + Number(l.debit || 0), 0);
    const totalCredit = editLines.reduce((s, l) => s + Number(l.credit || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) { toast.error(`Debet (${totalDebit.toFixed(2)}) och kredit (${totalCredit.toFixed(2)}) balanserar inte!`);
      return;
    }
    if (editLines.length < 2) { toast.error("Minst 2 konteringsrader krävs");
      return;
    }
    if (editLines.some(l => !l.account_id)) { toast.error("Alla rader måste ha ett konto valt");
      return;
    }

    setSaving(true);
    try { // Update description
      await supabase.from("journal_entries")
        .update({ description: editDescription, updated_at: new Date().toISOString() })
        .eq("id", editingEntry.id);

      // Delete old lines and insert new
      await supabase.from("journal_entry_lines").delete().eq("journal_entry_id", editingEntry.id);

      const newLines = editLines.map(l => ({ journal_entry_id: editingEntry.id,
        account_id: l.account_id,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
      }));

      const { error } = await supabase.from("journal_entry_lines").insert(newLines);
      if (error) throw error;

      toast.success("Verifikation uppdaterad!");
      setEditingEntry(null);
      setEntryDetail(null);
      loadAll();
    } catch (err: any) { toast.error("Kunde inte spara: " + err.message);
    } finally { setSaving(false);
    }
  };

  const changeEntryStatus = async (entryId: string, newStatus: string) => { try { const updateData: any = { status: newStatus, updated_at: new Date().toISOString() };
      if (newStatus === "approved") { const { data: { user } } = await supabase.auth.getUser();
        updateData.approved_by = user?.id;
      }

      const { error } = await supabase.from("journal_entries").update(updateData).eq("id", entryId);
      if (error) throw error;

      toast.success(newStatus === "approved" ? "Verifikation godkänd!" : "Status ändrad till " + newStatus);
      setEntryDetail(null);
      loadAll();
    } catch (err: any) { toast.error("Fel: " + err.message);
    }
  };

  const markReviewed = async (flag: FlaggedTransaction, approved: boolean) => { setReviewing(true);
    try { const { error } = await supabase
        .from("flagged_transactions")
        .update({ is_reviewed: true,
          reviewed_at: new Date().toISOString(),
          review_notes: (approved ? "✅ Godkänd: " : "❌ Underkänd: ") + reviewNotes,
        })
        .eq("id", flag.id);

      if (error) throw error;
      toast.success(approved ? "Markerad som granskad och godkänd" : "Markerad som underkänd");
      setReviewDialog(null);
      setReviewNotes("");
      loadAll();
    } catch (err: any) { toast.error("Fel: " + err.message);
    } finally { setReviewing(false);
    }
  };

  const unreviewedCount = flags.filter(f => !f.is_reviewed).length;
  const criticalCount = flags.filter(f => !f.is_reviewed && (f.severity === "critical" || f.severity === "high")).length;

  if (loading) { return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!company) return <p className="text-muted-foreground p-4">Företaget hittades inte.</p>;

  const editTotalDebit = editLines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const editTotalCredit = editLines.reduce((s, l) => s + Number(l.credit || 0), 0);
  const editBalanced = Math.abs(editTotalDebit - editTotalCredit) <= 0.01;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Tillbaka
        </Button>
        <div>
          <h2 className="text-xl font-bold">{company.name}</h2>
          <p className="text-sm text-muted-foreground">{company.org_number} · {company.industry || "Allmän"}</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" />
            <div>
              <p className="text-xl font-bold">{recentEntries.length}</p>
              <p className="text-xs text-muted-foreground">Senaste verifikationer</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <FileWarning className="h-6 w-6 text-[#7A5417]" />
            <div>
              <p className="text-xl font-bold">{unreviewedCount}</p>
              <p className="text-xs text-muted-foreground">Ogranskade flaggor</p>
            </div>
          </CardContent>
        </Card>
        <Card className={criticalCount > 0 ? "border-destructive" : ""}>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className={`h-6 w-6 ${criticalCount > 0 ? "text-destructive" : "text-muted-foreground"}`} />
            <div>
              <p className="text-xl font-bold">{criticalCount}</p>
              <p className="text-xs text-muted-foreground">Kritiska/Höga</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-[#085041]" />
            <div>
              <p className="text-xl font-bold">{flags.filter(f => f.is_reviewed).length}</p>
              <p className="text-xs text-muted-foreground">Granskade</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Flagged Transactions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileWarning className="h-4 w-4" />
            Flaggade verifikationer ({flags.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                 <TableRow>
                  <TableHead>Verifikation</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Allvarlighet</TableHead>
                  <TableHead>Beskrivning</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flags.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Inga flaggade transaktioner — allt ser bra ut! ✅
                    </TableCell>
                  </TableRow>
                )}
                {flags.map(flag => (
                  <TableRow key={flag.id} className={!flag.is_reviewed ? "bg-yellow-50/50 dark:bg-yellow-950/10" : ""}>
                    <TableCell>
                      {flag.journal_number ? (
                        <Button variant="link" size="sm" className="h-auto p-0 text-primary font-mono text-xs" onClick={() => flag.journal_entry_id && loadEntryLines(flag.journal_entry_id)}>
                          {flag.journal_number}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                      {flag.entry_date && (
                        <p className="text-[10px] text-muted-foreground">{new Date(flag.entry_date).toLocaleDateString("sv-SE")}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{flagTypeLabels[flag.flag_type] || flag.flag_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={severityConfig[flag.severity]?.color || "bg-muted"}>
                        {severityConfig[flag.severity]?.label || flag.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate text-sm">{flag.description}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(flag.created_at).toLocaleDateString("sv-SE")}
                    </TableCell>
                    <TableCell>
                      {flag.is_reviewed ? (
                        <Badge variant="secondary" className="gap-1">
                          <CheckCircle className="h-3 w-3" /> Granskad
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1">
                          <Clock className="h-3 w-3" /> Väntar
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {flag.journal_entry_id && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => loadEntryLines(flag.journal_entry_id!)}>
                            <Eye className="h-3 w-3 mr-1" /> Visa
                          </Button>
                        )}
                        {!flag.is_reviewed && (
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setReviewDialog(flag); setReviewNotes(""); }}>
                            Granska
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Journal Entries */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Senaste verifikationer
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Beskrivning</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentEntries.map(entry => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-sm">{entry.entry_date}</TableCell>
                    <TableCell className="text-sm max-w-[250px] truncate">{entry.description}</TableCell>
                    <TableCell>
                      <Badge variant={entry.status === "approved" ? "default" : "secondary"} className="text-xs">
                        {entry.status === "approved" ? "Godkänd" : entry.status === "pending_approval" ? "Väntar" : entry.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => loadEntryLines(entry.id)}>
                        <Eye className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Entry Detail / Edit Dialog */}
      <Dialog open={!!entryDetail && !editingEntry} onOpenChange={() => setEntryDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Verifikationsdetalj</DialogTitle>
            <DialogDescription>{entryDetail?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Datum: {entryDetail?.entry_date}</span>
              <Badge variant={entryDetail?.status === "approved" ? "default" : "secondary"}>
                {entryDetail?.status === "approved" ? "Godkänd" : entryDetail?.status === "pending_approval" ? "Väntar" : entryDetail?.status}
              </Badge>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Konto</TableHead>
                  <TableHead>Namn</TableHead>
                  <TableHead className="text-right">Debet</TableHead>
                  <TableHead className="text-right">Kredit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entryDetail?.lines.map((line, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-sm">{line.account_number}</TableCell>
                    <TableCell className="text-sm">{line.account_name}</TableCell>
                    <TableCell className="text-right text-sm">{Number(line.debit) > 0 ? Number(line.debit).toLocaleString("sv-SE") : "—"}</TableCell>
                    <TableCell className="text-right text-sm">{Number(line.credit) > 0 ? Number(line.credit).toLocaleString("sv-SE") : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-between pt-2 border-t">
              <div className="flex gap-2">
                {entryDetail?.status === "pending_approval" && (
                  <>
                    <Button size="sm" onClick={() => changeEntryStatus(entryDetail.id, "approved")}>
                      <CheckCircle className="h-3.5 w-3.5 mr-1" /> Godkänn
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => changeEntryStatus(entryDetail.id, "rejected")}>
                      <XCircle className="h-3.5 w-3.5 mr-1" /> Avvisa
                    </Button>
                  </>
                )}
              </div>
              <Button size="sm" variant="outline" onClick={() => entryDetail && startEditing(entryDetail)}>
                <Pencil className="h-3.5 w-3.5 mr-1" /> Redigera
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Entry Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" /> Redigera verifikation
            </DialogTitle>
            <DialogDescription>Ändra konteringsrader, belopp eller beskrivning. Debet och kredit måste balansera.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Beskrivning</label>
              <Input value={editDescription} onChange={e => setEditDescription(e.target.value)} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Konteringsrader</label>
                <Button size="sm" variant="outline" onClick={addLine}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Ny rad
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Konto</TableHead>
                    <TableHead className="text-right">Debet</TableHead>
                    <TableHead className="text-right">Kredit</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editLines.map((line, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Select value={line.account_id} onValueChange={v => updateLine(i, "account_id", v)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Välj konto">
                              {line.account_number ? `${line.account_number} ${line.account_name}` : "Välj konto"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {accounts.map(a => (
                              <SelectItem key={a.id} value={a.id} className="text-xs">
                                {a.account_number} {a.account_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input type="number" className="h-8 text-right text-sm" value={line.debit || ""} onChange={e => updateLine(i, "debit", parseFloat(e.target.value) || 0)} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" className="h-8 text-right text-sm" value={line.credit || ""} onChange={e => updateLine(i, "credit", parseFloat(e.target.value) || 0)} />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => removeLine(i)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-semibold">
                    <TableCell>Summa</TableCell>
                    <TableCell className="text-right">{editTotalDebit.toLocaleString("sv-SE", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className={`text-right ${!editBalanced ? "text-destructive" : ""}`}>
                      {editTotalCredit.toLocaleString("sv-SE", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>

              {!editBalanced && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Differens: {Math.abs(editTotalDebit - editTotalCredit).toLocaleString("sv-SE", { minimumFractionDigits: 2 })} kr
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setEditingEntry(null)}>Avbryt</Button>
              <Button onClick={saveEntry} disabled={saving || !editBalanced}>
                <Save className="h-4 w-4 mr-1" /> {saving ? "Sparar..." : "Spara ändringar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={!!reviewDialog} onOpenChange={() => setReviewDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-[#7A5417]" />
              Granska flagga
            </DialogTitle>
            <DialogDescription>{reviewDialog?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="flex gap-2">
              <Badge className={severityConfig[reviewDialog?.severity || ""]?.color}>
                {severityConfig[reviewDialog?.severity || ""]?.label}
              </Badge>
              <Badge variant="outline">{flagTypeLabels[reviewDialog?.flag_type || ""] || reviewDialog?.flag_type}</Badge>
            </div>
            <div>
              <label className="text-sm font-medium">Anteckningar</label>
              <Textarea placeholder="Beskriv din bedömning..." value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => reviewDialog && markReviewed(reviewDialog, false)} disabled={reviewing}>
                <XCircle className="h-4 w-4 mr-1" /> Underkänn
              </Button>
              <Button onClick={() => reviewDialog && markReviewed(reviewDialog, true)} disabled={reviewing}>
                <CheckCircle className="h-4 w-4 mr-1" /> Godkänn
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
