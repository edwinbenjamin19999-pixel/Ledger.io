import { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Calculator, Download, Loader2, Plus, Trash2, AlertTriangle, CheckCircle2,
  AlertCircle, Receipt, ChevronRight, Check, X, Link2, Percent, FileText, Landmark, CalendarDays, ScrollText,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ChartOfAccountsJoin } from "@/types/database-extensions";
import { differenceInDays, format } from "date-fns";
import { sv } from "date-fns/locale";
import { computeVATBoxesFromGL, quarterRange, monthRange, type VATDeclarationData } from "@/lib/vat/computeVATBoxesFromGL";
import { computeTax, type TaxEngineInput } from "@/lib/tax/taxEngine";
import { optimizeTax, type Recommendation } from "@/lib/tax/aiOptimizer";
import { TaxHeroRow } from "@/components/tax/TaxHeroRow";
import { AIInsightsGrid } from "@/components/tax/AIInsightsGrid";
import { ScenarioEngine } from "@/components/tax/ScenarioEngine";
import { TaxBreakdownAccordion } from "@/components/tax/TaxBreakdownAccordion";
import { TaxStickyFooter } from "@/components/tax/TaxStickyFooter";
import { INK2Section } from "@/components/tax/INK2Section";
import { bookFinalTax } from "@/lib/tax/bookFinalTax";
import type { INK2XmlInput } from "@/lib/tax/buildINK2Xml";

interface TaxRow {
  label: string; accountRange?: string; autoValue: number;
  adjustedValue: number; sign: "+" | "-" | "+/-"; editable: boolean;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

interface TimelineEvent {
  type: string; label: string; date: Date; amount: number;
  status: "submitted" | "today" | "soon" | "upcoming" | "missed";
}

const VATBox = ({ ruta, label, amount }: { ruta: string; label: string; amount: number; color?: string }) => (
  <div className="rounded-[8px] border-[0.5px] border-[#E2E8F0] bg-white p-3 transition-colors hover:border-[#C8DDF5]">
    <div className="text-base font-bold text-[#1E3A5F] font-mono">{ruta}</div>
    <div className="text-[11px] text-[#64748B] mt-0.5 line-clamp-2">{label}</div>
    <div className="text-sm font-bold text-[#0F1F3D] font-mono mt-1 tabular-nums">{fmt(amount)} kr</div>
  </div>
);

const TaxCalculation = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(true);

  // VAT/F-skatt sync
  const [vatPeriodType, setVatPeriodType] = useState<"monthly" | "quarterly" | "yearly">("quarterly");
  const [currentVAT, setCurrentVAT] = useState<VATDeclarationData | null>(null);
  const [quarterlyVAT, setQuarterlyVAT] = useState<{ q1: number; q2: number; q3: number; q4: number }>({ q1: 0, q2: 0, q3: 0, q4: 0 });
  const [submittedQuarters, setSubmittedQuarters] = useState<Set<number>>(new Set());
  const [fSkattPaidReal, setFSkattPaidReal] = useState(0);
  const [fSkattPaymentsCount, setFSkattPaymentsCount] = useState(0);
  const [currentVatPeriodLabel, setCurrentVatPeriodLabel] = useState("");

  const [resultRows, setResultRows] = useState<TaxRow[]>([
    { label: "Resultat före skatt", accountRange: "3000-8999", autoValue: 0, adjustedValue: 0, sign: "+/-", editable: true },
    { label: "Bokföringsmässiga avskrivningar", accountRange: "7810-7839", autoValue: 0, adjustedValue: 0, sign: "+", editable: true },
    { label: "Räntekostnader", accountRange: "8410-8462", autoValue: 0, adjustedValue: 0, sign: "+", editable: true },
    { label: "Ränteintäkter", accountRange: "8310-8390", autoValue: 0, adjustedValue: 0, sign: "-", editable: true },
  ]);

  const [adjustmentRows, setAdjustmentRows] = useState<TaxRow[]>([
    { label: "Ej skattepliktiga intäkter", accountRange: "8012,8020,8021", autoValue: 0, adjustedValue: 0, sign: "-", editable: true },
    { label: "Ej avdragsgilla kostnader", accountRange: "6072,7632,8051,8072", autoValue: 0, adjustedValue: 0, sign: "+", editable: true },
    { label: "Vändning bokf. avskrivning", accountRange: "7810-7839", autoValue: 0, adjustedValue: 0, sign: "+/-", editable: true },
    { label: "Skattemässig avskrivning", autoValue: 0, adjustedValue: 0, sign: "+/-", editable: true },
    { label: "Resultatandel KB", autoValue: 0, adjustedValue: 0, sign: "+/-", editable: true },
    { label: "Återföring periodiseringsfond", autoValue: 0, adjustedValue: 0, sign: "+", editable: true },
    { label: "Schablonintäkt p-fond", autoValue: 0, adjustedValue: 0, sign: "+", editable: true },
  ]);

