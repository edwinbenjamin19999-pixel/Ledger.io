import { useState, useMemo } from "react";
import { ChevronDown, TrendingUp, TrendingDown, Minus, ShieldCheck, ShieldAlert, Shield } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { computeConfidenceTrend, type ConfidenceOutput, type ImprovementSuggestion } from "@/lib/budget/confidenceEngine";
import type { BudgetDrivers } from "@/lib/budget/driverEngine";
import type { ConfidenceHistoryPoint } from "@/hooks/useConfidenceTrend";
import { ConfidenceImprovementList } from "./ConfidenceImprovementList";

interface Props {
  confidence: ConfidenceOutput;
  history: ConfidenceHistoryPoint[];
  suggestions: ImprovementSuggestion[];
  onApplyDriverPatch?: (patch: Partial<BudgetDrivers>) => void;
  className?: string;
}

const LEVEL_STYLE = {
  high: { bg: "bg-[#E1F5EE]", border: "border-[#BFE6D6]", text: "text-[#085041]", icon: ShieldCheck, label: "Hög" },
  medium: { bg: "bg-[#FAEEDA]", border: "border-[#F0DDB7]", text: "text-[#7A5417]", icon: Shield, label: "Medel" },
  low: { bg: "bg-[#FCE8E8]", border: "border-[#F4C8C8]", text: "text-[#7A1A1A]", icon: ShieldAlert, label: "Låg" },
} as const;

export function ConfidenceCard({ confidence, history, suggestions, onApplyDriverPatch, className }: Props) {
  const [open, setOpen] = useState(false);
  const style = LEVEL_STYLE[confidence.level];
  const Icon = style.icon;

  const trend = useMemo(
    () => computeConfidenceTrend(history.map((h) => ({ score: h.overall_score, at: h.computed_at }))),
    [history]
  );

  const sparkPath = useMemo(() => {
    if (history.length < 2) return null;
    const sorted = [...history].sort((a, b) => +new Date(a.computed_at) - +new Date(b.computed_at));
    const W = 80, H = 24;
    const xs = sorted.map((_, i) => (i / (sorted.length - 1)) * W);
    const ys = sorted.map((p) => H - (p.overall_score / 100) * H);
    return xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(" ");
  }, [history]);

  const TrendIcon = trend.direction === "up" ? TrendingUp : trend.direction === "down" ? TrendingDown : Minus;
  const trendColor =
    trend.direction === "up" ? "text-[#085041]" : trend.direction === "down" ? "text-[#7A1A1A]" : "text-slate-500";

  const showInstabilityBanner = trend.lastDrop > 10;

  return (
    <TooltipProvider>
      <div className={cn("rounded-2xl border bg-white overflow-hidden", style.border, className)}>
        <div className={cn("p-4 flex items-start justify-between gap-3", style.bg)}>
          <div className="flex items-start gap-3 min-w-0">
            <div className={cn("flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm", style.text)}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Prognosens tillförlitlighet</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className={cn("text-[10px] font-medium border rounded-full px-1.5 py-0.5 cursor-help", style.text, style.border)}>
                      {style.label}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <ConfidenceBreakdown confidence={confidence} />
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex items-baseline gap-3 mt-1">
                <span className={cn("text-3xl font-bold tracking-tight", style.text)}>{confidence.score}</span>
                <span className="text-xs text-slate-500">/100</span>
                <span className={cn("flex items-center gap-1 text-xs font-medium", trendColor)}>
                  <TrendIcon className="w-3.5 h-3.5" />
                  {trend.label}
                </span>
              </div>
            </div>
          </div>
          {sparkPath && (
            <svg width={80} height={24} className="shrink-0">
              <path d={sparkPath} fill="none" stroke="currentColor" strokeWidth={1.5} className={trendColor} />
            </svg>
          )}
        </div>

        {showInstabilityBanner && (
          <div className="px-4 py-2 bg-[#FCE8E8] border-t border-[#F4C8C8] text-xs text-[#7A1A1A]">
            <span className="font-semibold">Prognosen blir instabil</span> — granska följande konton:{" "}
            {confidence.top3WeakSignals.map((w) => w.account).join(", ") || "—"}
          </div>
        )}

        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-2.5 border-t border-slate-100 hover:bg-slate-50 transition-colors">
            <span className="text-xs font-medium text-slate-700">
              Förbättringsförslag ({suggestions.length})
            </span>
            <ChevronDown className={cn("w-4 h-4 text-slate-500 transition-transform", open && "rotate-180")} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-4 border-t border-slate-100 bg-slate-50/40">
              <ConfidenceImprovementList suggestions={suggestions} onApplyDriverPatch={onApplyDriverPatch} />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </TooltipProvider>
  );
}

function ConfidenceBreakdown({ confidence }: { confidence: ConfidenceOutput }) {
  const rows: Array<{ label: string; value: number; weighted: number; weight: string }> = [
    { label: "Datakvalitet", value: confidence.components.dataQuality, weighted: confidence.weightedComponents.dataQuality, weight: "30%" },
    { label: "Historisk konsistens", value: confidence.components.historicalConsistency, weighted: confidence.weightedComponents.historicalConsistency, weight: "30%" },
    { label: "Variansstabilitet", value: confidence.components.varianceStability, weighted: confidence.weightedComponents.varianceStability, weight: "25%" },
    { label: "Täckning (mån)", value: confidence.components.coverage, weighted: confidence.weightedComponents.coverage, weight: "15%" },
  ];
  return (
    <div className="text-xs space-y-1.5">
      <div className="font-semibold text-slate-900 mb-1">Hur poängen beräknas</div>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-3">
          <span className="text-slate-600">
            {r.label} <span className="text-slate-400">({r.weight})</span>
          </span>
          <span className="font-mono text-slate-900">{(r.value * 100).toFixed(0)}</span>
        </div>
      ))}
      <div className="border-t border-slate-200 pt-1 flex justify-between font-semibold">
        <span>Totalt</span>
        <span>{confidence.score}/100</span>
      </div>
    </div>
  );
}
