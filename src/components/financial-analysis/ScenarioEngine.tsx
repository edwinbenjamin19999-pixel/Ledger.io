import { useState } from "react";
import { TrendingUp, TrendingDown, Sparkles, Shield, Activity } from "lucide-react";
import { formatSEK } from "@/lib/formatNumber";
import { cn } from "@/lib/utils";
import { buildScenarios, type ScenarioResult } from "@/lib/financial-analysis/buildScenarios";
import { PremiumSegmentedControl } from "./PremiumSegmentedControl";
import type { VarianceRow, KPIMetric } from "./types";

interface Props {
  rows: VarianceRow[];
  kpis: KPIMetric[];
  acceptedImpactSEK: number;
  currentCash: number;
  monthlyBurn: number;
  onActivatePlan: () => void;
  onShowRiskActions: () => void;
}

const ICONS = {
  base: Activity,
  improved: Sparkles,
  worst: Shield,
};

const ACCENTS: Record<ScenarioResult['key'], { border: string; bg: string; chip: string; cta?: string }> = {
  base: {
    border: 'border-slate-200',
    bg: 'bg-white',
    chip: 'bg-slate-100 text-slate-700',
  },
  improved: {
    border: 'border-emerald-200/70',
    bg: 'bg-gradient-to-br from-emerald-50/60 to-white',
    chip: 'bg-[#E1F5EE] text-[#085041]',
    cta: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  },
  worst: {
    border: 'border-rose-200/70',
    bg: 'bg-gradient-to-br from-rose-50/40 to-white',
    chip: 'bg-[#FCE8E8] text-[#7A1A1A]',
    cta: 'bg-rose-600 hover:bg-rose-700 text-white',
  },
};

export function ScenarioEngine({
  rows, kpis, acceptedImpactSEK, currentCash, monthlyBurn, onActivatePlan, onShowRiskActions,
}: Props) {
  const [horizon, setHorizon] = useState<'3' | '12'>('3');
  const scenarios = buildScenarios({
    rows,
    kpis,
    acceptedImpactSEK,
    currentCash,
    monthlyBurn,
    horizonMonths: horizon === '3' ? 3 : 12,
  });

  return (
    <section className="rounded-2xl border border-slate-200/60 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200/60">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Scenarier</h3>
          <p className="text-[11px] text-slate-500">Vad är mina alternativ?</p>
        </div>
        <PremiumSegmentedControl<'3' | '12'>
          options={[{ value: '3', label: '3 mån' }, { value: '12', label: '12 mån' }]}
          value={horizon}
          onChange={(v) => setHorizon(v)}
          size="sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-slate-200/60">
        {scenarios.map(s => {
          const Icon = ICONS[s.key];
          const accent = ACCENTS[s.key];
          const profitDeltaPositive = s.profitDelta >= 0;
          return (
            <div key={s.key} className={cn("p-5 flex flex-col gap-3", accent.bg)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center", accent.chip)}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{s.label}</span>
                </div>
                {s.key !== 'base' && (
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                    accent.chip
                  )}>
                    {s.key === 'improved' ? 'Med åtgärder' : 'Riskscenario'}
                  </span>
                )}
              </div>

              {/* Resultat */}
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Resultat</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold tabular-nums text-slate-900">{formatSEK(s.profit)}</span>
                  {s.profitDelta !== 0 && (
                    <span className={cn(
                      "text-xs font-semibold tabular-nums",
                      profitDeltaPositive ? "text-[#085041]" : "text-[#7A1A1A]"
                    )}>
                      {profitDeltaPositive ? '+' : ''}{formatSEK(s.profitDelta)}
                    </span>
                  )}
                </div>
              </div>

              {/* Kassa + Runway */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Kassa</div>
                  <div className="text-sm font-bold tabular-nums text-slate-900">{formatSEK(s.cash)}</div>
                  {s.cashDelta !== 0 && (
                    <div className={cn("text-[11px] tabular-nums", s.cashDelta > 0 ? "text-[#085041]" : "text-[#7A1A1A]")}>
                      {s.cashDelta > 0 ? '+' : ''}{formatSEK(s.cashDelta)}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Runway</div>
                  <div className="text-sm font-bold tabular-nums text-slate-900">{s.runwayDays} dgr</div>
                  {s.runwayDelta !== 0 && (
                    <div className={cn("text-[11px] tabular-nums", s.runwayDelta > 0 ? "text-[#085041]" : "text-[#7A1A1A]")}>
                      {s.runwayDelta > 0 ? '+' : ''}{s.runwayDelta} dgr
                    </div>
                  )}
                </div>
              </div>

              {/* Antaganden */}
              <ul className="space-y-1 pt-2 border-t border-slate-100">
                {s.assumptions.map((a, i) => (
                  <li key={i} className="text-[11px] text-slate-600 flex gap-1.5">
                    <span className="text-slate-300 shrink-0">·</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div className="mt-auto pt-2">
                {s.key === 'improved' && (
                  <button
                    onClick={onActivatePlan}
                    disabled={acceptedImpactSEK === 0}
                    className={cn(
                      "w-full px-3 py-2 rounded-lg text-xs font-semibold transition-all",
                      acceptedImpactSEK !== 0
                        ? accent.cta
                        : "bg-slate-100 text-slate-400 cursor-not-allowed"
                    )}
                  >
                    {acceptedImpactSEK !== 0 ? 'Aktivera plan →' : 'Acceptera AI-förslag först'}
                  </button>
                )}
                {s.key === 'worst' && (
                  <button
                    onClick={onShowRiskActions}
                    className={cn("w-full px-3 py-2 rounded-lg text-xs font-semibold transition-all", accent.cta)}
                  >
                    Visa riskåtgärder
                  </button>
                )}
                {s.key === 'base' && (
                  <div className="text-[11px] text-slate-400 italic text-center py-2">Nuvarande bana</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
