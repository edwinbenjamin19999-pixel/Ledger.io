import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { formatSEK } from "@/lib/formatNumber";
import { Link } from "react-router-dom";
import type { BudgetMetrics } from "@/lib/budget/driverEngine";
import type { RealismResult } from "@/lib/budget/realismEngine";

type Kpi = "revenue" | "costs" | "ebit" | "cash";

interface Props {
  activeKpi: Kpi;
  onKpiChange: (k: Kpi) => void;
  actual: number;
  budget: number;
  forecast: number;
  metrics: BudgetMetrics;
  realism: RealismResult;
  saving: boolean;
  dirty: boolean;
  onSave: () => void;
  lastSaved?: string | null;
}

const KPI_LABELS: Record<Kpi, string> = {
  revenue: "Intäkter",
  costs: "Kostnader",
  ebit: "EBIT",
  cash: "Kassa",
};

function statusFor(deltaPct: number, isCost: boolean) {
  const adverse = isCost ? deltaPct > 0 : deltaPct < 0;
  const abs = Math.abs(deltaPct);
  if (!adverse || abs < 5) return { label: "På spår", cls: "bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]" };
  if (abs < 15) return { label: "Risk", cls: "bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7]" };
  return { label: "Kritisk", cls: "bg-[#FCE8E8] text-[#7A1A1A] border-[#F4C8C8]" };
}

export function BudgetDecisionHeader({
  activeKpi, onKpiChange, actual, budget, forecast, metrics, realism, saving, dirty, onSave, lastSaved,
}: Props) {
  const delta = actual - budget;
  const deltaPct = budget !== 0 ? (delta / Math.abs(budget)) * 100 : 0;
  const isCost = activeKpi === "costs";
  const status = statusFor(deltaPct, isCost);
  const Trend = delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus;
  const trendColor = (isCost ? delta < 0 : delta > 0) ? "text-[#085041]" : delta === 0 ? "text-slate-400" : "text-[#7A1A1A]";
  const realismDot = realism.status === "ok" ? "bg-emerald-500" : realism.status === "warning" ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="rounded-2xl border bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)] p-4 space-y-3">
      {/* KPI chips */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1.5">
          {(Object.keys(KPI_LABELS) as Kpi[]).map(k => (
            <button
              key={k}
              onClick={() => onKpiChange(k)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                activeKpi === k
                  ? "bg-[#3b82f6] text-white border-cyan-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              )}
            >
              {KPI_LABELS[k]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline" className="text-xs">
            <Link to="/cash-command?seed=budget">Open in Cash Command</Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="text-xs">
            <Link to="/financial-analysis">Financial Analysis</Link>
          </Button>
          <Button size="sm" onClick={onSave} disabled={!dirty || saving} className="text-xs">
            {saving ? "Sparar…" : dirty ? "Spara" : "Sparat"}
          </Button>
        </div>
      </div>

      {/* Numbers strip */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 items-end">
        <Cell label="Utfall" value={formatSEK(actual)} />
        <Cell label="Budget" value={formatSEK(budget)} />
        <Cell label="Prognos" value={formatSEK(forecast)} />
        <div>
          <div className="text-[10px] uppercase tracking-wide text-slate-500">Δ</div>
          <div className={cn("flex items-center gap-1 text-base font-semibold tabular-nums", trendColor)}>
            <Trend className="w-4 h-4" />
            {formatSEK(Math.abs(delta))}
          </div>
          <div className={cn("text-xs tabular-nums", trendColor)}>{deltaPct >= 0 ? "+" : ""}{deltaPct.toFixed(1)}%</div>
        </div>
        <Cell
          label="Runway"
          value={metrics.runway != null ? `${metrics.runway} dgr` : "—"}
        />
        <div className="flex flex-col gap-1">
          <span className={cn("inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-medium border w-fit", status.cls)}>
            {status.label}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
            <span className={cn("w-2 h-2 rounded-full", realismDot)} />
            {realism.summary}
          </span>
          {lastSaved && <span className="text-[10px] text-slate-400">Senast sparat {lastSaved}</span>}
        </div>
      </div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-base font-semibold tabular-nums text-slate-900">{value}</div>
    </div>
  );
}
