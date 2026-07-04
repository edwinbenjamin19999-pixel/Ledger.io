import { TrendingUp, TrendingDown, ChevronRight, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AIInsightData {
  headline: string;
  previousValue?: number;
  currentValue?: number;
  deltaAmount?: number;
  deltaPercent?: number;
  isFavorable?: boolean;
  explanations?: string[];
  ctaLabel?: string;
  onCtaClick?: () => void;
  transactionsAnalyzed?: number;
}

function formatSEKCompact(value: number): string {
  return new Intl.NumberFormat("sv-SE", { style: "decimal", maximumFractionDigits: 0 }).format(value) + " kr";
}

export function AIInsightCard({ data, className }: { data: AIInsightData; className?: string }) {
  const hasData = data.currentValue !== undefined || data.deltaAmount !== undefined;

  if (!hasData && !data.explanations?.length) {
    return (
      <div className={cn("rounded-2xl border border-border/50 bg-muted/30 p-5", className)}>
        <div className="flex items-center gap-2 mb-2">
          <Brain className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">AI-insikt</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Inga data ännu — AI analyserar när fler transaktioner finns
        </p>
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-2xl border p-5 transition-all duration-200",
      data.isFavorable
        ? "border-emerald-200/60 bg-emerald-50/30 dark:border-emerald-800/40 dark:bg-emerald-950/20"
        : "border-rose-200/60 bg-rose-50/30 dark:border-rose-800/40 dark:bg-rose-950/20",
      className
    )}>
      {/* Headline */}
      <div className="flex items-center gap-2 mb-3">
        {data.isFavorable ? (
          <TrendingUp className="h-4 w-4 text-[#085041] dark:text-[#1D9E75]" />
        ) : (
          <TrendingDown className="h-4 w-4 text-[#7A1A1A] dark:text-[#C73838]" />
        )}
        <h4 className="text-sm font-semibold text-foreground">{data.headline}</h4>
      </div>

      {/* Comparison */}
      {data.previousValue !== undefined && data.currentValue !== undefined && (
        <div className="flex items-center gap-2 mb-2 text-sm tabular-nums">
          <span className="text-muted-foreground">{formatSEKCompact(data.previousValue)}</span>
          <span className="text-muted-foreground">→</span>
          <span className="font-semibold text-foreground">{formatSEKCompact(data.currentValue)}</span>
        </div>
      )}

      {/* Delta */}
      {data.deltaAmount !== undefined && (
        <div className={cn(
          "text-lg font-bold tabular-nums mb-3",
          data.isFavorable ? "text-[#085041] dark:text-[#1D9E75]" : "text-[#7A1A1A] dark:text-[#C73838]"
        )}>
          {data.deltaAmount >= 0 ? "+" : ""}{formatSEKCompact(data.deltaAmount)}
          {data.deltaPercent !== undefined && (
            <span className="text-sm font-medium ml-2">
              ({data.deltaPercent >= 0 ? "+" : ""}{data.deltaPercent.toFixed(1).replace(".", ",")}%)
            </span>
          )}
        </div>
      )}

      {/* AI Explanations */}
      {data.explanations && data.explanations.length > 0 && (
        <div className="space-y-1 mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">AI-insikt</p>
          {data.explanations.map((exp, i) => (
            <p key={i} className="text-sm text-foreground/80 flex items-start gap-1.5">
              <span className="text-muted-foreground mt-0.5">•</span>
              {exp}
            </p>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
        {data.transactionsAnalyzed && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Brain className="h-3 w-3" />
            AI analyserade {data.transactionsAnalyzed} transaktioner
          </span>
        )}
        {data.ctaLabel && data.onCtaClick && (
          <button
            onClick={data.onCtaClick}
            className="text-xs font-semibold text-primary flex items-center gap-0.5 hover:underline"
          >
            {data.ctaLabel}
            <ChevronRight className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
