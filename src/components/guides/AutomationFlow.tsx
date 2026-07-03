import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";

interface Step { icon: LucideIcon; label: string; sub: string }

export const AutomationFlow = ({ steps }: { steps: Step[] }) => (
  <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 md:gap-2">
    {steps.map((s, i) => (
      <div key={s.label} className="flex md:flex-1 items-center gap-3 md:flex-col md:gap-0">
        <div className="flex flex-col items-center text-center md:flex-1 w-full">
          <div className="w-14 h-14 rounded-xl border border-[#C8DDF5] bg-[#EFF6FF] flex items-center justify-center">
            <s.icon className="w-6 h-6 text-[#3b82f6]" />
          </div>
          <div className="mt-3 text-[#0F1B2D] font-semibold text-sm">{s.label}</div>
          <div className="text-xs text-[#64748b] mt-0.5">{s.sub}</div>
        </div>
        {i < steps.length - 1 && (
          <ChevronRight className="w-5 h-5 text-[#1E3A5F] md:mx-2 md:mt-[-28px] flex-shrink-0" />
        )}
      </div>
    ))}
  </div>
);
