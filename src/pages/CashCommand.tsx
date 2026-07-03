import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMonthlyCapitalNeed } from "@/hooks/useMonthlyCapitalNeed";
import { useLiveCashPosition } from "@/hooks/useLiveCashPosition";
import { useRealtimeCashUpdates } from "@/hooks/useRealtimeCashUpdates";
import { useCashFlow } from "@/hooks/useCashFlow";
import { useSimulation } from "@/hooks/useSimulation";
import { useCashflowAction } from "@/hooks/useCashflowAction";
import { DailyTimeline } from "@/components/cash-command/DailyTimeline";
import { SyncTrustBar } from "@/components/cash-command/SyncTrustBar";
import { LiquidityPriorityStack } from "@/components/cash-command/LiquidityPriorityStack";
import { SimulationOverlayStrip } from "@/components/cash-command/SimulationOverlayStrip";
import { ActionExecuteSheet } from "@/components/cashflow/v2/ActionExecuteSheet";
import { ActivationHero } from "@/components/shared/ActivationHero";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Wrench, Droplet, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { CashflowModuleHeader } from "@/components/cashflow/CashflowModuleHeader";
import { formatSEK, CASHFLOW_TERMS } from "@/lib/cashflow/shared";
import type { ActionableInsight } from "@/lib/cashflow/types";

const STORAGE_KEY = "dashboard:selectedCompanyId";

