/**
 * ForecastStatusHeader — large status pill, AI headline, key deltas + confidence meter.
 */
import { cn } from "@/lib/utils";
import { ConfidenceMeter } from "./ConfidenceMeter";
import { formatSEK } from "@/lib/formatNumber";

export type ForecastStatus = "on_track" | "at_risk" | "off_track";

interface Props {
  status: ForecastStatus;
  headline: string | null;
  loadingHeadline?: boolean;
  budgetDeltaEbit: number | null;
  scenarioDeltaEbit: number | null;
  confidenceScore: number;
  historicalAccuracyPct?: number;
  confidenceBreakdown?: { label: string; value: number }[];
}

const STATUS_MAP: Record<ForecastStatus, { label: string; dot: string; ring: string; text: string }> = {
  on_track: {
    label: "On track",
    dot: "bg-emerald-500",
    ring: "ring-emerald-200/60",
    text: "text-[#085041]",
  },
  at_risk: {
    label: "At risk",
    dot: "bg-amber-500",
    ring: "ring-amber-200/60",
    text: "text-[#7A5417]",
  },
  off_track: {
    label: "Off track",
    dot: "bg-rose-500",
    ring: "ring-rose-200/60",
    text: "text-[#7A1A1A]",
  },
};

function DeltaPill({ label, value }: { label: string; value: number | null }) {
  if (value == null || !Number.isFinite(value)) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
        <div className="mt-0.5 text-sm font-semibold text-slate-400">—</div>
      </div>
    );
  }
  const positive = value >= 0;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={cn("mt-0.5 text-sm font-semibold tabular-nums", positive ? "text-[#085041]" : "text-[#7A1A1A]")}>
        {positive ? "+" : ""}
        {formatSEK(value)}
      </div>
    </div>
  );
}

export function ForecastStatusHeader({
  status,
  headline,
  loadingHeadline,
  budgetDeltaEbit,
  scenarioDeltaEbit,
  confidenceScore,
  historicalAccuracyPct,
  confidenceBreakdown,
}: Props) {
  const s = STATUS_MAP[status];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1.5 ring-4", s.ring, "bg-white border border-slate-200")}>
            <span className={cn("h-2.5 w-2.5 rounded-full", s.dot)} />
            <span className={cn("text-base font-semibold", s.text)}>{s.label}</span>
          </div>

          <div className="mt-3 max-w-3xl text-sm text-slate-700">
            {loadingHeadline ? (
              <span className="inline-block h-4 w-2/3 animate-pulse rounded bg-slate-100" />
            ) : (
              headline ?? "AI analyserar din prognos…"
            )}
          </div>
        </div>

        <ConfidenceMeter
          score={confidenceScore}
          historicalPct={historicalAccuracyPct}
          breakdown={confidenceBreakdown}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <DeltaPill label="Δ Budget (EBIT)" value={budgetDeltaEbit} />
        <DeltaPill label="Δ Scenario (EBIT)" value={scenarioDeltaEbit} />
        <DeltaPill label="Konfidens" value={confidenceScore} />
        <DeltaPill label="Historisk" value={Number.isFinite(historicalAccuracyPct) ? (historicalAccuracyPct as number) : null} />
      </div>
    </div>
  );
}
