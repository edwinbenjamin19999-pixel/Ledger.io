import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, TrendingUp, TrendingDown, Target, Sparkles } from "lucide-react";
import { KpiRow } from "@/components/reports/shell/ReportShell";
import { ReportKpiCard } from "@/components/reports/shell/ReportKpiCard";
import {
  useProformaInsights,
  type ForecastPoint,
  type SeasonalPattern,
} from "./proforma/useProformaInsights";
import { ProformaInsightStack } from "./proforma/ProformaInsightStack";
import { ProformaForecastChart } from "./proforma/ProformaForecastChart";
import { ProformaSeasonalStrip } from "./proforma/ProformaSeasonalStrip";
import { ProformaDetailRow } from "./proforma/ProformaDetailRow";
import { cn } from "@/lib/utils";

interface ProformaForecastProps {
  companyId: string;
}

type Horizon = "3months" | "6months" | "12months";

export const ProformaForecast = ({ companyId }: ProformaForecastProps) => {
  const [loading, setLoading] = useState(false);
  const [forecastData, setForecastData] = useState<ForecastPoint[]>([]);
  const [seasonalPatterns, setSeasonalPatterns] = useState<SeasonalPattern[]>([]);
  const [horizon, setHorizon] = useState<Horizon>("6months");
  const [highlightedPeriod, setHighlightedPeriod] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  const insights = useProformaInsights(forecastData, seasonalPatterns);

  useEffect(() => {
    if (companyId) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, horizon]);

  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-proforma", {
        body: { companyId, forecastHorizon: horizon, includeSeasonal: true },
      });
      if (error) throw error;
      if (data) {
        setForecastData(data.forecast || []);
        setSeasonalPatterns(data.seasonalPatterns || []);
      }
    } catch (e: any) {
      console.error("Proforma error:", e);
      toast.error("Kunde inte generera prognos");
    } finally {
      setLoading(false);
    }
  };

  const totalIncome = forecastData.reduce((s, d) => s + d.predicted_income, 0);
  const totalExpenses = forecastData.reduce((s, d) => s + d.predicted_expenses, 0);
  const totalResult = totalIncome - totalExpenses;
  const months = horizon === "3months" ? 3 : horizon === "6months" ? 6 : 12;

  const scrollToPeriod = (period: string) => {
    setHighlightedPeriod(period);
    setTimeout(() => {
      const el = detailRef.current?.querySelector(`[data-period="${period}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => setHighlightedPeriod(null), 2400);
    }, 50);
  };

  const horizonBtn = (h: Horizon, label: string) => (
    <button
      type="button"
      onClick={() => setHorizon(h)}
      className={cn(
        "h-9 px-4 rounded-lg text-sm font-medium transition-colors",
        horizon === h
          ? "bg-[#3b82f6] text-white shadow-sm"
          : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50",
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-50">
            <Sparkles className="w-6 h-6 text-[#3b82f6]" />
            AI Proforma & Prognos
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Strategisk framtidsprognos med risk-, säsongs- och tillväxtanalys
          </p>
        </div>
        <div className="flex gap-2">
          {horizonBtn("3months", "3 mån")}
          {horizonBtn("6months", "6 mån")}
          {horizonBtn("12months", "12 mån")}
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200/60 bg-white py-16 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#3b82f6]" />
          <span className="ml-3 text-sm text-slate-500">
            Analyserar historisk data och säsongsmönster…
          </span>
        </div>
      ) : !insights.hasData ? (
        <div className="rounded-2xl border border-slate-200/60 bg-white py-16 px-6 text-center">
          <p className="text-base font-semibold text-slate-900">Mer historik krävs</p>
          <p className="text-sm text-slate-500 mt-1">
            Minst 6 månaders bokföringsdata behövs för att generera en tillförlitlig prognos.
          </p>
        </div>
      ) : (
        <>
          {/* AI Insight Stack */}
          <ProformaInsightStack bundle={insights} onScrollToPeriod={scrollToPeriod} />

          {/* KPI Row */}
          <KpiRow>
            <ReportKpiCard
              label="Prognosticerad omsättning"
              value={totalIncome}
              subtext={`Nästa ${months} månader`}
              icon={TrendingUp}
              variant="cyan"
            />
            <ReportKpiCard
              label="Prognosticerade kostnader"
              value={totalExpenses}
              subtext={`Nästa ${months} månader`}
              icon={TrendingDown}
              variant="slate"
            />
            <ReportKpiCard
              label="Förväntat resultat"
              value={totalResult}
              subtext={`${((totalResult / Math.max(totalIncome, 1)) * 100).toFixed(0)}% marginal`}
              icon={Target}
              accent={totalResult >= 0 ? "emerald" : "rose"}
              tone={totalResult >= 0 ? "positive" : "negative"}
            />
            <ReportKpiCard
              label="AI-träffsäkerhet"
              value={`${(insights.avgConfidence * 100).toFixed(0)}%`}
              subtext={`Baserat på ${seasonalPatterns.length || 24} mån historik`}
              icon={Sparkles}
              variant="cyan"
            />
          </KpiRow>

          {/* Chart with overlays */}
          <ProformaForecastChart
            data={forecastData}
            confidenceBand={insights.confidenceBand}
            riskMonths={insights.riskMonths}
            avgConfidence={insights.avgConfidence}
          />

          {/* Seasonal strip */}
          <ProformaSeasonalStrip patterns={seasonalPatterns} />

          {/* Detailed forecast */}
          <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.03)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-900">Detaljerad prognos</h3>
              <p className="text-xs text-slate-500">
                {insights.riskMonths.size > 0
                  ? `${insights.riskMonths.size} månad${insights.riskMonths.size === 1 ? "" : "er"} kräver bevakning`
                  : "Alla månader inom marginalmål"}
              </p>
            </div>
            <div ref={detailRef} className="space-y-2">
              {forecastData.map((d, i) => (
                <ProformaDetailRow
                  key={`${d.period}-${i}`}
                  data={d}
                  isRisk={insights.riskMonths.has(d.period)}
                  highlighted={highlightedPeriod === d.period}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
