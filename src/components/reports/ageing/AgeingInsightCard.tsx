import { Users, TrendingUp, Zap, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgeingInsight } from "./useAgeingInsights";

const ICON_MAP: Record<string, LucideIcon> = {
  concentration: Users,
  trend: TrendingUp,
  action: Zap,
};

const TONE_MAP = {
  neutral: {
    iconBg: "bg-slate-100 dark:bg-slate-800",
    iconColor: "text-slate-600 dark:text-slate-300",
  },
  warning: {
    iconBg: "bg-[#FAEEDA] dark:bg-amber-950/40",
    iconColor: "text-[#7A5417] dark:text-[#C28A2B]",
  },
  critical: {
    iconBg: "bg-[#FCE8E8] dark:bg-rose-950/40",
    iconColor: "text-[#7A1A1A] dark:text-[#C73838]",
  },
} as const;

interface Props {
  insight: AgeingInsight;
}

export const AgeingInsightCard = ({ insight }: Props) => {
  const Icon = ICON_MAP[insight.id] ?? Zap;
  const tone = TONE_MAP[insight.riskLevel];

  return (
    <div className="rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-start gap-3 shadow-[0_2px_8px_rgba(15,23,42,0.03)]">
      <span
        className={cn(
          "shrink-0 w-9 h-9 rounded-lg flex items-center justify-center",
          tone.iconBg,
        )}
      >
        <Icon className={cn("w-4 h-4", tone.iconColor)} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          {insight.metric && (
            <span className="text-xl font-bold tabular-nums text-slate-900 dark:text-slate-50 leading-none">
              {insight.metric}
            </span>
          )}
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-snug truncate">
            {insight.headline}
          </span>
        </div>
        {insight.detail && (
          <p
            className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate"
            title={insight.detail}
          >
            {insight.detail}
          </p>
        )}
      </div>
    </div>
  );
};
