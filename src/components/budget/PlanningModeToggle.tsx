import { cn } from "@/lib/utils";

export type PlanningMode = "simple" | "advanced";

interface Props {
  value: PlanningMode;
  onChange: (m: PlanningMode) => void;
  overriddenCount?: number;
}

export function PlanningModeToggle({ value, onChange, overriddenCount = 0 }: Props) {
  return (
    <div className="flex items-center gap-3">
      <div className="inline-flex rounded-full border border-slate-200 bg-white p-0.5">
        {(["simple", "advanced"] as PlanningMode[]).map(m => (
          <button
            key={m}
            onClick={() => onChange(m)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-colors",
              value === m ? "bg-[#3b82f6] text-white" : "text-slate-600 hover:text-slate-900"
            )}
          >
            {m === "simple" ? "Simple" : "Advanced"}
          </button>
        ))}
      </div>
      {value === "simple" && overriddenCount > 0 && (
        <span className="text-xs text-[#7A5417] bg-[#FAEEDA] border border-[#F0DDB7] px-2 py-0.5 rounded-full">
          {overriddenCount} konton manuellt överstyrda
        </span>
      )}
    </div>
  );
}
