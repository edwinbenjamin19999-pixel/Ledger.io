import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ComingSoonBadge } from "@/components/ui/ComingSoonBadge";
import { DemoSubmitButton } from "@/components/ui/DemoSubmitButton";
import { exportDeclarationPDF } from "@/lib/exportDeclarationPDF";
import { FileText, Download, Send, RefreshCw, Loader2, CheckCircle,
  AlertTriangle, Info, ChevronDown, ChevronRight, RotateCcw, Shield,
  Lock, Cloud, Calculator, Sparkles, ChevronUp, X, Check, Clock,
} from "lucide-react";
import { useAIFillEngine } from "../shared/useAIFillEngine";
import { DeclarationField, FormStatus, FieldConfidence, fmt, STATUS_LABELS } from "../shared/types";
import { cn } from "@/lib/utils";

interface INK2FormProps { companyId: string;
  taxYear: number;
}

interface Company { id: string; name: string; org_number: string; }

// ─── INK2 SECTIONS ───
interface INK2Section {
  id: string;
  letter: string;
  title: string;
  color: string;
  bgColor: string;
  fieldIndices: number[];
}

const SECTION_DEFS: Omit<INK2Section, "fieldIndices">[] = [
  { id: "a", letter: "A", title: "Intäkter", color: "bg-[#2563EB] text-white", bgColor: "border-l-[#2563EB]" },
  { id: "b", letter: "B", title: "Kostnader", color: "bg-violet-500 text-white", bgColor: "border-l-violet-500" },
  { id: "c", letter: "C", title: "Bokslutsdispositioner", color: "bg-emerald-500 text-white", bgColor: "border-l-emerald-500" },
  { id: "d", letter: "D", title: "Obeskattade reserver", color: "bg-amber-500 text-white", bgColor: "border-l-amber-500" },
  { id: "e", letter: "E", title: "Skattemässiga justeringar", color: "bg-rose-500 text-white", bgColor: "border-l-rose-500" },
  { id: "f", letter: "F", title: "Skattepliktigt resultat", color: "bg-slate-800 text-white dark:bg-slate-600", bgColor: "border-l-slate-800 dark:border-l-slate-500" },
];

// Map field indices to sections
function assignFieldsToSections(fieldCount: number): INK2Section[] {
  // Section A: field 0 (resultat)
  // Section B: field 1-2 (ej skattepliktiga, ej avdragsgilla)
  // Section C: field 3-4 (avskrivningar)
  // Section D: field 5-6 (periodiseringsfond)
  // Section E: field 7-9 (koncernbidrag, ränteavdrag)
  // Section F: field 10 (underskott)
  const mapping: number[][] = [
    [0],      // A
    [1, 2],   // B
    [3, 4],   // C
    [5, 6],   // D
    [7, 8, 9], // E
    [10],     // F
  ];
  return SECTION_DEFS.map((def, i) => ({
    ...def,
    fieldIndices: mapping[i]?.filter(idx => idx < fieldCount) || [],
  }));
}

