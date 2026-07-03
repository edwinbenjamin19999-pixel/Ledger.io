import { Sparkles, AlertTriangle, CheckCircle2, ArrowRight, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProformaInsightCard } from "./ProformaInsightCard";
import type { ProformaInsightsBundle } from "./useProformaInsights";

const TONE = {
  neutral: { bg: "bg-slate-50/70 dark:bg-slate-900/40", border: "border-slate-200/60 dark:border-slate-800", iconBg: "bg-slate-500/10", iconColor: "text-slate-600 dark:text-slate-300", Icon: Sparkles },
  positive: { bg: "bg-cyan-50/70 dark:bg-cyan-950/30", border: "border-cyan-200/60 dark:border-[#3b82f6]/40", iconBg: "bg-[#EFF6FF]", iconColor: "text-[#3b82f6] dark:text-[#1E3A5F]", Icon: TrendingUp },
  warning: { bg: "bg-amber-50/70 dark:bg-amber-950/30", border: "border-amber-200/60 dark:border-amber-800/40", iconBg: "bg-[#FAEEDA]", iconColor: "text-[#7A5417] dark:text-[#C28A2B]", Icon: Sparkles },
  critical: { bg: "bg-rose-50/70 dark:bg-rose-950/30", border: "border-rose-200/60 dark:border-rose-800/40", iconBg: "bg-[#FCE8E8]", iconColor: "text-[#7A1A1A] dark:text-[#C73838]", Icon: AlertTriangle },
} as const;

interface Props {
  bundle: ProformaInsightsBundle;
  onScrollToPeriod?: (period: string) => void;
}

export const ProformaInsightStack = ({ bundle, onScrollToPeriod }: Props) => {
  const { primary, secondary } = bundle;
  const tone = TONE[primary.tone];
  const Icon = tone.Icon;

  return (
    <div className="space-y-3">
      <div className={cn("rounded-2xl border px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4", tone.bg, tone.border)}>
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className={cn("shrink-0 w-9 h-9 rounded-xl flex items-center justify-center", tone.iconBg)}>
            <Icon className={cn("w-4 h-4", tone.iconColor)} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50 leading-snug">{primary.headline}</p>
            {primary.detail && (
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-snug">{primary.detail}</p>
            )}
          </div>
        </div>

        {primary.actionLabel && primary.targetPeriod && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onScrollToPeriod?.(primary.targetPeriod!)}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#3b82f6] hover:bg-[#3b82f6] text-white text-sm font-medium transition-colors shadow-sm"
            >
              {primary.actionLabel}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {primary.tone === "positive" && !primary.actionLabel && (
          <CheckCircle2 className="w-5 h-5 text-[#3b82f6] shrink-0 hidden sm:block" />
        )}
      </div>

      {secondary.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {secondary.map((ins, i) => (
            <ProformaInsightCard key={`${ins.id}-${i}`} insight={ins} />
          ))}
        </div>
      )}
    </div>
  );
};
