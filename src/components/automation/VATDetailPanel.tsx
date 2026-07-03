import { useState, useEffect, useMemo } from "react";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DemoSubmitButton } from "@/components/ui/DemoSubmitButton";
import { VATReconciliation } from "./VATReconciliation";
import { toast as sonnerToast } from "sonner";
import {
  Loader2, CheckCircle2, AlertTriangle, Send, Calculator, ChevronLeft, ChevronRight, Lock, FileText, RotateCcw, ClipboardCheck,
} from "lucide-react";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface VATDetailPanelProps {
  companyId: string;
  environment: string;
  onComplete: () => void;
}

const formatSEK = (n: number) => Math.round(n).toLocaleString("sv-SE") + " kr";

interface RutaValue {
  value: number;
  auto: boolean;
  missingAccount?: string;
}

type RutaData = Record<string, RutaValue>;

interface VATCheck {
  id: string;
  status: "pass" | "warning" | "fail";
  text: string;
}

interface VatPeriodRow {
  id: string;
  period_start: string;
  period_end: string;
  period_type: string;
  status: string;
  submitted_at: string | null;
  reference_number: string | null;
  ruta_values: Record<string, number> | null;
}

interface PeriodOption {
  label: string;
  start: string;
  end: string;
  dbRow?: VatPeriodRow;
}

const SECTION_COLORS: Record<string, string> = {
  A: "border-l-blue-500",
  B: "border-l-violet-500",
  C: "border-l-amber-500",
  D: "border-l-orange-500",
  E: "border-l-emerald-500",
  F: "border-l-[#3b82f6]",
};