  const [ibDeficit, setIbDeficit] = useState(0);
  const [receivedGroupContrib, setReceivedGroupContrib] = useState(0);
  const [givenGroupContrib, setGivenGroupContrib] = useState(0);
  const [negativeInterestNet, setNegativeInterestNet] = useState(0);
  const [periodizationAmount, setPeriodizationAmount] = useState(0);
  const [customAdjustments, setCustomAdjustments] = useState<{ label: string; value: number; sign: "+" | "-" }[]>([]);

  // Footer booking state
  const [booking, setBooking] = useState(false);
  const [bookedRef, setBookedRef] = useState<string | null>(null);

  useEffect(() => { if (!loading && !user) navigate("/auth"); }, [user, loading, navigate]);
  useEffect(() => { if (user) loadCompanies(); }, [user]);
  useEffect(() => { if (selectedCompany && year) { loadFromGL(); loadVATAndFSkatt(); } }, [selectedCompany, year]);

  const loadCompanies = async () => {
    const { data } = await supabase.from("companies").select("id, name, vat_period_type, org_number").order("name");
    if (data) { setCompanies(data); if (data.length) setSelectedCompany(data[0].id); }
  };

  const loadVATAndFSkatt = async () => {
    try {
      const { data: companyRow } = await supabase
        .from("companies").select("vat_period_type").eq("id", selectedCompany).maybeSingle();
      const ptype = ((companyRow as any)?.vat_period_type as "monthly" | "quarterly" | "yearly") || "quarterly";
      setVatPeriodType(ptype);

      const now = new Date();
      const isCurrentYear = now.getFullYear() === year;
      let currentRange: { start: string; end: string };
      let currentLabel: string;
      if (ptype === "monthly") {
        const m = isCurrentYear ? now.getMonth() + 1 : 12;
        currentRange = monthRange(year, m);
        currentLabel = `${year}-${String(m).padStart(2, "0")}`;
      } else if (ptype === "yearly") {
        currentRange = { start: `${year}-01-01`, end: `${year}-12-31` };
        currentLabel = `${year}`;
      } else {
        const q = isCurrentYear ? (Math.floor(now.getMonth() / 3) + 1) as 1 | 2 | 3 | 4 : 4;
        currentRange = quarterRange(year, q);
        currentLabel = `Q${q} ${year}`;
      }
      setCurrentVatPeriodLabel(currentLabel);
      const current = await computeVATBoxesFromGL(selectedCompany, currentRange.start, currentRange.end);
      setCurrentVAT(current);

      const [q1, q2, q3, q4] = await Promise.all(
        ([1, 2, 3, 4] as const).map(async q => {
          const { start, end } = quarterRange(year, q);
          const r = await computeVATBoxesFromGL(selectedCompany, start, end);
          return r.box49;
        })
      );
      setQuarterlyVAT({ q1, q2, q3, q4 });

      const { data: vatPeriods } = await supabase
        .from("vat_periods" as any).select("period_start, submitted_at")
        .eq("company_id", selectedCompany)
        .gte("period_start", `${year}-01-01`).lte("period_start", `${year}-12-31`);
      const submitted = new Set<number>();
      (vatPeriods ?? []).forEach((p: any) => {
        if (!p.submitted_at) return;
        const m = new Date(p.period_start).getMonth();
        submitted.add(Math.floor(m / 3) + 1);
      });
      setSubmittedQuarters(submitted);

      const { data: fSkattLines } = await supabase
        .from("journal_entry_lines")
        .select("debit, credit, chart_of_accounts!inner(account_number, company_id), journal_entries!inner(entry_date, status, company_id)")
        .eq("chart_of_accounts.company_id", selectedCompany)
        .eq("journal_entries.company_id", selectedCompany)
        .eq("journal_entries.status", "approved")
        .in("chart_of_accounts.account_number", ["2510", "1630"])
        .gte("journal_entries.entry_date", `${year}-01-01`)
        .lte("journal_entries.entry_date", `${year}-12-31`);

      let paid = 0;
      const months = new Set<string>();
      (fSkattLines ?? []).forEach((l: any) => {
        const acct = (l.chart_of_accounts as any)?.account_number;
        const debit = Number(l.debit) || 0;
        const credit = Number(l.credit) || 0;
        if (acct === "2510") paid += debit - credit;
        else if (acct === "1630") paid += credit - debit;
        const d = (l.journal_entries as any)?.entry_date;
        if (d) months.add(d.substring(0, 7));
      });
      setFSkattPaidReal(Math.max(0, Math.round(paid)));
      setFSkattPaymentsCount(months.size);
    } catch (err) {
      console.error("Failed to load VAT/F-skatt sync:", err);
    }
  };

