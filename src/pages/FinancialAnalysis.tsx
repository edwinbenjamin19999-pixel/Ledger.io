import { useState, useMemo, useCallback, useEffect } from "react";
import { BarChart3, Save, ScrollText, ArrowRight } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { PageLayout } from "@/components/layout/PageLayout";
import { useFinancialOSOptional } from "@/contexts/FinancialOSContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFinancialComparison } from "@/components/financial-analysis/useFinancialComparison";
import { GapStrip } from "@/components/financial-analysis/GapStrip";
import { ConsequenceBand } from "@/components/financial-analysis/ConsequenceBand";
import { RankedDriversList } from "@/components/financial-analysis/RankedDriversList";
import { ScenarioEngine } from "@/components/financial-analysis/ScenarioEngine";
import { AccountPlanGrid, type AccountAdjustmentState, type AdjustmentSource } from "@/components/financial-analysis/AccountPlanGrid";
import { AdjustmentLogDrawer } from "@/components/financial-analysis/AdjustmentLogDrawer";
import { ViewModeToggle, type ViewMode } from "@/components/financial-analysis/ViewModeToggle";
import { PremiumSegmentedControl } from "@/components/financial-analysis/PremiumSegmentedControl";
import { DrillDownPanel } from "@/components/financial-analysis/DrillDownPanel";
import { WaterfallChart } from "@/components/financial-analysis/charts/WaterfallChart";
import { TrendChart } from "@/components/financial-analysis/charts/TrendChart";
import { computeDrivers } from "@/lib/financial-analysis/computeDrivers";
import { useAccountSuggestions, type AccountSuggestion } from "@/hooks/useAccountSuggestions";
import { useForecastAdjustments } from "@/hooks/useForecastAdjustments";
import type { VarianceRow, ComparisonMode, PeriodPreset } from "@/components/financial-analysis/types";

const MODE_OPTS: { value: ComparisonMode; label: string }[] = [
  { value: 'actual_vs_budget', label: 'vs Budget' },
  { value: 'actual_vs_forecast', label: 'vs Prognos' },
  { value: 'forecast_vs_budget', label: 'Prognos vs Budget' },
];
const PERIOD_OPTS: { value: PeriodPreset; label: string }[] = [
  { value: 'month', label: 'Månad' },
  { value: 'quarter', label: 'Kvartal' },
  { value: 'ytd', label: 'YTD' },
  { value: 'full_year', label: 'Helår' },
];

type KpiKey = 'Intäkter' | 'Kostnader' | 'EBIT' | 'Nettoresultat';

