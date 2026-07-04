import { cn } from "@/lib/utils";
import type { Timeframe } from "@/lib/budget/trendEngine";

interface Props {
  value: Timeframe;
  onChange: (t: Timeframe) => void;
  className?: string;
}

export function TimeframeToggle({ value, onChange, className }: Props) {
  return (
    <div className={cn("inline-flex rounded-full border border-slate-200 bg-white p-0.5 text-xs", className)}>
      {(["month", "quarter"] as const).map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          className={cn(
            "px-3 py-1 rounded-full font-medium transition-colors",
            value === k ? "bg-[#3b82f6] text-white" : "text-slate-600 hover:text-slate-900"
          )}
        >
          {k === "month" ? "Månad" : "Kvartal"}
        </button>
      ))}
    </div>
  );
}
