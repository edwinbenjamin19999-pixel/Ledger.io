import { cn } from "@/lib/utils";
import type { ScenarioType } from "@/lib/budget/driverEngine";

interface Props {
  value: ScenarioType;
  onChange: (s: ScenarioType) => void;
}

const PILLS: { key: ScenarioType; label: string }[] = [
  { key: "base", label: "Bas" },
  { key: "optimistic", label: "Optimistisk" },
  { key: "pessimistic", label: "Risk" },
];

export function ScenarioPills({ value, onChange }: Props) {
  return (
    <div className="inline-flex rounded-full border border-slate-200 bg-white p-0.5">
      {PILLS.map(p => (
        <button
          key={p.key}
          onClick={() => onChange(p.key)}
          className={cn(
            "px-3 py-1 rounded-full text-xs font-medium transition-colors",
            value === p.key ? "bg-[#3b82f6] text-white" : "text-slate-600 hover:text-slate-900"
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