  const loadFromGL = async () => {
    setIsLoading(true);
    try {
      const startDate = `${year}-01-01`; const endDate = `${year}-12-31`;
      const { data: lines } = await supabase.from("journal_entry_lines")
        .select("debit, credit, chart_of_accounts!inner(account_number, company_id)")
        .eq("chart_of_accounts.company_id", selectedCompany)
        .gte("created_at", startDate).lte("created_at", endDate);
      if (!lines) return;

      const sumByRange = (from: string, to: string) => {
        let total = 0;
        for (const l of lines) {
          const accNum = (l.chart_of_accounts as ChartOfAccountsJoin | null)?.account_number || "";
          if (accNum >= from && accNum <= to) total += (l.debit || 0) - (l.credit || 0);
        }
        return total;
      };
      const sumByAccounts = (accounts: string[]) => {
        let total = 0;
        for (const l of lines) {
          const accNum = (l.chart_of_accounts as ChartOfAccountsJoin | null)?.account_number || "";
          if (accounts.includes(accNum)) total += (l.debit || 0) - (l.credit || 0);
        }
        return total;
      };

      const revenue = -(sumByRange("3000", "3999"));
      const costs = sumByRange("4000", "8999");
      const resultBeforeTax = revenue - costs;
      const depreciation = sumByRange("7810", "7839");
      const interestCosts = sumByRange("8410", "8462");
      const interestIncome = -(sumByRange("8310", "8390"));
      const nonTaxableIncome = -(sumByAccounts(["8012", "8020", "8021"]));
      const nonDeductibleCosts = sumByAccounts(["6072", "7632", "8051", "8072"]);

      setResultRows([
        { label: "Resultat före skatt", accountRange: "3000-8999", autoValue: resultBeforeTax, adjustedValue: resultBeforeTax, sign: "+/-", editable: true },
        { label: "Bokföringsmässiga avskrivningar", accountRange: "7810-7839", autoValue: depreciation, adjustedValue: depreciation, sign: "+", editable: true },
        { label: "Räntekostnader", accountRange: "8410-8462", autoValue: interestCosts, adjustedValue: interestCosts, sign: "+", editable: true },
        { label: "Ränteintäkter", accountRange: "8310-8390", autoValue: interestIncome, adjustedValue: interestIncome, sign: "-", editable: true },
      ]);
      setAdjustmentRows(prev => prev.map(row => {
        if (row.label === "Ej skattepliktiga intäkter") return { ...row, autoValue: nonTaxableIncome, adjustedValue: nonTaxableIncome };
        if (row.label === "Ej avdragsgilla kostnader") return { ...row, autoValue: nonDeductibleCosts, adjustedValue: nonDeductibleCosts };
        if (row.label === "Vändning bokf. avskrivning") return { ...row, autoValue: depreciation, adjustedValue: depreciation };
        return row;
      }));
      const netInterest = interestCosts - interestIncome;
      setNegativeInterestNet(netInterest > 0 ? netInterest : 0);
    } catch (err) { console.error("Failed to load GL data:", err); }
    finally { setIsLoading(false); }
  };

  // ── Calculations preserved ──
  const skmResult1 = useMemo(() => {
    let result = resultRows[0]?.adjustedValue || 0;
    for (const row of adjustmentRows) {
      if (row.sign === "+") result += row.adjustedValue;
      else if (row.sign === "-") result -= row.adjustedValue;
      else result += row.adjustedValue;
    }
    for (const adj of customAdjustments) result += adj.sign === "+" ? adj.value : -adj.value;
    result -= ibDeficit; result += receivedGroupContrib; result -= givenGroupContrib;
    return result;
  }, [resultRows, adjustmentRows, customAdjustments, ibDeficit, receivedGroupContrib, givenGroupContrib]);

  const ebitda = useMemo(() => skmResult1 + (resultRows[1]?.adjustedValue || 0) + negativeInterestNet, [skmResult1, resultRows, negativeInterestNet]);
  const interestDeductionLimit = useMemo(() => ebitda * 0.3, [ebitda]);
  const unusedInterestNet = useMemo(() => Math.max(0, negativeInterestNet - interestDeductionLimit), [negativeInterestNet, interestDeductionLimit]);
  const skmResult2 = useMemo(() => skmResult1 + unusedInterestNet, [skmResult1, unusedInterestNet]);
  const maxPeriodization = useMemo(() => skmResult2 > 0 ? skmResult2 * 0.25 : 0, [skmResult2]);
  const skmResult3 = useMemo(() => skmResult2 - periodizationAmount, [skmResult2, periodizationAmount]);
  const corporateTax = useMemo(() => skmResult3 > 0 ? Math.round(skmResult3 * 0.206) : 0, [skmResult3]);

