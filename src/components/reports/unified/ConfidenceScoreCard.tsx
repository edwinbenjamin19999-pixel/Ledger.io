import { Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ConfidenceScoreCardProps {
  confidence: number; // 0..1
  countsBySeverity: { critical: number; warning: number; info: number };
}

export function ConfidenceScoreCard({ confidence, countsBySeverity }: ConfidenceScoreCardProps) {
  const pct = Math.round(confidence * 100);
  const tone = pct >= 85 ? "emerald" : pct >= 60 ? "amber" : "rose";

  const toneStyles = {
    emerald: {
      shell: "bg-card border-border ring-1 ring-emerald-500/15 dark:ring-emerald-400/20",
      accent: "bg-emerald-500/70 dark:bg-emerald-400/80",
      bar: "bg-[#0F1F3D]",
      icon: "bg-[#E1F5EE] text-[#085041] dark:text-[#1D9E75]",
      value: "text-[#085041] dark:text-emerald-300",
    },
    amber: {
      shell: "bg-card border-border ring-1 ring-amber-500/15 dark:ring-amber-400/20",
      accent: "bg-amber-500/70 dark:bg-amber-400/80",
      bar: "bg-[#0F1F3D]",
      icon: "bg-[#FAEEDA] text-[#7A5417] dark:text-[#C28A2B]",
      value: "text-[#7A5417] dark:text-amber-300",
    },
    rose: {
      shell: "bg-card border-border ring-1 ring-rose-500/15 dark:ring-rose-400/20",
      accent: "bg-rose-500/70 dark:bg-rose-400/80",
      bar: "bg-[#0F1F3D]",
      icon: "bg-[#FCE8E8] text-[#7A1A1A] dark:text-[#C73838]",
      value: "text-[#7A1A1A] dark:text-rose-300",
    },
  }[tone];

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "relative overflow-hidden rounded-2xl border p-5 cursor-help transition-all hover:shadow-md hover:-translate-y-0.5",
              toneStyles.shell,
            )}
          >
            <div className={cn("absolute inset-x-0 top-0 h-px", toneStyles.accent)} />
            <div className="flex items-start gap-3">
              <div className={cn("rounded-xl w-10 h-10 flex items-center justify-center shrink-0", toneStyles.icon)}>
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Financial Confidence
                </p>
                <p className={cn("text-2xl font-bold leading-tight mt-0.5 tabular-nums", toneStyles.value)}>
                  {pct}%
                </p>
                <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div className={cn("h-full transition-all", toneStyles.bar)} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  Validering, datakomplett & konsistens
                </p>
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1 text-xs">
            <p className="font-semibold">Hur poängen beräknas</p>
            <p>• {countsBySeverity.critical} kritiska problem (−25% var)</p>
            <p>• {countsBySeverity.warning} varningar (−8% var)</p>
            <p>• {countsBySeverity.info} info-flaggor (−3% var)</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
