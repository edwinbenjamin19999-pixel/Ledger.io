import { useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink, Loader2, Beaker, Play, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { ActionableInsight } from "@/lib/cashflow/types";
import { routeFor, ctaVerb } from "@/lib/cash-command/routeFor";

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(Math.round(Math.abs(n)));

const riskStyle: Record<ActionableInsight["riskLevel"], { chip: string; bar: string }> = {
  high: {
    chip: "bg-[#FCE8E8] text-[#7A1A1A] border-[#F4C8C8] dark:bg-[#FCE8E8] dark:text-rose-200 dark:border-[#F4C8C8]",
    bar: "from-rose-500 to-rose-600",
  },
  medium: {
    chip: "bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7] dark:bg-[#FAEEDA] dark:text-amber-200 dark:border-[#F0DDB7]",
    bar: "from-amber-500 to-amber-600",
  },
  low: {
    chip: "bg-[#E1F5EE] text-[#085041] border-[#BFE6D6] dark:bg-[#E1F5EE] dark:text-emerald-200 dark:border-[#BFE6D6]",
    bar: "from-emerald-500 to-emerald-600",
  },
};

interface InsightItem {
  id: string;
  primary: string;
  secondary?: string;
  amount?: number;
}

interface Props {
  insight: ActionableInsight;
  /** Optional preloaded affected items (invoices/bills). */
  items?: InsightItem[];
  /** Avg daily outflow for runway delta math. */
  avgDailyOutflow: number;
  pending: boolean;
  onExecute: (insight: ActionableInsight, selectedIds: string[]) => void;
  onSimulate: (insight: ActionableInsight) => void;
}

export function LiquidityPriorityCard({
  insight,
  items = [],
  avgDailyOutflow,
  pending,
  onExecute,
  onSimulate,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const route = routeFor(insight);
  const tone = riskStyle[insight.riskLevel];
  const runwayDelta =
    avgDailyOutflow > 0 ? Math.round((insight.impactSek * insight.confidence) / avgDailyOutflow) : 0;
  const allSelected = items.length > 0 && selected.size === items.length;

  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)));
  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-white/[0.04] p-5 shadow-sm">
      <div className={cn("absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b", tone.bar)} />

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={cn("text-[10px] uppercase font-semibold tracking-wide px-2 py-0.5 rounded border", tone.chip)}>
              {insight.riskLevel === "high" ? "Hög risk" : insight.riskLevel === "medium" ? "Medel" : "Låg"}
            </span>
            <span className="text-[10px] uppercase font-semibold tracking-wide px-2 py-0.5 rounded border bg-slate-100 text-slate-700 border-slate-200 dark:bg-white/5 dark:text-white/70 dark:border-white/10">
              Säkerhet {Math.round(insight.confidence * 100)}%
            </span>
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white leading-tight">
            {insight.title}
          </h3>

          {/* AI rationale folded in */}
          <p className="text-xs italic text-slate-500 dark:text-white/60 mt-1.5 leading-relaxed flex items-start gap-1.5">
            <Sparkles className="h-3 w-3 mt-0.5 shrink-0 text-[#0052FF]" />
            <span>{insight.description}</span>
          </p>

          {/* Impact line */}
          {insight.impactSek > 0 && (
            <div className="mt-3 flex items-baseline gap-3 flex-wrap">
              <span className="text-2xl font-bold tabular-nums text-[#085041] dark:text-emerald-300">
                +{fmt(insight.impactSek)} kr
              </span>
              <span className="text-[11px] text-muted-foreground">inom 14 dagar</span>
              {runwayDelta !== 0 && (
                <span className="text-xs text-[#0052FF] dark:text-[#0052FF] font-medium">
                  · Runway {runwayDelta >= 0 ? "+" : ""}
                  {runwayDelta} dgr
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Affected items */}
      {items.length > 0 && (
        <div className="mt-4 border-t border-slate-100 dark:border-white/5 pt-3">
          <button
            onClick={() => setExpanded((s) => !s)}
            className="w-full flex items-center justify-between text-xs font-medium text-slate-700 dark:text-white/80 hover:text-[#0052FF] dark:hover:text-[#0052FF] transition-colors"
          >
            <span className="flex items-center gap-1.5">
              {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              Visa {items.length} berörda poster
            </span>
            {expanded && (
              <span className="text-[10px] text-muted-foreground">
                {selected.size}/{items.length} valda
              </span>
            )}
          </button>

          {expanded && (
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2 px-2 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground border-b border-slate-100 dark:border-white/5">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} className="h-3.5 w-3.5" />
                <span className="flex-1">Post</span>
                <span>Belopp</span>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-0.5">
                {items.map((it) => {
                  const isSel = selected.has(it.id);
                  return (
                    <label
                      key={it.id}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded-md text-xs cursor-pointer transition-colors",
                        isSel
                          ? "bg-[#EFF6FF] dark:bg-[#EFF6FF]"
                          : "hover:bg-slate-50 dark:hover:bg-white/5",
                      )}
                    >
                      <Checkbox
                        checked={isSel}
                        onCheckedChange={() => toggleOne(it.id)}
                        className="h-3.5 w-3.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-900 dark:text-white/90 truncate">
                          {it.primary}
                        </div>
                        {it.secondary && (
                          <div className="text-[10px] text-muted-foreground truncate">
                            {it.secondary}
                          </div>
                        )}
                      </div>
                      {it.amount != null && (
                        <span className="tabular-nums text-slate-700 dark:text-white/80">
                          {fmt(it.amount)} kr
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action row */}
      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <button
          disabled={pending}
          onClick={() => onExecute(insight, Array.from(selected))}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-all",
            "bg-[#0052FF] text-white",
            "hover:shadow-[0_0_24px_hsl(var(--primary)/0.4)]",
            "disabled:opacity-60",
          )}
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          {ctaVerb(insight.kind)}
          {selected.size > 0 && ` (${selected.size})`}
        </button>
        <button
          onClick={() => onSimulate(insight)}
          className="px-3 py-2 rounded-lg text-sm flex items-center gap-1.5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/80 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
        >
          <Beaker className="h-3.5 w-3.5" />
          Simulera först
        </button>
        <Link
          to={route.href}
          className="px-3 py-2 rounded-lg text-sm flex items-center gap-1.5 text-slate-700 dark:text-white/80 hover:text-[#0052FF] dark:hover:text-[#0052FF] hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {route.label}
        </Link>
      </div>
    </div>
  );
}
