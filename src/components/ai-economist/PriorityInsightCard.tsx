import { useState } from "react";
import { ArrowRight, CheckCircle2, Sparkles, X, Loader2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CFOPriority } from "@/hooks/useCFOPriorities";
import type { AutomationMode } from "@/hooks/useAIEconomistSettings";

const tierStyles: Record<CFOPriority["tier"], { bar: string; chip: string; label: string }> = {
  critical: { bar: "from-rose-500 to-rose-600", chip: "bg-[#FCE8E8] text-[#7A1A1A] border-[#F4C8C8] dark:bg-[#FCE8E8] dark:text-rose-200 dark:border-[#F4C8C8]", label: "Kritisk" },
  high:     { bar: "from-orange-500 to-orange-600", chip: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/20 dark:text-orange-200 dark:border-orange-400/30", label: "Hög" },
  medium:   { bar: "from-yellow-500 to-yellow-600", chip: "bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7] dark:bg-[#FAEEDA] dark:text-yellow-200 dark:border-[#F0DDB7]", label: "Medel" },
  low:      { bar: "from-emerald-500 to-emerald-600", chip: "bg-[#E1F5EE] text-[#085041] border-[#BFE6D6] dark:bg-[#E1F5EE] dark:text-emerald-200 dark:border-[#BFE6D6]", label: "Låg" },
};

interface Props {
  insight: CFOPriority;
  automationMode: AutomationMode;
  onFix: () => Promise<void> | void;
  onIgnore: () => void;
  pending: boolean;
}

function fmtSEK(n: number) {
  return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(Math.round(Math.abs(n))) + " kr";
}

export function PriorityInsightCard({ insight, automationMode, onFix, onIgnore, pending }: Props) {
  const [showDetails, setShowDetails] = useState(false);
  const t = tierStyles[insight.tier];
  const isNeg = insight.impact_sek < 0;
  const canFix = insight.action_type !== "none";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 dark:border-white/10 bg-white dark:bg-white/[0.04] backdrop-blur-xl p-5 shadow-sm hover:bg-slate-50 dark:hover:bg-white/[0.07] transition-all">
      <div className={cn("absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b", t.bar)} />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={cn("text-[10px] uppercase font-semibold tracking-wide px-2 py-0.5 rounded border", t.chip)}>
              {t.label}
            </span>
            <span className="text-[10px] text-muted-foreground">Konfidens {Math.round(insight.confidence * 100)}%</span>
            <span className="text-[10px] text-muted-foreground/60">·</span>
            <span className="text-[10px] text-muted-foreground">{insight.source}</span>
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white leading-tight">{insight.title}</h3>
          <p className="text-sm text-slate-600 dark:text-white/70 mt-1.5 leading-relaxed">{insight.explanation}</p>

          {insight.impact_sek !== 0 && (
            <div className="mt-3 flex items-baseline gap-2">
              <span className={cn(
                "text-2xl font-bold tabular-nums tracking-tight",
                isNeg ? "text-[#7A1A1A] dark:text-rose-300" : "text-[#085041] dark:text-emerald-300"
              )}>
                {isNeg ? "−" : "+"}{fmtSEK(insight.impact_sek)}
              </span>
              <span className="text-xs text-muted-foreground">finansiell påverkan</span>
            </div>
          )}

          {showDetails && (
            <div className="mt-3 p-3 rounded-lg bg-slate-50 dark:bg-black/20 border border-slate-200/60 dark:border-white/5 text-xs text-slate-600 dark:text-white/60 space-y-1">
              <div className="flex items-center gap-1.5"><Info className="h-3 w-3" /> Källa: {insight.source}</div>
              <div>Prioritetspoäng: {insight.priority_score.toFixed(2)}</div>
              <div>Auto-läge: {automationMode}</div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        {canFix && (
          <button
            disabled={pending}
            onClick={onFix}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-all",
              "bg-[#0F1F3D] text-white",
              "hover:shadow-[0_0_24px_rgba(37,99,235,0.4)]",
              "disabled:opacity-60"
            )}
          >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {automationMode === "autonomous"
              ? "Utför nu"
              : automationMode === "manual"
              ? "Granska & godkänn"
              : "Fixa automatiskt"}
            {!pending && <ArrowRight className="h-3.5 w-3.5" />}
          </button>
        )}
        <button
          onClick={() => setShowDetails(s => !s)}
          className="px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
        >
          {showDetails ? "Dölj detaljer" : "Granska"}
        </button>
        <button
          onClick={onIgnore}
          className="ml-auto px-2 py-2 rounded-lg text-slate-400 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/70 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
          title="Ignorera"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
