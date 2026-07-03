import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, LayoutDashboard, Target, History, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFinancialOSOptional } from "@/contexts/FinancialOSContext";
import { SavedViewChips } from "@/components/financial-os/SavedViewChips";
import { AIInsightBar } from "@/components/financial-os/AIInsightBar";
import { CommentsPanel } from "@/components/financial-os/CommentsPanel";
import { PresentationMode } from "@/components/financial-os/PresentationMode";
import { MONTH_KEYS, MonthKey, BudgetRowData } from "@/lib/budget/budgetEngine";
import { BudgetDrivers, calculateRR, calculateBR, calculateKF, calculateMetrics, DEFAULT_DRIVERS, applyScenario, type ScenarioType } from "@/lib/budget/driverEngine";
import { analyzeHistoricalData, analysisToDrivers, type HistoricalEntry } from "@/lib/budget/historicalAnalysis";

import { BudgetOnboardingNew } from "@/components/budget/BudgetOnboardingNew";
import { BudgetEditorRR } from "@/components/budget/BudgetEditorRR";
import { BudgetCashFlow } from "@/components/budget/BudgetCashFlow";
import { BudgetBalanceSheet } from "@/components/budget/BudgetBalanceSheet";
import { BudgetAIAssistant } from "@/components/budget/BudgetAIAssistant";
import { BudgetDriverModel } from "@/components/budget/BudgetDriverModel";
import { BudgetDeleteDialog } from "@/components/budget/BudgetDeleteDialog";
import { AssumptionsPanel } from "@/components/budget/AssumptionsPanel";
import { BudgetDecisionHeader } from "@/components/budget/BudgetDecisionHeader";
import { ScenarioPills } from "@/components/budget/ScenarioPills";
import { LiveImpactStrip } from "@/components/budget/LiveImpactStrip";
import { RealismBanner } from "@/components/budget/RealismBanner";
import { PlanningModeToggle, type PlanningMode } from "@/components/budget/PlanningModeToggle";
import { AccountMonthMatrix } from "@/components/budget/AccountMonthMatrix";
import { TargetPanel } from "@/components/budget/TargetPanel";
import { BudgetNarrativeCard } from "@/components/budget/BudgetNarrativeCard";
import { AdjustmentLogDrawer } from "@/components/financial-analysis/AdjustmentLogDrawer";
import { evaluateRealism } from "@/lib/budget/realismEngine";
import { buildRankedActions, applyAction as applyRankedAction, type RankedAction } from "@/lib/budget/rankedActions";
import { useForecastAdjustments } from "@/hooks/useForecastAdjustments";
import { useRollingForecast } from "@/hooks/useRollingForecast";
import { useBudgetAccountSuggestions } from "@/hooks/useBudgetAccountSuggestions";
import { AIHero } from "@/components/budget/AIHero";
import { ActionStackInteractive } from "@/components/budget/ActionStackInteractive";
import { KpiControlStrip, type Kpi as ControlKpi } from "@/components/budget/KpiControlStrip";
import { WhatChangedCard } from "@/components/budget/WhatChangedCard";
import { ScenarioGraph } from "@/components/budget/ScenarioGraph";
import { bucketAccounts, buildWhatChanged, topAccountsForClass } from "@/lib/budget/whatChangedEngine";
import { ReportDrilldownDrawer } from "@/components/reports/drilldown/ReportDrilldownDrawer";
import type { DrilldownContext } from "@/components/reports/drilldown/types";
import type { Timeframe } from "@/lib/budget/trendEngine";
import { ConfidenceCard } from "@/components/budget/ConfidenceCard";
import { useForecastLocks } from "@/hooks/useForecastLocks";
import { useConfidenceTrend } from "@/hooks/useConfidenceTrend";
import { computeForecast } from "@/lib/budget/forecastEngine";
import { computeConfidence, suggestImprovements } from "@/lib/budget/confidenceEngine";
import { formatSEK } from "@/lib/formatNumber";
import type { GapOption } from "@/lib/budget/gapEngine";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Company { id: string; name: string; }
interface BudgetPlan { id: string; name: string; fiscal_year: number; scenario_type: string; status: string; creation_method: string; }

type Tab = "plan" | "target" | "log";
type Kpi = "revenue" | "costs" | "ebit" | "cash";

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: "plan", label: "Planera", icon: LayoutDashboard },
  { key: "target", label: "Mål", icon: Target },
  { key: "log", label: "Logg", icon: History },
];

