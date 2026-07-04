import { CheckCircle2, AlertTriangle, XCircle, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatSEK } from "@/lib/formatNumber";
import type { PerformanceStatus } from "@/lib/follow-up/statusEngine";
import type { VarianceKPIs } from "@/lib/follow-up/varianceEngine";

const STATUS_STYLE: Record<
  PerformanceStatus,
  { label: string; pillClass: string; ringClass: string; Icon: typeof CheckCircle2 }
> = {
  on_track: {
    label: "On track",
    pillClass: "bg-[#E1F5EE] text-[#085041] border-[#BFE6D6]",
    ringClass: "bg-emerald-500",
    Icon: CheckCircle2,
  },
  at_risk: {
    label: "At risk",
    pillClass: "bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7]",
    ringClass: "bg-amber-500",
    Icon: AlertTriangle,
  },
  off_track: {
    label: "Off track",
    pillClass: "bg-[#FCE8E8] text-[#7A1A1A] border-[#F4C8C8]",
    ringClass: "bg-rose-500",
    Icon: XCircle,
  },
};

interface Props {
  status: PerformanceStatus;
  reason: string;
  aiSummary?: string;
  aiLoading?: boolean;
  kpis: VarianceKPIs;
  onSimulate?: () => void;
  onOpenCash?: () => void;
  onClick?: () => void;
}

function fmtDelta(n: number): string {
  const sign = n >= 0 ? "+" : "−";
  return `${sign}${formatSEK(Math.abs(Math.round(n)))}`;
}

export function PerformanceStatusHeader({
  status,
  reason,
  aiSummary,
  aiLoading,
  kpis,
  onSimulate,
  onOpenCash,
  onClick,
}: Props) {
  const style = STATUS_STYLE[status];
  const { Icon } = style;

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-2xl border bg-white shadow-sm p-6 transition-all duration-150",
        "hover:shadow-md cursor-pointer animate-in fade-in slide-in-from-bottom-2",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-3">
            <div
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold",
                style.pillClass,
              )}
            >
              <span className={cn("h-2 w-2 rounded-full", style.ringClass)} />
              <Icon className="h-4 w-4" />
              {style.label}
            </div>
            <span className="text-xs text-slate-500">Performance status</span>
          </div>
          <h2 className="text-2xl font-semibold text-slate-900 leading-snug">{reason}</h2>
          <div className="mt-3 flex items-start gap-2 text-sm text-slate-600 min-h-[1.25rem]">
            <Sparkles className="h-4 w-4 mt-0.5 text-[#3b82f6] shrink-0" />
            {aiLoading ? (
              <span className="inline-flex items-center gap-2 text-slate-400">
                <Loader2 className="h-3 w-3 animate-spin" /> AI analyserar avvikelser…
              </span>
            ) : (
              <span>{aiSummary || "Klicka på en drivare nedan för att se rotorsak och åtgärd."}</span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            {onSimulate && (
              <Button size="sm" onClick={onSimulate}>
                Simulera åtgärd
              </Button>
            )}
            {onOpenCash && (
              <Button size="sm" variant="outline" onClick={onOpenCash}>
                Öppna Cash Command
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Delta strip */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        <DeltaTile label="Δ EBIT" value={kpis.deltaEbit} />
        <DeltaTile label="Δ Kassa" value={kpis.deltaCash} />
        <DeltaTile label="Δ Marginal" value={kpis.deltaMarginPp} suffix=" pp" />
      </div>
    </div>
  );
}

function DeltaTile({ label, value, suffix = "" }: { label: string; value: number; suffix?: string }) {
  const positive = value >= 0;
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div
        className={cn(
          "mt-1 text-2xl font-bold tabular-nums",
          positive ? "text-[#085041]" : "text-[#7A1A1A]",
        )}
      >
        {suffix === " pp"
          ? `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(1)}${suffix}`
          : fmtDelta(value)}
      </div>
    </div>
  );
}
