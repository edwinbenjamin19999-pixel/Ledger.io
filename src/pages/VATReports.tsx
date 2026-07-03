import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, FileText, Loader2, Percent, AlertTriangle, Calendar } from "lucide-react";
import { VATHorizontalDeclaration } from "@/components/vat/VATHorizontalDeclaration";
import { AIReviewPanel } from "@/components/vat/AIReviewPanel";
import { BoxDrilldownDrawer } from "@/components/vat/BoxDrilldownDrawer";
import { FilingReadinessBar } from "@/components/vat/FilingReadinessBar";
import { TaxImpactInsightsSection } from "@/components/vat/TaxImpactInsightsSection";
import { VATHeroRow } from "@/components/vat/VATHeroRow";
import { FinOSInsightStack } from "@/components/finos/FinOSInsightStack";
import { vatFindingToInsight } from "@/lib/finos/adapters/vatFindingToInsight";
import { Sparkles } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { VATCorrectionDialog } from "@/components/vat/VATCorrectionDialog";
import { VATSettlementDialog } from "@/components/vat/VATSettlementDialog";
import { VATPaymentDialog } from "@/components/vat/VATPaymentDialog";
import { VATSubmitDialog } from "@/components/vat/VATSubmitDialog";
import { runVATRuleChecks, calculateConfidenceBreakdown, calculateOverallConfidence, deriveVerdict, type VATFinding, type ConfidenceBreakdown as CB } from "@/lib/vat/vatReviewEngine";
import { pickDefaultCompanyId } from "@/lib/company-selection";
import { Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useVATOverrides } from "@/hooks/useVATOverrides";
import { cn } from "@/lib/utils";
import { computeVATBoxesFromGL, type VATDeclarationData, type AccountBalance } from "@/lib/vat/computeVATBoxesFromGL";

interface Company {
  id: string;
  name: string;
  vat_number?: string;
  org_number?: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];
const MONTHS_FULL = ["Januari", "Februari", "Mars", "April", "Maj", "Juni", "Juli", "Augusti", "September", "Oktober", "November", "December"];

