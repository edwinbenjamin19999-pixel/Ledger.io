import { TrendingUp, TrendingDown, Target, Activity, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLiveCFOKPIs } from "@/hooks/useLiveCFOKPIs";
import { useCFOPriorities } from "@/hooks/useCFOPriorities";
import type { CFOContextPayload } from "@/hooks/useCFOContext";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  companyId: string;
  context: CFOContextPayload;
}

const formatSEK = (v: number) => new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(v || 0);
const formatPct = (v: number | null) => v == null ? "—" : `${v.toFixed(1)}%`;

export const ContextPanel = ({ companyId, context }: Props) => {
  const kpis = useLiveCFOKPIs(companyId);
  const { data: priorities, loading } = useCFOPriorities(companyId);
  const navigate = useNavigate();

  return (
    <aside className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-950/50 border-l border-slate-200 dark:border-slate-800 p-5 space-y-5">
      {/* Active context */}
      {context.type !== "general" && (
        <section className="rounded-2xl bg-white border border-[#C8DDF5] p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-[#0052FF] dark:text-[#0052FF] mb-2">Aktiv kontext</div>
          {context.kpi && (
            <>
              <div className="text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
                {typeof context.value === "number" && context.value > 1
                  ? formatSEK(context.value)
                  : typeof context.value === "number"
                    ? `${(context.value * 100).toFixed(1)}%`
                    : "—"}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {context.kpi.toUpperCase()}
                {context.percentile != null && ` · Percentil ${context.percentile}`}
              </div>
            </>
          )}
          {context.scenario_name && (
            <div className="text-base font-semibold text-slate-900 dark:text-white">{context.scenario_name}</div>
          )}
          {context.notes && (
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">{context.notes}</p>
          )}
        </section>
      )}

      {/* Live KPIs */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-4 w-4 text-[#0052FF]" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Live-data</h3>
        </div>
        {!kpis.loaded ? (
          <div className="space-y-2"><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <KPISmall label="Nettoresultat" value={formatSEK(kpis.net_result)} positive={kpis.net_result >= 0} />
            <KPISmall label="Likviditet" value={formatSEK(kpis.cash_position)} positive={kpis.cash_position >= 0} />
            <KPISmall label="Runway" value={kpis.runway_days != null ? `${kpis.runway_days} d` : "—"} positive={(kpis.runway_days ?? 0) > 90} />
            <KPISmall label="EBIT-marginal" value={formatPct(kpis.ebit_margin_pct)} positive={(kpis.ebit_margin_pct ?? 0) > 0} />
          </div>
        )}
      </section>

      {/* Top suggestions */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-4 w-4 text-[#0052FF]" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Föreslagna åtgärder</h3>
        </div>
        {loading ? (
          <Skeleton className="h-24" />
        ) : (priorities?.top || []).slice(0, 3).length === 0 ? (
          <p className="text-xs text-slate-500">Inga öppna prioriteter just nu.</p>
        ) : (
          <ul className="space-y-2">
            {(priorities?.top || []).slice(0, 3).map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => navigate("/cfo")}
                  className="w-full text-left rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 hover:border-[#0052FF] transition-colors group"
                >
                  <div className="flex items-start gap-2">
                    <span className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${
                      p.tier === "critical" ? "bg-red-500" : p.tier === "high" ? "bg-orange-500" : p.tier === "medium" ? "bg-yellow-500" : "bg-slate-400"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-2">{p.title}</p>
                      {p.impact_sek > 0 && (
                        <p className="text-[11px] text-slate-500 tabular-nums mt-0.5">{formatSEK(p.impact_sek)}</p>
                      )}
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#0052FF] shrink-0 mt-1" />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
};

const KPISmall = ({ label, value, positive }: { label: string; value: string; positive: boolean }) => (
  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">{label}</div>
    <div className="flex items-center gap-1 mt-1">
      <span className="text-base font-bold tabular-nums text-slate-900 dark:text-white">{value}</span>
      {positive ? <TrendingUp className="h-3 w-3 text-[#085041]" /> : <TrendingDown className="h-3 w-3 text-[#7A1A1A]" />}
    </div>
  </div>
);
