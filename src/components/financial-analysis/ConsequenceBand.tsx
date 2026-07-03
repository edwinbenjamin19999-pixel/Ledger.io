import { AlertTriangle, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatSEK } from "@/lib/formatNumber";
import { cn } from "@/lib/utils";
import type { KPIMetric } from "./types";

interface Props {
  kpis: KPIMetric[];
  monthlyBurn: number;
  onSeedScenario?: (seed: 'cost' | 'pricing' | 'cash') => void;
}

export function ConsequenceBand({ kpis, monthlyBurn, onSeedScenario }: Props) {
  const navigate = useNavigate();
  const revenue = kpis.find(k => k.label === 'Intäkter');
  const ebit = kpis.find(k => k.label === 'EBIT');

  // Margin in percentage points
  const actMargin = revenue?.actual ? (ebit?.actual ?? 0) / revenue.actual : 0;
  const cmpMargin = revenue?.comparison ? (ebit?.comparison ?? 0) / revenue.comparison : 0;
  const marginDeltaPP = (actMargin - cmpMargin) * 100;

  // Liquidity drag = EBIT shortfall
  const liquidityDelta = (ebit?.varianceAmount ?? 0); // already signed

  // Runway delta in days (negative if liquidity dropped)
  const runwayDelta = monthlyBurn > 0 ? Math.round((liquidityDelta / monthlyBurn) * 30) : 0;

  const isNegative = (ebit?.isFavorable === false);
  const sign = (n: number) => n >= 0 ? '+' : '';

  return (
    <section className={cn(
      "rounded-xl border px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-2",
      isNegative
        ? "border-rose-200/60 bg-rose-50/50"
        : "border-emerald-200/60 bg-emerald-50/40"
    )}>
      <div className={cn(
        "flex items-center gap-2 shrink-0",
        isNegative ? "text-[#7A1A1A]" : "text-[#085041]"
      )}>
        <AlertTriangle className="h-4 w-4" />
        <span className="text-xs font-bold uppercase tracking-wider">
          {isNegative ? "Om inget görs" : "Effekt"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm flex-1">
        <span className="text-slate-700">
          Marginal{' '}
          <span className={cn("font-bold tabular-nums", marginDeltaPP < 0 ? "text-[#7A1A1A]" : "text-[#085041]")}>
            {sign(marginDeltaPP)}{marginDeltaPP.toFixed(1).replace('.', ',')} pp
          </span>
        </span>
        <span className="text-slate-300">·</span>
        <span className="text-slate-700">
          Likviditet{' '}
          <span className={cn("font-bold tabular-nums", liquidityDelta < 0 ? "text-[#7A1A1A]" : "text-[#085041]")}>
            {sign(liquidityDelta)}{formatSEK(liquidityDelta)}
          </span>
        </span>
        <span className="text-slate-300">·</span>
        <span className="text-slate-700">
          Runway{' '}
          <span className={cn("font-bold tabular-nums", runwayDelta < 0 ? "text-[#7A1A1A]" : "text-[#085041]")}>
            {sign(runwayDelta)}{runwayDelta} dgr
          </span>
        </span>
      </div>

      <div className="flex items-center gap-1.5 ml-auto">
        <button
          onClick={() => navigate('/cash-command')}
          className="px-2.5 py-1 rounded-md text-[11px] font-medium border border-slate-200 bg-white text-slate-700 hover:border-[#3b82f6] hover:text-[#3b82f6] inline-flex items-center gap-1"
        >
          Cash Command <ArrowRight className="h-3 w-3" />
        </button>
        <button
          onClick={() => onSeedScenario?.('cost')}
          className="px-2.5 py-1 rounded-md text-[11px] font-medium border border-slate-200 bg-white text-slate-700 hover:border-[#3b82f6] hover:text-[#3b82f6]"
        >
          Justera kostnader
        </button>
        <button
          onClick={() => onSeedScenario?.('pricing')}
          className="px-2.5 py-1 rounded-md text-[11px] font-medium border border-slate-200 bg-white text-slate-700 hover:border-[#3b82f6] hover:text-[#3b82f6]"
        >
          Höj priser
        </button>
      </div>
    </section>
  );
}
