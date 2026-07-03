import { cn } from "@/lib/utils";
import type { ComparisonPeriod } from "@/hooks/useBoardSummary";

const OPTIONS: Array<{ value: ComparisonPeriod; label: string; disabled?: boolean }> = [
  { value: "last_month", label: "vs förra månaden" },
  { value: "last_year", label: "vs förra året" },
  { value: "budget", label: "vs budget", disabled: true },
];

export const PeriodComparisonChip = ({
  value,
  onChange,
}: {
  value: ComparisonPeriod;
  onChange: (v: ComparisonPeriod) => void;
}) => (
  <div className="inline-flex items-center gap-2">
    {OPTIONS.map(opt => (
      <button
        key={opt.value}
        disabled={opt.disabled}
        onClick={() => !opt.disabled && onChange(opt.value)}
        title={opt.disabled ? "Insufficient data" : undefined}
        className={cn(
          "rounded-lg px-4 py-2 text-sm transition-colors",
          opt.disabled && "opacity-40 cursor-not-allowed",
          !opt.disabled && value === opt.value && "bg-gray-100 border border-gray-300 text-gray-800 font-medium",
          !opt.disabled && value !== opt.value && "bg-transparent border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300"
        )}
      >
        {opt.label}
      </button>
    ))}
  </div>
);
