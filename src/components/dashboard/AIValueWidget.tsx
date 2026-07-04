import { useNavigate } from "react-router-dom";
import { Sparkles, Settings, ArrowRight, Loader2 } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { useAIValueMetrics } from "@/hooks/useAIValueMetrics";
import { formatTimeSaved } from "@/lib/aiValueSettings";

interface Props {
  companyId: string;
}

/**
 * "Vad AI har gjort åt dig" — live, data-driven value tracker.
 *
 * Rendering rules (per spec):
 *  - Hidden entirely during the company's first 7 days (warmup).
 *  - Shows a graceful empty state when there's literally no AI activity yet.
 *  - Numbers stated as facts. No marketing language. No exclamation marks.
 *  - Always exposes the assumption ("baserat på X min per post").
 */
export const AIValueWidget = ({ companyId }: Props) => {
  const navigate = useNavigate();
  const { data, isLoading } = useAIValueMetrics(companyId);

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl border-[0.5px] border-slate-200 p-6 flex items-center justify-center min-h-[220px]">
        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
      </div>
    );
  }

  // Warmup window — never show value claims with no history behind them.
  if (!data || data.warmingUp) return null;

  const minPerTx = data.minutesPerTransaction;
  const monthlyTimeStr = formatTimeSaved(data.monthlyMinutesSaved);
  const lifetimeTimeStr = formatTimeSaved(data.lifetimeMinutesSaved);
  const automationPct = Math.round(data.monthlyAutomationRate * 100);

  return (
    <div className="bg-white rounded-3xl border-[0.5px] border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-5 pb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#3b82f6]/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-[#3b82f6]" />
          </div>
          <div>
            <h3 className="text-[15px] font-medium text-slate-900">Vad AI har gjort åt dig</h3>
            <p className="text-[12px] text-slate-500">
              Baserat på {minPerTx} min per manuell post —{" "}
              <button
                onClick={() => navigate("/ai-settings")}
                className="underline decoration-dotted underline-offset-2 hover:text-slate-700"
              >
                justera i inställningar
              </button>
            </p>
          </div>
        </div>
      </div>

      {!data.hasData ? (
        <div className="px-6 pb-6 text-[13px] text-slate-500">
          Inga automatiska åtgärder ännu denna månad. Värdet visas så snart AI börjar agera självständigt.
        </div>
      ) : (
        <>
          {/* Monthly stats */}
          <div className="px-6 pb-4">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-2">Denna månad</div>
            <ul className="space-y-1.5 text-[14px] text-slate-700">
              <li>
                <span className="tabular-nums font-medium text-slate-900">{data.monthlyAuto}</span>{" "}
                transaktioner kategoriserade automatiskt
              </li>
              <li>
                <span className="tabular-nums font-medium text-slate-900">{data.monthlyMatched}</span>{" "}
                fakturor matchade utan ingrepp
              </li>
              <li>
                Uppskattad tidsbesparing:{" "}
                <span className="tabular-nums font-medium text-slate-900">{monthlyTimeStr}</span>
              </li>
            </ul>
          </div>

          {/* Lifetime + trend */}
          <div className="px-6 pb-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">Sedan du startade</div>
              <div className="text-[20px] font-medium text-slate-900 tabular-nums leading-tight">
                {lifetimeTimeStr}
              </div>
              <div className="text-[12px] text-slate-500 tabular-nums">
                {data.lifetimeAuto + data.lifetimeMatched} åtgärder totalt
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">Automatiseringsgrad</div>
              <div className="flex items-end gap-2">
                <div className="text-[20px] font-medium text-slate-900 tabular-nums leading-tight">
                  {automationPct}%
                </div>
                <div className="flex-1 h-8 -mb-1 min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.trend}>
                      <Line
                        type="monotone"
                        dataKey="rate"
                        stroke="#3b82f6"
                        strokeWidth={1.5}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="text-[12px] text-slate-500">
                Trend, senaste 6 mån
              </div>
            </div>
          </div>

          {/* Footer link */}
          <button
            onClick={() => navigate("/ai-activity")}
            className="w-full px-6 py-3 border-t border-slate-100 flex items-center justify-between text-[13px] text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <span>Se hela AI-aktivitetsloggen</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  );
};