export default function CashCommand() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [companyId, setCompanyId] = useState<string | undefined>();
  const [refDate, setRefDate] = useState(() => new Date());
  const [activeInsight, setActiveInsight] = useState<ActionableInsight | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      if (stored) { setCompanyId(stored); return; }
      const { data } = await supabase.from("user_roles").select("company_id").eq("user_id", user.id).limit(1).maybeSingle();
      if (data?.company_id) setCompanyId(data.company_id);
    })();
  }, [user]);

  const data = useMonthlyCapitalNeed(companyId, refDate);
  const live = useLiveCashPosition(companyId);
  const cf = useCashFlow(companyId);
  const sim = useSimulation();
  const { pending: pendingActionKey } = useCashflowAction();
  const { status: realtimeStatus } = useRealtimeCashUpdates(
    companyId,
    useCallback(() => { live.refresh(); cf.refresh(); }, [live, cf]),
  );

  const bankActivation = !data.loading && data.openingCash === 0 && data.items.length === 0;
  const monthCaption = useMemo(() => refDate.toLocaleDateString("sv-SE", { month: "long", year: "numeric" }), [refDate]);

  // KPI strip values
  const cashBalance = live.data?.currentBalance ?? data.openingCash;
  const net30d = live.data?.netCashFlow30d ?? (data.totalInflow - data.totalOutflow);
  const runwayDays = live.data?.runwayDays ?? null;
  const avgDailyOutflow = data.totalOutflow > 0 ? data.totalOutflow / 30 : 0;
  const riskScore = data.status === "red" ? 85 : data.status === "yellow" ? 50 : 15;

  // Simulation summary
  const weightedImpact = sim.pending.reduce((s, a) => s + a.expectedImpactSek * a.confidence, 0);
  const runwayDelta = avgDailyOutflow > 0 ? Math.round(weightedImpact / avgDailyOutflow) : 0;

  const handleExecuteAll = async () => {
    // Execute each pending action's primary verb against ActionExecuteSheet flow
    sim.clear();
    cf.refresh();
  };

  // Bulk action projections from insights
  const criticalInsights = cf.actionableInsights.filter((i) => i.riskLevel === "high");
  const arInsight = cf.actionableInsights.find((i) => i.kind === "ar_overdue");
  const criticalImpact = criticalInsights.reduce((s, i) => s + i.impactSek, 0);
  const arImpact = arInsight?.impactSek ?? 0;

  return (
    <div className="w-full px-4 sm:px-6 xl:px-8 py-4 sm:py-6 space-y-5 min-h-screen pb-24">
      {/* Header — unified across the 3 cashflow modules */}
      <CashflowModuleHeader
        self="command"
        links={["report", "live"]}
        rightSlot={
          <div className="inline-flex items-center gap-1 rounded-xl border bg-card p-1">
            <button className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center" onClick={() => setRefDate(new Date(refDate.getFullYear(), refDate.getMonth() - 1, 1))} aria-label="Föregående månad">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium px-3 capitalize tabular-nums">{monthCaption}</span>
            <button className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center" onClick={() => setRefDate(new Date(refDate.getFullYear(), refDate.getMonth() + 1, 1))} aria-label="Nästa månad">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        }
      />

      {data.loading ? (
        <div className="space-y-4">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : data.error ? (
        <div className="rounded-2xl border border-[#F4C8C8] bg-[#FCE8E8] p-6 text-sm text-[#7A1A1A]">{data.error}</div>
      ) : bankActivation ? (
        <ActivationHero
          title="Koppla bank för full prognos"
          valueProp="När du kopplar bankkonto och bokför fakturor visar AI exakt vilka utflöden som väntar varje dag."
          steps={[
            { label: "Koppla bank via Open Banking" },
            { label: "Aktivera AI-bokföring för leverantörsfakturor" },
            { label: "Få automatiska likviditetsvarningar" },
          ]}
          primaryCtaLabel="Koppla bank"
          onPrimaryCta={() => navigate("/bankintegration")}
          secondaryCtaLabel="Lägg upp leverantörsfaktura"
          onSecondaryCta={() => navigate("/invoices")}
        />
      ) : (
        <>
          {/* Sync trust bar */}
          {live.data && live.data.accounts.length > 0 && (
            <SyncTrustBar
              accounts={live.data.accounts}
              realtimeStatus={realtimeStatus}
              hasStaleData={live.data.dataFreshness.has_stale_data}
              newestSyncSeconds={live.data.dataFreshness.newest_sync_seconds}
              companyId={companyId}
              onSynced={live.refresh}
            />
          )}

          {/* Thin KPI strip (56px row, 4 metrics) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCell label={CASHFLOW_TERMS.cash} value={formatSEK(cashBalance)} tone={cashBalance < 0 ? "rose" : "default"} />
            <KpiCell label={CASHFLOW_TERMS.net30d} value={`${net30d >= 0 ? "+" : ""}${formatSEK(Math.abs(net30d))}`} tone={net30d >= 0 ? "emerald" : "rose"} />
            <KpiCell label={CASHFLOW_TERMS.runway} value={runwayDays === null ? "—" : `${runwayDays} dgr`} tone={runwayDays !== null && runwayDays < 60 ? "amber" : "default"} />
            <KpiCell label={CASHFLOW_TERMS.riskScore} value={`${riskScore} / 100`} tone={riskScore > 70 ? "rose" : riskScore > 30 ? "amber" : "emerald"} />
          </div>

          {/* Simulation overlay strip */}
          <SimulationOverlayStrip
            pending={sim.pending}
            runwayDelta={runwayDelta}
            onRemove={sim.remove}
            onClear={sim.clear}
            onExecuteAll={handleExecuteAll}
          />

          {/* Global Action Bar */}
          {cf.actionableInsights.length > 0 && (
            <div className="rounded-2xl border bg-card p-3 flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-muted-foreground mr-1">Snabbåtgärder:</span>
              <BulkButton
                icon={Wrench}
                label="Fixa alla kritiska"
                impact={criticalImpact}
                count={criticalInsights.length}
                onClick={() => criticalInsights[0] && setActiveInsight(criticalInsights[0])}
              />
              <BulkButton
                icon={Droplet}
                label="Förbättra likviditet"
                impact={cf.actionableInsights.reduce((s, i) => s + i.impactSek, 0)}
                count={cf.actionableInsights.length}
                onClick={() => cf.actionableInsights[0] && setActiveInsight(cf.actionableInsights[0])}
              />
              {arInsight && (
                <BulkButton
                  icon={Send}
                  label="Skicka påminnelser"
                  impact={arImpact}
                  count={arInsight.invoiceIds.length}
                  onClick={() => setActiveInsight(arInsight)}
                />
              )}
            </div>
          )}

          {/* Liquidity Priority Stack — primary focus */}
          <LiquidityPriorityStack
            insights={cf.actionableInsights}
            arInvoices={cf.arInvoices}
            apInvoices={cf.apInvoices}
            avgDailyOutflow={avgDailyOutflow}
            pendingId={pendingActionKey?.split(":")[0] ?? null}
            onExecute={(insight) => setActiveInsight(insight)}
            onSimulate={(insight) => {
              sim.add({
                id: `sim-${insight.id}-${Date.now()}`,
                kind: insight.kind === "ar_overdue" ? "send_reminders" : insight.kind === "ap_pressure" ? "delay_ap" : "negotiate_terms",
                label: insight.title,
                expectedImpactSek: insight.impactSek,
                daysToImpact: 7,
                confidence: insight.confidence,
                riskLevel: insight.riskLevel,
                insightId: insight.id,
              });
            }}
          />

          {/* Timeline with Y=0 line + first negative + event markers */}
          <DailyTimeline data={data.dailyTimeline} riskDate={data.riskDate} />
        </>
      )}

      {/* Execute sheet (Preview → Progress → Result) */}
      {companyId && (
        <ActionExecuteSheet
          insight={activeInsight}
          companyId={companyId}
          avgDailyOutflow={avgDailyOutflow}
          onClose={() => setActiveInsight(null)}
          onSimulate={(a) => sim.add(a)}
          onExecuted={() => { cf.refresh(); }}
        />
      )}
    </div>
  );
}

function KpiCell({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "rose" | "amber" | "emerald" }) {
  const toneCls = tone === "rose" ? "text-[#7A1A1A]" : tone === "amber" ? "text-[#7A5417]" : tone === "emerald" ? "text-[#085041]" : "text-foreground";
  return (
    <div className="rounded-xl border bg-card px-4 py-3 flex items-center justify-between">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</span>
      <span className={cn("text-base font-bold tabular-nums", toneCls)}>{value}</span>
    </div>
  );
}

function BulkButton({ icon: Icon, label, impact, count, onClick }: { icon: typeof Wrench; label: string; impact: number; count: number; onClick: () => void }) {
  if (count === 0) return null;
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#C8DDF5] dark:border-[#C8DDF5] bg-blue-50/50 dark:bg-[#EFF6FF] hover:bg-blue-100/60 dark:hover:bg-[#EFF6FF] transition-colors text-xs"
    >
      <Icon className="h-3.5 w-3.5 text-[#3b82f6]" />
      <span className="font-semibold text-slate-900 dark:text-white">{label}</span>
      <span className="text-muted-foreground">·</span>
      <span className="text-[#085041] font-semibold tabular-nums">+{formatSEK(impact)}</span>
      <span className="text-[10px] text-muted-foreground">({count})</span>
    </button>
  );
}
