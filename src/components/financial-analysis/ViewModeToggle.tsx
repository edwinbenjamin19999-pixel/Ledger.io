import { Calendar, TrendingUp, Target } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewMode = 'period' | 'trend' | 'scenario';

interface Props {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}

const OPTIONS: { value: ViewMode; label: string; icon: typeof Calendar }[] = [
  { value: 'period', label: 'Period', icon: Calendar },
  { value: 'trend', label: 'Trend', icon: TrendingUp },
  { value: 'scenario', label: 'Scenario', icon: Target },
];

export function ViewModeToggle({ value, onChange }: Props) {
  return (
    <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-100 border border-slate-200/80">
      {OPTIONS.map(opt => {
        const Icon = opt.icon;
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all inline-flex items-center gap-1.5",
              active
                ? "bg-[#3b82f6] text-white shadow-[0_2px_6px_-2px_rgba(37,99,235,0.5)]"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            )}
          >
            <Icon className="h-3 w-3" />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
