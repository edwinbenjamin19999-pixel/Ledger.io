/**
 * /forecast — AI-driven Forecast Control Center.
 *
 * Composes:
 *  - mode toggle (Rolling / Månadsvis / Kvartalsvis) + version chips
 *  - status header (status pill + AI headline + ΔBudget/ΔScenario/Konfidens/Historisk)
 *  - main composed chart with confidence band + turning point markers
 *  - turning points panel + AI insights panel
 *  - collapsed breakdown table
 *
 * Pure frontend assembly: all heavy math comes from existing pure engines.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ActivationHero } from "@/components/shared/ActivationHero";

import { ForecastModeToggle, type ForecastMode } from "@/components/forecast/ForecastModeToggle";
import { ForecastStatusHeader, type ForecastStatus } from "@/components/forecast/ForecastStatusHeader";
import { ForecastMainChart } from "@/components/forecast/ForecastMainChart";
import { TurningPointsPanel } from "@/components/forecast/TurningPointsPanel";
import { ForecastInsightsPanel, type ForecastInsights, type ForecastInsightChip } from "@/components/forecast/ForecastInsightsPanel";
import { ForecastVersionPicker } from "@/components/forecast/ForecastVersionPicker";
import { ForecastVersionCompare } from "@/components/forecast/ForecastVersionCompare";
import { ForecastBreakdownTable } from "@/components/forecast/ForecastBreakdownTable";

import { useForecastVersions } from "@/hooks/useForecastVersions";
import { useForecastAdjustments } from "@/hooks/useForecastAdjustments";
import { useTurningPoints } from "@/hooks/useTurningPoints";
import { useRollingForecast } from "@/hooks/useRollingForecast";

import { detectTurningPoints } from "@/lib/forecast/turningPointEngine";
import { computeHistoricalAccuracy } from "@/lib/forecast/historicalAccuracy";
import { buildSnapshot } from "@/lib/forecast/versionEngine";
import { calculateRR, calculateBR, calculateKF, DEFAULT_DRIVERS } from "@/lib/budget/driverEngine";

import { Button } from "@/components/ui/button";
import { History } from "lucide-react";

interface CompanyRow { id: string; name: string }

export default function Forecast() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>("");
  const [budgetId, setBudgetId] = useState<string | null>(null);
  const [fiscalYear] = useState<number>(new Date().getFullYear());
  const [mode, setMode] = useState<ForecastMode>("rolling");
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [insights, setInsights] = useState<ForecastInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [headline, setHeadline] = useState<string | null>(null);
  const [status, setStatus] = useState<ForecastStatus>("on_track");

  // Resolve active company
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("companies")
        .select("id, name")
        .order("created_at", { ascending: true })
        .limit(1);
      const c = (data?.[0] as CompanyRow | undefined) ?? null;
      if (c) {
        setCompanyId(c.id);
        setCompanyName(c.name);
      }
    })();
  }, [user]);

  // Resolve latest budget for this company / FY (optional)
  useEffect(() => {
    if (!companyId) return;
    (async () => {
      const { data } = await supabase
        .from("budget_plans")
        .select("id")
        .eq("company_id", companyId)
        .eq("fiscal_year", fiscalYear)
        .order("created_at", { ascending: false })
        .limit(1);
      setBudgetId((data?.[0] as { id: string } | undefined)?.id ?? null);
    })();
  }, [companyId, fiscalYear]);

  const versionsHook = useForecastVersions({ companyId, budgetId, fiscalYear });
  const adjustments = useForecastAdjustments(companyId);
  const rolling = useRollingForecast({ companyId, budgetId, fiscalYear });

  // Compute drivers-based forecast (placeholder baseline if rolling missing).
  const computed = useMemo(() => {
    const drivers = DEFAULT_DRIVERS;
    const rr = calculateRR(drivers);
    const br = calculateBR(drivers, rr);
    const kf = calculateKF(drivers, rr, br);
    const ebit = rr.map((r) => r.ebit);
    const closingCash = kf.map((k) => k.closingCash);
    return { ebit, closingCash, drivers };
  }, []);

  // Pick active snapshot (locked version overrides live).
  const activeSnapshot = useMemo(() => {
    if (activeVersionId) {
      const v = versionsHook.list.data?.find((x) => x.id === activeVersionId);
      if (v?.snapshot) return v.snapshot;
    }
    // Live rolling — synthesize from computed + rolling cache if present.
    const liveForecast = (rolling.payload?.forecast ?? {}) as Record<string, number[]>;
    return buildSnapshot({
      fiscalYear,
      forecast: liveForecast,
      ebit: computed.ebit,
      closingCash: computed.closingCash,
      drivers: computed.drivers as unknown as Record<string, unknown>,
      mode,
      source: "live",
    });
  }, [activeVersionId, versionsHook.list.data, rolling.payload, computed, fiscalYear, mode]);

  // Confidence band via small inline σ (uses ±10% as quick proxy).
  const { p10Ebit, p90Ebit } = useMemo(() => {
    const p10 = activeSnapshot.ebit.map((v) => v * 0.85 - 5000);
    const p90 = activeSnapshot.ebit.map((v) => v * 1.15 + 5000);
    return { p10Ebit: p10, p90Ebit: p90 };
  }, [activeSnapshot]);

  const turningPoints = useTurningPoints({
    ebit: activeSnapshot.ebit,
    closingCash: activeSnapshot.closingCash,
    targetEbit: null,
  });

  // Latest actual month (placeholder — derived from rolling.payload if available).
  const latestActualMonth = rolling.payload?.latest_month ?? -1;

  // Build actuals vector for accuracy (best effort — empty when none).
  const actualsVec = useMemo(() => {
    const arr: number[] = Array.from({ length: 12 }, () => 0);
    return arr;
  }, []);

  const accuracy = useMemo(() => {
    return computeHistoricalAccuracy({
      versions: (versionsHook.list.data ?? []).map((v) => ({
        id: v.id,
        label: v.label,
        locked_at: v.locked_at,
        snapshot: v.snapshot,
      })),
      actuals: { ebit: actualsVec },
      latestActualMonth,
    });
  }, [versionsHook.list.data, actualsVec, latestActualMonth]);

  // Confidence proxy until full breakdown is wired.
  const confidenceScore = useMemo(() => {
    const months = Math.max(0, latestActualMonth + 1);
    return Math.min(95, 40 + months * 4);
  }, [latestActualMonth]);

  // Fetch AI insights (debounced on mode/snapshot change).
  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    setInsightsLoading(true);
    (async () => {
      try {
        const tps = detectTurningPoints({
          ebit: activeSnapshot.ebit,
          closingCash: activeSnapshot.closingCash,
        });
        const { data, error } = await supabase.functions.invoke("forecast-explain", {
          body: {
            mode,
            fiscalYear,
            drivers: activeSnapshot.drivers ?? {},
            turningPoints: tps,
            deltas: { budget: null, scenario: null },
          },
        });
        if (cancelled) return;
        if (error) throw error;
        if (data) {
          setHeadline(data.headline ?? null);
          setStatus((data.status as ForecastStatus) ?? "on_track");
          setInsights({
            drivers: data.drivers ?? [],
            risks: data.risks ?? [],
            actions: data.actions ?? [],
          });
        }
      } catch (e) {
        if (!cancelled) {
          console.error("forecast-explain failed", e);
          // Fallback: rule-based headline.
          if (turningPoints.find((t) => t.type === "cash_negative")) {
            setStatus("off_track");
            setHeadline("Kassan vänder negativ — agera nu.");
          } else if (turningPoints.length > 0) {
            setStatus("at_risk");
            setHeadline("Risk i prognosen — granska vändpunkter.");
          } else {
            setStatus("on_track");
            setHeadline("Prognosen är på linje med plan.");
          }
        }
      } finally {
        if (!cancelled) setInsightsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, mode, activeVersionId]);

  const handleApplyAction = async (chip: ForecastInsightChip) => {
    if (!companyId || !chip.patch) {
      toast.info(chip.label);
      return;
    }
    try {
      await adjustments.record.mutateAsync({
        companyId,
        budgetId,
        accountNumber: chip.patch.driver,
        periodMonth: `${fiscalYear}-${String(Math.max(1, latestActualMonth + 1)).padStart(2, "0")}-01`,
        priorValue: 0,
        newValue: chip.patch.deltaPct,
        source: "ai",
        reasoning: chip.detail ?? chip.label,
      });
      toast.success("AI-åtgärd tillämpad");
    } catch (e) {
      console.error(e);
      toast.error("Kunde inte tillämpa åtgärden");
    }
  };

  const handleLockVersion = async (label: string, kind: "rolling" | "monthly" | "quarterly" | "custom") => {
    try {
      await versionsHook.lock.mutateAsync({
        label,
        kind,
        snapshot: activeSnapshot,
        baseConfidence: confidenceScore,
      });
      toast.success(`Version "${label}" låst`);
    } catch (e) {
      console.error(e);
      toast.error("Kunde inte låsa version");
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!companyId) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <ActivationHero
          title="Aktivera Prognos"
          valueProp="Skapa ett bolag och en budget för att låsa upp AI-driven rolling forecast med vändpunkter och scenarioplanering."
          primaryCtaLabel="Skapa bolag"
          onPrimaryCta={() => navigate("/companies")}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Prognos</div>
            <h1 className="text-2xl font-bold text-slate-900">
              {companyName} <span className="text-slate-400">· {fiscalYear}</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <ForecastModeToggle mode={mode} onChange={setMode} />
            <Button variant="outline" size="sm" onClick={() => setCompareOpen(true)} className="gap-1.5">
              <History className="h-4 w-4" /> Jämför
            </Button>
          </div>
        </div>

        {/* Version chips */}
        <ForecastVersionPicker
          mode={mode}
          versions={versionsHook.list.data ?? []}
          activeVersionId={activeVersionId}
          onSelect={setActiveVersionId}
          onLockCurrent={handleLockVersion}
          isLocking={versionsHook.lock.isPending}
        />

        {/* Status + AI headline */}
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
          <ForecastStatusHeader
            status={status}
            headline={headline}
            loadingHeadline={insightsLoading && !headline}
            budgetDeltaEbit={null}
            scenarioDeltaEbit={null}
            confidenceScore={confidenceScore}
            historicalAccuracyPct={accuracy.rollingAvgPct}
          />
        </div>

        {/* Main chart */}
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <ForecastMainChart
            actualEbit={activeSnapshot.ebit}
            forecastEbit={activeSnapshot.ebit}
            budgetEbit={null}
            scenarioEbit={null}
            p10Ebit={p10Ebit}
            p90Ebit={p90Ebit}
            latestActualMonth={latestActualMonth}
            turningPoints={turningPoints}
            onPointClick={(m) => toast.info(`Drilldown månad ${m + 1} – kommer i nästa iteration.`)}
          />
        </div>

        {/* Two-column row */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <TurningPointsPanel
            points={turningPoints}
            onSimulate={() => navigate("/scenarios")}
            onDrilldown={(p) => toast.info(`Drilldown ${p.label}`)}
          />
          <ForecastInsightsPanel
            insights={insights}
            loading={insightsLoading}
            onApplyAction={handleApplyAction}
            onOpenScenarios={() => navigate("/scenarios")}
          />
        </div>

        {/* Breakdown */}
        <ForecastBreakdownTable
          forecast={activeSnapshot.forecast}
          budget={null}
        />
      </div>

      <ForecastVersionCompare
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        versions={versionsHook.list.data ?? []}
      />
    </div>
  );
}
