import { Sparkles, AlertTriangle, CheckCircle2, ArrowRight, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { AgeingInsightCard } from "./AgeingInsightCard";
import { handleSendReminder, handleMarkFollowup } from "./AgeingActions";
import type { AgeingInsightsBundle } from "./useAgeingInsights";

interface Props {
  bundle: AgeingInsightsBundle;
  companyId: string;
  type: "AR" | "AP";
}

const PRIMARY_TONE = {
  neutral: {
    bg: "bg-blue-50/70 dark:bg-blue-950/30",
    border: "border-blue-200/60 dark:border-[#3b82f6]/40",
    iconBg: "bg-[#EFF6FF]",
    iconColor: "text-[#3b82f6] dark:text-[#1E3A5F]",
    Icon: CheckCircle2,
  },
  warning: {
    bg: "bg-amber-50/70 dark:bg-amber-950/30",
    border: "border-amber-200/60 dark:border-amber-800/40",
    iconBg: "bg-[#FAEEDA]",
    iconColor: "text-[#7A5417] dark:text-[#C28A2B]",
    Icon: Sparkles,
  },
  critical: {
    bg: "bg-rose-50/70 dark:bg-rose-950/30",
    border: "border-rose-200/60 dark:border-rose-800/40",
    iconBg: "bg-[#FCE8E8]",
    iconColor: "text-[#7A1A1A] dark:text-[#C73838]",
    Icon: AlertTriangle,
  },
} as const;

export const AgeingInsightStack = ({ bundle, companyId, type }: Props) => {
  const { primary, secondary } = bundle;
  const tone = PRIMARY_TONE[primary.riskLevel];
  const Icon = tone.Icon;
  const targets = primary.targetCounterparties ?? [];
  const hasActions = targets.length > 0 && primary.riskLevel !== "neutral";

  return (
    <div className="space-y-3">
      {/* Primary banner */}
      <div
        className={cn(
          "rounded-2xl border px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4",
          tone.bg,
          tone.border,
        )}
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span
            className={cn(
              "shrink-0 w-9 h-9 rounded-xl flex items-center justify-center",
              tone.iconBg,
            )}
          >
            <Icon className={cn("w-4 h-4", tone.iconColor)} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50 leading-snug">
              {primary.headline}
            </p>
            {primary.detail && (
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-snug">
                {primary.detail}
              </p>
            )}
          </div>
        </div>

        {hasActions && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleMarkFollowup(targets, companyId, type)}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-white dark:hover:bg-slate-800 transition-colors"
            >
              <Flag className="w-3.5 h-3.5" />
              Markera för uppföljning
            </button>
            <button
              type="button"
              onClick={() => handleSendReminder(targets, companyId, type)}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#3b82f6] hover:bg-[#3b82f6] text-white text-sm font-medium transition-colors shadow-sm"
            >
              {primary.actionLabel ??
                (type === "AR" ? "Skicka påminnelse" : "Markera för betalning")}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Secondary cards */}
      {secondary.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {secondary.map((ins) => (
            <AgeingInsightCard key={ins.id} insight={ins} />
          ))}
        </div>
      )}
    </div>
  );
};