  const effectiveTaxRate = useMemo(() => {
    const base = resultRows[0]?.adjustedValue;
    if (!base || base === 0) return 0;
    return (corporateTax / Math.abs(base)) * 100;
  }, [corporateTax, resultRows]);

  const resultBeforeTax = resultRows[0]?.adjustedValue || 0;
  const bookDepreciation = resultRows[1]?.adjustedValue || 0;
  const nonDeductibleCostsTotal = adjustmentRows.find(r => r.label === "Ej avdragsgilla kostnader")?.adjustedValue || 0;
  const groupNet = receivedGroupContrib - givenGroupContrib;

  // Build TaxEngineInput baseline for AI optimizer
  const taxEngineInput: TaxEngineInput = useMemo(() => ({
    resultBeforeTax,
    nonDeductibleCosts: nonDeductibleCostsTotal,
    bookDepreciation,
    taxDepreciation: bookDepreciation,
    netInterestExpense: negativeInterestNet,
    groupContribReceived: receivedGroupContrib,
    groupContribGiven: givenGroupContrib,
    lossCarryforward: ibDeficit,
    periodiseringsfondAllocation: periodizationAmount,
  }), [resultBeforeTax, nonDeductibleCostsTotal, bookDepreciation, negativeInterestNet, receivedGroupContrib, givenGroupContrib, ibDeficit, periodizationAmount]);

  const optimizationPlan = useMemo(() => optimizeTax(taxEngineInput), [taxEngineInput]);
  const [appliedTypes, setAppliedTypes] = useState<Set<string>>(new Set());

  const applyRecommendation = (rec: Recommendation) => {
    const newInput = rec.apply(taxEngineInput);
    if (newInput.periodiseringsfondAllocation !== taxEngineInput.periodiseringsfondAllocation) {
      setPeriodizationAmount(Math.round(newInput.periodiseringsfondAllocation));
    }
    setAppliedTypes(prev => { const n = new Set(prev); n.add(rec.type); return n; });
    toast.success(`Tillämpat: ${rec.title}`);
  };

