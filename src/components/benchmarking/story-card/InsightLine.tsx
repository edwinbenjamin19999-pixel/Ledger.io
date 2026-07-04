import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VerdictTone } from "@/lib/benchmarking/verdictCalculator";

interface Props {
  text: string;
  tone: VerdictTone;
}

const TONE_BG: Record<VerdictTone, string> = {
  strong:
    "bg-emerald-50/60 dark:bg-emerald-950/20 text-[#085041] dark:text-emerald-200",
  watch: "bg-slate-50 dark:bg-slate-900/40 text-foreground",
  attention:
    "bg-amber-50/70 dark:bg-amber-950/20 text-[#7A5417] dark:text-amber-200",
  critical:
    "bg-rose-50/70 dark:bg-rose-950/20 text-[#7A1A1A] dark:text-rose-200",
};

export function InsightLine({ text, tone }: Props) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm leading-snug",
        TONE_BG[tone],
      )}
    >
      <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0 opacity-70" />
      <p className="line-clamp-2">{text}</p>
    </div>
  );
}
