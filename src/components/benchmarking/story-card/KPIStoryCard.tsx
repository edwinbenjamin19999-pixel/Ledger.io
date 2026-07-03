import { useState } from "react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getVerdict } from "@/lib/benchmarking/verdictCalculator";
import { KPICardHeader } from "./KPICardHeader";
import { PrimaryValueBlock } from "./PrimaryValueBlock";
import { AnimatedBenchmarkBar } from "./AnimatedBenchmarkBar";
import { AIVerdictBadge } from "./AIVerdictBadge";
import { InsightLine } from "./InsightLine";
import { ActionRow } from "./ActionRow";
import { ExpandedKPIPanel } from "./ExpandedKPIPanel";

export interface KPIStoryData {
  label: string;
  value: number;
  unit: string;
  p25: number;
  p50: number;
  p75: number;
  percentile: number;
  prevPercentile: number;
  insight: string;
  smartWarning: string | null;
  gapText?: string;
  isReliable: boolean;
  dataQualityNote: string | null;
  deepDive: string[];
  description?: string;
}

interface Props {
  kpi: KPIStoryData;
  sniLabel: string;
  revenueBase?: number;
  onSimulate?: () => void;
  onCreateAction?: () => void;
  onReview?: () => void;
  simulationActive?: boolean;
  className?: string;
}

export function KPIStoryCard({
  kpi,
  sniLabel,
  revenueBase,
  onSimulate,
  onCreateAction,
  onReview,
  simulationActive,
  className,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const verdict = getVerdict(kpi.percentile, kpi.smartWarning);
  const isAlert = !!kpi.smartWarning || verdict.tone === "critical";
  const reliable = kpi.isReliable;

  const dataState = !reliable
    ? "disabled"
    : simulationActive
      ? "simulating"
      : isAlert
        ? "alert"
        : expanded
          ? "expanded"
          : "default";

  return (
    <div
      data-state={dataState}
      className={cn(
        "group relative overflow-hidden rounded-2xl border backdrop-blur-sm",
        "bg-gradient-to-br from-white via-white to-slate-50/60",
        "dark:from-slate-900 dark:via-slate-900 dark:to-slate-900/80",
        "border-slate-200/70 dark:border-slate-800",
        "shadow-sm transition-all duration-200",
        // Hover (only when not disabled)
        reliable &&
          "hover:shadow-lg hover:border-[#C8DDF5] dark:hover:border-[#3b82f6] hover:-translate-y-0.5",
        // States
        isAlert && "border-l-4 border-l-rose-500",
        !isAlert && simulationActive && "shadow-[0_0_24px_rgba(37,99,235,0.18)] border-[#3b82f6] dark:border-[#3b82f6]",
        !isAlert && !simulationActive && expanded && verdict.accentClass,
        !reliable && "border-dashed opacity-80",
        className,
      )}
    >
      {/* Live pill in simulation */}
      {simulationActive && reliable && (
        <span className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 rounded-full bg-[#EFF6FF] border border-[#C8DDF5] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#3b82f6] dark:text-[#3b82f6] animate-pulse">
          <span className="h-1.5 w-1.5 rounded-full bg-[#3b82f6]" /> Live
        </span>
      )}

      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <div className="p-5 space-y-4">
          {/* Header */}
          <KPICardHeader
            label={kpi.label}
            description={kpi.description}
            alert={isAlert}
          />

          {/* Primary value + percentile pill */}
          <PrimaryValueBlock
            value={kpi.value}
            unit={kpi.unit}
            percentile={kpi.percentile}
            prevPercentile={reliable ? kpi.prevPercentile : undefined}
            verdict={verdict}
            reliable={reliable}
            simulating={simulationActive}
          />

          {/* Disabled state */}
          {!reliable ? (
            <>
              <Badge variant="outline" className="text-muted-foreground">
                Otillräcklig data
              </Badge>
              {kpi.dataQualityNote && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200/60 bg-amber-50/60 dark:bg-amber-950/20 p-3 text-xs text-[#7A5417] dark:text-amber-200">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <p>{kpi.dataQualityNote}</p>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Benchmark bar */}
              <AnimatedBenchmarkBar
                percentile={kpi.percentile}
                p25={kpi.p25}
                p50={kpi.p50}
                p75={kpi.p75}
                unit={kpi.unit}
                verdict={verdict}
                simulating={simulationActive}
                reliable={reliable}
              />

              {/* Verdict badge */}
              <div className="flex items-center justify-between gap-2">
                <AIVerdictBadge verdict={verdict} />
                {kpi.gapText && (
                  <span className="text-[11px] text-muted-foreground tabular-nums truncate">
                    {kpi.gapText}
                  </span>
                )}
              </div>

              {/* Insight (max 2 lines) */}
              <InsightLine
                text={kpi.smartWarning ?? kpi.insight}
                tone={verdict.tone}
              />

              {/* Action row */}
              <ActionRow
                context={{
                  type: "kpi",
                  kpi: kpi.label,
                  value: kpi.value,
                  percentile: kpi.percentile,
                  peer_median: kpi.p50,
                  source: sniLabel,
                  label: kpi.label,
                  notes: kpi.insight,
                }}
                onReview={onReview ?? (() => setExpanded((v) => !v))}
                onSimulate={onSimulate}
                onCreateAction={onCreateAction}
                expanded={expanded}
                onToggleExpand={() => setExpanded((v) => !v)}
              />

              {/* Expanded panel */}
              <CollapsibleContent>
                <ExpandedKPIPanel
                  label={kpi.label}
                  value={kpi.value}
                  unit={kpi.unit}
                  percentile={kpi.percentile}
                  prevPercentile={kpi.prevPercentile}
                  p25={kpi.p25}
                  p50={kpi.p50}
                  p75={kpi.p75}
                  deepDive={kpi.deepDive}
                  verdict={verdict}
                  revenueBase={revenueBase}
                />
              </CollapsibleContent>

              {/* Expand toggle (chevron pill) */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded((v) => !v)}
                className="w-full h-7 text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground -mt-1"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Dölj djupanalys
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Visa djupanalys
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </Collapsible>
    </div>
  );
}
