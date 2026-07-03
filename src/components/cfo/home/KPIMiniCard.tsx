import { useNavigate } from "react-router-dom";
import { CFOEntryButton } from "@/components/cfo-workspace/CFOEntryButton";
import { drilldown } from "./DrilldownRouter";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react";

export type KPITone = "strong" | "watch" | "needs_attention" | "critical" | "neutral";

const TONE: Record<KPITone, { dot: string; chip: string; ring: string }> = {
  strong: { dot: "bg-emerald-500", chip: "text-[#085041] dark:text-emerald-300 bg-[#E1F5EE]", ring: "hover:ring-emerald-500/30" },
  watch: { dot: "bg-[#3b82f6]", chip: "text-[#3b82f6] dark:text-[#3b82f6] bg-[#EFF6FF]", ring: "hover:ring-[#3b82f6]/30" },
  needs_attention: { dot: "bg-amber-500", chip: "text-[#7A5417] dark:text-amber-300 bg-[#FAEEDA]", ring: "hover:ring-amber-500/30" },
  critical: { dot: "bg-rose-500", chip: "text-[#7A1A1A] dark:text-rose-300 bg-[#FCE8E8]", ring: "hover:ring-rose-500/30" },
  neutral: { dot: "bg-slate-400", chip: "text-slate-700 dark:text-slate-300 bg-slate-500/10", ring: "hover:ring-slate-500/30" },
};

interface Props {
  kpiKey: string;
  label: string;
  value: string;
  delta?: { pct: number; direction: "up" | "down" | "flat"; positiveIsGood?: boolean } | null;
  verdict?: string;
  tone?: KPITone;
  Icon?: LucideIcon;
  index?: number;
}

export function KPIMiniCard({ kpiKey, label, value, delta, verdict, tone = "neutral", Icon, index = 0 }: Props) {
  const navigate = useNavigate();
  const t = TONE[tone];
  const TrendIcon = delta?.direction === "up" ? TrendingUp : delta?.direction === "down" ? TrendingDown : Minus;
  const isGood = delta
    ? delta.direction === "flat"
      ? null
      : (delta.positiveIsGood ?? true) === (delta.direction === "up")
    : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => drilldown(navigate, { kind: "kpi", key: kpiKey, label })}
      onKeyDown={(e) => e.key === "Enter" && drilldown(navigate, { kind: "kpi", key: kpiKey, label })}
      className={cn(
        "group relative text-left rounded-2xl border border-border",
        "bg-card text-card-foreground",
        "p-4 cursor-pointer ring-1 ring-transparent transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-lg",
        t.ring,
        "animate-fade-in",
      )}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider truncate">{label}</span>
        </div>
        <span className={cn("h-2 w-2 rounded-full shrink-0", t.dot)} title={tone} />
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <div className="text-xl md:text-2xl font-bold tabular-nums leading-none">{value}</div>
        {delta && (
          <div
            className={cn(
              "flex items-center gap-0.5 text-[11px] font-semibold tabular-nums",
              isGood === null ? "text-muted-foreground" : isGood ? "text-[#085041] dark:text-[#1D9E75]" : "text-[#7A1A1A] dark:text-[#C73838]",
            )}
          >
            <TrendIcon className="h-3 w-3" />
            {Math.abs(delta.pct).toFixed(1)}%
          </div>
        )}
      </div>

      {verdict && <p className="mt-2 text-[11px] text-muted-foreground line-clamp-2 leading-snug">{verdict}</p>}

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-md", t.chip)}>
          {tone === "strong" ? "Stark" : tone === "watch" ? "Bevaka" : tone === "needs_attention" ? "Åtgärda" : tone === "critical" ? "Kritisk" : "—"}
        </span>
        <div onClick={(e) => e.stopPropagation()}>
          <CFOEntryButton
            context={{ type: "kpi", kpi: kpiKey, label, value: undefined }}
            label="AI"
            size="sm"
            className="h-7 px-2 text-[11px]"
          />
        </div>
      </div>
    </div>
  );
}
