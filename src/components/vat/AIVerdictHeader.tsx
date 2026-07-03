import { CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIVerdictHeaderProps {
  verdict: "correct" | "review" | "critical";
  summary: string;
  confidence: number;
}

const VERDICT_MAP = {
  correct: {
    label: "Momsdeklaration ser korrekt ut",
    icon: CheckCircle2,
    ring: "stroke-emerald-500",
    bg: "from-emerald-500/10 to-emerald-500/5",
    text: "text-[#085041] dark:text-[#1D9E75]",
    badge: "bg-[#1D9E75]",
  },
  review: {
    label: "Granskning rekommenderas",
    icon: AlertTriangle,
    ring: "stroke-amber-500",
    bg: "from-amber-500/10 to-amber-500/5",
    text: "text-[#7A5417] dark:text-[#C28A2B]",
    badge: "bg-[#C28A2B]",
  },
  critical: {
    label: "Kritiskt fel upptäckt",
    icon: ShieldAlert,
    ring: "stroke-rose-500",
    bg: "from-rose-500/10 to-rose-500/5",
    text: "text-[#7A1A1A] dark:text-[#C73838]",
    badge: "bg-[#C73838]",
  },
};

export function AIVerdictHeader({ verdict, summary, confidence }: AIVerdictHeaderProps) {
  const cfg = VERDICT_MAP[verdict];
  const Icon = cfg.icon;
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (confidence / 100) * circumference;

  return (
    <div className={cn("relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 border border-border", cfg.bg)}>
      <div className="flex items-start gap-4">
        {/* Confidence ring */}
        <div className="relative w-20 h-20 shrink-0">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="36" className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="6" fill="none" />
            <circle
              cx="40" cy="40" r="36"
              className={cn(cfg.ring, "transition-all duration-700")}
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("text-xl font-bold tabular-nums", cfg.text)}>{confidence}</span>
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">conf</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <Icon className={cn("w-5 h-5", cfg.text)} />
            <h3 className={cn("font-bold text-base", cfg.text)}>{cfg.label}</h3>
          </div>
          <p className="text-sm text-foreground/80 leading-relaxed">{summary}</p>
        </div>
      </div>
    </div>
  );
}
