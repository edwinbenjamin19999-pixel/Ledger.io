import { cn } from "@/lib/utils";
import { Sparkles, ShieldCheck, Eye, AlertTriangle, AlertOctagon } from "lucide-react";
import type { Verdict } from "@/lib/benchmarking/verdictCalculator";

const ICONS = {
  strong: ShieldCheck,
  watch: Eye,
  attention: AlertTriangle,
  critical: AlertOctagon,
} as const;

interface Props {
  verdict: Verdict;
  className?: string;
  showAi?: boolean;
}

export function AIVerdictBadge({ verdict, className, showAi = true }: Props) {
  const Icon = ICONS[verdict.tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        "animate-fade-in transition-colors",
        verdict.badgeClass,
        className,
      )}
    >
      {showAi && <Sparkles className="h-3 w-3 opacity-70" />}
      <Icon className="h-3 w-3" />
      <span>{verdict.label}</span>
    </span>
  );
}
