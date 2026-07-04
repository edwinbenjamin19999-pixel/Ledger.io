import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { confidenceTone } from "@/lib/ai-ekonom/executionLevel";

interface Props {
  confidence: number;        // 0..1
  factors?: string[];        // why this confidence
  size?: "sm" | "md";
  className?: string;
}

export function ConfidenceMeter({ confidence, factors, size = "md", className }: Props) {
  const pct = Math.round(Math.max(0, Math.min(1, confidence)) * 100);
  const tone = confidenceTone(confidence);
  const segs = 5;
  const filled = Math.round((pct / 100) * segs);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className={cn("text-[10px] uppercase font-semibold tracking-wide px-2 py-0.5 rounded border", tone.cls)}>
        {tone.label} · {pct}%
      </span>
      <div className="flex items-center gap-0.5" aria-hidden>
        {Array.from({ length: segs }).map((_, i) => (
          <div
            key={i}
            className={cn(
              size === "sm" ? "h-1 w-3" : "h-1.5 w-4",
              "rounded-sm transition-colors",
              i < filled
                ? confidence >= 0.85 ? "bg-emerald-500" : confidence >= 0.6 ? "bg-amber-500" : "bg-rose-500"
                : "bg-slate-200 dark:bg-white/10",
            )}
          />
        ))}
      </div>
      {factors && factors.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <button className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Varför denna konfidens?">
              <Info className="h-3 w-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 text-xs space-y-1.5">
            <div className="font-semibold text-slate-900 dark:text-white mb-1">Varför {pct}%?</div>
            {factors.map((f, i) => (
              <div key={i} className="flex gap-1.5 text-slate-600 dark:text-white/70">
                <span className="text-[#3b82f6] dark:text-[#1E3A5F]">•</span>
                <span>{f}</span>
              </div>
            ))}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