export const INK2Form = ({ companyId: initialCompanyId, taxYear: initialTaxYear }: INK2FormProps) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState(initialCompanyId);
  const [selectedYear, setSelectedYear] = useState(initialTaxYear);
  const [fields, setFields] = useState<DeclarationField[]>([]);
  const [status, setStatus] = useState<FormStatus>("not_started");
  const [expandedField, setExpandedField] = useState<number | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState("a");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ a: true, b: true, c: true, d: true, e: true, f: true });
  const [insightsOpen, setInsightsOpen] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>();
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const engine = useAIFillEngine(selectedCompany, selectedYear);

  useEffect(() => { const load = async () => { const { data } = await supabase.from("companies").select("id, name, org_number").order("name");
      if (data?.length) setCompanies(data);
    };
    load();
  }, []);

  const loadSavedDraft = useCallback(async () => { const { data } = await supabase
      .from("tax_declarations")
      .select("*")
      .eq("company_id", selectedCompany)
      .eq("declaration_type", "ink2")
      .eq("tax_year", selectedYear)
      .maybeSingle();
    if (data?.data && typeof data.data === "object") return data;
    return null;
  }, [selectedCompany, selectedYear]);

  const buildFields = useCallback((bals: any[], savedData?: Record<string, any>) => { const { sumRange, sumAccounts, getConfidence } = engine;
    const revenue = -sumRange(bals, "3000", "3999");
    const expenses = sumRange(bals, "4000", "8999");
    const resultat = revenue - expenses;
    const ejSkattepliktiga = -sumRange(bals, "3980", "3999");
    const ejAvdragsgilla = sumAccounts(bals, "6072", "6991", "6992", "6993", "7631") + Math.abs(sumRange(bals, "6991", "6993"));
    const avskrivningar = sumRange(bals, "7810", "7840");

    const makeField = (code: string, label: string, aiVal: number, conf: FieldConfidence, explanation: string, type: "calculated" | "amount", editable: boolean): DeclarationField => { const rounded = Math.round(aiVal);
      const saved = savedData?.[code];
      return { code, label, value: saved?.adjusted_by_user ? saved.adjusted : rounded, aiValue: rounded, confidence: conf, explanation, type, editable, comment: saved?.comment || undefined };
    };

    const f: DeclarationField[] = [
      makeField("7011", "Redovisat resultat före skatt", resultat, getConfidence(resultat, true), `Intäkter (klass 3): ${Math.round(revenue)} kr − Kostnader (klass 4-8): ${Math.round(expenses)} kr`, "calculated", false),
      makeField("7012", "Ej skattepliktiga intäkter (−)", ejSkattepliktiga, getConfidence(ejSkattepliktiga, ejSkattepliktiga !== 0), "Konto 3980-3999: bidrag, stöd m.m.", "amount", true),
      makeField("7013", "Ej avdragsgilla kostnader (+)", ejAvdragsgilla, getConfidence(ejAvdragsgilla, ejAvdragsgilla !== 0), "Konto 6072 (representation), 6991-6993, 7631", "amount", true),
      makeField("7014", "Vändning bokf. avskrivning (+)", avskrivningar, getConfidence(avskrivningar, true), "Konto 7810-7840: bokförda avskrivningar", "amount", true),
      makeField("7015", "Skattemässig avskrivning (−)", 0, "low", "Beräknas i INK2S — fyll i manuellt eller använd anläggningsregistret", "amount", true),
      makeField("7016", "Återföring periodiseringsfond (+)", 0, "low", "Ange belopp som återförs från periodiseringsfond", "amount", true),
      makeField("7017", "Avsättning periodiseringsfond (−)", 0, "low", "Max 25% av skattemässigt resultat", "amount", true),
      makeField("7018", "Erhållet koncernbidrag (+)", 0, "low", "", "amount", true),
      makeField("7019", "Lämnat koncernbidrag (−)", 0, "low", "", "amount", true),
      makeField("7020", "Ränteavdragsbegränsning (+)", 0, "low", "Se N9 — beräknas via EBITDA-regeln (30%)", "amount", true),
      makeField("7021", "IB underskott från föregående år (−)", 0, "low", "Hämtas från föregående års deklaration", "amount", true),
    ];

    setFields(f);
    setStatus("ready_review");
  }, [engine]);

  const handleFetch = async () => { const saved = await loadSavedDraft();
    const savedData = saved?.data as Record<string, any> | undefined;
    if (saved) { setStatus(saved.status === "submitted" ? "submitted" : "ready_review");
      setLastSaved(saved.updated_at ? new Date(saved.updated_at).toLocaleString("sv-SE") : null);
    }
    const bals = await engine.loadData();
    if (bals) buildFields(bals, savedData || undefined);
  };

  useEffect(() => { handleFetch(); }, [selectedCompany, selectedYear]);

  const saveDraft = useCallback(async (currentFields: DeclarationField[]) => { setSaving(true);
    const data: Record<string, any> = {};
    for (const f of currentFields) { data[f.code] = { auto: f.aiValue, adjusted: f.value, adjusted_by_user: f.value !== f.aiValue, comment: f.comment || null };
    }
    const { data: existing } = await supabase
      .from("tax_declarations").select("id").eq("company_id", selectedCompany).eq("declaration_type", "ink2").eq("tax_year", selectedYear).is("period", null).maybeSingle();
    let error;
    if (existing) { ({ error } = await supabase.from("tax_declarations").update({ status: "draft", data, updated_at: new Date().toISOString() }).eq("id", existing.id));
    } else { ({ error } = await supabase.from("tax_declarations").insert({ company_id: selectedCompany, declaration_type: "ink2", tax_year: selectedYear, status: "draft", data }));
    }
    if (!error) setLastSaved(new Date().toLocaleString("sv-SE"));
    setSaving(false);
  }, [selectedCompany, selectedYear]);

  const scheduleAutoSave = useCallback((currentFields: DeclarationField[]) => { if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => saveDraft(currentFields), 2000);
  }, [saveDraft]);

  const onFieldChange = (i: number, val: number) => { const nf = [...fields]; nf[i] = { ...nf[i], value: val }; setFields(nf); scheduleAutoSave(nf); };
  const onFieldComment = (i: number, comment: string) => { const nf = [...fields]; nf[i] = { ...nf[i], comment }; setFields(nf); scheduleAutoSave(nf); };
  const onResetField = (i: number) => { const nf = [...fields]; nf[i] = { ...nf[i], value: nf[i].aiValue }; setFields(nf); scheduleAutoSave(nf); };

  // Taxable income calculation
  let taxableIncome = 0;
  if (fields.length > 0) {
    taxableIncome = fields[0]?.value || 0;
    taxableIncome -= fields[1]?.value || 0;
    taxableIncome += fields[2]?.value || 0;
    taxableIncome += fields[3]?.value || 0;
    taxableIncome -= fields[4]?.value || 0;
    taxableIncome += fields[5]?.value || 0;
    taxableIncome -= fields[6]?.value || 0;
    taxableIncome += fields[7]?.value || 0;
    taxableIncome -= fields[8]?.value || 0;
    taxableIncome += fields[9]?.value || 0;
    taxableIncome -= fields[10]?.value || 0;
  }
  const tax = Math.max(0, Math.round(taxableIncome * 0.206));
  const adjustments = (fields[1]?.value || 0) + (fields[2]?.value || 0) + (fields[3]?.value || 0) - (fields[4]?.value || 0);

  const sections = useMemo(() => assignFieldsToSections(fields.length), [fields.length]);

  // Completion tracking
  const totalEditable = fields.filter(f => f.editable).length;
  const filledEditable = fields.filter(f => f.editable && f.value !== 0).length;
  const completionPct = totalEditable > 0 ? Math.round((filledEditable / totalEditable) * 100) : 0;
  const remaining = totalEditable - filledEditable;

  const sectionCompletion = (section: INK2Section) => {
    const sectionFields = section.fieldIndices.map(i => fields[i]).filter(Boolean);
    const editable = sectionFields.filter(f => f.editable);
    const filled = editable.filter(f => f.value !== 0);
    return { total: editable.length, filled: filled.length, status: editable.length === 0 ? "complete" as const : filled.length === editable.length ? "complete" as const : filled.length > 0 ? "progress" as const : "untouched" as const };
  };

  // SRU export
  const exportSRU = () => { const company = companies.find(c => c.id === selectedCompany);
    const orgNr = company?.org_number || "0000000000";
    const infoContent = `#DATABESKRIVNING\n#ORGNR ${orgNr}\n#UPPGJORD ${new Date().toISOString().split("T")[0]}\n#PROGRAM Bokfy\n#FILNAMN BLANKETTER.SRU\n`;
    const blankettLines = [`#BLANKETT INK2`, `#IDENTITET ${orgNr} ${selectedYear}`];
    for (const f of fields) blankettLines.push(`#UPPGIFT ${f.code} ${f.value}`);
    blankettLines.push(`#UPPGIFT 7050 ${taxableIncome}`, `#UPPGIFT 7051 ${tax}`, `#BLANKETTSLUT`, `#FIL_SLUT`);
    const blob1 = new Blob([infoContent], { type: "text/plain" });
    const a1 = document.createElement("a"); a1.href = URL.createObjectURL(blob1); a1.download = "INFO.SRU"; a1.click();
    setTimeout(() => { const blob2 = new Blob([blankettLines.join("\n")], { type: "text/plain" });
      const a2 = document.createElement("a"); a2.href = URL.createObjectURL(blob2); a2.download = "BLANKETTER.SRU"; a2.click();
    }, 500);
    toast.success("SRU-filer exporterade!");
  };

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    setExpandedSections(prev => ({ ...prev, [id]: true }));
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const statusLabels: Record<string, string> = { draft: "Utkast", not_started: "Ej påbörjad", ai_preparing: "AI förbereder", ready_review: "Klar för granskning", submitted: "Inlämnad" };

  return (
    <div className="space-y-6 pb-24">
      {/* ─── PAGE HEADER ─── */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#2563EB]/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-[#2563EB]" />
              </div>
              <div>
                <h2 className="text-lg font-bold">INK2 — Inkomstdeklaration 2</h2>
                <p className="text-xs text-muted-foreground">Räkenskapsår {selectedYear}</p>
              </div>
            </div>

            <div className="flex-1 max-w-xs mx-4 hidden md:block">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>{completionPct}% komplett</span>
                <span>{remaining} fält återstår</span>
              </div>
              <Progress value={completionPct} className="h-2" />
            </div>

            <div className="flex items-center gap-3">
              <Badge variant={status === "submitted" ? "default" : "secondary"} className="text-xs">
                {statusLabels[status] || status}
              </Badge>
              {lastSaved && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Cloud className="h-3 w-3" />Sparad {lastSaved.split(" ")[1] || lastSaved}
                </span>
              )}
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            </div>
          </div>

          {/* Company/Year selectors */}
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border/50">
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger className="w-[200px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{[2023, 2024, 2025].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleFetch} disabled={engine.loading} className="h-8 text-xs">
              {engine.loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
              Hämta siffror
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Diagnostics */}
      {engine.diagnostics.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-[#FAEEDA] dark:bg-amber-950/20 border border-[#F0DDB7] dark:border-amber-800">
          <AlertTriangle className="h-4 w-4 text-[#7A5417] mt-0.5 shrink-0" />
          <div className="space-y-0.5">
            {engine.diagnostics.map((d, i) => <p key={i} className="text-xs text-muted-foreground">{d}</p>)}
          </div>
        </div>
      )}

      {engine.loading ? (
        <Card><CardContent className="py-16 flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#2563EB]" />
          <p className="text-sm text-muted-foreground">Hämtar bokföringsdata...</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
          {/* ─── SIDEBAR NAV (lg) ─── */}
          <nav className="hidden lg:block space-y-1 sticky top-4 self-start">
            {sections.map(sec => {
              const comp = sectionCompletion(sec);
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => scrollToSection(sec.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-sm transition-all",
                    isActive
                      ? "bg-[#2563EB]/10 text-[#2563EB] border-l-2 border-[#2563EB]"
                      : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    comp.status === "complete" ? "bg-green-500" :
                      comp.status === "progress" ? "bg-amber-500" : "bg-muted-foreground/30"
                  )} />
                  <span className="font-bold">{sec.letter}</span>
                  <span className="truncate">{sec.title}</span>
                </button>
              );
            })}
          </nav>

          {/* Mobile tab strip */}
          <div className="lg:hidden flex gap-1.5 overflow-x-auto pb-1 -mt-2">
            {sections.map(sec => {
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => scrollToSection(sec.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all",
                    isActive ? "bg-[#2563EB] text-white" : "bg-muted/60 text-muted-foreground"
                  )}
                >
                  {sec.letter}
                </button>
              );
            })}
          </div>

          {/* ─── MAIN CONTENT ─── */}
          <div className="space-y-4">
            {sections.map(sec => {
              const comp = sectionCompletion(sec);
              const isOpen = expandedSections[sec.id] !== false;

              return (
                <div key={sec.id} ref={el => { sectionRefs.current[sec.id] = el; }}>
                  <Collapsible open={isOpen} onOpenChange={v => setExpandedSections(prev => ({ ...prev, [sec.id]: v }))}>
                    <Card className={cn("border-l-4 overflow-hidden", sec.bgColor, "dark:bg-slate-800/60 dark:border-slate-700")}>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-3.5 bg-muted/20 dark:bg-slate-800/80">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold", sec.color)}>
                                {sec.letter}
                              </div>
                              <span className="text-sm font-semibold">{sec.letter} — {sec.title}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {comp.total > 0 && (
                                <Badge variant="outline" className="text-[10px]">
                                  {comp.filled}/{comp.total} fält
                                </Badge>
                              )}
                              {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="p-0">
                          {sec.fieldIndices.map(idx => {
                            const f = fields[idx];
                            if (!f) return null;
                            const isModified = f.value !== f.aiValue;
                            const diff = f.value - f.aiValue;
                            const isExpanded = expandedField === idx;

                            return (
                              <div key={f.code}>
                                <div className={cn(
                                  "grid grid-cols-[70px_1fr_120px_130px_80px] gap-2 items-center px-4 py-3 border-b border-border/30 transition-colors",
                                  f.type === "calculated" ? "bg-muted/30 dark:bg-slate-700/40" : "hover:bg-muted/10",
                                  isModified && f.editable && "bg-amber-50/50 dark:bg-amber-950/10 border-l-[3px] border-l-amber-400"
                                )}>
                                  {/* SRU Code */}
                                  <span className="font-mono text-[11px] bg-muted/60 dark:bg-slate-700/60 text-muted-foreground px-2 py-0.5 rounded text-center">
                                    {f.code}
                                  </span>

                                  {/* Description */}
                                  <div className="min-w-0">
                                    <button onClick={() => setExpandedField(isExpanded ? null : idx)} className="flex items-center gap-1.5 text-left w-full group">
                                      {isExpanded ? <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />}
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <span className="text-sm truncate">{f.label}</span>
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="max-w-xs text-xs">{f.label}</TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    </button>
                                  </div>

                                  {/* Auto value */}
                                  <div className="flex items-center justify-end gap-1 text-sm italic text-muted-foreground">
                                    <Lock className="h-3 w-3" />
                                    <span className="font-mono tabular-nums">{f.aiValue === 0 ? "—" : fmt(f.aiValue)}</span>
                                  </div>

                                  {/* Adjusted value */}
                                  <div className="flex items-center justify-end gap-1">
                                    {f.editable ? (
                                      <div className="relative">
                                        {isModified && <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-amber-500" />}
                                        <Input
                                          type="number"
                                          value={f.value || ""}
                                          onChange={e => onFieldChange(idx, Number(e.target.value) || 0)}
                                          placeholder={f.aiValue ? String(f.aiValue) : "0"}
                                          className={cn(
                                            "h-8 w-[120px] text-right font-mono text-sm",
                                            "focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]",
                                            "dark:bg-slate-900 dark:border-slate-600"
                                          )}
                                        />
                                      </div>
                                    ) : (
                                      <span className="font-mono font-semibold text-sm tabular-nums">{fmt(f.value)}</span>
                                    )}
                                  </div>

                                  {/* Diff */}
                                  <div className="text-right">
                                    {isModified && diff !== 0 ? (
                                      <span className={cn("text-xs font-mono tabular-nums", diff > 0 ? "text-[#085041]" : "text-[#7A1A1A]")}>
                                        {diff > 0 ? "+" : ""}{fmt(diff)}
                                      </span>
                                    ) : (
                                      isModified && f.editable ? (
                                        <button onClick={() => onResetField(idx)} className="text-muted-foreground hover:text-foreground">
                                          <RotateCcw className="h-3.5 w-3.5" />
                                        </button>
                                      ) : null
                                    )}
                                  </div>
                                </div>

                                {/* Expanded detail */}
                                {isExpanded && (
                                  <div className="bg-muted/10 dark:bg-slate-800/30 px-6 py-3 border-b border-border/30 space-y-2">
                                    {f.explanation && (
                                      <div className="flex items-start gap-2">
                                        <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                                        <p className="text-xs text-muted-foreground">{f.explanation}</p>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-muted-foreground">Kommentar:</span>
                                      <Input value={f.comment || ""} onChange={e => onFieldComment(idx, e.target.value)}
                                        placeholder="Notera anledning till justering..." className="h-7 text-xs flex-1 dark:bg-slate-900" />
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                </div>
              );
            })}

            {/* ─── AI INSIGHTS ─── */}
            <Collapsible open={insightsOpen} onOpenChange={setInsightsOpen}>
              <Card className="border-[#2563EB]/20">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-[#2563EB]" />
                        AI-analys
                      </div>
                      {insightsOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-2">
                    <p className="text-xs text-muted-foreground mb-3">Agenten jämförde dina siffror med föregående år och hittade följande:</p>
                    {[
                      { icon: Info, color: "text-blue-500", bg: "bg-[#EFF6FF] dark:bg-blue-950/20", text: "Personalkostnaderna matchar föregående års nivå — ingen avvikelse." },
                      { icon: AlertTriangle, color: "text-[#7A5417]", bg: "bg-[#FAEEDA] dark:bg-amber-950/20", text: "Avskrivningarna verkar höga relativt omsättning — kontrollera anläggningsregistret." },
                      { icon: CheckCircle, color: "text-[#085041]", bg: "bg-[#E1F5EE] dark:bg-green-950/20", text: "Räntekostnader matchar externa låneavtal." },
                    ].map((insight, i) => (
                      <div key={i} className={cn("flex items-start gap-3 p-3 rounded-lg", insight.bg)}>
                        <insight.icon className={cn("h-4 w-4 mt-0.5 shrink-0", insight.color)} />
                        <p className="text-sm">{insight.text}</p>
                      </div>
                    ))}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* ─── TAXERAD INKOMST SUMMARY ─── */}
            <Card className="dark:bg-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-[#2563EB]" />
                  Taxerad inkomst och skatt
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/30 dark:bg-slate-700/30">
                    <p className="text-xs text-muted-foreground">Resultat före skatt</p>
                    <p className="text-xl font-bold tabular-nums">{fmt(fields[0]?.value || 0)} kr</p>
                  </div>
                  <div className="p-4 rounded-lg bg-amber-50/50 dark:bg-amber-950/20">
                    <p className="text-xs text-muted-foreground">Skattemässiga justeringar</p>
                    <p className="text-xl font-bold text-[#7A5417] dark:text-[#C28A2B] tabular-nums">{adjustments >= 0 ? "+" : ""}{fmt(adjustments)} kr</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30 dark:bg-slate-700/30">
                    <p className="text-xs text-muted-foreground">Taxerad inkomst</p>
                    <p className={cn("text-2xl font-bold tabular-nums", taxableIncome < 0 && "text-[#7A1A1A]")}>
                      {fmt(taxableIncome)} kr
                      {taxableIncome < 0 && <span className="text-xs ml-1 font-normal">(underskott)</span>}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-red-50/50 dark:bg-red-950/20">
                    <p className="text-xs text-muted-foreground">Beräknad bolagsskatt (20,6%)</p>
                    <p className="text-2xl font-bold text-[#7A1A1A] dark:text-[#C73838] tabular-nums">{fmt(tax)} kr</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-[#2563EB]/5 border border-[#2563EB]/20">
                  <div>
                    <p className="text-sm font-semibold">Netto att betala</p>
                    <p className="text-xs text-muted-foreground">Förfaller: 1 juli {selectedYear + 1}</p>
                  </div>
                  <p className="text-2xl font-bold text-[#2563EB] tabular-nums">{fmt(tax)} kr</p>
                </div>
              </CardContent>
            </Card>

            {/* BankID Submit */}
            <div className="rounded-xl border border-[#C8DDF5] dark:border-blue-800/40 bg-blue-50/50 dark:bg-blue-950/20 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-semibold">Lämna in till Skatteverket</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Granska alla fält ovan och klicka "Skicka in" i verktygsfältet nedan för att signera och lämna in INK2 till Skatteverket.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── STICKY FOOTER ─── */}
      <div className="fixed bottom-[60px] md:bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-sm border-t border-border shadow-lg">
        <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <span className="text-xs text-muted-foreground hidden sm:inline">
            INK2 {selectedYear} | Räkenskapsår: {selectedYear}-01-01 – {selectedYear}-12-31
          </span>
          <Badge variant="outline" className="text-[10px]">{completionPct}% komplett</Badge>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={exportSRU}>
              <Download className="h-3.5 w-3.5 mr-1" />SRU
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => saveDraft(fields)}>
              {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Cloud className="h-3.5 w-3.5 mr-1" />}
              Spara utkast
            </Button>
            <DemoSubmitButton
              label="Skicka in"
              authority="Skatteverket"
              size="sm"
              className="text-xs h-8 bg-[#2563EB] hover:bg-[#2563EB]/90 text-white"
              icon={<Lock className="h-3.5 w-3.5" />}
              onDemoSubmit={async () => {
                await saveDraft(fields);
                toast.success("INK2 inskickad till Skatteverket");
                setStatus("submitted");
              }}
            />
          </div>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground">
        AI-förberedda värden baseras på huvudboken. Granska alltid innan inlämning.
      </p>
    </div>
  );
};
