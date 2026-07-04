import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useCashFlow } from "@/hooks/useCashFlow";
import { useRealtimeCashUpdates } from "@/hooks/useRealtimeCashUpdates";
import { useRollingForecast13w } from "@/hooks/useRollingForecast13w";
import { CashFlowDrilldown } from "@/components/cashflow/CashFlowDrilldown";
import { KpiStrip, type KpiKey } from "@/components/cashflow/v2/KpiStrip";
import { CashWaterfall } from "@/components/cashflow/v2/CashWaterfall";
import { WaterfallDrilldownDrawer } from "@/components/cashflow/v2/WaterfallDrilldownDrawer";
import { RollingForecast13w } from "@/components/cashflow/v2/RollingForecast13w";
import { CashflowModuleHeader } from "@/components/cashflow/CashflowModuleHeader";
import { buildWaterfall, type WaterfallStep } from "@/lib/cashflow/waterfall";
import { Radio, Sparkles, Zap } from "lucide-react";
import { formatSEK, CASHFLOW_TERMS } from "@/lib/cashflow/shared";

interface Company { id: string; name: string; }

const CashFlow = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState(searchParams.get("company") || "");
  const [drilldownPeriod, setDrilldownPeriod] = useState<string | null>(null);
  const [waterfallStep, setWaterfallStep] = useState<WaterfallStep | null>(null);
  const [selectedKpi, setSelectedKpi] = useState<KpiKey | null>(null);

  const {
    kpi,
    periods,
    loading,
    arInvoices,
    apInvoices,
    actionableInsights,
    refresh,
  } = useCashFlow(selectedCompany || undefined);

  const { weeks, runwayWeek, loading: forecastLoading } = useRollingForecast13w(
    selectedCompany || undefined,
  );

  const { status: realtimeStatus } = useRealtimeCashUpdates(selectedCompany || null, refresh);

  useEffect(() => { if (!authLoading && !user) navigate("/auth"); }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("companies").select("id, name").order("name").then(({ data }) => {
      if (data?.length) {
        setCompanies(data);
        if (!selectedCompany) setSelectedCompany(data[0].id);
      }
    });
  }, [user]);

  const handleCompanyChange = (id: string) => {
    setSelectedCompany(id);
    setSearchParams(prev => { prev.set("company", id); return prev; });
  };

  const { monthInflow, monthOutflow, prevMonthInflow, prevMonthOutflow, sparklineNet } = useMemo(() => {
    const now = new Date();
    const curKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
    const cur = periods.find(p => p.period === curKey);
    const prev = periods.find(p => p.period === prevKey);
    const idxNow = periods.findIndex(p => p.period === curKey);
    const sliceEnd = idxNow >= 0 ? idxNow + 1 : periods.length;
    const spark = periods.slice(Math.max(0, sliceEnd - 6), sliceEnd).map(p => p.net);
    return {
      monthInflow: cur?.inflows ?? 0,
      monthOutflow: cur?.outflows ?? 0,
      prevMonthInflow: prev?.inflows ?? 0,
      prevMonthOutflow: prev?.outflows ?? 0,
      sparklineNet: spark.length ? spark : [0, 0, 0, 0, 0, 0],
    };
  }, [periods]);

  const waterfallSteps = useMemo<WaterfallStep[]>(() => {
    const now = new Date();
    const curKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
    const current = periods.find(p => p.period === curKey);
    const previous = periods.find(p => p.period === prevKey);
    if (!current) return [];
    return buildWaterfall({ current, previous });
  }, [periods]);

  const selectedPeriodData = drilldownPeriod ? periods.find(p => p.period === drilldownPeriod) || null : null;

  const liveDot = realtimeStatus === "live"
    ? { color: "bg-emerald-500", label: "LIVE", ping: true }
    : realtimeStatus === "reconnecting"
      ? { color: "bg-amber-500", label: "RECONNECTING", ping: true }
      : { color: "bg-rose-500", label: "OFFLINE", ping: false };

  const statusPill = (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
      <span className="relative flex h-1.5 w-1.5">
        {liveDot.ping && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${liveDot.color} opacity-75`} />
        )}
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${liveDot.color}`} />
      </span>
      {liveDot.label}
    </span>
  );

  const narrative = kpi
    ? `${CASHFLOW_TERMS.cash} ${formatSEK(kpi.cashBalance)} · ${CASHFLOW_TERMS.runway} ${kpi.runwayDays} dgr · ${actionableInsights.length} öppna åtgärder.`
    : "Laddar realtidsdata…";

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-8 w-8 rounded-full" /></div>;
  if (!user) return null;

  return (
    <div className="relative">
      <main className="container mx-auto px-4 py-5 space-y-4 max-w-[1500px]">
        <CashflowModuleHeader
          self="live"
          statusPill={statusPill}
          rightSlot={
            companies.length > 1 && (
              <Select value={selectedCompany} onValueChange={handleCompanyChange}>
                <SelectTrigger className="w-52 h-8 text-xs">
                  <SelectValue placeholder="Välj bolag" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )
          }
        />

        {/* KPI STRIP */}
        {loading || !kpi ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-[110px] rounded-2xl" />)}
          </div>
        ) : (
          <KpiStrip
            kpi={kpi}
            selected={selectedKpi}
            onSelect={setSelectedKpi}
            monthInflow={monthInflow}
            monthOutflow={monthOutflow}
            prevMonthInflow={prevMonthInflow}
            prevMonthOutflow={prevMonthOutflow}
            sparklineNet={sparklineNet}
          />
        )}

        {/* READ-ONLY AI NARRATIVE BAND (no execution buttons) */}
        {!loading && kpi && (
          <div className="rounded-xl border bg-gradient-to-r from-[#3b82f6]/5 via-transparent to-transparent px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-2 min-w-0 flex-1">
              <Sparkles className="h-4 w-4 text-[#3b82f6] mt-0.5 flex-shrink-0" />
              <p className="text-xs text-foreground/80 leading-relaxed">{narrative}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs border-[#C8DDF5] text-[#3b82f6] dark:text-[#1E3A5F] hover:bg-[#EFF6FF]"
              onClick={() => navigate("/cash-command")}
            >
              <Zap className="h-3.5 w-3.5 mr-1.5" />
              Öppna Cash Command för åtgärder
            </Button>
          </div>
        )}

        {/* WATERFALL */}
        {loading ? (
          <Skeleton className="h-[420px] rounded-2xl" />
        ) : (
          <div className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold tracking-tight flex items-center gap-1.5">
                <Radio className="h-3.5 w-3.5 text-[#3b82f6]" /> Cash Waterfall — denna månad
              </h2>
              <p className="text-[11px] text-muted-foreground">Klicka på en stapel för att se underliggande verifikationer</p>
            </div>
            {waterfallSteps.length > 0 ? (
              <CashWaterfall steps={waterfallSteps} onDrillDown={setWaterfallStep} />
            ) : (
              <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
                Ingen kassarörelse registrerad denna månad ännu.
              </div>
            )}
          </div>
        )}

        {/* 13-WEEK FORECAST */}
        <div className="space-y-2">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">13-veckors prognos</h2>
            <p className="text-[11px] text-muted-foreground">Bekräftade · sannolika · osäkra inflöden — runway markerad</p>
          </div>
          <RollingForecast13w
            weeks={weeks}
            loading={forecastLoading}
            runwayWeek={runwayWeek}
            overlayShift={0}
          />
        </div>
      </main>

      {/* WATERFALL DRILLDOWN */}
      <WaterfallDrilldownDrawer step={waterfallStep} onClose={() => setWaterfallStep(null)} />

      {/* PERIOD DRILLDOWN */}
      {drilldownPeriod && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setDrilldownPeriod(null)} />
          <CashFlowDrilldown
            period={selectedPeriodData}
            onClose={() => setDrilldownPeriod(null)}
            arInvoices={arInvoices}
            apInvoices={apInvoices}
            companyId={selectedCompany}
          />
        </>
      )}
    </div>
  );
};

export default CashFlow;
