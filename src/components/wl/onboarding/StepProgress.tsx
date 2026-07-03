import { Check } from "lucide-react";

interface Props {
  current: number;
  steps: { label: string }[];
}

export function StepProgress({ current, steps }: Props) {
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {steps.map((s, i) => {
        const n = i + 1;
        const isDone = n < current;
        const isActive = n === current;
        return (
          <div key={s.label} className="flex items-center gap-2 sm:gap-3">
            <div
              className={`flex items-center gap-2 transition-all ${
                isActive ? "opacity-100" : isDone ? "opacity-90" : "opacity-40"
              }`}
            >
              <div
                className={`h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-semibold border transition-all ${
                  isActive
                    ? "bg-[#3b82f6] text-white border-[#3b82f6] shadow-[0_0_0_4px_rgba(37,99,235,0.12)]"
                    : isDone
                    ? "bg-[#3b82f6] text-white border-[#3b82f6]"
                    : "bg-white text-slate-400 border-slate-200"
                }`}
              >
                {isDone ? <Check className="h-3.5 w-3.5" /> : n}
              </div>
              <span
                className={`hidden sm:inline text-xs font-medium ${
                  isActive ? "text-slate-900" : "text-slate-500"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`h-px w-6 sm:w-10 transition-colors ${
                  isDone ? "bg-[#3b82f6]" : "bg-slate-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