const VATReports = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedPeriod, setSelectedPeriod] = useState((new Date().getMonth() + 1).toString());
  const [periodType, setPeriodType] = useState<"monthly" | "quarterly">("monthly");
  const [vatData, setVatData] = useState<VATDeclarationData | null>(null);
  const [previousBox49, setPreviousBox49] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [latestDataHint, setLatestDataHint] = useState<string | null>(null);
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);

  // AI review state
  const [aiReviewOpen, setAiReviewOpen] = useState(false);
  const [aiReview, setAiReview] = useState<{
    verdict: "correct" | "review" | "critical";
    confidence: number;
    findingsCount: number;
    criticalCount: number;
  } | null>(null);
  const [aiReviewLoading, setAiReviewLoading] = useState(false);

  // Drilldown state
  const [drilldownBox, setDrilldownBox] = useState<string | null>(null);

  // Settlement / payment / correction
  const [settlementOpen, setSettlementOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [activeFinding, setActiveFinding] = useState<VATFinding | null>(null);
  const [declarationStatus, setDeclarationStatus] = useState<
    "draft" | "ai_reviewed" | "review_required" | "ready" | "filed" | "settled" | "paid" | "refunded" | "closed"
  >("draft");

  // Compute period label early so hooks below can depend on it
  const periodLabel = periodType === "monthly"
    ? `${selectedYear}-${String(selectedPeriod).padStart(2, "0")}`
    : `Q${selectedPeriod} ${selectedYear}`;

  // Persisted overrides
  const { valueMap: overrideValues, saveOverride, removeOverride, resetAll: resetOverrides } =
    useVATOverrides(selectedCompany || null, periodLabel);

  // Period date range (for drilldown)
  const { periodStart, periodEnd } = useMemo(() => {
    const year = parseInt(selectedYear);
    const period = parseInt(selectedPeriod);
    if (periodType === "monthly") {
      const start = `${year}-${String(period).padStart(2, "0")}-01`;
      const lastDay = new Date(year, period, 0).getDate();
      return { periodStart: start, periodEnd: `${year}-${String(period).padStart(2, "0")}-${lastDay}` };
    }
    const startMonth = (period - 1) * 3 + 1;
    const endMonth = period * 3;
    const start = `${year}-${String(startMonth).padStart(2, "0")}-01`;
    const lastDay = new Date(year, endMonth, 0).getDate();
    return { periodStart: start, periodEnd: `${year}-${String(endMonth).padStart(2, "0")}-${lastDay}` };
  }, [selectedYear, selectedPeriod, periodType]);

  useEffect(() => { if (!loading && !user) navigate("/auth"); }, [user, loading, navigate]);
  useEffect(() => { if (user) loadCompanies(); }, [user]);

  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase.from("companies").select("id, name, vat_number, org_number").order("name");
      if (error) throw error;
      setCompanies(data || []);
      if (data?.length) {
        const preferred = pickDefaultCompanyId(data);
        setSelectedCompany(preferred);
        detectLatestPeriod(preferred);
        loadAvailablePeriods(preferred);
      }
    } catch (error: any) {
      toast.error(error.message || "Kunde inte ladda företag");
    }
  };

  const loadAvailablePeriods = async (companyId: string) => {
    try {
      const { data } = await supabase
        .from("journal_entries")
        .select("entry_date")
        .eq("company_id", companyId)
        .eq("status", "approved");
      if (data) {
        const periods = new Set<string>();
        data.forEach(e => { if (e.entry_date) periods.add(e.entry_date.substring(0, 7)); });
        setAvailablePeriods(Array.from(periods).sort());
      }
    } catch (e) { console.error("Could not load available periods:", e); }
  };

  useEffect(() => {
    if (selectedCompany && selectedYear && selectedPeriod) calculateVAT();
  }, [selectedCompany, selectedYear, selectedPeriod, periodType]);

  const detectLatestPeriod = async (companyId: string) => {
    try {
      const { data } = await supabase
        .from("journal_entries")
        .select("entry_date")
        .eq("company_id", companyId)
        .eq("status", "approved")
        .order("entry_date", { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        const latestDate = new Date(data[0].entry_date);
        const latestMonth = latestDate.getMonth() + 1;
        const latestYear = latestDate.getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        if (latestYear !== currentYear || latestMonth !== currentMonth) {
          setSelectedYear(latestYear.toString());
          setSelectedPeriod(latestMonth.toString());
          setLatestDataHint(`Senaste bokföring: ${latestYear}-${String(latestMonth).padStart(2, "0")}`);
        }
      }
    } catch (e) { console.error("Could not detect latest period:", e); }
  };

  const calculateVAT = async () => {
    if (!selectedCompany) return;
    setIsCalculating(true);
    try {
      const result = await computeVATBoxesFromGL(selectedCompany, periodStart, periodEnd);
      setVatData(result);
      // Compute previous period box49 for delta — same engine, no new logic
      try {
        const year = parseInt(selectedYear);
        const period = parseInt(selectedPeriod);
        let prevStart: string, prevEnd: string;
        if (periodType === "monthly") {
          const py = period === 1 ? year - 1 : year;
          const pm = period === 1 ? 12 : period - 1;
          const lastDay = new Date(py, pm, 0).getDate();
          prevStart = `${py}-${String(pm).padStart(2, "0")}-01`;
          prevEnd = `${py}-${String(pm).padStart(2, "0")}-${lastDay}`;
        } else {
          const py = period === 1 ? year - 1 : year;
          const pq = period === 1 ? 4 : period - 1;
          const sm = (pq - 1) * 3 + 1;
          const em = pq * 3;
          const lastDay = new Date(py, em, 0).getDate();
          prevStart = `${py}-${String(sm).padStart(2, "0")}-01`;
          prevEnd = `${py}-${String(em).padStart(2, "0")}-${lastDay}`;
        }
        const prev = await computeVATBoxesFromGL(selectedCompany, prevStart, prevEnd);
        setPreviousBox49(prev?.hasData ? prev.box49 : null);
      } catch { setPreviousBox49(null); }
      if (!result.hasData) {
        toast.info("Inga godkända verifikationer hittades för vald period");
      } else {
        toast.success("Momsberäkning klar!");
      }
    } catch (error: any) {
      toast.error(error.message || "Kunde inte beräkna moms");
    } finally {
      setIsCalculating(false);
    }
  };

  // Build VATSnapshot for AI review (with override values applied)
  const vatSnapshot = useMemo(() => {
    if (!vatData) return null;
    const get = (b: string, original: number) =>
      overrideValues[b] !== undefined ? overrideValues[b] : original;
    return {
      box05: get("05", vatData.box05), box06: get("06", vatData.box06), box07: get("07", vatData.box07), box08: get("08", vatData.box08),
      box10: get("10", vatData.box10), box11: get("11", vatData.box11), box12: get("12", vatData.box12),
      box20: get("20", vatData.box20), box21: get("21", vatData.box21), box22: get("22", vatData.box22), box23: get("23", vatData.box23), box24: get("24", vatData.box24),
      box30: get("30", vatData.box30), box31: get("31", vatData.box31), box32: get("32", vatData.box32),
      box35: get("35", vatData.box35), box36: get("36", vatData.box36), box39: get("39", vatData.box39), box40: get("40", vatData.box40), box41: get("41", vatData.box41), box42: get("42", vatData.box42),
      box48: get("48", vatData.box48), box49: get("49", vatData.box49),
      box50: get("50", vatData.box50), box60: get("60", vatData.box60), box61: get("61", vatData.box61), box62: get("62", vatData.box62),
    };
  }, [vatData, overrideValues]);

  // Findings + breakdown — single source of truth for Insights bar + Confidence panel
  const findings = useMemo<VATFinding[]>(() => {
    if (!vatSnapshot) return [];
    try { return runVATRuleChecks({ current: vatSnapshot, overrides: overrideValues }); }
    catch { return []; }
  }, [vatSnapshot, overrideValues]);

  const hasOverrides = Object.keys(overrideValues).length > 0;
  const breakdown = useMemo<CB | null>(() => {
    if (!vatSnapshot) return null;
    return calculateConfidenceBreakdown(findings, hasOverrides);
  }, [vatSnapshot, findings, hasOverrides]);

  const overallConfidence = useMemo(() => {
    if (!breakdown) return null;
    return calculateOverallConfidence(breakdown, false);
  }, [breakdown]);

  // Auto-update aiReview summary when findings change (debounced)
  const aiTriggerTimer = useRef<number | null>(null);
  useEffect(() => {
    if (!vatSnapshot || !selectedCompany) return;
    if (aiTriggerTimer.current) window.clearTimeout(aiTriggerTimer.current);
    aiTriggerTimer.current = window.setTimeout(() => {
      try {
        const verdict = deriveVerdict(findings);
        setAiReview({
          verdict,
          confidence: overallConfidence ?? 0,
          findingsCount: findings.length,
          criticalCount: findings.filter(f => f.severity === "critical").length,
        });
        // Auto-advance status: draft → ai_reviewed once findings are computed
        if (declarationStatus === "draft" && findings.length >= 0) {
          setDeclarationStatus(verdict === "critical" ? "review_required" : "ai_reviewed");
        }
      } catch (e) { console.error("AI summary failed:", e); }
    }, 600);
    return () => { if (aiTriggerTimer.current) window.clearTimeout(aiTriggerTimer.current); };
  }, [vatSnapshot, selectedCompany, findings, overallConfidence, declarationStatus]);

  const handleSubmitDeclaration = async () => {
    toast.success("Momsdeklaration förberedd för signering");
    // Real submit flow goes through BankID — already exists in VATHorizontalDeclaration
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return null;

  const selectedCompanyData = companies.find(c => c.id === selectedCompany);

  const yearNum = parseInt(selectedYear);

  // Generate period pills
  const periodPills = periodType === "monthly"
    ? MONTHS.map((m, i) => ({ value: String(i + 1), label: `${m} ${selectedYear}` }))
    : [1, 2, 3, 4].map(q => ({ value: String(q), label: `Q${q} ${selectedYear}` }));

  // Show recent 6 periods in the pill bar
  const currentPeriodIdx = periodPills.findIndex(p => p.value === selectedPeriod);
  const startIdx = Math.max(0, Math.min(currentPeriodIdx - 2, periodPills.length - 6));
  const visiblePills = periodPills.slice(startIdx, startIdx + 6);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-background">
      <PageHeader
        icon={Percent}
        title="Momsdeklaration"
        subtitle="SKV 4700 — Automatisk momsberäkning"
      />

      <div className="px-8 space-y-5">
        {/* SINGLE summary strip — replaces the 3 duplicated KPI cards */}
        {vatData && (
          <VATHeroRow
            vatPayable={vatSnapshot?.box49 ?? vatData.box49}
            outputVat={vatData.box10 + vatData.box11 + vatData.box12 + vatData.box30 + vatData.box31 + vatData.box32 + vatData.box60 + vatData.box61 + vatData.box62}
            inputVat={vatData.box48}
            periodLabel={periodLabel}
            previousVatPayable={previousBox49}
            onReviewAI={() => setAiReviewOpen(true)}
          />
        )}

        {/* Company selector + period type */}
        <div className="flex items-center gap-4 flex-wrap">
          <Select value={selectedCompany} onValueChange={(v) => { setSelectedCompany(v); detectLatestPeriod(v); loadAvailablePeriods(v); setVatData(null); }}>
            <SelectTrigger className="w-56 h-[34px] rounded-[8px] border-[0.5px] border-[#E2E8F0] bg-white"><SelectValue placeholder="Välj företag" /></SelectTrigger>
            <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>

          <div className="flex items-center bg-[#F1F5F9] rounded-[10px] p-1 gap-1">
            <button
              onClick={() => { setPeriodType("monthly"); setSelectedPeriod("1"); }}
              className={cn(
                "px-3 h-[28px] text-sm font-medium rounded-[8px] transition-colors",
                periodType === "monthly" ? "bg-[#0F1F3D] text-white" : "text-[#475569] hover:bg-white"
              )}
            >
              Månadsvis
            </button>
            <button
              onClick={() => { setPeriodType("quarterly"); setSelectedPeriod("1"); }}
              className={cn(
                "px-3 h-[28px] text-sm font-medium rounded-[8px] transition-colors",
                periodType === "quarterly" ? "bg-[#0F1F3D] text-white" : "text-[#475569] hover:bg-white"
              )}
            >
              Kvartalsvis
            </button>
          </div>

          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-24 h-[34px] rounded-[8px] border-[0.5px] border-[#E2E8F0] bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>{[2024, 2025, 2026].map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
          </Select>

          {isCalculating && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Beräknar...
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            <span className="bg-[#F1F5F9] text-[#475569] border-[0.5px] border-[#E2E8F0] rounded-full px-2.5 h-[22px] text-[11px] font-medium inline-flex items-center gap-1.5">
              <Calendar className="w-3 h-3" />
              Ej inskickad
            </span>
          </div>
        </div>

        {/* Period pill selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {visiblePills.map(p => {
            const isActive = p.value === selectedPeriod;
            const periodKey = periodType === "monthly"
              ? `${selectedYear}-${String(p.value).padStart(2, "0")}`
              : null;
            const hasData = periodKey ? availablePeriods.some(ap => ap.startsWith(periodKey)) : false;

            return (
              <button
                key={p.value}
                onClick={() => setSelectedPeriod(p.value)}
                className={cn(
                  "px-3 h-[28px] text-sm font-medium rounded-full transition-colors whitespace-nowrap relative",
                  isActive
                    ? "bg-[#0F1F3D] text-white"
                    : "bg-white text-[#475569] border-[0.5px] border-[#E2E8F0] hover:border-[#0F1F3D]/30"
                )}
              >
                {p.label}
                {hasData && !isActive && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#1D9E75]" />
                )}
              </button>
            );
          })}
        </div>

        {vatData ? (
          <>
            {/* FinOS unified insight stack — replaces VAT-specific grid */}
            <section>
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-[#3b82f6]" />
                  AI-insikter · Moms
                </h2>
                <span className="text-[11px] text-muted-foreground">{findings.length} fynd · sorterade efter allvar</span>
              </div>
              <FinOSInsightStack
                insights={findings.map((f) =>
                  vatFindingToInsight(f, {
                    onFix: (ff) => { setActiveFinding(ff); setCorrectionOpen(true); },
                    onDrilldown: (ff) => ff.affectedBox && setDrilldownBox(ff.affectedBox),
                  }),
                )}
                limit={6}
              />
            </section>

            <Tabs defaultValue="declaration" className="space-y-5">
              <div className="bg-[#F1F5F9] rounded-[10px] p-1 inline-flex gap-1">
                <TabsList className="bg-transparent p-0 h-auto">
                  <TabsTrigger value="declaration" className="data-[state=active]:bg-[#0F1F3D] data-[state=active]:text-white rounded-[8px] px-3 h-[28px] text-sm font-medium data-[state=active]:shadow-none">Momsdeklaration</TabsTrigger>
                  <TabsTrigger value="reconciliation" className="data-[state=active]:bg-[#0F1F3D] data-[state=active]:text-white rounded-[8px] px-3 h-[28px] text-sm font-medium data-[state=active]:shadow-none">Momsavstämning</TabsTrigger>
                  <TabsTrigger value="accounts" className="data-[state=active]:bg-[#0F1F3D] data-[state=active]:text-white rounded-[8px] px-3 h-[28px] text-sm font-medium data-[state=active]:shadow-none">Kontounderlag</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="declaration" className="space-y-5">
                {/* 2-col layout: declaration (main) + sticky Action panel */}
                <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5 items-start">
                  <div className="space-y-5 min-w-0">
                    {/* Skatteeffekt — collapsible (default closed) */}
                    <Collapsible>
                      <div className="rounded-[12px] bg-white border-[0.5px] border-[#E2E8F0] overflow-hidden">
                        <CollapsibleTrigger className="w-full flex items-center justify-between px-5 py-3 hover:bg-[#F8FAFC] transition-colors">
                          <div className="flex items-center gap-2 text-sm font-semibold text-[#0F1F3D]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#0F1F3D]" />
                            Skatteeffekt &amp; analys
                          </div>
                          <ChevronDown className="w-4 h-4 text-[#64748B] transition-transform data-[state=open]:rotate-180" />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="border-t-[0.5px] border-[#E2E8F0] p-4">
                            <TaxImpactInsightsSection
                              vatPayable={vatData.box49}
                              totalSales={vatData.box05 + vatData.box06 + vatData.box07 + vatData.box08}
                              inputVat={vatData.box48}
                            />
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>

                    <VATHorizontalDeclaration
                      vatData={vatData}
                      periodLabel={periodLabel}
                      companyName={selectedCompanyData?.name || ""}
                      orgNumber={selectedCompanyData?.org_number}
                      onDrillDown={(box) => setDrilldownBox(box)}
                      onReviewAI={() => setAiReviewOpen(true)}
                      overrideValues={overrideValues}
                      onSaveOverride={saveOverride}
                      onRemoveOverride={removeOverride}
                      onResetOverrides={resetOverrides}
                      findings={findings}
                    />
                  </div>

                  <div className="hidden xl:block xl:sticky xl:top-4">
                    <FinOSInsightStack
                      insights={findings.map((f) =>
                        vatFindingToInsight(f, {
                          onFix: (ff) => { setActiveFinding(ff); setCorrectionOpen(true); },
                          onDrilldown: (ff) => ff.affectedBox && setDrilldownBox(ff.affectedBox),
                        }),
                      )}
                      limit={4}
                      dense
                    />
                  </div>
                </div>
              </TabsContent>

            <TabsContent value="reconciliation">
              <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="bg-muted/30 border-b border-border px-6 py-4">
                  <h3 className="text-sm font-semibold text-foreground">Momsavstämning — {periodLabel}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Utgående och ingående momskonton med UB för perioden</p>
                </div>
                <div className="p-6 space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-3 mb-4">Utgående moms</h4>
                      <div className="rounded-xl border border-border overflow-hidden">
                        <table className="w-full text-sm">
                          <thead><tr className="bg-muted/30"><th className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4 text-left">Konto</th><th className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4 text-left">Namn</th><th className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4 text-right">UB period</th></tr></thead>
                          <tbody>
                            {vatData.outputVatAccounts.map(a => (
                              <tr key={a.accountNumber} className="border-b border-border hover:bg-muted/20 transition-colors">
                                <td className="py-3 px-4 font-mono text-foreground">{a.accountNumber}</td>
                                <td className="py-3 px-4 text-muted-foreground">{a.accountName}</td>
                                <td className="py-3 px-4 text-right font-mono text-foreground font-medium">{(a.creditTotal - a.debitTotal).toLocaleString("sv-SE", { minimumFractionDigits: 2 })}</td>
                              </tr>
                            ))}
                            {vatData.outputVatAccounts.length === 0 && <tr><td colSpan={3} className="py-8 text-center text-muted-foreground">Inga utgående momskonton</td></tr>}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                              <td colSpan={2} className="py-3 px-4 text-foreground">Summa utgående</td>
                              <td className="py-3 px-4 text-right font-mono text-foreground">{vatData.outputVatAccounts.reduce((s, a) => s + (a.creditTotal - a.debitTotal), 0).toLocaleString("sv-SE", { minimumFractionDigits: 2 })}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-3 mb-4">Ingående moms</h4>
                      <div className="rounded-xl border border-border overflow-hidden">
                        <table className="w-full text-sm">
                          <thead><tr className="bg-muted/30"><th className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4 text-left">Konto</th><th className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4 text-left">Namn</th><th className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4 text-right">UB period</th></tr></thead>
                          <tbody>
                            {vatData.inputVatAccounts.map(a => (
                              <tr key={a.accountNumber} className="border-b border-border hover:bg-muted/20 transition-colors">
                                <td className="py-3 px-4 font-mono text-foreground">{a.accountNumber}</td>
                                <td className="py-3 px-4 text-muted-foreground">{a.accountName}</td>
                                <td className="py-3 px-4 text-right font-mono text-foreground font-medium">{(a.debitTotal - a.creditTotal).toLocaleString("sv-SE", { minimumFractionDigits: 2 })}</td>
                              </tr>
                            ))}
                            {vatData.inputVatAccounts.length === 0 && <tr><td colSpan={3} className="py-8 text-center text-muted-foreground">Inga ingående momskonton</td></tr>}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                              <td colSpan={2} className="py-3 px-4 text-foreground">Summa ingående</td>
                              <td className="py-3 px-4 text-right font-mono text-foreground">{vatData.inputVatAccounts.reduce((s, a) => s + (a.debitTotal - a.creditTotal), 0).toLocaleString("sv-SE", { minimumFractionDigits: 2 })}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Avstämning */}
                  <div className="bg-card rounded-xl border border-border p-5 space-y-3">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border pb-3 mb-4">Avstämning</h4>
                    {(() => {
                      const bookOutput = vatData.outputVatAccounts.reduce((s, a) => s + (a.creditTotal - a.debitTotal), 0);
                      const declOutput = vatData.box10 + vatData.box11 + vatData.box12 + vatData.box30 + vatData.box31 + vatData.box32 + vatData.box60 + vatData.box61 + vatData.box62;
                      const bookInput = vatData.inputVatAccounts.reduce((s, a) => s + (a.debitTotal - a.creditTotal), 0);
                      const declInput = vatData.box48;
                      const outputDiff = Math.abs(bookOutput - declOutput);
                      const inputDiff = Math.abs(bookInput - declInput);
                      const hasRoundingDiff = outputDiff > 0.001 || inputDiff > 0.001;

                      return (
                        <>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex justify-between"><span className="text-muted-foreground">Utgående moms (bokföring)</span><span className="font-mono text-foreground">{bookOutput.toLocaleString("sv-SE", { minimumFractionDigits: 2 })} kr</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Utgående moms (deklaration)</span><span className="font-mono text-foreground">{declOutput.toLocaleString("sv-SE")} kr</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Ingående moms (bokföring)</span><span className="font-mono text-foreground">{bookInput.toLocaleString("sv-SE", { minimumFractionDigits: 2 })} kr</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Ingående moms (deklaration: ruta 48)</span><span className="font-mono text-foreground">{declInput.toLocaleString("sv-SE")} kr</span></div>
                          </div>
                          {hasRoundingDiff && (
                            <div className="rounded-xl border border-[#F0DDB7] dark:border-amber-800 p-4 bg-amber-50/50 dark:bg-amber-950/20 text-sm space-y-1 mt-2">
                              <div className="flex items-center gap-2 font-medium text-[#7A5417] dark:text-[#C28A2B]">
                                <AlertTriangle className="h-4 w-4" />
                                Öresavrundning (SKV avrundning till heltal)
                              </div>
                              {outputDiff > 0.001 && (
                                <div className="flex justify-between text-xs"><span className="text-[#7A5417] dark:text-[#C28A2B]">Utgående differens</span><span className="font-mono text-[#7A5417] dark:text-[#C28A2B]">{outputDiff.toLocaleString("sv-SE", { minimumFractionDigits: 2 })} kr</span></div>
                              )}
                              {inputDiff > 0.001 && (
                                <div className="flex justify-between text-xs"><span className="text-[#7A5417] dark:text-[#C28A2B]">Ingående differens</span><span className="font-mono text-[#7A5417] dark:text-[#C28A2B]">{inputDiff.toLocaleString("sv-SE", { minimumFractionDigits: 2 })} kr</span></div>
                              )}
                              <p className="text-xs text-[#7A5417] dark:text-[#C28A2B]">Deklarationen avrundas till hela kronor. Bokför differensen på konto 3740.</p>
                            </div>
                          )}
                          <div className="border-t border-border pt-3 mt-3 flex justify-between font-semibold">
                            <span className="text-foreground">Moms att betala/återfå (ruta 49)</span>
                            <span className={cn("font-mono", vatData.box49 >= 0 ? "text-[#7A1A1A] dark:text-[#C73838]" : "text-[#085041] dark:text-[#1D9E75]")}>{vatData.box49.toLocaleString("sv-SE")} kr</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <Button variant="outline" className="rounded-xl gap-2"><Download className="w-4 h-4" />Exportera PDF</Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="accounts">
              <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="bg-muted/30 border-b border-border px-6 py-4">
                  <h3 className="text-sm font-semibold text-foreground">Kontounderlag — {periodLabel}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Alla konton med transaktioner i perioden</p>
                </div>
                <div className="p-6">
                  {vatData.allAccounts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border-2 border-dashed border-border">
                      <FileText className="w-12 h-12 text-muted-foreground/30 mb-4" />
                      <p className="text-muted-foreground font-medium">Inga transaktioner hittades</p>
                      <p className="text-muted-foreground/60 text-sm mt-1">Välj en period med bokförda verifikationer</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/30">
                            <th className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4 text-left">Konto</th>
                            <th className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4 text-left">Namn</th>
                            <th className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4 text-center">Moms</th>
                            <th className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4 text-right">Debet</th>
                            <th className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4 text-right">Kredit</th>
                            <th className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4 text-right">Netto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vatData.allAccounts.map(a => (
                            <tr key={a.accountNumber} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                              <td className="py-3 px-4 font-mono text-foreground">{a.accountNumber}</td>
                              <td className="py-3 px-4 text-muted-foreground">{a.accountName}</td>
                              <td className="py-3 px-4 text-center text-muted-foreground">{a.vatCode ? `${a.vatCode}%` : "—"}</td>
                              <td className="py-3 px-4 text-right font-mono text-foreground">{a.debitTotal > 0 ? a.debitTotal.toLocaleString("sv-SE") : ""}</td>
                              <td className="py-3 px-4 text-right font-mono text-foreground">{a.creditTotal > 0 ? a.creditTotal.toLocaleString("sv-SE") : ""}</td>
                              <td className="py-3 px-4 text-right font-mono font-medium text-foreground">{(a.creditTotal - a.debitTotal).toLocaleString("sv-SE")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border-2 border-dashed border-border">
            <FileText className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-muted-foreground font-medium text-xl">Välj period och beräkna moms</h3>
            <p className="text-muted-foreground/60 text-sm mt-1">Välj företag, period — beräkningen startar automatiskt</p>
          </div>
        )}
      </div>

      {/* Spacer so sticky bar doesn't cover content */}
      {vatData && <div className="h-24" />}

      {/* Filing readiness bar (sticky bottom) — extended with settlement + payment */}
      {vatData && (
        <FilingReadinessBar
          vatPayable={vatSnapshot?.box49 ?? vatData.box49}
          confidence={aiReviewLoading ? null : overallConfidence}
          unresolvedCount={findings.length}
          hasCriticalIssues={findings.some(f => f.severity === "critical")}
          hasOverrides={Object.keys(overrideValues).length > 0}
          status={declarationStatus}
          submitMode="dialog"
          onReviewAI={() => setAiReviewOpen(true)}
          onSaveDraft={() => toast.success("Utkast sparat")}
          onSubmit={() => { setSubmitOpen(true); }}
          onBookSettlement={() => setSettlementOpen(true)}
          onRegisterPayment={() => setPaymentOpen(true)}
        />
      )}

      {/* Submit dialog — BankID + XML download */}
      {vatData && selectedCompany && selectedCompanyData && (
        <VATSubmitDialog
          open={submitOpen}
          onOpenChange={setSubmitOpen}
          companyId={selectedCompany}
          orgNr={selectedCompanyData.org_number ?? selectedCompanyData.vat_number ?? ""}
          periodLabel={periodLabel}
          boxes={{
            ruta05: vatSnapshot?.box05 ?? vatData.box05,
            ruta06: vatSnapshot?.box06 ?? vatData.box06,
            ruta07: vatSnapshot?.box07 ?? vatData.box07,
            ruta08: vatSnapshot?.box08 ?? vatData.box08,
            ruta10: vatSnapshot?.box10 ?? vatData.box10,
            ruta11: vatSnapshot?.box11 ?? vatData.box11,
            ruta12: vatSnapshot?.box12 ?? vatData.box12,
            ruta20: vatSnapshot?.box20 ?? vatData.box20,
            ruta21: vatSnapshot?.box21 ?? vatData.box21,
            ruta22: vatSnapshot?.box22 ?? vatData.box22,
            ruta23: vatSnapshot?.box23 ?? vatData.box23,
            ruta24: vatSnapshot?.box24 ?? vatData.box24,
            ruta30: vatSnapshot?.box30 ?? vatData.box30,
            ruta31: vatSnapshot?.box31 ?? vatData.box31,
            ruta32: vatSnapshot?.box32 ?? vatData.box32,
            ruta35: vatSnapshot?.box35 ?? vatData.box35,
            ruta36: vatSnapshot?.box36 ?? vatData.box36,
            ruta37: vatData.box37,
            ruta38: vatData.box38,
            ruta39: vatSnapshot?.box39 ?? vatData.box39,
            ruta40: vatSnapshot?.box40 ?? vatData.box40,
            ruta41: vatSnapshot?.box41 ?? vatData.box41,
            ruta42: vatSnapshot?.box42 ?? vatData.box42,
            ruta48: vatSnapshot?.box48 ?? vatData.box48,
            ruta49: vatSnapshot?.box49 ?? vatData.box49,
            ruta50: vatSnapshot?.box50 ?? vatData.box50,
            ruta60: vatSnapshot?.box60 ?? vatData.box60,
            ruta61: vatSnapshot?.box61 ?? vatData.box61,
            ruta62: vatSnapshot?.box62 ?? vatData.box62,
          }}
          onSubmitted={({ method }) => {
            if (method === "bankid") setDeclarationStatus("filed");
          }}
        />
      )}

      {/* AI Review Panel (right slide-in) */}
      <AIReviewPanel
        open={aiReviewOpen}
        onOpenChange={setAiReviewOpen}
        vatData={vatSnapshot}
        overrides={overrideValues}
        periodLabel={periodLabel}
        companyId={selectedCompany || null}
        onDrillDown={(box) => { setAiReviewOpen(false); setDrilldownBox(box); }}
      />

      {/* Box drilldown drawer */}
      <BoxDrilldownDrawer
        open={drilldownBox !== null}
        onOpenChange={(o) => !o && setDrilldownBox(null)}
        box={drilldownBox}
        periodStart={periodStart}
        periodEnd={periodEnd}
        companyId={selectedCompany || null}
        boxValue={drilldownBox && vatData ? (vatData as any)[`box${drilldownBox}`] : undefined}
      />

      {/* AI correction preview */}
      <VATCorrectionDialog
        open={correctionOpen}
        onOpenChange={setCorrectionOpen}
        finding={activeFinding}
        onOpenDrilldown={(box) => setDrilldownBox(box)}
      />

      {/* Settlement booking — clears 261x/262x/263x/264x → 2650 or 1650 */}
      {vatData && selectedCompany && (
        <VATSettlementDialog
          open={settlementOpen}
          onOpenChange={setSettlementOpen}
          companyId={selectedCompany}
          periodLabel={periodLabel}
          periodEndDate={periodEnd}
          outputBalances={vatData.outputVatAccounts.map(a => ({
            accountNumber: a.accountNumber,
            ubAmount: a.creditTotal - a.debitTotal,
          }))}
          inputBalances={vatData.inputVatAccounts.map(a => ({
            accountNumber: a.accountNumber,
            ubAmount: a.debitTotal - a.creditTotal,
          }))}
          onSuccess={() => setDeclarationStatus("settled")}
        />
      )}

      {/* Payment / refund booking */}
      {vatData && selectedCompany && (
        <VATPaymentDialog
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          companyId={selectedCompany}
          periodLabel={periodLabel}
          direction={(vatSnapshot?.box49 ?? vatData.box49) >= 0 ? "payable" : "receivable"}
          defaultAmount={Math.abs(vatSnapshot?.box49 ?? vatData.box49)}
          onSuccess={() => setDeclarationStatus(((vatSnapshot?.box49 ?? vatData.box49) >= 0) ? "paid" : "refunded")}
        />
      )}
    </div>
  );
};

export default VATReports;