const SECTION_BG: Record<string, string> = {
  A: "bg-blue-50/50 dark:bg-blue-950/20",
  B: "bg-violet-50/50 dark:bg-violet-950/20",
  C: "bg-amber-50/50 dark:bg-amber-950/20",
  D: "bg-orange-50/50 dark:bg-orange-950/20",
  E: "bg-emerald-50/50 dark:bg-emerald-950/20",
  F: "bg-cyan-50/50 dark:bg-cyan-950/20",
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];
const QUARTER_NAMES = ["Q1", "Q2", "Q3", "Q4"];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "Ej inskickad", color: "bg-[#FAEEDA] text-[#7A5417] dark:bg-amber-900/30 dark:text-amber-300" },
  submitted: { label: "Inskickad", color: "bg-[#EFF6FF] text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  approved: { label: "Godkänd", color: "bg-[#E1F5EE] text-[#085041] dark:bg-emerald-900/30 dark:text-emerald-300" },
  corrected: { label: "Korrigerad", color: "bg-[#F1F5F9] text-violet-800 dark:bg-violet-900/30 dark:text-violet-300" },
};

export const VATDetailPanel = ({ companyId, environment, onComplete }: VATDetailPanelProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rutor, setRutor] = useState<RutaData>({});
  const [manualOverrides, setManualOverrides] = useState<Record<string, number>>({});
  const [checks, setChecks] = useState<VATCheck[]>([]);
  const [signing, setSigning] = useState(false);
  const [activeTab, setActiveTab] = useState<"deklaration" | "avstamning">("deklaration");
  const [reconciliationStatus, setReconciliationStatus] = useState<"none" | "balanced" | "unbalanced">("none");

  // Period management
  const [vatPeriodType, setVatPeriodType] = useState<string>("quarterly");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedPeriodIdx, setSelectedPeriodIdx] = useState<number>(-1);
  const [periods, setPeriods] = useState<PeriodOption[]>([]);
  const [dbPeriods, setDbPeriods] = useState<VatPeriodRow[]>([]);

  // Load company VAT settings + periods
  useEffect(() => {
    loadSettings();
  }, [companyId]);

  useEffect(() => {
    if (vatPeriodType) buildPeriods();
  }, [vatPeriodType, selectedYear, dbPeriods]);

  useEffect(() => {
    if (selectedPeriodIdx >= 0 && periods[selectedPeriodIdx]) {
      loadRutor(periods[selectedPeriodIdx]);
    }
  }, [selectedPeriodIdx, periods]);

  const loadSettings = async () => {
    const { data: company } = await supabase
      .from("companies")
      .select("vat_period_type")
      .eq("id", companyId)
      .maybeSingle();

    const periodType = (company as any)?.vat_period_type || "quarterly";
    setVatPeriodType(periodType);

    await loadDbPeriods();
  };

  const loadDbPeriods = async () => {
    const { data } = await supabase
      .from("vat_periods")
      .select("*")
      .eq("company_id", companyId)
      .order("period_start", { ascending: false });

    setDbPeriods((data as any[] || []) as VatPeriodRow[]);
  };

  const buildPeriods = () => {
    const opts: PeriodOption[] = [];
    if (vatPeriodType === "monthly") {
      for (let m = 0; m < 12; m++) {
        const start = `${selectedYear}-${String(m + 1).padStart(2, "0")}-01`;
        const lastDay = new Date(selectedYear, m + 1, 0).getDate();
        const end = `${selectedYear}-${String(m + 1).padStart(2, "0")}-${lastDay}`;
        const dbRow = dbPeriods.find((p) => p.period_start === start && p.period_type === "monthly");
        opts.push({ label: MONTH_NAMES[m], start, end, dbRow });
      }
    } else if (vatPeriodType === "quarterly") {
      for (let q = 0; q < 4; q++) {
        const startMonth = q * 3 + 1;
        const endMonth = q * 3 + 3;
        const start = `${selectedYear}-${String(startMonth).padStart(2, "0")}-01`;
        const lastDay = new Date(selectedYear, endMonth, 0).getDate();
        const end = `${selectedYear}-${String(endMonth).padStart(2, "0")}-${lastDay}`;
        const dbRow = dbPeriods.find((p) => p.period_start === start && p.period_type === "quarterly");
        opts.push({ label: QUARTER_NAMES[q], start, end, dbRow });
      }
    } else {
      const start = `${selectedYear}-01-01`;
      const end = `${selectedYear}-12-31`;
      const dbRow = dbPeriods.find((p) => p.period_start === start && p.period_type === "yearly");
      opts.push({ label: String(selectedYear), start, end, dbRow });
    }
    setPeriods(opts);

    // Auto-select current period
    if (selectedPeriodIdx < 0) {
      const now = new Date();
      if (selectedYear === now.getFullYear()) {
        if (vatPeriodType === "monthly") {
          const prev = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
          setSelectedPeriodIdx(prev);
        } else if (vatPeriodType === "quarterly") {
          const curQ = Math.ceil((now.getMonth() + 1) / 3);
          setSelectedPeriodIdx(curQ === 1 ? 3 : curQ - 2);
        } else {
          setSelectedPeriodIdx(0);
        }
      } else {
        setSelectedPeriodIdx(opts.length - 1);
      }
    }
  };

  const selectedPeriod = periods[selectedPeriodIdx];
  const isSubmitted = selectedPeriod?.dbRow?.status === "submitted" || selectedPeriod?.dbRow?.status === "approved";
  const isReadOnly = isSubmitted;

  const loadRutor = async (period: PeriodOption) => {
    setLoading(true);
    setManualOverrides({});

    // If submitted, load from snapshot
    if (period.dbRow && (period.dbRow.status === "submitted" || period.dbRow.status === "approved") && period.dbRow.ruta_values) {
      const snapshot = period.dbRow.ruta_values;
      const r: RutaData = {};
      Object.entries(snapshot).forEach(([key, val]) => {
        r[key] = { value: val as number, auto: true };
      });
      setRutor(r);
      setChecks([{ id: "snap", status: "pass", text: "Visar inskickade värden (snapshot)" }]);
      setLoading(false);
      return;
    }

    try {
      const { data: lines } = await supabase
        .from("journal_entry_lines")
        .select(
          `debit, credit, vat_code, account:chart_of_accounts!inner(account_number, vat_code), journal_entry:journal_entries!inner(entry_date, status, company_id)`
        )
        .eq("journal_entry.company_id", companyId)
        .eq("journal_entry.status", "approved")
        .gte("journal_entry.entry_date", period.start)
        .lte("journal_entry.entry_date", period.end);

      const { data: accounts } = await supabase
        .from("chart_of_accounts")
        .select("account_number")
        .eq("company_id", companyId)
        .in("account_number", ["2610", "2611", "2612", "2614", "2615", "2620", "2621", "2630", "2631", "2640", "2641", "2642", "2645", "2646"]);

      const existingAccounts = new Set((accounts || []).map((a: any) => a.account_number));

      let r05 = 0, r06 = 0, r07 = 0, r08 = 0;
      let r10 = 0, r11 = 0, r12 = 0;
      let r20 = 0, r21 = 0, r22 = 0, r23 = 0, r24 = 0;
      let r48 = 0;
      let missingVatCode = 0;

      (lines || []).forEach((l: any) => {
        const acc = l.account?.account_number || "";
        const vatCode = l.vat_code || l.account?.vat_code || "";
        const c = l.credit || 0;
        const d = l.debit || 0;
        const net = c - d;
        const accNum = parseInt(acc, 10);

        if (accNum >= 3000 && accNum <= 3699 && net > 0) {
          if (vatCode === "25") r05 += net;
          else if (vatCode === "12") r06 += net;
          else if (vatCode === "6") r07 += net;
          else if (vatCode === "0" || vatCode === "exempt") r08 += net;
          else { r08 += net; if (!vatCode) missingVatCode++; }
        }

        if (["2610", "2611", "2612"].includes(acc)) r10 += c - d;
        else if (["2620", "2621"].includes(acc)) r11 += c - d;
        else if (["2630", "2631"].includes(acc)) r12 += c - d;

        if (acc === "2614") r23 += d - c;
        if (acc === "2615") r20 += d - c;
        if (["2645", "2646"].includes(acc)) r21 += d - c;

        if (["2640", "2641", "2642"].includes(acc)) r48 += d - c;
      });

      const totalRC = r20 + r21 + r22 + r23 + r24;
      const r30 = totalRC * 0.25;

      const r: RutaData = {
        "05": { value: r05, auto: true },
        "06": { value: r06, auto: true },
        "07": { value: r07, auto: true },
        "08": { value: r08, auto: true },
        "10": { value: r10, auto: true, missingAccount: !existingAccounts.has("2610") && !existingAccounts.has("2611") ? "2610/2611" : undefined },
        "11": { value: r11, auto: true, missingAccount: !existingAccounts.has("2620") && !existingAccounts.has("2621") ? "2620" : undefined },
        "12": { value: r12, auto: true, missingAccount: !existingAccounts.has("2630") && !existingAccounts.has("2631") ? "2630" : undefined },
        "20": { value: r20, auto: r20 !== 0 },
        "21": { value: r21, auto: r21 !== 0 },
        "22": { value: r22, auto: false },
        "23": { value: r23, auto: r23 !== 0 },
        "24": { value: r24, auto: false },
        "30": { value: r30, auto: totalRC !== 0 },
        "31": { value: 0, auto: false },
        "32": { value: 0, auto: false },
        "48": { value: r48, auto: true, missingAccount: !existingAccounts.has("2640") && !existingAccounts.has("2641") ? "2640" : undefined },
        "49": { value: 0, auto: true },
      };

      const totalOut = r10 + r11 + r12 + r30;
      r["49"] = { value: totalOut - r48, auto: true };
      setRutor(r);

      const autoChecks: VATCheck[] = [];
      if (missingVatCode > 0) {
        autoChecks.push({ id: "vat", status: "warning", text: `${missingVatCode} intäktsrader saknar momskod` });
      } else {
        autoChecks.push({ id: "vat", status: "pass", text: "Alla intäktsrader har momskod" });
      }
      const expected10 = r05 * 0.25;
      if (r05 > 0 && Math.abs(r10 - expected10) > 10) {
        autoChecks.push({ id: "r10", status: "warning", text: `Ruta 10 avviker från Ruta 05 × 25%` });
      }
      Object.entries(r).forEach(([key, val]) => {
        if (val.missingAccount) autoChecks.push({ id: `miss-${key}`, status: "warning", text: `Konto ${val.missingAccount} saknas — ruta ${key} ej auto-beräknad` });
      });
      setChecks(autoChecks);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getVal = (key: string) => manualOverrides[key] ?? rutor[key]?.value ?? 0;

  const calcRuta49 = () => {
    const totalOut = getVal("10") + getVal("11") + getVal("12") + getVal("30") + getVal("31") + getVal("32");
    return totalOut - getVal("48");
  };

  const handleManualChange = (ruta: string, value: string) => {
    if (isReadOnly) return;
    const num = parseFloat(value.replace(/\s/g, "").replace(",", ".")) || 0;
    setManualOverrides((prev) => ({ ...prev, [ruta]: num }));
  };

  const buildRutaSnapshot = (): Record<string, number> => {
    const keys = ["05", "06", "07", "08", "10", "11", "12", "20", "21", "22", "23", "24", "30", "31", "32", "48"];
    const snap: Record<string, number> = {};
    keys.forEach((k) => { snap[k] = getVal(k); });
    snap["49"] = calcRuta49();
    return snap;
  };

  const handleSubmit = async () => {
    if (!selectedPeriod) return;
    setSigning(true);
    try {
      const rutaSnapshot = buildRutaSnapshot();
      const refNumber = `SKV-${Date.now().toString(36).toUpperCase()}`;

      const { error } = await supabase.from("vat_periods").upsert(
        {
          company_id: companyId,
          period_start: selectedPeriod.start,
          period_end: selectedPeriod.end,
          period_type: vatPeriodType,
          status: "submitted",
          submitted_at: new Date().toISOString(),
          reference_number: refNumber,
          ruta_values: rutaSnapshot,
        } as any,
        { onConflict: "company_id,period_start,period_type" }
      );
      if (error) throw error;

      // Also invoke edge function
      await supabase.functions.invoke("calculate-vat", {
        body: {
          company_id: companyId,
          period_year: selectedYear,
          period_type: vatPeriodType,
          period_quarter: vatPeriodType === "quarterly" ? selectedPeriodIdx + 1 : undefined,
          period_month: vatPeriodType === "monthly" ? selectedPeriodIdx + 1 : undefined,
          environment,
          rutor_overrides: manualOverrides,
        },
      });

      toast({
        title: "Momsdeklaration sparad (demo)",
        description: `${selectedPeriod.label} ${selectedYear}. Ref: ${refNumber}`,
      });

      await loadDbPeriods();
      onComplete();
    } catch (e: any) {
      toast({ title: "Fel", description: e.message || "Kunde inte spara", variant: "destructive" });
    } finally {
      setSigning(false);
    }
  };

  const handleCorrection = async () => {
    if (!selectedPeriod?.dbRow) return;
    // Create a correction period by clearing submission
    toast({ title: "Korrigeringsdeklaration skapad", description: "Du kan nu redigera värdena och skicka in igen." });
    // Insert a new row with status corrected — reloads UI
    await supabase.from("vat_periods").insert({
      company_id: companyId,
      period_start: selectedPeriod.start,
      period_end: selectedPeriod.end,
      period_type: "corrected",
      status: "draft",
      ruta_values: selectedPeriod.dbRow.ruta_values,
    } as any);
    await loadDbPeriods();
  };

  const ruta49 = calcRuta49();

  if (!periods.length && !loading) return null;

  return (
    <TooltipProvider>
      <div className="pt-2 space-y-4">
        {/* Year selector */}
        <div className="flex items-center justify-between px-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedYear((y) => y - 1); setSelectedPeriodIdx(0); }}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold">{selectedYear}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedYear((y) => y + 1); setSelectedPeriodIdx(0); }}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Period strip */}
        <ScrollArea className="w-full">
          <div className="flex gap-1.5 pb-2 px-1">
            {periods.map((p, idx) => {
              const isActive = idx === selectedPeriodIdx;
              const status = p.dbRow?.status || "draft";
              const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
              return (
                <button
                  key={p.start}
                  onClick={() => setSelectedPeriodIdx(idx)}
                  className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-all shrink-0 border ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-card border-border hover:bg-muted/50"
                  }`}
                >
                  <span className="font-semibold">{p.label}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full leading-none ${isActive ? "bg-primary-foreground/20 text-primary-foreground" : cfg.color}`}>
                    {cfg.label}
                  </span>
                </button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Tab bar + Reconciliation toolbar */}
        <div className="flex items-center justify-between border-b pb-1">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab("deklaration")}
              className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors ${
                activeTab === "deklaration"
                  ? "bg-background border border-b-0 border-border text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Deklaration
            </button>
            <button
              onClick={() => setActiveTab("avstamning")}
              className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors flex items-center gap-1.5 ${
                activeTab === "avstamning"
                  ? "bg-background border border-b-0 border-border text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Avstämning
              {reconciliationStatus === "balanced" && <CheckCircle2 className="h-3 w-3 text-[#085041]" />}
              {reconciliationStatus === "unbalanced" && <AlertTriangle className="h-3 w-3 text-[#7A5417]" />}
            </button>
          </div>
          {activeTab === "deklaration" && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-7"
              onClick={() => {
                setActiveTab("avstamning");
              }}
            >
              <ClipboardCheck className="h-3.5 w-3.5" />
              Kör avstämning
              {reconciliationStatus === "balanced" && (
                <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-[#E1F5EE] text-[#085041] dark:bg-emerald-900/30 dark:text-emerald-300">Avstämd ✓</Badge>
              )}
              {reconciliationStatus === "unbalanced" && (
                <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-[#FAEEDA] text-[#7A5417] dark:bg-amber-900/30 dark:text-amber-300">Ej avstämd ⚠️</Badge>
              )}
            </Button>
          )}
        </div>

        {/* Reconciliation tab */}
        {activeTab === "avstamning" && selectedPeriod && (
          <VATReconciliation
            companyId={companyId}
            periodStart={selectedPeriod.start}
            periodEnd={selectedPeriod.end}
            rutaValues={buildRutaSnapshot()}
            onReconciliationDone={(balanced) => {
              setReconciliationStatus(balanced ? "balanced" : "unbalanced");
              if (balanced) {
                sonnerToast.success("Momsdeklarationen stämmer mot huvudboken");
              } else {
                sonnerToast.warning("Avvikelser hittades", {
                  description: "Visa avstämningsrapporten för detaljer",
                });
              }
            }}
          />
        )}

        {/* Deklaration tab */}
        {activeTab === "deklaration" && (
        <>
        {/* Submitted banner */}
        {isSubmitted && selectedPeriod?.dbRow && (
          <div className="rounded-lg border border-[#C8DDF5] bg-[#EFF6FF] dark:bg-blue-950/20 dark:border-blue-800 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Lock className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-800 dark:text-blue-300">
                Inskickad {selectedPeriod.dbRow.submitted_at
                  ? new Date(selectedPeriod.dbRow.submitted_at).toLocaleDateString("sv-SE")
                  : ""}
              </span>
              {selectedPeriod.dbRow.reference_number && (
                <Badge variant="outline" className="text-[10px] ml-auto">
                  Ref: {selectedPeriod.dbRow.reference_number}
                </Badge>
              )}
            </div>
            <Button variant="outline" size="sm" className="text-xs gap-1.5 border-[#F0DDB7] text-[#7A5417] hover:bg-[#FAEEDA] dark:text-[#C28A2B] dark:border-amber-700" onClick={handleCorrection}>
              <RotateCcw className="h-3 w-3" />
              Skicka korrigeringsdeklaration
            </Button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Section A */}
            <SectionCard section="A" title="Momspliktig omsättning">
              <RutaRow ruta="05" label="Momspliktig försäljning 25%" data={rutor} overrides={manualOverrides} readOnly={isReadOnly} />
              <RutaRow ruta="06" label="Momspliktig försäljning 12%" data={rutor} overrides={manualOverrides} readOnly={isReadOnly} />
              <RutaRow ruta="07" label="Momspliktig försäljning 6%" data={rutor} overrides={manualOverrides} readOnly={isReadOnly} />
              <RutaRow ruta="08" label="Momsbefriad omsättning & export" data={rutor} overrides={manualOverrides} readOnly={isReadOnly} />
            </SectionCard>

            {/* Section B */}
            <SectionCard section="B" title="Utgående moms">
              <RutaRow ruta="10" label="Utgående moms 25%" data={rutor} overrides={manualOverrides} formula="Ruta 05 × 25%" readOnly={isReadOnly} />
              <RutaRow ruta="11" label="Utgående moms 12%" data={rutor} overrides={manualOverrides} formula="Ruta 06 × 12%" readOnly={isReadOnly} />
              <RutaRow ruta="12" label="Utgående moms 6%" data={rutor} overrides={manualOverrides} formula="Ruta 07 × 6%" readOnly={isReadOnly} />
            </SectionCard>

            {/* Section C */}
            <SectionCard section="C" title="Inköp vid omvänd skattskyldighet">
              <RutaRow ruta="20" label="Varor från annat EU-land" data={rutor} overrides={manualOverrides} onChange={handleManualChange} editable={!isReadOnly} readOnly={isReadOnly} />
              <RutaRow ruta="21" label="Tjänster från EU (huvudregeln)" data={rutor} overrides={manualOverrides} onChange={handleManualChange} editable={!isReadOnly} readOnly={isReadOnly} />
              <RutaRow ruta="22" label="Tjänster utanför EU" data={rutor} overrides={manualOverrides} onChange={handleManualChange} editable={!isReadOnly} readOnly={isReadOnly} />
              <RutaRow ruta="23" label="Varor i Sverige, omvänd skattsk." data={rutor} overrides={manualOverrides} onChange={handleManualChange} editable={!isReadOnly} readOnly={isReadOnly} />
              <RutaRow ruta="24" label="Övriga inköp, omvänd skattsk." data={rutor} overrides={manualOverrides} onChange={handleManualChange} editable={!isReadOnly} readOnly={isReadOnly} />
            </SectionCard>

            {/* Section D */}
            <SectionCard section="D" title="Utgående moms (omvänd skattskyldighet)">
              <RutaRow ruta="30" label="Utgående moms 25%" data={rutor} overrides={manualOverrides} onChange={handleManualChange} editable={!isReadOnly} readOnly={isReadOnly} />
              <RutaRow ruta="31" label="Utgående moms 12%" data={rutor} overrides={manualOverrides} onChange={handleManualChange} editable={!isReadOnly} readOnly={isReadOnly} />
              <RutaRow ruta="32" label="Utgående moms 6%" data={rutor} overrides={manualOverrides} onChange={handleManualChange} editable={!isReadOnly} readOnly={isReadOnly} />
            </SectionCard>

            {/* Section E */}
            <SectionCard section="E" title="Ingående moms">
              <RutaRow ruta="48" label="Ingående moms att dra av" data={rutor} overrides={manualOverrides} readOnly={isReadOnly} />
            </SectionCard>

            <Separator />

            {/* Section F — Ruta 49 */}
            <div className={`rounded-lg border-l-4 ${SECTION_COLORS.F} border border-border/50 ${SECTION_BG.F} p-4`}>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Ruta 49 — Moms att betala / få tillbaka</p>
                  <p className="text-xs text-muted-foreground mt-0.5">(10+11+12+30+31+32) − 48</p>
                </div>
                <div className="text-right">
                  <span className={`text-2xl font-bold font-mono tabular-nums ${ruta49 >= 0 ? "text-destructive" : "text-[#085041] dark:text-[#1D9E75]"}`}>
                    {ruta49 >= 0 ? "" : "−"}{formatSEK(Math.abs(ruta49))}
                  </span>
                  <p className="text-[10px] text-muted-foreground">
                    {ruta49 >= 0 ? "Att betala" : "Att få tillbaka"}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Checks */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Kontroller</p>
              {checks.map((c) => (
                <div key={c.id} className="flex items-center gap-2 text-xs">
                  {c.status === "pass" ? <CheckCircle2 className="w-3.5 h-3.5 text-[#085041] shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 text-[#7A5417] shrink-0" />}
                  <span>{c.text}</span>
                </div>
              ))}
            </div>

            {/* Submit / Read-only */}
            {!isReadOnly && (
              <div className="flex justify-center pt-2">
                <DemoSubmitButton
                  label="Skicka momsdeklaration"
                  authority="Skatteverket"
                  onDemoSubmit={handleSubmit}
                  disabled={signing}
                  icon={signing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  className="w-full h-11"
                />
              </div>
            )}
          </>
        )}
        </>
        )}
      </div>
    </TooltipProvider>
  );
};

// --- Sub-components ---

const SectionCard = ({ section, title, children }: { section: string; title: string; children: React.ReactNode }) => (
  <div className={`rounded-lg border-l-4 ${SECTION_COLORS[section]} border border-border/50 overflow-hidden`}>
    <div className={`px-3 py-2 ${SECTION_BG[section]}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Avsnitt {section} — {title}
      </p>
    </div>
    <div className="divide-y divide-border/50">{children}</div>
  </div>
);

interface RutaRowProps {
  ruta: string;
  label: string;
  data: RutaData;
  overrides: Record<string, number>;
  formula?: string;
  editable?: boolean;
  readOnly?: boolean;
  onChange?: (ruta: string, value: string) => void;
}

const RutaRow = ({ ruta, label, data, overrides, formula, editable, readOnly, onChange }: RutaRowProps) => {
  const rd = data[ruta];
  const value = overrides[ruta] ?? rd?.value ?? 0;
  const isAuto = rd?.auto && !(ruta in overrides);
  const hasMissing = rd?.missingAccount;

  return (
    <div className="flex items-center justify-between px-3 py-2 text-xs hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="font-mono text-muted-foreground w-6 shrink-0">{ruta}</span>
        <span className="truncate">{label}</span>
        {formula && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Calculator className="w-3 h-3 text-muted-foreground shrink-0 cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top"><p className="text-xs">{formula}</p></TooltipContent>
          </Tooltip>
        )}
        {hasMissing && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] bg-[#FAEEDA] text-[#7A5417] dark:bg-amber-900/30 dark:text-amber-300 shrink-0">
                <AlertTriangle className="w-2.5 h-2.5" />
                Saknas
              </span>
            </TooltipTrigger>
            <TooltipContent><p className="text-xs">Konto {hasMissing} saknas — ruta {ruta} ej auto-beräknad</p></TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isAuto && value !== 0 && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#E1F5EE] text-[#085041] dark:bg-emerald-900/30 dark:text-emerald-300">Huvudbok</span>
        )}
        {editable && onChange && !readOnly ? (
          <Input
            type="text"
            className="w-28 h-7 text-right font-mono text-xs tabular-nums"
            defaultValue={value === 0 ? "" : Math.round(value).toString()}
            placeholder="0"
            onBlur={(e) => onChange(ruta, e.target.value)}
          />
        ) : (
          <span className={`font-mono tabular-nums w-28 text-right ${value === 0 ? "text-muted-foreground" : "font-medium"}`}>
            {value === 0 ? "—" : formatSEK(value)}
          </span>
        )}
      </div>
    </div>
  );
};
