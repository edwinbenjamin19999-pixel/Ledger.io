import { cn } from "@/lib/utils";

interface PriorityBannerProps {
  total: number;
  critical: number;
  warning: number;
  healthy: number;
}

export const PriorityBanner = ({ total, critical, warning, healthy }: PriorityBannerProps) => {
  const needsAttention = critical + warning;
  const headline = needsAttention === 0
    ? "Allt under kontroll"
    : `${needsAttention} ${needsAttention === 1 ? "klient kräver" : "klienter kräver"} din uppmärksamhet`;

  return (
    <div className="px-4 pt-4 pb-3">
      <h1 className="text-[22px] font-bold text-white leading-tight tracking-tight">
        {headline}
      </h1>
      <p className="text-xs text-white/50 mt-1">{total} aktiva mandat</p>

      <div className="flex items-center gap-2 mt-3">
        <Pill count={critical} label="Kritiska" tone="critical" pulse />
        <Pill count={warning} label="Varningar" tone="warning" />
        <Pill count={healthy} label="Friska" tone="healthy" />
      </div>
    </div>
  );
};

const Pill = ({
  count, label, tone, pulse = false,
}: { count: number; label: string; tone: "critical" | "warning" | "healthy"; pulse?: boolean }) => {
  const styles = {
    critical: "bg-rose-500/15 text-rose-300 border-rose-400/30 shadow-[0_0_16px_rgba(244,63,94,0.25)]",
    warning: "bg-amber-500/15 text-amber-300 border-amber-400/30 shadow-[0_0_12px_rgba(245,158,11,0.18)]",
    healthy: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  } as const;
  const dot = {
    critical: "bg-rose-400",
    warning: "bg-amber-400",
    healthy: "bg-emerald-400",
  } as const;
  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-semibold tabular-nums backdrop-blur-md",
      styles[tone],
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dot[tone], pulse && count > 0 && "animate-pulse")} />
      <span>{count}</span>
      <span className="text-white/60 font-normal">{label}</span>
    </div>
  );
};
