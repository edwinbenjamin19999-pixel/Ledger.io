/**
 * ForecastModeToggle — Rolling / Månadsvis / Kvartalsvis segmented control.
 * Active button uses the brand cyan token (selection-control standard).
 */
import { cn } from "@/lib/utils";
import { Activity, Calendar, CalendarDays } from "lucide-react";

export type ForecastMode = "rolling" | "monthly" | "quarterly";

interface Props {
  mode: ForecastMode;
  onChange: (m: ForecastMode) => void;
}

const OPTIONS: Array<{ value: ForecastMode; label: string; icon: typeof Activity }> = [
  { value: "rolling", label: "Rolling", icon: Activity },
  { value: "monthly", label: "Månadsvis", icon: Calendar },
  { value: "quarterly", label: "Kvartalsvis", icon: CalendarDays },
];

export function ForecastModeToggle({ mode, onChange }: Props) {
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = mode === value;
        return (
          <button
            key={value}
            onClick={() => onChange(value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150",
              active
                ? "bg-[#3b82f6] text-white shadow-[0_2px_8px_rgba(37,99,235,0.25)]"
                : "text-slate-600 hover:bg-slate-50",
            )}
            aria-pressed={active}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
