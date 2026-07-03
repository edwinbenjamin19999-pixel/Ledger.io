import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useBusinessPulse, PulseInsight, InsightSeverity } from "@/hooks/useBusinessPulse";
import { useCashflowForecast } from "@/hooks/useCashflowForecast";
import { cn } from "@/lib/utils";
import type { WidgetSize } from "@/components/dashboard/kpi-definitions";

interface BusinessPulseWidgetProps {
  companyId: string;
  size?: WidgetSize;
}

const FILTERS = ["Alla", "Likviditet", "Fordringar", "Deadlines"] as const;
const FILTER_MAP: Record<string, string | null> = {
  Alla: null,
  Likviditet: "liquidity",
  Fordringar: "receivables",
  Deadlines: "deadlines",
};

const DOT_COLOR: Record<InsightSeverity, string> = {
  red: "bg-rose-500",
  yellow: "bg-amber-500",
  green: "bg-emerald-500",
};

function getUrgency(insight: PulseInsight): string | null {
  const dayMatch = insight.detail?.match(/(\d+)\s*d/);
  if (dayMatch) {
    const days = parseInt(dayMatch[1]);
    if (days === 0) return "Idag";
    return `${days}d`;
  }
  if (insight.detail?.toLowerCase().includes("idag")) return "Idag";
  return null;
}

function getActionLabel(insight: PulseInsight): string {
  switch (insight.category) {
    case "receivables":
      return "Skicka påminnelse →";
    case "liquidity":
      return "Visa kassaflöde →";
    case "costs":
      return "Betala nu →";
    case "deadlines":
      return "Visa deadline →";
    case "verifications":
      return "Granska →";
    default:
      return "Visa →";
  }
}

/**
 * Riskradar — disciplined risk/alert system.
 * Calm dark surface, severity-dot driven, no decorative clutter.
 */
export const BusinessPulseWidget = ({ companyId, size = "large" }: BusinessPulseWidgetProps) => {
  const navigate = useNavigate();
  const { insights, updatedAt, loading } = useBusinessPulse(companyId);
  const { data: cashflow } = useCashflowForecast(12, companyId);
  const cashCritical = (cashflow?.currentCash ?? 0) <= 0;
  const [activeFilter, setActiveFilter] = useState<string>("Alla");

  if (loading) {
    return (
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-6 h-fit self-start">
        <Skeleton className="h-5 w-32 mb-6" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      </div>
    );
  }

  const isMedium = size === "medium";
  const filterCategory = FILTER_MAP[activeFilter];
  const filtered = filterCategory
    ? insights.filter(i => i.category === filterCategory)
    : insights;
  const displayInsights = isMedium ? filtered.slice(0, 3) : filtered;
  const timeStr = updatedAt.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden flex flex-col h-fit self-start">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-gray-900 font-semibold text-base tracking-tight">Riskradar</h3>
            <p className="text-gray-400 text-sm mt-0.5">Prioriterade signaler</p>
          </div>
          <span className="text-gray-300 text-xs tabular-nums">Uppdaterad {timeStr}</span>
        </div>

        {!isMedium && (
          <div className="flex gap-1.5 mt-4">
            {FILTERS.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className={cn(
                  "rounded-md px-3 py-1 text-[11px] font-medium transition-colors",
                  activeFilter === cat
                    ? "bg-gray-900 text-white"
                    : "bg-gray-50 text-gray-500 hover:bg-gray-100",
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Alert list */}
      <div className="flex-1">
        {displayInsights.length === 0 && (
          <div className="px-4 py-10 text-center">
            {cashCritical ? (
              <>
                <p className="text-sm text-rose-600">Negativ kassa — kritiskt läge</p>
                <p className="text-xs text-gray-400 mt-1">Inga öppna signaler i kön, men likviditeten kräver åtgärd.</p>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-500">Inga aktiva signaler</p>
                <p className="text-xs text-gray-400 mt-1">Inget kräver åtgärd just nu.</p>
              </>
            )}
          </div>
        )}

        {displayInsights.map(insight => {
          const urgency = getUrgency(insight);
          const actionLabel = getActionLabel(insight);
          return (
            <button
              key={insight.id}
              onClick={() => navigate(insight.navigateTo)}
              className="w-full flex items-center gap-4 px-6 py-3.5 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors text-left"
            >
              <span
                className={cn(
                  "w-2 h-2 rounded-full flex-shrink-0",
                  DOT_COLOR[insight.severity],
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800 truncate">{insight.title}</p>
                <p className="text-xs text-gray-400 truncate mt-0.5">{insight.detail}</p>
              </div>
              {urgency && (
                <span className="text-xs text-gray-400 tabular-nums font-mono flex-shrink-0">
                  {urgency}
                </span>
              )}
              <span className="text-[#3b82f6] text-xs hover:underline flex-shrink-0">
                {actionLabel}
              </span>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      {!isMedium && insights.length > 0 && (
        <button
          onClick={() => navigate("/reports")}
          className="border-t border-gray-100 pt-3 pb-3 mt-1 px-6 text-[#3b82f6] hover:underline text-xs font-medium text-left cursor-pointer"
        >
          Visa fullständig logg →
        </button>
      )}
    </div>
  );
};