export default function FinancialAnalysis() {
  const { state, rows, kpis, monthlyTrend, isLoading, hasData, hasBudget, companyId, dateRange, setMode, setPeriod } = useFinancialComparison();
  const [view, setView] = useState<ViewMode>('period');
  const [activeKpi, setActiveKpi] = useState<KpiKey>('EBIT');
  const [selectedRow, setSelectedRow] = useState<VarianceRow | null>(null);
  const [drillOpen, setDrillOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [adjustments, setAdjustments] = useState<AccountAdjustmentState>({});
  const navigate = useNavigate();
  const location = useLocation();
  const fos = useFinancialOSOptional();

  useEffect(() => {
    fos?.logViewOpen(location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const drivers = useMemo(() => computeDrivers(rows), [rows]);
  const periodHash = `${state.year}-${state.period}-${state.month}`;

  const { data: suggestions = [] } = useAccountSuggestions({
    companyId,
    rows,
    periodHash,
    enabled: hasData && view !== 'trend',
  });

  const { list: adjustmentsList, record, undo } = useForecastAdjustments(companyId);

  // Reset local state when period changes
  useEffect(() => { setAdjustments({}); }, [periodHash]);

  const acceptedImpactSEK = useMemo(() => {
    let total = 0;
    for (const adj of Object.values(adjustments)) {
      if (adj.source === 'ai' && adj.suggestionId) {
        const s = suggestions.find(x => `${x.account_number}` === Object.keys(adjustments).find(k => adjustments[k] === adj));
        if (s) total += s.expected_impact_sek;
      }
    }
    // Simpler: walk suggestions and check adjustments
    total = 0;
    for (const s of suggestions) {
      const adj = adjustments[s.account_number];
      if (adj?.source === 'ai') total += s.expected_impact_sek;
    }
    return total;
  }, [adjustments, suggestions]);

  const openDrill = useCallback((row: VarianceRow) => {
    setSelectedRow(row);
    setDrillOpen(true);
  }, []);

  const handleAdjust = useCallback((accountNumber: string, value: number, source: AdjustmentSource, sug?: AccountSuggestion) => {
    setAdjustments(prev => {
      const prior = prev[accountNumber]?.value ?? null;
      const next = { ...prev, [accountNumber]: { value, source, suggestionId: sug?.account_number } };
      // Log
      if (companyId) {
        record.mutate({
          companyId,
          accountNumber,
          periodMonth: periodHash,
          priorValue: prior,
          newValue: value,
          source: source === 'original' ? 'reset' : source,
          reasoning: sug?.reason ?? undefined,
        });
      }
      return next;
    });
  }, [companyId, periodHash, record]);

  const handleReset = useCallback((accountNumber: string, mode: 'baseline' | 'ai') => {
    if (mode === 'baseline') {
      setAdjustments(prev => {
        const next = { ...prev };
        const prior = prev[accountNumber]?.value ?? null;
        delete next[accountNumber];
        if (companyId && prior !== null) {
          record.mutate({
            companyId,
            accountNumber,
            periodMonth: periodHash,
            priorValue: prior,
            newValue: 0,
            source: 'reset',
            reasoning: 'Återställd till baseline',
          });
        }
        return next;
      });
    } else {
      const sug = suggestions.find(s => s.account_number === accountNumber);
      if (sug) handleAdjust(accountNumber, sug.suggested_value, 'ai', sug);
    }
  }, [companyId, periodHash, record, suggestions, handleAdjust]);

  const aiCount = Object.values(adjustments).filter(a => a.source === 'ai').length;
  const manualCount = Object.values(adjustments).filter(a => a.source === 'manual').length;

  const activatePlan = () => {
    toast.success(`Plan aktiverad`, {
      description: `${aiCount + manualCount} ändringar skickade till budget.`,
    });
  };

  return (
    <PageLayout title="Finansiell analys" subtitle="Beslutsmotor: gap → orsak → konsekvens → scenario → justering" financialOS>
      <div className="space-y-4 px-4 md:px-8 pb-10">
        {isLoading && (
          <>
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-14 rounded-xl" />
            <Skeleton className="h-72 rounded-2xl" />
          </>
        )}

        {!isLoading && !hasData && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/40 p-12 text-center">
            <BarChart3 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-slate-900">Ingen finansiell data ännu</h3>
            <p className="text-sm text-slate-500 mb-4">Det finns inga godkända verifikationer för den valda perioden.</p>
            <Button variant="outline" onClick={() => navigate('/accounting')}>Registrera verifikation</Button>
          </div>
        )}

        {!isLoading && hasData && (
          <>
            {/* Header controls */}
            <section className="flex flex-wrap items-center gap-3 justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <PremiumSegmentedControl options={MODE_OPTS} value={state.mode === 'actual' || state.mode === 'variance' ? 'actual_vs_budget' : state.mode} onChange={setMode} size="sm" />
                <PremiumSegmentedControl options={PERIOD_OPTS} value={state.period} onChange={setPeriod} size="sm" />
              </div>
              <ViewModeToggle value={view} onChange={setView} />
            </section>

            {/* GAP */}
            {view !== 'scenario' && (
              <GapStrip
                kpis={kpis}
                active={activeKpi}
                onActiveChange={setActiveKpi}
              />
            )}

            {/* CONSEQUENCE */}
            {view !== 'scenario' && (
              <ConsequenceBand
                kpis={kpis}
                monthlyBurn={Math.max(kpis.find(k => k.label === 'Kostnader')?.actual ?? 0, 1) / Math.max(monthlyTrend.length, 1)}
                onSeedScenario={() => setView('scenario')}
              />
            )}

            {view === 'period' && (
              <>
                {/* DRIVERS */}
                <RankedDriversList drivers={drivers} rows={rows} onDrill={openDrill} />

                {/* WATERFALL */}
                <section className="rounded-2xl border border-slate-200/60 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
                  <div className="mb-2">
                    <h3 className="text-sm font-semibold text-slate-900">Resultatuppbyggnad</h3>
                    <p className="text-[11px] text-slate-500">Klicka på en stapel för drilldown</p>
                  </div>
                  <WaterfallChart rows={rows} onClick={openDrill} />
                </section>
              </>
            )}

            {view === 'trend' && (
              <section className="rounded-2xl border border-slate-200/60 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
                <div className="mb-2">
                  <h3 className="text-sm font-semibold text-slate-900">Trend · {activeKpi}</h3>
                  <p className="text-[11px] text-slate-500">Månatlig utveckling vs budget</p>
                </div>
                <TrendChart monthlyTrend={monthlyTrend} hasBudget={hasBudget} />
              </section>
            )}

            {/* SCENARIO ENGINE - always visible except in pure trend */}
            {view !== 'trend' && (
              <ScenarioEngine
                rows={rows}
                kpis={kpis}
                acceptedImpactSEK={acceptedImpactSEK}
                currentCash={Math.max((kpis.find(k => k.label === 'EBIT')?.actual ?? 0), 0) * 3}
                monthlyBurn={Math.max((kpis.find(k => k.label === 'Kostnader')?.actual ?? 0) / Math.max(monthlyTrend.length, 1), 1)}
                onActivatePlan={activatePlan}
                onShowRiskActions={() => navigate('/cash-command')}
              />
            )}

            {/* ACCOUNT PLAN GRID */}
            {view !== 'trend' && (
              <AccountPlanGrid
                rows={rows}
                suggestions={suggestions}
                adjustments={adjustments}
                onChange={handleAdjust}
                onReset={handleReset}
              />
            )}

            {/* DECISION FOOTER */}
            <section className="rounded-xl border border-slate-200/60 bg-slate-50/40 px-4 py-3 flex flex-wrap items-center justify-between gap-3 sticky bottom-2">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <ScrollText className="h-4 w-4 text-slate-400" />
                <span>
                  <strong className="text-slate-900">{aiCount + manualCount}</strong> ändringar i sessionen ·{' '}
                  <span className="text-[#3b82f6]">{aiCount} AI</span> ·{' '}
                  <span className="text-slate-700">{manualCount} manuella</span>
                </span>
                <button
                  onClick={() => setLogOpen(true)}
                  className="text-xs text-[#3b82f6] hover:underline"
                >
                  Visa logg →
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate('/budget')}>
                  Öppna Budget <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
                <Button
                  size="sm"
                  className="bg-[#3b82f6] hover:bg-[#3b82f6]"
                  disabled={(aiCount + manualCount) === 0}
                  onClick={() => {
                    activatePlan();
                    navigate('/budget');
                  }}
                >
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  Skicka till Budget
                </Button>
              </div>
            </section>
          </>
        )}
      </div>

      <DrillDownPanel
        row={selectedRow}
        open={drillOpen}
        onClose={() => setDrillOpen(false)}
        companyId={companyId}
        fromDate={dateRange.from}
        toDate={dateRange.to}
      />

      <AdjustmentLogDrawer
        open={logOpen}
        onClose={() => setLogOpen(false)}
        adjustments={adjustmentsList.data ?? []}
        onUndo={(id) => undo.mutate(id)}
      />
    </PageLayout>
  );
}
