import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SeasonalPattern } from "./useProformaInsights";

interface Props {
  patterns: SeasonalPattern[];
}

const toneFor = (strength: number) => {
  if (strength >= 1.1) return "bg-[#EFF6FF] text-[#3b82f6] border-[#C8DDF5]";
  if (strength <= 0.85) return "bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7]";
  return "bg-slate-50 text-slate-600 border-slate-200";
};

const fmtDeviation = (strength: number) => {
  const dev = (strength - 1) * 100;
  return `${dev >= 0 ? "+" : ""}${dev.toFixed(0)}%`;
};

export const ProformaSeasonalStrip = ({ patterns }: Props) => {
  if (patterns.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4 shadow-[0_2px_8px_rgba(15,23,42,0.03)]">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-4 h-4 text-slate-500" />
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Säsongsmönster
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {patterns.map((p, i) => (
          <span
            key={`${p.month}-${i}`}
            title={`Genomsnittlig intäkt: ${p.avg_income.toLocaleString("sv-SE")} kr`}
            className={cn(
              "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-medium tabular-nums border",
              toneFor(p.pattern_strength),
            )}
          >
            <span className="font-semibold">{p.month}</span>
            <span className="opacity-80">{fmtDeviation(p.pattern_strength)}</span>
          </span>
        ))}
      </div>
    </div>
  );
};