const Budget = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fos = useFinancialOSOptional();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [budgetPlan, setBudgetPlan] = useState<BudgetPlan | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("plan");
  const [aiOpen, setAiOpen] = useState(false);
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [drivers, setDrivers] = useState<BudgetDrivers>(DEFAULT_DRIVERS);
  const [scenario, setScenario] = useState<ScenarioType>("base");
  const [planningMode, setPlanningMode] = useState<PlanningMode>("simple");
  const [activeKpi, setActiveKpi] = useState<Kpi>("ebit");
  const [secondaryOpen, setSecondaryOpen] = useState(false);

  const [rows, setRows] = useState<BudgetRowData[]>([]);
  const [baselineRows, setBaselineRows] = useState<BudgetRowData[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [cfData, setCfData] = useState<Record<string, number[]>>({});

  const [actualRevenue, setActualRevenue] = useState(0);
  const [actualCosts, setActualCosts] = useState(0);
  const [cashBalance, setCashBalance] = useState(0);
  const [ytdActuals, setYtdActuals] = useState<Record<string, number>>({});
  /** Per-month actuals: month index 0..11 → { revenue, costs, ebit, cash } */
  const [monthlyActuals, setMonthlyActuals] = useState<{ revenue: number[]; costs: number[]; ebit: number[]; cash: number[] }>({
    revenue: new Array(12).fill(0),
    costs: new Array(12).fill(0),
    ebit: new Array(12).fill(0),
    cash: new Array(12).fill(0),
  });
  /** Per-account amount for current and previous fiscal year, used by whatChangedEngine. */
  const [prevYearAccountTotals, setPrevYearAccountTotals] = useState<Record<string, number>>({});

  // Plan-tab interactive state
  const [timeframe, setTimeframe] = useState<Timeframe>("month");
  const [activeControlKpi, setActiveControlKpi] = useState<ControlKpi>("variance");
  const [drilldownCtx, setDrilldownCtx] = useState<DrilldownContext | null>(null);
  const [scenarioPatch, setScenarioPatch] = useState<Partial<BudgetDrivers>>({});
  const [dismissedActions, setDismissedActions] = useState<Set<string>>(new Set());

  const isLocked = budgetPlan?.status === "locked" || budgetPlan?.status === "approved";

  const { list: adjustmentsList, undo: undoAdjustment } = useForecastAdjustments(selectedCompany || null);
  useRollingForecast({ companyId: selectedCompany || null, budgetId: budgetPlan?.id ?? null, fiscalYear: selectedYear });

  useEffect(() => { if (!loading && !user) navigate("/auth"); }, [user, loading, navigate]);
  useEffect(() => { if (user) loadCompanies(); }, [user]);
  useEffect(() => { if (selectedCompany) loadBudgetPlan(); }, [selectedCompany, selectedYear]);
  useEffect(() => { if (budgetPlan) loadRows(); }, [budgetPlan?.id]);
  useEffect(() => { if (selectedCompany) loadHistoricalDrivers(); }, [selectedCompany]);
  useEffect(() => {
    fos?.logViewOpen(location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCompanies = async () => {
    const { data } = await supabase.from("companies").select("id, name").order("name");
    setCompanies(data || []);
    if (data && data.length > 0) setSelectedCompany(data[0].id);
  };

  const loadHistoricalDrivers = async () => {
    try {
      const prevYear = selectedYear - 1;
      const { data: journalData } = await supabase
        .from("journal_entries")
        .select("id, entry_date, journal_entry_lines(debit, credit, account_id)")
        .eq("company_id", selectedCompany).eq("status", "approved")
        .gte("entry_date", `${prevYear}-01-01`).lte("entry_date", `${prevYear}-12-31`);
      const { data: accounts } = await supabase.from("chart_of_accounts").select("id, account_number").eq("company_id", selectedCompany);
      const acctMap = new Map((accounts || []).map((a: any) => [a.id, a.account_number]));
      const prevTotals: Record<string, number> = {};
      if (journalData && journalData.length > 0) {
        const entries: HistoricalEntry[] = journalData.map((entry: any) => ({
          entry_date: entry.entry_date,
          lines: (entry.journal_entry_lines || []).map((line: any) => ({
            account_number: acctMap.get(line.account_id) || "0000",
            debit: line.debit || 0,
            credit: line.credit || 0,
          })),
        }));
        // Aggregate previous year per-account totals (signed: revenue positive, costs positive)
        entries.forEach(e => e.lines.forEach(l => {
          const num = l.account_number;
          const debit = l.debit - l.credit;
          const credit = l.credit - l.debit;
          if (num >= "3000" && num <= "3999") prevTotals[num] = (prevTotals[num] || 0) + credit;
          else if (num >= "4000" && num <= "7999") prevTotals[num] = (prevTotals[num] || 0) + debit;
        }));
        setPrevYearAccountTotals(prevTotals);
        const analysis = analyzeHistoricalData(entries);
        if (analysis.hasData) setDrivers(analysisToDrivers(analysis));
      } else {
        setPrevYearAccountTotals({});
      }
    } catch (e) { console.error("Failed to load historical drivers:", e); }
  };

  const loadBudgetPlan = async () => {
    setLoadingData(true);
    const { data, error } = await supabase
      .from("budget_plans").select("*")
      .eq("company_id", selectedCompany).eq("fiscal_year", selectedYear)
      .eq("scenario_type", "base").maybeSingle();
    if (!error && data) setBudgetPlan(data as unknown as BudgetPlan);
    else setBudgetPlan(null);
    setLoadingData(false);
  };

  const loadRows = async () => {
    if (!budgetPlan) return;
    const { data } = await supabase.from("budget_rows").select("*").eq("budget_id", budgetPlan.id).order("account_number");
    const budgetRows = (data || []) as unknown as BudgetRowData[];
    setRows(budgetRows);
    setBaselineRows(JSON.parse(JSON.stringify(budgetRows)));
    loadActualsAndYtd(budgetRows);
  };

  const loadActualsAndYtd = async (budgetRows: BudgetRowData[]) => {
    try {
      const { data: journalData } = await supabase
        .from("journal_entries")
        .select("id, entry_date, journal_entry_lines(debit, credit, account_id)")
        .eq("company_id", selectedCompany).eq("status", "approved")
        .gte("entry_date", `${selectedYear}-01-01`).lte("entry_date", `${selectedYear}-12-31`);
      const { data: accounts } = await supabase.from("chart_of_accounts").select("id, account_number").eq("company_id", selectedCompany);
      const acctMap = new Map((accounts || []).map((a: any) => [a.id, a.account_number]));

      let actRev = 0, actCost = 0, cash = 0;
      const ytd: Record<string, number> = {};
      const monthly = {
        revenue: new Array(12).fill(0),
        costs: new Array(12).fill(0),
        ebit: new Array(12).fill(0),
        cash: new Array(12).fill(0),
      };
      (journalData || []).forEach((entry: any) => {
        const dateStr = entry.entry_date as string;
        const monthIdx = dateStr ? Math.max(0, Math.min(11, new Date(dateStr).getMonth())) : 0;
        (entry.journal_entry_lines || []).forEach((line: any) => {
          const num = acctMap.get(line.account_id) as string | undefined;
          if (!num) return;
          const amount = (line.debit || 0) - (line.credit || 0);
          const credit = (line.credit || 0) - (line.debit || 0);
          if (num >= "3000" && num <= "3999") {
            actRev += credit; ytd[num] = (ytd[num] || 0) + credit;
            monthly.revenue[monthIdx] += credit;
            monthly.ebit[monthIdx] += credit;
          }
          if (num >= "4000" && num <= "7999") {
            actCost += amount; ytd[num] = (ytd[num] || 0) + amount;
            monthly.costs[monthIdx] += amount;
            monthly.ebit[monthIdx] -= amount;
          }
          if (num >= "1910" && num <= "1949") {
            cash += amount;
            monthly.cash[monthIdx] += amount;
          }
        });
      });
      // Cumulative cash balance per month
      let running = 0;
      monthly.cash = monthly.cash.map(v => (running += v));
      setActualRevenue(actRev);
      setActualCosts(actCost);
      setCashBalance(cash);
      setMonthlyActuals(monthly);
      setYtdActuals(ytd);
    } catch (e) { console.error("Failed to load actuals:", e); }
  };

  const onCellChange = useCallback((rowIdx: number, month: MonthKey, value: string) => {
    if (isLocked) return;
    const num = value === "" ? 0 : parseFloat(value) || 0;
    setRows(prev => {
      const copy = [...prev];
      copy[rowIdx] = { ...copy[rowIdx], [month]: num, manually_adjusted: true };
      return copy;
    });
    setDirty(true);
  }, [isLocked]);

  const onRowReplace = useCallback((rowIdx: number, monthly: Record<MonthKey, number>) => {
    setRows(prev => {
      const copy = [...prev];
      copy[rowIdx] = { ...copy[rowIdx], ...monthly, manually_adjusted: true };
      return copy;
    });
    setDirty(true);
  }, []);

  const onCFChange = useCallback((key: string, monthIdx: number, value: number) => {
    setCfData(prev => {
      const arr = [...(prev[key] || new Array(12).fill(0))];
      arr[monthIdx] = value;
      return { ...prev, [key]: arr };
    });
    setDirty(true);
  }, []);

  const saveRows = useCallback(async () => {
    if (!dirty || isLocked || !budgetPlan) return;
    setSaving(true);
    try {
      const updates = rows.map(r => ({
        id: r.id, budget_id: budgetPlan.id,
        account_number: r.account_number, account_name: r.account_name,
        jan: r.jan, feb: r.feb, mar: r.mar, apr: r.apr, maj: r.maj, jun: r.jun,
        jul: r.jul, aug: r.aug, sep: r.sep, okt: r.okt, nov: r.nov, dec: r.dec,
        manually_adjusted: r.manually_adjusted, notes: r.notes,
      }));
      const { error } = await supabase.from("budget_rows").upsert(updates);
      if (error) throw error;
      setDirty(false);
      setLastSaved(new Date().toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" }));
      setBaselineRows(JSON.parse(JSON.stringify(rows)));
      toast.success("Budget sparad");
    } catch { toast.error("Kunde inte spara"); }
    finally { setSaving(false); }
  }, [rows, dirty, budgetPlan, isLocked]);

  const handleBudgetCreated = () => { loadBudgetPlan(); };
  const handleBudgetDeleted = () => {
    setBudgetPlan(null); setRows([]); setBaselineRows([]); setActiveTab("plan");
  };

  // Driver-engine derived state
  const scenarioDrivers = useMemo(() => applyScenario(drivers, scenario), [drivers, scenario]);
  const driverRR = useMemo(() => calculateRR(scenarioDrivers), [scenarioDrivers]);
  const driverBR = useMemo(() => calculateBR(scenarioDrivers, driverRR), [scenarioDrivers, driverRR]);
  const driverKF = useMemo(() => calculateKF(scenarioDrivers, driverRR, driverBR), [scenarioDrivers, driverRR, driverBR]);
  const driverMetrics = useMemo(() => calculateMetrics(scenarioDrivers, driverRR, driverKF), [scenarioDrivers, driverRR, driverKF]);

  const realism = useMemo(() => evaluateRealism(driverRR, driverBR, driverKF, scenarioDrivers), [driverRR, driverBR, driverKF, scenarioDrivers]);
  const rankedActions = useMemo(() => buildRankedActions(driverRR, driverKF, scenarioDrivers, driverMetrics), [driverRR, driverKF, scenarioDrivers, driverMetrics]);

  // Baseline snapshot for live impact (lifetime of mount)
  const baselineRef = useRef<{ ebit: number; cash: number; runway: number | null } | null>(null);
  useEffect(() => {
    if (driverRR.length && !baselineRef.current) {
      const ebit = driverRR.reduce((s, m) => s + m.ebit, 0);
      const cash = driverKF[11]?.closingCash ?? 0;
      baselineRef.current = { ebit, cash, runway: driverMetrics.runway };
    }
  }, [driverRR, driverKF, driverMetrics]);

  // KPI strip values from BUDGET (rows) vs ACTUALS vs FORECAST (driver)
  const budgetTotals = useMemo(() => {
    const rev = rows.filter(r => r.account_number >= "3000" && r.account_number <= "3999")
      .reduce((s, r) => s + MONTH_KEYS.reduce((ms, m) => ms + (r[m] || 0), 0), 0);
    const cost = rows.filter(r => r.account_number >= "4000" && r.account_number <= "7999")
      .reduce((s, r) => s + MONTH_KEYS.reduce((ms, m) => ms + (r[m] || 0), 0), 0);
    return { revenue: rev, costs: cost, ebit: rev - cost, cash: cashBalance };
  }, [rows, cashBalance]);

  const headerNumbers = useMemo(() => {
    const actual = activeKpi === "revenue" ? actualRevenue
      : activeKpi === "costs" ? actualCosts
      : activeKpi === "cash" ? cashBalance
      : actualRevenue - actualCosts;
    const budget = budgetTotals[activeKpi];
    const forecast = activeKpi === "revenue" ? driverRR.reduce((s, m) => s + m.revenue, 0)
      : activeKpi === "costs" ? driverRR.reduce((s, m) => s + m.cogs + m.totalOpex, 0)
      : activeKpi === "cash" ? (driverKF[11]?.closingCash ?? 0)
      : driverRR.reduce((s, m) => s + m.ebit, 0);
    return { actual, budget, forecast };
  }, [activeKpi, actualRevenue, actualCosts, cashBalance, budgetTotals, driverRR, driverKF]);

  // AI account-level suggestions (6h cached) — only fetched when Advanced mode is active
  const { data: aiSuggestions = [] } = useBudgetAccountSuggestions({
    companyId: selectedCompany || null,
    budgetId: budgetPlan?.id ?? null,
    fiscalYear: selectedYear,
    rows,
    ytdActuals,
    enabled: planningMode === "advanced" && !!budgetPlan,
  });

  // Per-month budget series for KPI strip + scenario graph
  const monthlyBudget = useMemo(() => {
    const rev = new Array(12).fill(0);
    const cost = new Array(12).fill(0);
    const ebit = new Array(12).fill(0);
    rows.forEach(r => {
      MONTH_KEYS.forEach((mk, i) => {
        const v = r[mk] || 0;
        if (r.account_number >= "3000" && r.account_number <= "3999") { rev[i] += v; ebit[i] += v; }
        else if (r.account_number >= "4000" && r.account_number <= "7999") { cost[i] += v; ebit[i] -= v; }
      });
    });
    return { revenue: rev, costs: cost, ebit };
  }, [rows]);

  // What-changed engine input
  const whatChanged = useMemo(() => {
    if (Object.keys(prevYearAccountTotals).length === 0) return [];
    const currTotals = bucketAccounts(ytdActuals);
    const prevTotals = bucketAccounts(prevYearAccountTotals);
    return buildWhatChanged(
      { totals: currTotals, raw: ytdActuals },
      { totals: prevTotals, raw: prevYearAccountTotals },
      scenarioDrivers,
      driverMetrics,
    );
  }, [ytdActuals, prevYearAccountTotals, scenarioDrivers, driverMetrics]);

  // ---- Hybrid forecast + confidence ----
  const locksHook = useForecastLocks(selectedCompany || null, budgetPlan?.id ?? null);
  const locksMap = useMemo(() => locksHook.asMap(), [locksHook.list.data]);
  const trendQuery = useConfidenceTrend(selectedCompany || null, budgetPlan?.id ?? null);

  /** Per-account 12-vector of current FY actuals. */
  const monthlyActualsByAccount = useMemo(() => {
    const out: Record<string, number[]> = {};
    rows.forEach((r) => {
      out[r.account_number] = MONTH_KEYS.map((mk) => Number(r[mk]) || 0);
    });
    return out;
  }, [rows]);

  /** Per-account 12-vector of prior FY actuals (distributed flat from YoY total). */
  const priorYearByAccount = useMemo(() => {
    const out: Record<string, number[]> = {};
    Object.entries(prevYearAccountTotals).forEach(([acc, total]) => {
      const m = total / 12;
      out[acc] = new Array(12).fill(m);
    });
    return out;
  }, [prevYearAccountTotals]);

  const latestActualMonth = useMemo(() => {
    let last = -1;
    for (let i = 0; i < 12; i++) {
      if ((monthlyActuals.revenue[i] || 0) !== 0 || (monthlyActuals.costs[i] || 0) !== 0) last = i;
    }
    return last;
  }, [monthlyActuals]);

  const forecastOut = useMemo(
    () => computeForecast({
      actuals: monthlyActualsByAccount,
      priorYear: priorYearByAccount,
      latestActualMonth,
      drivers: scenarioDrivers,
      locks: locksMap,
      overrides: {},
    }),
    [monthlyActualsByAccount, priorYearByAccount, latestActualMonth, scenarioDrivers, locksMap]
  );

  const confidence = useMemo(
    () => computeConfidence({ ...forecastOut.confidenceInputs, drivers: scenarioDrivers }),
    [forecastOut, scenarioDrivers]
  );

  const improvementSuggestions = useMemo(
    () => suggestImprovements(confidence, { ...forecastOut.confidenceInputs, drivers: scenarioDrivers }),
    [confidence, forecastOut, scenarioDrivers]
  );

  /** Debounced insert into forecast_confidence_history when score changes. */
  const lastInsertedScore = useRef<number | null>(null);
  useEffect(() => {
    if (!selectedCompany || !budgetPlan?.id) return;
    if (lastInsertedScore.current === confidence.score) return;
    const handle = setTimeout(async () => {
      try {
        await supabase.from("forecast_confidence_history").insert({
          company_id: selectedCompany,
          budget_id: budgetPlan.id,
          overall_score: confidence.score,
          level: confidence.level,
          components: confidence.components as any,
          weak_signals: confidence.top3WeakSignals as any,
        });
        lastInsertedScore.current = confidence.score;
        trendQuery.refetch();
      } catch {
        // silent
      }
    }, 1500);
    return () => clearTimeout(handle);
  }, [confidence.score, confidence.level, selectedCompany, budgetPlan?.id]);

  // KPI control strip series (variance/revenue/costs/forecast — monthly)
  const kpiSeries = useMemo(() => {
    const variance = monthlyActuals.ebit.map((a, i) => a - (monthlyBudget.ebit[i] || 0));
    return {
      variance: { monthly: variance, value: variance.reduce((s, v) => s + v, 0), isCostLike: false },
      revenue: { monthly: monthlyActuals.revenue, value: actualRevenue - budgetTotals.revenue, isCostLike: false },
      costs: { monthly: monthlyActuals.costs, value: actualCosts - budgetTotals.costs, isCostLike: true },
      forecast: { monthly: driverRR.map(m => m.ebit), value: driverRR.reduce((s, m) => s + m.ebit, 0), isCostLike: false },
    };
  }, [monthlyActuals, monthlyBudget, actualRevenue, actualCosts, budgetTotals, driverRR]);

  // Build a drilldown context from a KPI click
  const openKpiDrilldown = useCallback((k: ControlKpi) => {
    setActiveControlKpi(k);
    if (!selectedCompany) return;
    const fromDate = new Date(`${selectedYear}-01-01`);
    const toDate = new Date(`${selectedYear}-12-31`);
    const accountFilter = (num: string) => {
      if (k === "revenue") return num >= "3000" && num <= "3999";
      if (k === "costs" || k === "variance" || k === "forecast") return num >= "4000" && num <= "7999";
      return false;
    };
    const accounts = rows
      .filter(r => accountFilter(r.account_number))
      .map(r => ({
        accountNumber: r.account_number,
        accountName: r.account_name,
        ib: 0, ub: 0, perioden: ytdActuals[r.account_number] || 0, foregaende: prevYearAccountTotals[r.account_number] || 0,
      } as any));
    const labelMap: Record<ControlKpi, string> = {
      variance: "Budgetavvikelse",
      revenue: "Intäkt vs plan",
      costs: "Kostnadsavvikelse",
      forecast: "Prognos EBIT",
    };
    setDrilldownCtx({
      companyId: selectedCompany,
      companyName: companies.find(c => c.id === selectedCompany)?.name || "",
      reportKind: "BUDGET",
      lens: "variance",
      fromDate, toDate,
      origin: {
        label: labelMap[k],
        value: kpiSeries[k].value,
        comparisonValue: 0,
      },
      accounts,
    });
  }, [selectedCompany, selectedYear, rows, ytdActuals, prevYearAccountTotals, companies, kpiSeries]);

  const openWhatChangedDrilldown = useCallback((accountNumbers: string[], label: string) => {
    if (!selectedCompany) return;
    const fromDate = new Date(`${selectedYear}-01-01`);
    const toDate = new Date(`${selectedYear}-12-31`);
    const accounts = rows
      .filter(r => accountNumbers.includes(r.account_number))
      .map(r => ({
        accountNumber: r.account_number,
        accountName: r.account_name,
        ib: 0, ub: 0, perioden: ytdActuals[r.account_number] || 0, foregaende: prevYearAccountTotals[r.account_number] || 0,
      } as any));
    setDrilldownCtx({
      companyId: selectedCompany,
      companyName: companies.find(c => c.id === selectedCompany)?.name || "",
      reportKind: "BUDGET",
      lens: "variance",
      fromDate, toDate,
      origin: { label, value: accounts.reduce((s, a) => s + (a.perioden || 0), 0) },
      accounts,
    });
  }, [selectedCompany, selectedYear, rows, ytdActuals, prevYearAccountTotals, companies]);

  const { record: recordAdjustment } = useForecastAdjustments(selectedCompany || null);

  const onAcceptAction = useCallback((a: RankedAction, patch: Partial<BudgetDrivers>) => {
    setDrivers(prev => ({ ...prev, ...patch }));
    toast.success(`Åtgärd verkställd: ${a.title}`, {
      description: `EBIT ${a.ebitDelta >= 0 ? "+" : ""}${Math.round(a.ebitDelta).toLocaleString("sv-SE")} kr · Runway ${a.runwayDays != null ? (a.runwayDays >= 0 ? "+" : "") + a.runwayDays + " d" : "—"}`,
    });
    if (selectedCompany) {
      const month = `${selectedYear}-01-01`;
      Object.entries(patch).forEach(([k, v]) => {
        if (typeof v === "number") {
          recordAdjustment.mutate({
            companyId: selectedCompany,
            budgetId: budgetPlan?.id ?? null,
            accountNumber: k,
            periodMonth: month,
            priorValue: (drivers as any)[k] ?? null,
            newValue: v,
            source: "ai",
            reasoning: a.title,
          });
        }
      });
    }
  }, [drivers, selectedCompany, selectedYear, budgetPlan, recordAdjustment]);

  const onRejectAction = useCallback((a: RankedAction) => {
    setDismissedActions(prev => new Set(prev).add(a.id));
  }, []);


  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!user) return null;

  return (
    <div>
      <main className="mx-auto px-4 py-6 space-y-5 max-w-[1600px]">
        {/* Financial OS chrome */}
        <div className="space-y-3">
          <SavedViewChips />
          <AIInsightBar />
        </div>
        {/* Top company/year selector + actions */}
        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="w-[220px] h-9 text-sm"><SelectValue placeholder="Välj bolag" /></SelectTrigger>
            <SelectContent>
              {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedYear.toString()} onValueChange={v => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-[100px] h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026, 2027].map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex-1" />
          {budgetPlan && (
            <>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setAssumptionsOpen(true)}>
                <Settings2 className="w-3.5 h-3.5" />Antaganden
              </Button>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setAiOpen(true)}>AI-assistent</Button>
              <BudgetDeleteDialog budgetId={budgetPlan.id} budgetName={budgetPlan.name} onDeleted={handleBudgetDeleted} />
            </>
          )}
        </div>

        {loadingData ? (
          <Card><CardContent className="py-12 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></CardContent></Card>
        ) : !budgetPlan ? (
          <BudgetOnboardingNew companyId={selectedCompany} fiscalYear={selectedYear} onBudgetCreated={handleBudgetCreated} />
        ) : (
          <>
            {/* Decision header */}
            <BudgetDecisionHeader
              activeKpi={activeKpi}
              onKpiChange={setActiveKpi}
              actual={headerNumbers.actual}
              budget={headerNumbers.budget}
              forecast={headerNumbers.forecast}
              metrics={driverMetrics}
              realism={realism}
              saving={saving}
              dirty={dirty}
              onSave={saveRows}
              lastSaved={lastSaved}
            />

            {/* Tab pills */}
            <div className="flex gap-2">
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium transition-colors border",
                    activeTab === t.key
                      ? "bg-[#3b82f6] text-white border-cyan-600"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                  )}
                >
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              ))}
            </div>

            {activeTab === "plan" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                {/* AI HERO + CONFIDENCE — decision-first */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2">
                    <AIHero
                      rr={driverRR}
                      br={driverBR}
                      kf={driverKF}
                      drivers={scenarioDrivers}
                      metrics={driverMetrics}
                      ebitMonthlyActuals={monthlyActuals.ebit}
                      whatChanged={whatChanged}
                      timeframe={timeframe}
                      onTimeframeChange={setTimeframe}
                      onDriverFocus={() => setAssumptionsOpen(true)}
                    />
                  </div>
                  <ConfidenceCard
                    confidence={confidence}
                    history={trendQuery.data ?? []}
                    suggestions={improvementSuggestions}
                    onApplyDriverPatch={(patch) => setDrivers((d) => ({ ...d, ...patch }))}
                  />
                </div>

                {/* Scenario / Mode controls */}
                <div className="flex flex-wrap items-center gap-3">
                  <ScenarioPills value={scenario} onChange={setScenario} />
                  <PlanningModeToggle
                    value={planningMode}
                    onChange={setPlanningMode}
                    overriddenCount={rows.filter(r => r.manually_adjusted).length}
                  />
                </div>

                <RealismBanner result={realism} />

                {/* TOP-3 ACTIONS */}
                <ActionStackInteractive
                  actions={rankedActions}
                  dismissed={dismissedActions}
                  onAccept={onAcceptAction}
                  onReject={onRejectAction}
                />

                {/* INTERACTIVE KPI STRIP */}
                <KpiControlStrip
                  timeframe={timeframe}
                  onTimeframeChange={setTimeframe}
                  series={kpiSeries}
                  active={activeControlKpi}
                  onClick={openKpiDrilldown}
                />

                {/* WHAT CHANGED + SCENARIO GRAPH */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <WhatChangedCard
                    items={whatChanged}
                    onPick={(it) => openWhatChangedDrilldown(it.accountNumbers, it.label)}
                  />
                  <ScenarioGraph
                    drivers={scenarioDrivers}
                    actualEbit={monthlyActuals.ebit}
                    budgetEbit={monthlyBudget.ebit}
                    scenarioPatch={scenarioPatch}
                    onScenarioPatchChange={setScenarioPatch}
                  />
                </div>

                {/* AI narrative */}
                <BudgetNarrativeCard
                  companyId={selectedCompany}
                  budgetId={budgetPlan.id}
                  context={{
                    fiscal_year: selectedYear,
                    actual: headerNumbers.actual,
                    budget: headerNumbers.budget,
                    forecast: headerNumbers.forecast,
                    runway: driverMetrics.runway,
                    realism: realism.status,
                  }}
                />

                {/* Live impact strip — kept for granular delta-vs-baseline */}
                <LiveImpactStrip
                  rr={driverRR}
                  kf={driverKF}
                  metrics={driverMetrics}
                  realism={realism}
                  baseline={baselineRef.current ?? undefined}
                />

                {/* Secondary table layer */}
                <Collapsible open={secondaryOpen} onOpenChange={setSecondaryOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" size="sm" className="text-xs w-full">
                      {secondaryOpen ? "Dölj" : "Visa"} detaljerade rapporter (RR · KF · BR)
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 pt-3">
                    <Card>
                      <BudgetEditorRR
                        rows={rows} onCellChange={onCellChange} isLocked={!!isLocked}
                        companyId={selectedCompany} fiscalYear={selectedYear}
                        driverRR={driverRR} budgetView="budget" onViewChange={() => {}}
                        scenario={scenario} onScenarioChange={setScenario}
                      />
                    </Card>
                    <Card><BudgetCashFlow rrRows={rows} cfData={cfData} onCFChange={onCFChange} isLocked={!!isLocked} driverKF={driverKF} /></Card>
                    <Card><BudgetBalanceSheet rrRows={rows} cfData={cfData} driverBR={driverBR} /></Card>
                    <Card className="p-4">
                      <BudgetDriverModel
                        drivers={drivers}
                        onDriversChange={setDrivers}
                        companyId={selectedCompany}
                      />
                    </Card>
                    <Card className="p-4">
                      <AccountMonthMatrix
                        rows={rows}
                        baseline={baselineRows}
                        aiSuggestions={aiSuggestions as any}
                        ytdActuals={ytdActuals}
                        isLocked={!!isLocked}
                        companyId={selectedCompany}
                        budgetId={budgetPlan.id}
                        onCellChange={onCellChange}
                        onRowReplace={onRowReplace}
                      />
                    </Card>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {activeTab === "target" && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
                <TargetPanel
                  companyId={selectedCompany}
                  budgetId={budgetPlan.id}
                  rr={driverRR}
                  kf={driverKF}
                  drivers={scenarioDrivers}
                  onApplyGap={async (opt: GapOption) => {
                    if (opt.driverPatch) {
                      setDrivers((d) => ({ ...d, ...opt.driverPatch }));
                    }
                    toast.success(`Tillämpade "${opt.label}"`, {
                      description: `Δ EBIT ${formatSEK(Math.round(opt.ebitImpact))} · Runway ${opt.runwayDeltaDays > 0 ? "+" : ""}${opt.runwayDeltaDays} d`,
                    });
                  }}
                />
              </div>
            )}

            {activeTab === "log" && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-200 rounded-2xl border bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)] p-5">
                <h3 className="text-sm font-semibold mb-3">Ändringslogg</h3>
                {(adjustmentsList.data ?? []).length === 0 ? (
                  <p className="text-sm text-slate-500 italic">Inga ändringar ännu.</p>
                ) : (
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => setLogOpen(true)}>
                    Visa {adjustmentsList.data?.length} ändringar
                  </Button>
                )}
              </div>
            )}
          </>
        )}

        <AssumptionsPanel
          open={assumptionsOpen}
          onOpenChange={setAssumptionsOpen}
          drivers={drivers}
          onDriversChange={setDrivers}
        />

        <BudgetAIAssistant
          open={aiOpen}
          onOpenChange={setAiOpen}
          companyId={selectedCompany}
          budgetId={budgetPlan?.id}
          onFillRR={() => { setActiveTab("plan"); setPlanningMode("advanced"); }}
          onCalcCashFlow={() => { setActiveTab("plan"); setSecondaryOpen(true); }}
          onGenerateBR={() => { setActiveTab("plan"); setSecondaryOpen(true); }}
          onSuggestSavings={() => {}}
        />

        <ReportDrilldownDrawer
          open={!!drilldownCtx}
          context={drilldownCtx}
          onClose={() => setDrilldownCtx(null)}
        />

        <AdjustmentLogDrawer
          open={logOpen}
          onClose={() => setLogOpen(false)}
          adjustments={adjustmentsList.data ?? []}
          onUndo={(id) => undoAdjustment.mutate(id)}
        />
        <CommentsPanel />
        <PresentationMode />
      </main>
    </div>
  );
};

export default Budget;
