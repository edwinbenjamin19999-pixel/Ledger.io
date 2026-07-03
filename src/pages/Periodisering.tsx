import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Search, Eye, RotateCcw, Sparkles, CalendarIcon, CheckCircle2, CalendarRange, BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { format, addMonths } from "date-fns";
import { sv } from "date-fns/locale";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useAccrualTimeline } from "@/hooks/usePeriodicAccruals";
import { Skeleton } from "@/components/ui/skeleton";
import { useChartTheme } from "@/hooks/useChartTheme";

const fmt = (n: number) => n.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type EntryType = "periodisering" | "avsattning" | "manuell";
type VatOption = "none" | "25out" | "25in" | "12" | "6";

interface ConteringLine { accountNumber: string;
  accountName: string;
  description: string;
  debit: number;
  credit: number;
  costCenter: string;
}

interface RecentEntry { id: string;
  journal_number: string;
  entry_date: string;
  description: string;
  total_debit: number;
  entry_type?: string;
  linked_entry_id?: string;
}

const Periodisering = () => {
  const chartTheme = useChartTheme(); const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [entryDate, setEntryDate] = useState<Date>(new Date());
  const [description, setDescription] = useState("");
  const [entryType, setEntryType] = useState<EntryType>("manuell");
  const [reversalDate, setReversalDate] = useState<Date>(addMonths(new Date(), 1));
  const [autoReverse, setAutoReverse] = useState<"next" | "specific" | "no">("next");
  const [vatOption, setVatOption] = useState<VatOption>("none");
  const [amountMode, setAmountMode] = useState<"netto" | "brutto">("netto");
  const [lines, setLines] = useState<ConteringLine[]>([
    { accountNumber: "", accountName: "", description: "", debit: 0, credit: 0, costCenter: "" },
    { accountNumber: "", accountName: "", description: "", debit: 0, credit: 0, costCenter: "" },
  ]);

  // AI suggestion
  const [showAISuggestion, setShowAISuggestion] = useState(false);
  const [aiText, setAiText] = useState("");

  // Right column
  const [recentEntries, setRecentEntries] = useState<RecentEntry[]>([]);
  const [entrySearch, setEntrySearch] = useState("");
  const [entryFilter, setEntryFilter] = useState("alla");
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [selectedEntryLines, setSelectedEntryLines] = useState<any[]>([]);

  // Reversal modal
  const [showReversal, setShowReversal] = useState(false);
  const [reversalTarget, setReversalTarget] = useState<any>(null);
  const [reversalTargetDate, setReversalTargetDate] = useState<Date>(new Date());

  const [saving, setSaving] = useState(false);

  // Timeline data
  const { data: timelineData, isLoading: timelineLoading } = useAccrualTimeline(selectedCompany || null);

  useEffect(() => { if (!authLoading && !user) navigate("/auth"); }, [user, authLoading, navigate]);
  useEffect(() => { if (user) loadCompanies(); }, [user]);
  useEffect(() => { if (selectedCompany) { loadAccounts(); loadRecent(); } }, [selectedCompany]);

  // AI pattern detection
  useEffect(() => { const patterns = ["förutbetald", "periodisering", "förskott", "hyra", "försäkring", "abonnemang"];
    const lower = description.toLowerCase();
    const match = patterns.some(p => lower.includes(p));
    if (match && description.length > 5 && entryType === "manuell") { setShowAISuggestion(true);
      setAiText(`Det här verkar vara en förutbetald kostnad. Föreslår periodisering med återföring ${format(addMonths(new Date(), 1), "d MMMM", { locale: sv })}.`);
    } else { setShowAISuggestion(false);
    }
  }, [description, entryType]);

  const loadCompanies = async () => { const { data } = await supabase.from("companies").select("id, name").order("name");
    if (data?.length) { setCompanies(data); setSelectedCompany(data[0].id); }
    setIsLoading(false);
  };

  const loadAccounts = async () => { const { data } = await supabase.from("chart_of_accounts").select("*").eq("company_id", selectedCompany).eq("is_active", true).order("account_number");
    setAccounts(data || []);
  };

  const loadRecent = async () => { const { data } = await supabase
      .from("journal_entries")
      .select("id, journal_number, entry_date, description, journal_entry_lines(debit)")
      .eq("company_id", selectedCompany)
      .order("created_at", { ascending: false })
      .limit(30);
    setRecentEntries((data || []).map(e => ({ id: e.id,
      journal_number: e.journal_number || "",
      entry_date: e.entry_date,
      description: e.description || "",
      total_debit: (e.journal_entry_lines || []).reduce((s: number, l: any) => s + (l.debit || 0), 0),
    })));
  };

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const addLine = () => setLines(prev => [...prev, { accountNumber: "", accountName: "", description: "", debit: 0, credit: 0, costCenter: "" }]);
  const removeLine = (idx: number) => setLines(prev => prev.filter((_, i) => i !== idx));

  const updateLine = (idx: number, field: keyof ConteringLine, value: string | number) => { setLines(prev => prev.map((l, i) => { if (i !== idx) return l;
      const updated = { ...l, [field]: value };
      if (field === "accountNumber") { const match = accounts.find(a => a.account_number === value);
        if (match) updated.accountName = match.account_name;
      }
      return updated;
    }));
  };

  const acceptAI = () => { setEntryType("periodisering");
    setAutoReverse("next");
    setShowAISuggestion(false);
    toast.success("AI-förslag godkänt");
  };

  const handleSave = async () => { if (!isBalanced) { toast.error("Verifikationen är inte balanserad"); return; }
    if (!description.trim()) { toast.error("Ange beskrivning"); return; }
    if (lines.some(l => !l.accountNumber)) { toast.error("Alla rader måste ha ett konto"); return; }

    setSaving(true);
    try { // Create journal entry
      const { data: entry, error: entryErr } = await supabase
        .from("journal_entries")
        .insert({ company_id: selectedCompany,
          entry_date: format(entryDate, "yyyy-MM-dd"),
          description: `${entryType !== "manuell" ? `[${entryType === "periodisering" ? "Periodisering" : "Avsättning"}] ` : ""}${description}`,
          status: "approved",
          created_by: user!.id,
        })
        .select()
        .maybeSingle();
      if (entryErr) throw entryErr;

      // Create lines
      const lineInserts = lines.filter(l => l.debit > 0 || l.credit > 0).map(l => { const acct = accounts.find(a => a.account_number === l.accountNumber);
        return { journal_entry_id: entry.id,
          account_id: acct?.id || "",
          debit: l.debit,
          credit: l.credit,
          description: l.description || null,
        };
      });
      const { error: lineErr } = await supabase.from("journal_entry_lines").insert(lineInserts);
      if (lineErr) throw lineErr;

      toast.success(`Verifikation ${entry.journal_number || entry.id.slice(0, 8)} skapad!`);

      // Reset form
      setDescription("");
      setEntryType("manuell");
      setLines([
        { accountNumber: "", accountName: "", description: "", debit: 0, credit: 0, costCenter: "" },
        { accountNumber: "", accountName: "", description: "", debit: 0, credit: 0, costCenter: "" },
      ]);
      loadRecent();
    } catch (err: any) { toast.error(err.message || "Kunde inte spara");
    } finally { setSaving(false);
    }
  };

  const openEntryDetail = async (entry: RecentEntry) => { const { data } = await supabase
      .from("journal_entry_lines")
      .select("*, chart_of_accounts(account_number, account_name)")
      .eq("journal_entry_id", entry.id);
    setSelectedEntry(entry);
    setSelectedEntryLines(data || []);
  };

  const handleReversal = async () => { if (!reversalTarget) return;
    setSaving(true);
    try { // Create reversed entry
      const { data: entry, error } = await supabase
        .from("journal_entries")
        .insert({ company_id: selectedCompany,
          entry_date: format(reversalTargetDate, "yyyy-MM-dd"),
          description: `Återföring av ${reversalTarget.description}`,
          status: "approved",
          created_by: user!.id,
        })
        .select()
        .maybeSingle();
      if (error) throw error;

      // Get original lines and reverse
      const { data: origLines } = await supabase
        .from("journal_entry_lines")
        .select("*")
        .eq("journal_entry_id", reversalTarget.id);

      const reversed = (origLines || []).map(l => ({ journal_entry_id: entry.id,
        account_id: l.account_id,
        debit: l.credit,
        credit: l.debit,
        description: `Återföring`,
      }));
      await supabase.from("journal_entry_lines").insert(reversed);

      toast.success("Återföring skapad!");
      setShowReversal(false);
      setReversalTarget(null);
      loadRecent();
    } catch (err: any) { toast.error(err.message || "Kunde inte skapa återföring");
    } finally { setSaving(false);
    }
  };

  const filteredRecent = useMemo(() => { let list = recentEntries;
    if (entrySearch.trim()) { const q = entrySearch.toLowerCase();
      list = list.filter(e => e.journal_number.toLowerCase().includes(q) || e.description.toLowerCase().includes(q));
    }
    if (entryFilter === "periodiseringar") list = list.filter(e => e.description.includes("[Periodisering]"));
    if (entryFilter === "avsattningar") list = list.filter(e => e.description.includes("[Avsättning]"));
    if (entryFilter === "aterforing") list = list.filter(e => e.description.includes("Återföring"));
    return list;
  }, [recentEntries, entrySearch, entryFilter]);


  if (authLoading || isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return null;

  const accountSuggestions = (query: string) => { if (!query) return accounts.slice(0, 10);
    return accounts.filter(a => a.account_number.startsWith(query) || a.account_name.toLowerCase().includes(query.toLowerCase())).slice(0, 10);
  };

  return (
    <div>
      <PageHeader
        icon={CalendarRange}
        title="Verifikationer & Periodisering"
        subtitle="Skapa verifikationer med AI-assistans och periodisering"
        actions={ companies.length > 1 ? (
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger className="w-48 h-[34px] rounded-[8px] border-[0.5px] border-[#E2E8F0] bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          ) : undefined
        }
      />
      <div className="px-8">

      <div className="flex gap-5">
        {/* Left: Form */}
        <div className="flex-1 space-y-4">
          {/* Header card */}
          <Card className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] shadow-none">
            <CardContent className="pt-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Datum</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(entryDate, "d MMM yyyy", { locale: sv })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={entryDate} onSelect={d => d && setEntryDate(d)} /></PopoverContent>
                  </Popover>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Beskrivning</label>
                  <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="T.ex. Förutbetald hyra Q2" />
                </div>
              </div>

              {/* Type pills */}
              <div className="flex gap-2">
                {([
                  { key: "periodisering" as EntryType, label: "Periodisering" },
                  { key: "avsattning" as EntryType, label: "Avsättning" },
                  { key: "manuell" as EntryType, label: "Manuell" },
                ]).map(t => (
                  <button
                    key={t.key}
                    onClick={() => setEntryType(t.key)}
                    className={`h-[28px] px-3 rounded-[8px] text-sm font-medium border-[0.5px] transition-colors ${
                      entryType === t.key
                        ? "bg-[#0F1F3D] text-white border-[#0F1F3D]"
                        : "bg-white text-[#475569] border-[#E2E8F0] hover:border-[#0F1F3D]/30"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Reversal fields */}
              {(entryType === "periodisering" || entryType === "avsattning") && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-[10px] bg-[#F8FAFC] border-[0.5px] border-[#E2E8F0]">
                  <div>
                    <label className="text-xs font-medium mb-1 block">Återföringsdatum</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                          {format(reversalDate, "d MMM yyyy", { locale: sv })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={reversalDate} onSelect={d => d && setReversalDate(d)} /></PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Återförs automatiskt</label>
                    <Select value={autoReverse} onValueChange={v => setAutoReverse(v as "next" | "no" | "specific")}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="next">Ja – nästa period</SelectItem>
                        <SelectItem value="specific">Ja – specifikt datum</SelectItem>
                        <SelectItem value="no">Nej</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Banner */}
          {showAISuggestion && (
            <div className="p-4 rounded-[12px] border-[0.5px] border-[#C8DDF5] bg-[#EFF6FF] flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#0F1F3D] flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-[#1E3A5F]">{aiText}</p>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={acceptAI} className="h-[28px] rounded-[8px] bg-[#0F1F3D] hover:bg-[#0F1F3D]/90 text-white">Godkänn förslag</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowAISuggestion(false)} className="h-[28px] rounded-[8px] border-[0.5px] border-[#E2E8F0]">Avfärda</Button>
                </div>
              </div>
            </div>
          )}

          {/* Contering lines */}
          <Card className="bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Konteringsrader</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Konto</TableHead>
                    <TableHead>Kontonamn</TableHead>
                    <TableHead className="w-32 text-right">Debet (kr)</TableHead>
                    <TableHead className="w-32 text-right">Kredit (kr)</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Input
                          value={line.accountNumber}
                          onChange={e => updateLine(idx, "accountNumber", e.target.value)}
                          placeholder="1790"
                          className="h-8 text-sm font-mono"
                          list={`acct-${idx}`}
                        />
                        <datalist id={`acct-${idx}`}>
                          {accountSuggestions(line.accountNumber).map(a => (
                            <option key={a.id} value={a.account_number}>{a.account_number} - {a.account_name}</option>
                          ))}
                        </datalist>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{line.accountName || "—"}</TableCell>
                      <TableCell>
                        <Input type="number" value={line.debit || ""} onChange={e => updateLine(idx, "debit", Number(e.target.value))} className="h-8 text-sm text-right" placeholder="0,00" />
                      </TableCell>
                      <TableCell>
                        <Input type="number" value={line.credit || ""} onChange={e => updateLine(idx, "credit", Number(e.target.value))} className="h-8 text-sm text-right" placeholder="0,00" />
                      </TableCell>
                      <TableCell>
                        {lines.length > 2 && (
                          <Button variant="ghost" size="sm" onClick={() => removeLine(idx)}><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between mt-3">
                <Button variant="outline" size="sm" onClick={addLine} className="h-[28px] rounded-[8px] border-[0.5px] border-[#E2E8F0]"><Plus className="h-3.5 w-3.5 mr-1" /> Lägg till rad</Button>
                <div className={`inline-flex items-center gap-1.5 rounded-full border-[0.5px] px-2.5 h-[22px] text-[11px] font-medium ${
                  isBalanced ? "bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]" : "bg-[#FCE8E8] text-[#7A1A1A] border-[#F4C8C8]"
                }`}>
                  {isBalanced ? (
                    <><CheckCircle2 className="h-3 w-3" /> Balanserat</>
                  ) : (
                    <span className="font-mono">Differens: {fmt(Math.abs(totalDebit - totalCredit))} kr</span>
                  )}
                </div>
              </div>

              {/* VAT / amount mode */}
              <div className="flex gap-4 mt-4 pt-3 border-t">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Moms</label>
                  <Select value={vatOption} onValueChange={v => setVatOption(v as VatOption)}>
                    <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ingen moms</SelectItem>
                      <SelectItem value="25out">25% utgående</SelectItem>
                      <SelectItem value="25in">25% ingående</SelectItem>
                      <SelectItem value="12">12%</SelectItem>
                      <SelectItem value="6">6%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Belopp</label>
                  <Select value={amountMode} onValueChange={v => setAmountMode(v as "netto" | "brutto")}>
                    <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="netto">Netto (exkl. moms)</SelectItem>
                      <SelectItem value="brutto">Brutto (inkl. moms)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Save button */}
              <div className="flex justify-end mt-4">
                <Button onClick={handleSave} disabled={saving || !isBalanced} className="h-[34px] rounded-[8px] bg-[#0F1F3D] hover:bg-[#0F1F3D]/90 text-white">
                  {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sparar...</> : "Spara verifikation"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Recent entries */}
        <div className="w-72 shrink-0 space-y-3 hidden lg:block">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={entrySearch} onChange={e => setEntrySearch(e.target.value)} placeholder="Sök ver..." className="pl-8 h-8 text-sm" />
          </div>
          <Tabs value={entryFilter} onValueChange={setEntryFilter}>
            <TabsList className="w-full grid grid-cols-4 h-7 bg-[#F1F5F9] p-0.5 rounded-[8px]">
              <TabsTrigger value="alla" className="text-xs rounded-[6px] data-[state=active]:bg-[#0F1F3D] data-[state=active]:text-white data-[state=active]:shadow-none">Alla</TabsTrigger>
              <TabsTrigger value="periodiseringar" className="text-xs rounded-[6px] data-[state=active]:bg-[#0F1F3D] data-[state=active]:text-white data-[state=active]:shadow-none">Per.</TabsTrigger>
              <TabsTrigger value="avsattningar" className="text-xs rounded-[6px] data-[state=active]:bg-[#0F1F3D] data-[state=active]:text-white data-[state=active]:shadow-none">Avs.</TabsTrigger>
              <TabsTrigger value="aterforing" className="text-xs rounded-[6px] data-[state=active]:bg-[#0F1F3D] data-[state=active]:text-white data-[state=active]:shadow-none">Åter.</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="space-y-1.5 max-h-[calc(100vh-250px)] overflow-y-auto">
            {filteredRecent.map(e => (
              <div
                key={e.id}
                onClick={() => openEntryDetail(e)}
                className="p-2.5 rounded-[10px] bg-white border-[0.5px] border-[#E2E8F0] hover:border-[#0F1F3D]/30 cursor-pointer transition-colors text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[#475569]">{e.journal_number || e.id.slice(0, 8)}</span>
                  <span className="font-mono text-xs text-[#0F1F3D] font-semibold">{fmt(e.total_debit)}</span>
                </div>
                <p className="text-xs text-[#64748B] truncate mt-0.5">{e.description}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[10px] text-[#94A3B8]">{e.entry_date}</span>
                  {e.description.includes("[Periodisering]") && <span className="inline-flex items-center rounded-full border-[0.5px] px-1.5 h-[16px] text-[10px] bg-[#EFF6FF] text-[#1E3A5F] border-[#C8DDF5]">Per.</span>}
                  {e.description.includes("[Avsättning]") && <span className="inline-flex items-center rounded-full border-[0.5px] px-1.5 h-[16px] text-[10px] bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7]">Avs.</span>}
                  {e.description.includes("Återföring") && <span className="inline-flex items-center rounded-full border-[0.5px] px-1.5 h-[16px] text-[10px] bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]">Åter.</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline chart */}
      <Card className="mt-6 bg-white border-[0.5px] border-[#E2E8F0] rounded-[12px] shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Periodiseringar per månad
          </CardTitle>
        </CardHeader>
        <CardContent>
          {timelineLoading ? (
            <Skeleton className="h-[250px] w-full" />
          ) : !timelineData?.hasData ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              <CalendarRange className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Inga periodiseringar bokförda ännu.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={timelineData.timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridColor} vertical={false} className="stroke-border" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} className="text-muted-foreground" />
                <Tooltip
                  formatter={(value: number) => new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', minimumFractionDigits: 0 }).format(value)}
                  labelClassName="text-foreground"
                  contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend />
                <Area type="monotone" dataKey="periodiseringar" name="Periodiseringar" stackId="1" fill="hsl(var(--primary))" stroke="hsl(var(--primary))" fillOpacity={0.3} />
                <Area type="monotone" dataKey="aterforing" name="Återföringar" stackId="2" fill="hsl(var(--destructive))" stroke="hsl(var(--destructive))" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>


      <Sheet open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Verifikat {selectedEntry?.journal_number || selectedEntry?.id.slice(0, 8)}</SheetTitle>
          </SheetHeader>
          {selectedEntry && (
            <div className="space-y-4 mt-4">
              <div className="text-sm space-y-1">
                <p><span className="text-muted-foreground">Datum:</span> {selectedEntry.entry_date}</p>
                <p><span className="text-muted-foreground">Beskrivning:</span> {selectedEntry.description}</p>
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
                  {selectedEntryLines.map((l: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-sm">
                        {l.chart_of_accounts?.account_number} {l.chart_of_accounts?.account_name}
                      </TableCell>
                      <TableCell className="text-right font-mono">{l.debit > 0 ? fmt(l.debit) : ""}</TableCell>
                      <TableCell className="text-right font-mono">{l.credit > 0 ? fmt(l.credit) : ""}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold border-t-2">
                    <TableCell>Summa</TableCell>
                    <TableCell className="text-right font-mono">{fmt(selectedEntryLines.reduce((s: number, l: any) => s + (l.debit || 0), 0))}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(selectedEntryLines.reduce((s: number, l: any) => s + (l.credit || 0), 0))}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setReversalTarget(selectedEntry); setShowReversal(true); setSelectedEntry(null); }}>
                  <RotateCcw className="w-4 h-4 mr-1" />Återför
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Reversal dialog */}
      <Dialog open={showReversal} onOpenChange={setShowReversal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Återför verifikation</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">Skapar en spegelvänd verifikation av <strong>{reversalTarget?.journal_number || reversalTarget?.id?.slice(0, 8)}</strong></p>
            <p className="text-sm text-muted-foreground">Beskrivning: Återföring av {reversalTarget?.description}</p>
            <div>
              <label className="text-sm font-medium mb-1 block">Återföringsdatum</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(reversalTargetDate, "d MMM yyyy", { locale: sv })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={reversalTargetDate} onSelect={d => d && setReversalTargetDate(d)} /></PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReversal(false)}>Avbryt</Button>
            <Button onClick={handleReversal} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Bekräfta och bokför
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      </div>
    </div>
  );
};

export default Periodisering;
