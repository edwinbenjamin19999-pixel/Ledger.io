import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FinalRecommendationProps {
  recommendation: "ready" | "review" | "do_not_submit";
  reasoning?: string;
}

const MAP = {
  ready: {
    icon: CheckCircle2,
    title: "Redo att skickas in",
    bg: "bg-[#E1F5EE] dark:bg-emerald-950/30 border-[#BFE6D6] dark:border-emerald-900/50",
    text: "text-[#085041] dark:text-[#1D9E75]",
  },
  review: {
    icon: AlertTriangle,
    title: "Granskning rekommenderas",
    bg: "bg-[#FAEEDA] dark:bg-amber-950/30 border-[#F0DDB7] dark:border-amber-900/50",
    text: "text-[#7A5417] dark:text-[#C28A2B]",
  },
  do_not_submit: {
    icon: XCircle,
    title: "Skicka inte in",
    bg: "bg-[#FCE8E8] dark:bg-rose-950/30 border-[#F4C8C8] dark:border-rose-900/50",
    text: "text-[#7A1A1A] dark:text-[#C73838]",
  },
};

export function FinalRecommendation({ recommendation, reasoning }: FinalRecommendationProps) {
  const cfg = MAP[recommendation];
  const Icon = cfg.icon;
  return (
    <div className={cn("rounded-xl border p-4 flex items-start gap-3", cfg.bg)}>
      <Icon className={cn("w-6 h-6 shrink-0 mt-0.5", cfg.text)} />
      <div className="flex-1">
        <div className={cn("font-bold text-sm", cfg.text)}>{cfg.title}</div>
        {reasoning && <p className="text-xs text-foreground/70 mt-1 leading-relaxed">{reasoning}</p>}
      </div>
    </div>
  );
}
