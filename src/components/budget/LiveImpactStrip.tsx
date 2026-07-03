import { cn } from "@/lib/utils";
import { formatSEK } from "@/lib/formatNumber";
import type { RRMonth, KFMonth, BudgetMetrics } from "@/lib/budget/driverEngine";
import type { RealismResult } from "@/lib/budget/realismEngine";

interface Props {
  rr: RRMonth[];
  kf: KFMonth[];
  metrics: BudgetMetrics;
  realism: RealismResult;
  baseline?: { ebit: number; cash: number; runway: number | null };
}

export function LiveImpactStrip({ rr, kf, metrics, realism, baseline }: Props) {
  const ebit = rr.reduce((s, m) => s + m.ebit, 0);
  const cash = kf[11]?.closingCash ?? 0;
  const runway = metrics.runway;

  const ebitΔ = baseline ? ebit - baseline.ebit : 0;
  const cashΔ = baseline ? cash - baseline.cash : 0;
  const runwayΔ = baseline && runway != null && baseline.runway != null ? runway - baseline.runway : 0;

  const realismDot = realism.status === "ok" ? "bg-emerald-500" : realism.status === "warning" ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Cell label="Resultat (EBIT)" value={formatSEK(ebit)} delta={ebitΔ} />
      <Cell label="Kassa (UB)" value={formatSEK(cash)} delta={cashΔ} />
      <Cell
        label="Runway"
        value={runway != null ? `${runway} dgr` : "—"}
        delta={runwayΔ}
        deltaSuffix=" dgr"
        rawDelta
      />
      <div className="rounded-2xl border bg-white shadow-[0_4px_12px_rgba(15,23,42,0.04)] p-4">
        <div className="text-[10px] uppercase tracking-wide text-slate-500">Realism</div>
        <div className="flex items-center gap-2 mt-1">
          <span className={cn("w-2.5 h-2.5 rounded-full", realismDot)} />
          <span className="text-sm font-semibold capitalize">{realism.status === "ok" ? "OK" : realism.status === "warning" ? "Varning" : "Kritisk"}</span>
        </div>
        <div className="text-xs text-slate-600 mt-1 line-clamp-2">{realism.warnings[0]?.title ?? realism.summary}</div>
      </div>
    </div>
  );
}

function Cell({ label, value, delta, deltaSuffix = "", rawDelta = false }: { label: string; value: string; delta: number; deltaSuffix?: string; rawDelta?: boolean }) {
  const isPositive = delta > 0;
  const isNeg = delta < 0;
  const cls = isPositive ? "text-[#085041]" : isNeg ? "text-[#7A1A1A]" : "text-slate-400";
  const sign = isPositive ? "+" : "";
  return (
    <div className="rounded-2xl border bg-white shadow-[0_4px_12px_rgba(15,23,42,0.04)] p-4">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-lg font-semibold tabular-nums text-slate-900 mt-0.5">{value}</div>
      {delta !== 0 && (
        <div className={cn("text-xs tabular-nums mt-0.5", cls)}>
          {sign}{rawDelta ? Math.round(delta) : formatSEK(Math.abs(delta))}{deltaSuffix}
        </div>
      )}
    </div>
  );
}
