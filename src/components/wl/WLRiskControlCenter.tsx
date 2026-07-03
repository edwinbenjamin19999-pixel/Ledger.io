import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useBusinessPulse, type InsightSeverity } from "@/hooks/useBusinessPulse";
import { cn } from "@/lib/utils";

interface Props {
  companyId: string;
}

const FILTERS = ["Alla", "Likviditet", "Fordringar", "Deadlines"] as const;
const FILTER_MAP: Record<string, string | null> = {
  Alla: null,
  Likviditet: "liquidity",
  Fordringar: "receivables",
  Deadlines: "deadlines",
};

const DOT_COLOR: Record<InsightSeverity, string> = {
  red: "bg-[#EF4444]",
  yellow: "bg-[#F59E0B]",
  green: "bg-emerald-500",
};

/** Extract a "Nd" urgency from detail strings like "93 dagar förfallna" */
function extractUrgency(detail: string): string | null {
  const m = detail.match(/(\d{1,4})\s*(dagar|d\b|days?)/i);
  return m ? `${m[1]}d` : null;
}

/**
 * White-label Risk & Kontrollcenter.
 * Light surface variant aligned with main dashboard background.
 */
export function WLRiskControlCenter({ companyId }: Props) {
  const navigate = useNavigate();
  const { insights, updatedAt, loading } = useBusinessPulse(companyId);
  const [activeFilter, setActiveFilter] = useState<string>("Alla");

  if (loading) {
    return (
      <section
        className="bg-white"
        style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 16, padding: 24 }}
      >
        <Skeleton className="h-5 w-40 mb-6" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      </section>
    );
  }

  const filterCategory = FILTER_MAP[activeFilter];
  const filtered = filterCategory
    ? insights.filter((i) => i.category === filterCategory)
    : insights;
  const timeStr = updatedAt.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });

  return (
    <section
      className="bg-white"
      style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 16, padding: 24 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.07em] font-medium text-black/40">
            Kontrollpanel
          </p>
          <h3 className="mt-1 text-[#0B1F2F] font-medium text-base tracking-tight">
            Risk &amp; Kontrollcenter
          </h3>
          <p className="text-black/50 text-[11px] mt-0.5">
            Aktiva signaler och avvikelser
          </p>
        </div>
        <span className="text-[11px] text-black/40 tabular-nums shrink-0">
          Senast skannad {timeStr}
        </span>
      </div>

      {/* Tab pill row */}
      <div
        className="flex gap-1 mt-4"
        style={{ background: "rgba(0,0,0,0.04)", borderRadius: 8, padding: 3, width: "fit-content" }}
      >
        {FILTERS.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveFilter(cat)}
            className={cn(
              "px-3 py-1 text-[12px] transition-colors",
              activeFilter === cat
                ? "bg-[#0B1F2F] text-white font-medium"
                : "text-black/50 hover:text-[#0B1F2F]",
            )}
            style={{ borderRadius: 6 }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Alert list */}
      <div className="mt-4">
        {filtered.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-black/60">Inga aktiva signaler</p>
            <p className="text-xs text-black/40 mt-1">Verksamhetsläget är stabilt.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map((insight) => {
              const urgency = extractUrgency(insight.detail);
              return (
                <button
                  key={insight.id}
                  onClick={() => navigate(insight.navigateTo)}
                  className="w-full flex items-center gap-3 text-left transition-colors hover:bg-black/[0.03]"
                  style={{ padding: "12px 16px", borderRadius: 8 }}
                >
                  <span
                    className={cn("rounded-full flex-shrink-0", DOT_COLOR[insight.severity])}
                    style={{ width: 8, height: 8 }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-[#0B1F2F] truncate">{insight.title}</p>
                    <p className="text-[11px] text-black/50 truncate mt-0.5">{insight.detail}</p>
                  </div>
                  {urgency && (
                    <span
                      className="shrink-0 tabular-nums"
                      style={{
                        backgroundColor: "#FEF2F2",
                        color: "#EF4444",
                        border: "1px solid #FEE2E2",
                        borderRadius: 100,
                        padding: "2px 8px",
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {urgency}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {insights.length > 0 && (
        <button
          onClick={() => navigate("/audit-log")}
          className="mt-4 w-full border-t border-black/5 pt-3 text-black/50 hover:text-[#0B1F2F] text-[11px] font-medium uppercase tracking-[0.07em] transition-colors text-left"
        >
          Visa fullständig logg →
        </button>
      )}
    </section>
  );
}
