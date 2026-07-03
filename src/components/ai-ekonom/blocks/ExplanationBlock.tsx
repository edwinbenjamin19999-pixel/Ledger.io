import { Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExplanationPayload } from "@/lib/ai-ekonom/intentRouter";

export const ExplanationBlock = ({ data }: { data: ExplanationPayload }) => {
  const conf = data.confidence ?? null;
  const tone =
    conf == null ? "slate"
      : conf >= 0.95 ? "cyan"
      : conf >= 0.75 ? "amber"
      : "rose";
  const chipClass = {
    slate: "bg-slate-100 text-slate-600",
    cyan:  "bg-[#EFF6FF] text-[#3b82f6] border-[#C8DDF5]",
    amber: "bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7]",
    rose:  "bg-[#FCE8E8] text-[#7A1A1A] border-[#F4C8C8]",
  }[tone];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide inline-flex items-center gap-1.5">
          <Brain className="w-3.5 h-3.5" /> AI-resonemang
        </span>
        {conf !== null && (
          <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full border tabular-nums", chipClass)}>
            {Math.round(conf * 100)}% säkerhet
          </span>
        )}
      </div>
      <p className="text-sm text-slate-700 leading-relaxed">{data.reasoning}</p>
    </div>
  );
};
