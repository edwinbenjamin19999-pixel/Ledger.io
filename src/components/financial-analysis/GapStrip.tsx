import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { ResponsiveContainer, LineChart, Line } from "recharts";
import { formatSEK, formatPercent } from "@/lib/formatNumber";
import { cn } from "@/lib/utils";
import type { KPIMetric } from "./types";

type KpiKey = 'Intäkter' | 'Kostnader' | 'EBIT' | 'Nettoresultat';
const KPI_OPTIONS: KpiKey[] = ['Intäkter', 'Kostnader', 'EBIT', 'Nettoresultat'];

interface Props {
  kpis: KPIMetric[];
  active: KpiKey;
  onActiveChange: (k: KpiKey) => void;
  forecastValue?: number | null;
  /** Optional 6-period sparkline values (oldest -> newest). */
  sparkline?: number[];
}

function statusFor(percent: number | null, isFavorable: boolean): { label: string; className: string } {
  const abs = percent === null ? 0 : Math.abs(percent);
  if (isFavorable || abs < 5) return { label: 'På spår', className: 'bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]' };
  if (abs < 15) return { label: 'Avvikelse', className: 'bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7]' };
  return { label: 'Kritisk', className: 'bg-[#FCE8E8] text-[#7A1A1A] border-[#F4C8C8]' };
}

export function GapStrip({ kpis, active, onActiveChange, forecastValue, sparkline }: Props) {
  const kpi = kpis.find(k => k.label === active);

  const sparkData = useMemo(() => (sparkline ?? []).map((v, i) => ({ i, v })), [sparkline]);
  const status = statusFor(kpi?.variancePercent ?? null, kpi?.isFavorable ?? true);
  const Icon = !kpi || kpi.varianceAmount === 0 ? Minus : kpi.isFavorable ? TrendingUp : TrendingDown;

  return (
    <section className="rounded-2xl border border-slate-200/60 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)] overflow-hidden">
      {/* KPI selector chips */}
      <div className="px-4 pt-3 flex items-center gap-1.5 flex-wrap">
        {KPI_OPTIONS.map(opt => (
          <button
            key={opt}
            onClick={() => onActiveChange(opt)}
            className={cn(
              "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all",
              active === opt
                ? "bg-[#3b82f6] text-white shadow-[0_2px_8px_-2px_rgba(8,145,178,0.5)]"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            )}
          >
            {opt}
          </button>
        ))}
      </div>

      {/* The gap strip itself */}
      <div className="grid grid-cols-12 gap-4 items-center px-5 py-4">
        {/* Three values: Utfall · Budget · Prognos */}
        <div className="col-span-12 md:col-span-7 grid grid-cols-3 gap-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Utfall</div>
            <div className="text-2xl font-bold tabular-nums text-slate-900">{formatSEK(kpi?.actual ?? 0)}</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Budget</div>
            <div className="text-2xl font-bold tabular-nums text-slate-700">{formatSEK(kpi?.comparison ?? 0)}</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Prognos</div>
            <div className="text-2xl font-bold tabular-nums text-slate-500">
              {forecastValue != null ? formatSEK(forecastValue) : '—'}
            </div>
          </div>
        </div>

        {/* Delta + status + sparkline */}
        <div className="col-span-12 md:col-span-5 flex items-center justify-end gap-4">
          <div className="flex flex-col items-end">
            <div className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-bold tabular-nums",
              kpi?.isFavorable ? "bg-[#E1F5EE] text-[#085041]" : "bg-[#FCE8E8] text-[#7A1A1A]"
            )}>
              <Icon className="h-4 w-4" />
              {(kpi?.varianceAmount ?? 0) >= 0 ? '+' : ''}{formatSEK(kpi?.varianceAmount ?? 0)}
            </div>
            {kpi?.variancePercent != null && (
              <div className={cn(
                "text-[11px] font-medium tabular-nums mt-0.5",
                kpi.isFavorable ? "text-[#085041]" : "text-[#7A1A1A]"
              )}>
                {kpi.variancePercent >= 0 ? '+' : ''}{formatPercent(kpi.variancePercent)} vs budget
              </div>
            )}
          </div>

          <div className={cn(
            "px-2.5 py-1 rounded-lg text-[11px] font-semibold border whitespace-nowrap",
            status.className
          )}>
            {status.label}
          </div>

          {sparkData.length > 1 && (
            <div className="w-24 h-10 hidden sm:block">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparkData}>
                  <Line
                    type="monotone"
                    dataKey="v"
                    stroke={kpi?.isFavorable ? "#10b981" : "#f43f5e"}
                    strokeWidth={1.75}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
