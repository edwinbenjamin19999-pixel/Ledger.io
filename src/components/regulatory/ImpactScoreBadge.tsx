import { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props { score: number; // 0-100
  financialImpact?: number; // kr
  label?: string;
}

export function ImpactScoreBadge({ score, financialImpact, label }: Props) { const { color, bg, text } = useMemo(() => { if (score >= 80) return { color: "text-destructive", bg: "bg-destructive/15 border-destructive/30", text: "Hög" };
    if (score >= 50) return { color: "text-[#7A5417]", bg: "bg-[#FAEEDA] border-[#F0DDB7]", text: "Medium" };
    if (score >= 20) return { color: "text-blue-600", bg: "bg-[#EFF6FF] border-blue-300", text: "Låg" };
    return { color: "text-muted-foreground", bg: "bg-muted border-border", text: "Minimal" };
  }, [score]);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-medium ${bg}`}>
            {/* Score circle */}
            <div className="relative h-6 w-6">
              <svg className="h-6 w-6 -rotate-90" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="none" stroke="hsl(var(--border))" strokeWidth="2.5" />
                <circle
                  cx="12" cy="12" r="10" fill="none"
                  stroke="currentColor"
                  className={color}
                  strokeWidth="2.5"
                  strokeDasharray={`${(score / 100) * 62.83} 62.83`}
                  strokeLinecap="round"
                />
              </svg>
              <span className={`absolute inset-0 flex items-center justify-center text-[8px] font-bold ${color}`}>
                {score}
              </span>
            </div>
            <span className={color}>{label || text}</span>
            {financialImpact !== undefined && financialImpact !== 0 && (
              <span className="font-mono text-[11px]">
                {financialImpact > 0 ? "+" : ""}{financialImpact.toLocaleString("sv-SE")} kr
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Påverkanspoäng baserat på ditt bolags storlek, bransch och nuvarande situation</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