  const scrollToAI = () => {
    document.getElementById("ai-insights")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Tax calendar (preserved)
  const timelineEvents: TimelineEvent[] = useMemo(() => {
    const now = new Date();
    const fSkattForecast = Math.round(corporateTax / 12);

    const vatStatus = (q: 1 | 2 | 3 | 4, dueDate: Date): TimelineEvent["status"] => {
      if (submittedQuarters.has(q)) return "submitted";
      const days = differenceInDays(dueDate, now);
      if (days < 0) return "missed";
      if (days === 0) return "today";
      if (days <= 7) return "soon";
      return "upcoming";
    };
    const fSkattStatus = (dueDate: Date): TimelineEvent["status"] => {
      const days = differenceInDays(dueDate, now);
      if (days < -7) return "submitted";
      if (days < 0) return "missed";
      if (days === 0) return "today";
      if (days <= 7) return "soon";
      return "upcoming";
    };

    const q1Due = new Date(year, 4, 12);
    const q2Due = new Date(year, 7, 12);
    const q3Due = new Date(year, 10, 12);
    const q4Due = new Date(year + 1, 1, 26);

    return [
      { type: "Moms Q1", label: "Momsdeklaration Q1", date: q1Due, amount: quarterlyVAT.q1, status: vatStatus(1, q1Due) },
      { type: "F-skatt", label: "F-skatt maj (prognos)", date: new Date(year, 4, 12), amount: fSkattForecast, status: fSkattStatus(new Date(year, 4, 12)) },
      { type: "INK2", label: "Inkomstdeklaration", date: new Date(year, 6, 1), amount: corporateTax, status: "upcoming" },
      { type: "Moms Q2", label: "Momsdeklaration Q2", date: q2Due, amount: quarterlyVAT.q2, status: vatStatus(2, q2Due) },
      { type: "F-skatt", label: "F-skatt aug (prognos)", date: new Date(year, 7, 12), amount: fSkattForecast, status: fSkattStatus(new Date(year, 7, 12)) },
      { type: "Moms Q3", label: "Momsdeklaration Q3", date: q3Due, amount: quarterlyVAT.q3, status: vatStatus(3, q3Due) },
      { type: "F-skatt", label: "F-skatt nov (prognos)", date: new Date(year, 10, 12), amount: fSkattForecast, status: fSkattStatus(new Date(year, 10, 12)) },
      { type: "Moms Q4", label: "Momsdeklaration Q4", date: q4Due, amount: quarterlyVAT.q4, status: vatStatus(4, q4Due) },
    ] as TimelineEvent[];
  }, [year, corporateTax, quarterlyVAT, submittedQuarters]);

  const vatBoxes = useMemo(() => {
    const v = currentVAT;
    return {
      outgoing: [
        { ruta: "05", label: "Momspliktig försäljning 25%", amount: v?.box05 ?? 0 },
        { ruta: "06", label: "Momspliktig försäljning 12%", amount: v?.box06 ?? 0 },
        { ruta: "07", label: "Momspliktig försäljning 6%", amount: v?.box07 ?? 0 },
        { ruta: "10", label: "Utgående moms 25%", amount: v?.box10 ?? 0 },
        { ruta: "11", label: "Utgående moms 12%", amount: v?.box11 ?? 0 },
        { ruta: "12", label: "Utgående moms 6%", amount: v?.box12 ?? 0 },
      ],
      incoming: [{ ruta: "48", label: "Ingående moms att dra av", amount: v?.box48 ?? 0 }],
      net: v?.box49 ?? 0,
      hasData: !!v?.hasData,
    };
  }, [currentVAT]);

  const updateResultRow = (i: number, v: number) => setResultRows(prev => prev.map((r, j) => j === i ? { ...r, adjustedValue: v } : r));
  const updateAdjustmentRow = (i: number, v: number) => setAdjustmentRows(prev => prev.map((r, j) => j === i ? { ...r, adjustedValue: v } : r));

  // INK2 input
  const currentCompany = companies.find(c => c.id === selectedCompany);
  const ink2Input: INK2XmlInput = useMemo(() => ({
    orgNumber: ((currentCompany as any)?.org_number || "").replace(/\D/g, ""),
    periodFrom: `${year}-01-01`,
    periodTo: `${year}-12-31`,
    resultBeforeTax,
    nonDeductibleCosts: nonDeductibleCostsTotal,
    bookDepreciation,
    taxDepreciation: bookDepreciation,
    disallowedInterest: unusedInterestNet,
    groupContribReceived: receivedGroupContrib,
    groupContribGiven: givenGroupContrib,
    lossCarryforwardApplied: Math.min(ibDeficit, Math.max(0, skmResult2)),
    periodiseringsfond: periodizationAmount,
    finalTaxableIncome: skmResult3,
    corporateTax,
  }), [currentCompany, year, resultBeforeTax, nonDeductibleCostsTotal, bookDepreciation, unusedInterestNet, receivedGroupContrib, givenGroupContrib, ibDeficit, skmResult2, skmResult3, periodizationAmount, corporateTax]);

  const handleExportPdf = () => {
    const w = window.open("", "_blank"); if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Skatteberäkning ${year}</title><style>body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Inter,sans-serif;margin:24px;color:#0f172a}h1{font-size:20px;font-weight:700}p{color:#64748b;font-size:13px}table{width:100%;border-collapse:collapse;margin:16px 0}td{padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:13px}td:last-child{text-align:right;font-family:ui-monospace,monospace;font-variant-numeric:tabular-nums}.bold{font-weight:700;background:#f8fafc}@media print{body{margin:0}}</style></head><body><h1>Skatteberäkning ${year}</h1><p>${currentCompany?.name || ""}</p><table><tr class="bold"><td>Resultat före skatt</td><td>${fmt(resultBeforeTax)} kr</td></tr><tr><td>SKM Resultat I</td><td>${fmt(skmResult1)} kr</td></tr><tr><td>SKM Resultat II</td><td>${fmt(skmResult2)} kr</td></tr><tr><td>SKM Resultat III</td><td>${fmt(skmResult3)} kr</td></tr><tr class="bold"><td>Bolagsskatt (20,6%)</td><td>${fmt(corporateTax)} kr</td></tr></table></body></html>`);
    w.document.close(); setTimeout(() => w.print(), 250);
  };

  const handleBookFinalTax = async () => {
    if (!selectedCompany || !user) return;
    setBooking(true);
    try {
      const result = await bookFinalTax({ companyId: selectedCompany, userId: user.id, fiscalYear: year, corporateTax });
      if (!result) { toast.info("Skatt = 0 — ingen verifikation skapad"); return; }
      const ref = result.journalNumber || result.journalEntryId.substring(0, 8);
      setBookedRef(ref);
      toast.success(`Slutskatt bokförd — verifikation ${ref}`);
    } catch (err: any) {
      toast.error(err?.message || "Bokföring misslyckades");
    } finally { setBooking(false); }
  };

  if (loading || isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return null;

  return (
    <div className="bg-slate-50 min-h-screen pb-24">
      <PageHeader
        icon={Calculator}
        title="Skatt & Moms"
        subtitle="Bolagsskatt, AI-optimering och INK2-inlämning"
        actions={
          <div className="flex items-center gap-2">
            {companies.length > 1 && (
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Välj bolag" /></SelectTrigger>
                <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            )}
            <Select value={String(year)} onValueChange={v => setYear(parseInt(v))}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>{[year - 1, year, year + 1].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        }
      />

      <div className="max-w-[1400px] mx-auto px-4 md:px-8 space-y-8 py-6">

        {/* ── HERO ROW ── */}
        <TaxHeroRow
          corporateTax={corporateTax}
          potentialSavingKr={optimizationPlan.totalPotentialSavingKr}
          resultBeforeTax={resultBeforeTax}
          effectiveTaxRate={effectiveTaxRate}
          fiscalYear={year}
          onOptimize={scrollToAI}
        />

        {/* ── AI INSIGHTS ── */}
        <div id="ai-insights" className="scroll-mt-6">
          <AIInsightsGrid
            recommendations={optimizationPlan.recommendations}
            appliedTypes={appliedTypes}
            onApply={applyRecommendation}
          />
        </div>

        {/* ── SCENARIO ENGINE ── */}
        <ScenarioEngine
          baselineInput={taxEngineInput}
          current={optimizationPlan.current}
          optimized={optimizationPlan.optimized}
        />

        {/* ── BREAKDOWN ── */}
        <TaxBreakdownAccordion
          items={[
            {
              id: "adjustments",
              title: "Skattemässiga justeringar",
              subtitle: "Ej avdragsgilla, avskrivningar, schablonintäkt",
              icon: <ScrollText className="h-4 w-4" />,
              children: (
                <div className="space-y-4">
                  {/* Resultatrader */}
                  <div className="space-y-1">
                    <div className="grid grid-cols-12 gap-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-1 pb-1">
                      <span className="col-span-4">Benämning</span><span className="col-span-2">Konton</span>
                      <span className="col-span-3 text-right">Auto</span><span className="col-span-3 text-right">Justerat</span>
                    </div>
                    {resultRows.map((row, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 items-center py-1.5 border-t border-slate-100">
                        <span className="col-span-4 text-[13px] text-slate-800">{row.label}</span>
                        <span className="col-span-2 text-[11px] text-slate-500 font-mono">{row.accountRange || "–"}</span>
                        <span className="col-span-3 text-right text-[13px] font-mono text-[#3b82f6]">{fmt(row.autoValue)}</span>
                        <div className="col-span-3"><Input type="text" value={row.adjustedValue} onChange={e => updateResultRow(i, parseFloat(e.target.value.replace(/\s/g, "").replace(",", ".")) || 0)} className="text-right font-mono h-7 text-[13px]" /></div>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Justeringar */}
                  <div className="space-y-1">
                    <div className="grid grid-cols-12 gap-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-1 pb-1">
                      <span className="col-span-4">Post</span><span className="col-span-1">±</span><span className="col-span-2">Konton</span>
                      <span className="col-span-2 text-right">Auto</span><span className="col-span-3 text-right">Justerat</span>
                    </div>
                    {adjustmentRows.map((row, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 items-center py-1.5 border-t border-slate-100">
                        <span className="col-span-4 text-[13px] text-slate-800">{row.label}</span>
                        <Badge variant="outline" className="col-span-1 text-[10px] justify-center">{row.sign}</Badge>
                        <span className="col-span-2 text-[11px] text-slate-500 font-mono">{row.accountRange || "Man."}</span>
                        <span className="col-span-2 text-right text-[13px] font-mono text-[#3b82f6]">{fmt(row.autoValue)}</span>
                        <div className="col-span-3"><Input type="text" value={row.adjustedValue} onChange={e => updateAdjustmentRow(i, parseFloat(e.target.value.replace(/\s/g, "").replace(",", ".")) || 0)} className="text-right font-mono h-7 text-[13px]" /></div>
                      </div>
                    ))}
                    {customAdjustments.map((adj, i) => (
                      <div key={`c-${i}`} className="grid grid-cols-12 gap-2 items-center py-1.5 border-t border-slate-100">
                        <div className="col-span-4"><Input value={adj.label} onChange={e => { const u = [...customAdjustments]; u[i].label = e.target.value; setCustomAdjustments(u); }} className="h-7 text-[13px]" placeholder="Benämning" /></div>
                        <div className="col-span-1"><Select value={adj.sign} onValueChange={v => { const u = [...customAdjustments]; u[i].sign = v as "+" | "-"; setCustomAdjustments(u); }}><SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="+">+</SelectItem><SelectItem value="-">-</SelectItem></SelectContent></Select></div>
                        <span className="col-span-2" /><span className="col-span-2" />
                        <div className="col-span-2"><Input type="text" value={adj.value} onChange={e => { const u = [...customAdjustments]; u[i].value = parseFloat(e.target.value.replace(/\s/g, "").replace(",", ".")) || 0; setCustomAdjustments(u); }} className="text-right font-mono h-7 text-[13px]" /></div>
                        <div className="col-span-1 flex justify-end"><Button variant="ghost" size="sm" onClick={() => setCustomAdjustments(p => p.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5 text-[#7A1A1A]" /></Button></div>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => setCustomAdjustments(p => [...p, { label: "", value: 0, sign: "+" }])}><Plus className="h-3.5 w-3.5 mr-1" />Lägg till justering</Button>
                  </div>

                  <Separator />
                  <div className="flex justify-between font-semibold text-sm"><span className="text-slate-700">SKM Resultat I</span><span className="font-mono tabular-nums text-slate-900">{fmt(skmResult1)} kr</span></div>
                </div>
              ),
            },
            {
              id: "interest",
              title: "Räntebegränsning (EBITDA 30 %)",
              subtitle: "Avdragsutrymme och outnyttjat negativt räntenetto",
              icon: <Percent className="h-4 w-4" />,
              children: (
                <div className="space-y-2 text-[13px]">
                  <div className="flex justify-between"><span className="text-slate-600">Negativt räntenetto</span><span className="font-mono tabular-nums text-slate-900">{fmt(negativeInterestNet)} kr</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">EBITDA skattemässigt</span><span className="font-mono tabular-nums text-slate-900">{fmt(ebitda)} kr</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Avdragsutrymme (30 %)</span><span className="font-mono tabular-nums text-slate-900">{fmt(interestDeductionLimit)} kr</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Outnyttjat negativt räntenetto</span><span className="font-mono tabular-nums text-slate-900">{fmt(unusedInterestNet)} kr</span></div>
                  <Separator />
                  <div className="flex justify-between font-semibold"><span className="text-slate-700">SKM Resultat II</span><span className="font-mono tabular-nums text-slate-900">{fmt(skmResult2)} kr</span></div>
                </div>
              ),
            },
            {
              id: "group",
              title: "Koncernbidrag & underskott",
              subtitle: "IB underskott, erhållet/lämnat koncernbidrag, periodiseringsfond",
              icon: <Landmark className="h-4 w-4" />,
              children: (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div><Label className="text-xs">IB skattemässigt underskott</Label><Input type="text" value={ibDeficit} onChange={e => setIbDeficit(parseFloat(e.target.value.replace(/\s/g, "").replace(",", ".")) || 0)} className="mt-1 font-mono text-right h-8 text-[13px]" /></div>
                    <div><Label className="text-xs">Erhållet koncernbidrag</Label><Input type="text" value={receivedGroupContrib} onChange={e => setReceivedGroupContrib(parseFloat(e.target.value.replace(/\s/g, "").replace(",", ".")) || 0)} className="mt-1 font-mono text-right h-8 text-[13px]" /></div>
                    <div><Label className="text-xs">Lämnat koncernbidrag</Label><Input type="text" value={givenGroupContrib} onChange={e => setGivenGroupContrib(parseFloat(e.target.value.replace(/\s/g, "").replace(",", ".")) || 0)} className="mt-1 font-mono text-right h-8 text-[13px]" /></div>
                  </div>
                  <Separator />
                  <div className="space-y-2 text-[13px]">
                    <div className="flex justify-between"><span className="text-slate-600">Max periodiseringsfond (25 % av SKM II)</span><span className="font-mono tabular-nums text-slate-900">{fmt(maxPeriodization)} kr</span></div>
                    <div><Label className="text-xs">Avsättning till periodiseringsfond</Label><Input type="text" value={periodizationAmount} onChange={e => { const val = parseFloat(e.target.value.replace(/\s/g, "").replace(",", ".")) || 0; setPeriodizationAmount(Math.min(val, maxPeriodization)); }} className="mt-1 font-mono text-right w-48 h-8 text-[13px]" /></div>
                    <Separator />
                    <div className="flex justify-between font-semibold"><span className="text-slate-700">SKM Resultat III</span><span className="font-mono tabular-nums text-slate-900">{fmt(skmResult3)} kr</span></div>
                    <div className="flex justify-between font-bold pt-1"><span className="text-slate-700">Bolagsskatt (20,6 %)</span><span className="font-mono tabular-nums text-slate-900 text-base">{fmt(corporateTax)} kr</span></div>
                  </div>
                </div>
              ),
            },
            {
              id: "vat",
              title: `Moms (rutor) — ${currentVatPeriodLabel || "innevarande period"}`,
              subtitle: "Synkad med Momsmodulen — ruta 05–49",
              icon: <Receipt className="h-4 w-4" />,
              children: (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Utgående moms</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
                      {vatBoxes.outgoing.map(b => <VATBox key={b.ruta} {...b} color="border-[#C8DDF5] bg-blue-50/50" />)}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Ingående moms</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
                      {vatBoxes.incoming.map(b => <VATBox key={b.ruta} {...b} color="border-[#BFE6D6] bg-emerald-50/50" />)}
                    </div>
                  </div>
                  <div className="rounded-xl border-2 border-[#F0DDB7] bg-amber-50/60 px-4 py-3 flex items-center justify-between">
                    <div>
                      <div className="text-base font-bold text-[#7A5417] font-mono">Ruta 49</div>
                      <div className="text-xs text-slate-600">Moms att betala / få tillbaka</div>
                    </div>
                    <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">{fmt(vatBoxes.net)} kr</div>
                  </div>
                  {vatBoxes.hasData && (
                    <Link to="/vat-reports" className="inline-flex items-center gap-1 text-xs text-[#3b82f6] hover:text-[#3b82f6] font-medium">
                      <Link2 className="h-3 w-3" />Öppna Momsmodulen
                    </Link>
                  )}
                </div>
              ),
            },
            {
              id: "calendar",
              title: `Skattekalender ${year}`,
              subtitle: "Moms, F-skatt och INK2 — deadlines",
              icon: <CalendarDays className="h-4 w-4" />,
              children: (
                <div className="space-y-2">
                  <div className="text-xs text-slate-500 mb-2">F-skatt inbetalt {year}: <span className="font-semibold text-slate-900 tabular-nums">{fmt(fSkattPaidReal)} kr</span> · {fSkattPaymentsCount} inbetalningar</div>
                  <div className="space-y-1.5">
                    {timelineEvents.map((e, i) => {
                      const tone =
                        e.status === "submitted" ? "bg-[#E1F5EE] text-[#085041]" :
                        e.status === "today" ? "bg-[#FCE8E8] text-[#7A1A1A]" :
                        e.status === "soon" ? "bg-[#FAEEDA] text-[#7A5417]" :
                        e.status === "missed" ? "bg-[#FCE8E8] text-[#7A1A1A]" :
                        "bg-slate-100 text-slate-700";
                      const label =
                        e.status === "submitted" ? "Inlämnad" :
                        e.status === "today" ? "Idag" :
                        e.status === "soon" ? "Snart" :
                        e.status === "missed" ? "Missad" :
                        "Kommande";
                      return (
                        <div key={i} className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-slate-50">
                          <div className="flex items-center gap-3">
                            <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${tone}`}>{label}</span>
                            <div>
                              <div className="text-[13px] font-medium text-slate-900">{e.label}</div>
                              <div className="text-[11px] text-slate-500">{format(e.date, "d MMM yyyy", { locale: sv })}</div>
                            </div>
                          </div>
                          <div className="text-[13px] font-mono tabular-nums text-slate-900">{e.amount > 0 ? `${fmt(e.amount)} kr` : "—"}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ),
            },
            {
              id: "ink2",
              title: "INK2 — Inkomstdeklaration & export",
              subtitle: "SKV-fält 4.3–4.15, validering, XML/PDF, bokför slutskatt",
              icon: <FileText className="h-4 w-4" />,
              children: (
                <INK2Section
                  companyId={selectedCompany}
                  userId={user.id}
                  orgNumber={ink2Input.orgNumber}
                  companyName={currentCompany?.name || ""}
                  fiscalYear={year}
                  ink2Input={ink2Input}
                  glNonDeductibleCosts={nonDeductibleCostsTotal}
                />
              ),
            },
          ]}
        />
      </div>

      <TaxStickyFooter
        finalTax={corporateTax}
        potentialSavingKr={optimizationPlan.totalPotentialSavingKr}
        onExportPdf={handleExportPdf}
        onBookFinalTax={handleBookFinalTax}
        bookDisabled={corporateTax === 0}
        bookBusy={booking}
        bookedRef={bookedRef}
      />
    </div>
  );
};

export default TaxCalculation;
