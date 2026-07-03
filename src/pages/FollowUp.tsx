/**
 * /follow-up — CFO Command Center.
 *
 * Composition (top → bottom):
 *   1. ModeToggle (Live · Live Forecast · Månad)
 *   2. PerformanceStatusHeader  (status pill + AI summary + KPI deltas)
 *   3. MissTargetBanner         (when projectedMiss < 0)
 *   4. RunRateChart             (actual + forecast + target, cumulative)
 *   5. VarianceDriverList       (top drivers + per-driver root cause)
 *
 * Drilldown → ReportDrilldownDrawer (4-level shared drawer).
 * Simulate  → ScenarioGraph in a Sheet.
 *
 * All math is deterministic (computeVariance + computeStatus). AI rationale
 * is layered via useFollowUpExplanations and degrades gracefully.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Activity } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { useFinancialOSOptional } from "@/contexts/FinancialOSContext";
import { ActivationHero } from "@/components/shared/ActivationHero";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

import { ModeToggle } from "@/components/follow-up/ModeToggle";
import { PerformanceStatusHeader } from "@/components/follow-up/PerformanceStatusHeader";
import { MissTargetBanner } from "@/components/follow-up/MissTargetBanner";
import { RunRateChart } from "@/components/follow-up/RunRateChart";
import { VarianceDriverList } from "@/components/follow-up/VarianceDriverList";

import { useFollowUpData } from "@/hooks/useFollowUpData";
import { useFollowUpExplanations } from "@/hooks/useFollowUpExplanations";
import { computeVariance, type FollowUpMode, type VarianceDriver } from "@/lib/follow-up/varianceEngine";
import { computeStatus } from "@/lib/follow-up/statusEngine";

import { ReportDrilldownDrawer } from "@/components/reports/drilldown/ReportDrilldownDrawer";
import type { DrilldownContext } from "@/components/reports/drilldown/types";

export default function FollowUp() {
  const navigate = useNavigate();
  const location = useLocation();
  const fos = useFinancialOSOptional();
  const { user, loading: authLoading } = useAuth();

  // Log view open for AI suggestions
  useEffect(() => {
    fos?.logViewOpen(location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>("");
  const fiscalYear = new Date().getFullYear();

  const [mode, setMode] = useState<FollowUpMode>("live");
  const [monthIndex, setMonthIndex] = useState<number>(new Date().getMonth());

  const [drillCtx, setDrillCtx] = useState<DrilldownContext | null>(null);
  const [simDriver, setSimDriver] = useState<VarianceDriver | null>(null);
  const [gapOpen, setGapOpen] = useState(false);

  // Resolve active company
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("companies")
        .select("id, name")
        .eq("created_by", user.id)
        .order("created_at", { ascending: true })
        .limit(1);
      setCompanyId(data?.[0]?.id ?? null);
      setCompanyName(data?.[0]?.name ?? "");
    })();
  }, [user]);

  const data = useFollowUpData(companyId, fiscalYear);

  // Sync default monthIndex to latest actual once data lands
  useEffect(() => {
    if (data.latestActualMonth >= 0) setMonthIndex(data.latestActualMonth);
  }, [data.latestActualMonth]);

  const variance = useMemo(() => {
    if (!data.actuals.length && !data.budget.length) return null;
    return computeVariance({
      actuals: data.actuals,
      budget: data.budget,
      mode,
      latestActualMonth: data.latestActualMonth,
      monthIndex,
    });
  }, [data.actuals, data.budget, mode, data.latestActualMonth, monthIndex]);

  const statusOut = useMemo(() => {
    if (!variance) return null;
    return computeStatus({
      kpis: variance.kpis,
      topDrivers: variance.topDrivers,
    });
  }, [variance]);

  const explanations = useFollowUpExplanations({
    companyId,
    fiscalYear,
    mode,
    monthIndex,
    status: statusOut?.status ?? "on_track",
    topDrivers: variance?.topDrivers ?? [],
    enabled: !!variance && !!statusOut,
  });

  // Build cumulative arrays for RunRateChart
  const runRate = useMemo(() => {
    const empty = new Array(12).fill(0);
    if (!variance) return { actual: empty, forecast: empty, target: empty };
    const actual = new Array(12).fill(0);
    const target = new Array(12).fill(0);
    for (let m = 0; m < 12; m++) {
      // EBIT per month from raw drivers (revenue - cost summed at month m)
      let revA = 0;
      let revB = 0;
      let costA = 0;
      let costB = 0;
      data.actuals.forEach((s) => {
        const cls = s.account_number;
        if (cls >= "3000" && cls <= "3999") revA += s.monthly[m] || 0;
        else if (cls >= "4000" && cls <= "7999") costA += s.monthly[m] || 0;
      });
      data.budget.forEach((s) => {
        const cls = s.account_number;
        if (cls >= "3000" && cls <= "3999") revB += s.monthly[m] || 0;
        else if (cls >= "4000" && cls <= "7999") costB += s.monthly[m] || 0;
      });
      actual[m] = m <= data.latestActualMonth ? revA - costA : 0;
      target[m] = revB - costB;
    }
    // Forecast = actual until latestActualMonth, then carry budget pace
    const forecast = actual.map((v, m) => (m <= data.latestActualMonth ? v : target[m]));
    return { actual, forecast, target };
  }, [variance, data.actuals, data.budget, data.latestActualMonth]);

  // Loading & empty states
  if (authLoading) {
    return (
      <PageLayout title="Uppföljning" subtitle="CFO Command Center">
        <div className="text-sm text-muted-foreground">Laddar…</div>
      </PageLayout>
    );
  }

  if (!companyId) {
    return (
      <PageLayout title="Uppföljning" subtitle="CFO Command Center">
        <ActivationHero
          icon={Activity}
          title="Aktivera Uppföljning"
          valueProp="Live-överblick av utfall vs budget med AI-rotorsaker — sparar timmar varje månadsslut."
          primaryCtaLabel="Skapa bolag"
          onPrimaryCta={() => navigate("/companies")}
        />
      </PageLayout>
    );
  }

  if (data.loading) {
    return (
      <PageLayout title="Uppföljning" subtitle={companyName || "CFO Command Center"}>
        <div className="space-y-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </PageLayout>
    );
  }

  if (data.error) {
    return (
      <PageLayout title="Uppföljning" subtitle={companyName || "CFO Command Center"}>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Kunde inte hämta data: {data.error}
        </div>
      </PageLayout>
    );
  }

  if (!variance || !statusOut) {
    return (
      <PageLayout title="Uppföljning" subtitle={companyName || "CFO Command Center"}>
        <ActivationHero
          icon={Activity}
          title="Lägg en budget för att aktivera uppföljning"
          valueProp="Uppföljningen jämför ditt utfall mot budgeten varje månad — utan budget finns inget att jämföra mot."
          primaryCtaLabel="Skapa budget"
          onPrimaryCta={() => navigate("/budget")}
        />
      </PageLayout>
    );
  }

  const handleDrilldown = (d: VarianceDriver) => {
    setDrillCtx({
      companyId,
      companyName,
      reportKind: "RR",
      lens: "actual" as never,
      fromDate: new Date(fiscalYear, 0, 1),
      toDate: new Date(fiscalYear, 11, 31),
      origin: { label: `${d.account_number} ${d.account_name}`, value: d.actual },
      accounts: [
        {
          account_number: d.account_number,
          account_name: d.account_name,
          actual: d.actual,
          budget: d.budget,
          variance: d.variance,
        } as never,
      ],
    });
  };

  return (
    <PageLayout title="Uppföljning" subtitle={companyName || "CFO Command Center"} financialOS>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <ModeToggle
            mode={mode}
            onModeChange={setMode}
            monthIndex={monthIndex}
            onMonthChange={setMonthIndex}
            latestActualMonth={data.latestActualMonth}
          />
        </div>

        <PerformanceStatusHeader
          status={statusOut.status}
          reason={statusOut.reason}
          aiSummary={explanations.data?.summary}
          aiLoading={explanations.loading}
          kpis={variance.kpis}
          onSimulate={() => setSimDriver(variance.topDrivers[0] ?? null)}
          onOpenCash={() => navigate("/cashflow-forecast")}
        />

        {statusOut.projectedMiss !== undefined && statusOut.projectedMiss < 0 && (
          <MissTargetBanner miss={statusOut.projectedMiss} onCloseGap={() => setGapOpen(true)} />
        )}

        <RunRateChart
          actual={runRate.actual}
          forecast={runRate.forecast}
          target={runRate.target}
          latestActualMonth={data.latestActualMonth}
          onPointClick={(m) => {
            setMode("month");
            setMonthIndex(m);
          }}
        />

        <VarianceDriverList
          drivers={variance.topDrivers}
          rootCauses={explanations.data?.perDriverRootCause}
          aiLoading={explanations.loading}
          onSimulate={(d) => setSimDriver(d)}
          onDrilldown={handleDrilldown}
        />
      </div>

      {/* Drilldown drawer */}
      <ReportDrilldownDrawer
        open={!!drillCtx}
        onClose={() => setDrillCtx(null)}
        context={drillCtx}
      />

      {/* Simulate drawer (lightweight; full ScenarioGraph requires drivers state from /budget) */}
      <Sheet open={!!simDriver} onOpenChange={(v) => !v && setSimDriver(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Simulera åtgärd · {simDriver?.account_name}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-3 text-sm text-muted-foreground">
            <p>
              Drivare <span className="font-mono">{simDriver?.account_number}</span> påverkar EBIT med{" "}
              <span className="font-semibold text-foreground">
                {Math.round((simDriver?.ebitImpact ?? 0) / 1000)} tkr
              </span>
              .
            </p>
            <p>
              Öppna scenariomotorn i Budget för att modellera ändringen mot hela
              driver-modellen och spara som ny version.
            </p>
            <button
              onClick={() => {
                setSimDriver(null);
                navigate(`/budget?focus=${simDriver?.account_number}&tab=scenarios`);
              }}
              className="mt-2 inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Öppna i Scenario Builder
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Gap closing drawer */}
      <Sheet open={gapOpen} onOpenChange={setGapOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Stäng gapet</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-3 text-sm text-muted-foreground">
            <p>
              Prognos pekar mot ett underskott på{" "}
              <span className="font-semibold text-foreground">
                {Math.abs(Math.round((statusOut.projectedMiss ?? 0) / 1000))} tkr
              </span>{" "}
              jämfört med målet.
            </p>
            <p>
              Stäng gapet-motorn lever som tab inuti Budget. Vi öppnar den åt
              dig så du kan välja mellan intäktshöjning, kostnadssänkning eller
              en balanserad väg.
            </p>
            <button
              onClick={() => {
                setGapOpen(false);
                navigate("/budget?tab=plan&action=close-gap");
              }}
              className="mt-2 inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Öppna i Budget
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </PageLayout>
  );
}
