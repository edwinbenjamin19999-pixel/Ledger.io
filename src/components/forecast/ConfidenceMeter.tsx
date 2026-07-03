/**
 * ConfidenceMeter — replaces the "100% accuracy" illusion with a
 * grounded confidence score + historical accuracy badge.
 */
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  /** 0–100 (computed by confidenceEngine). */
  score: number;
  /** Historical accuracy %, NaN when no locked versions exist. */
  historicalPct?: number;
  /** Optional component breakdown, displayed in the tooltip. */
  breakdown?: { label: string; value: number }[];
}

function levelFor(score: number): { label: string; color: string; bg: string } {
  if (score >= 75) return { label: "Hög", color: "text-[#085041]", bg: "bg-[#E1F5EE] border-[#BFE6D6]" };
  if (score >= 50) return { label: "Medel", color: "text-[#7A5417]", bg: "bg-[#FAEEDA] border-[#F0DDB7]" };
  return { label: "Låg", color: "text-[#7A1A1A]", bg: "bg-[#FCE8E8] border-[#F4C8C8]" };
}

export function ConfidenceMeter({ score, historicalPct, breakdown }: Props) {
  const lv = levelFor(score);
  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                lv.bg,
                lv.color,
              )}
            >
              Konfidens {Math.round(score)}%
              <Info className="h-3 w-3 opacity-60" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-1.5 text-xs">
              <div className="font-semibold">Konfidens: {lv.label}</div>
              {breakdown && breakdown.length > 0 ? (
                <ul className="space-y-0.5 text-slate-300">
                  {breakdown.map((b) => (
                    <li key={b.label} className="flex justify-between gap-3">
                      <span>{b.label}</span>
                      <span className="tabular-nums">{Math.round(b.value)}%</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-slate-300">Beräknad från datakvalitet, historisk konsekvens, drivar-stabilitet och kontotäckning.</div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>

        {Number.isFinite(historicalPct) && (
          <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
            Historisk träffsäkerhet {Math.round(historicalPct as number)}%
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
