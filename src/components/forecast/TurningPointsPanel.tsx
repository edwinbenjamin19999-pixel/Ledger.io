/**
 * TurningPointsPanel — list rows for each detected inflection event.
 * Provides per-row [Simulera] (deep-link to /scenarios) and [Drilldown] (open drawer).
 */
import { Star, AlertTriangle, Target as TargetIcon, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TurningPoint } from "@/lib/forecast/turningPointEngine";

interface Props {
  points: TurningPoint[];
  onSimulate: (p: TurningPoint) => void;
  onDrilldown: (p: TurningPoint) => void;
}

const ICONS = {
  ebit_negative: Star,
  cash_negative: AlertTriangle,
  target_miss: TargetIcon,
} as const;

const COLORS = {
  ebit_negative: { ring: "ring-amber-200", text: "text-[#7A5417]", bg: "bg-[#FAEEDA]" },
  cash_negative: { ring: "ring-rose-200", text: "text-[#7A1A1A]", bg: "bg-[#FCE8E8]" },
  target_miss: { ring: "ring-rose-200", text: "text-[#7A1A1A]", bg: "bg-[#FCE8E8]" },
} as const;

export function TurningPointsPanel({ points, onSimulate, onDrilldown }: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Vändpunkter</div>
          <div className="text-base font-semibold text-slate-900">När går det åt fel håll?</div>
        </div>
        <div className="text-xs text-slate-500">{points.length} {points.length === 1 ? "händelse" : "händelser"}</div>
      </div>

      {points.length === 0 ? (
        <div className="rounded-xl border border-[#BFE6D6] bg-[#E1F5EE] p-4 text-sm text-[#085041]">
          Inga kritiska vändpunkter upptäckta i prognosen. ✓
        </div>
      ) : (
        <ul className="space-y-2">
          {points.map((p, i) => {
            const Icon = ICONS[p.type];
            const c = COLORS[p.type];
            return (
              <li
                key={`${p.type}-${i}`}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 animate-in fade-in slide-in-from-bottom-1 duration-300",
                )}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg ring-2", c.ring, c.bg)}>
                    <Icon className={cn("h-4 w-4", c.text)} />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-900">{p.label}</div>
                    <div className="text-xs text-slate-500">Månad {p.monthIdx + 1} · {p.severity === "critical" ? "Kritiskt" : "Varning"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onSimulate(p)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Simulera
                  </button>
                  <button
                    onClick={() => onDrilldown(p)}
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800"
                  >
                    Drilldown
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
