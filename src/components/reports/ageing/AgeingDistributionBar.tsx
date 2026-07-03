import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  AgeingBucket,
  BUCKET_BG_CLASSES,
  fmtSEK,
} from "./ageingUtils";

interface Props {
  buckets: AgeingBucket[];
  total: number;
}

export const AgeingDistributionBar = ({ buckets, total }: Props) => {
  const [hovered, setHovered] = useState<number | null>(null);

  if (total <= 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
          Fördelning per åldersgrupp
        </h3>
        <span className="text-xs text-slate-500 tabular-nums">
          {fmtSEK(total)} kr totalt
        </span>
      </div>

      {/* Segmented bar */}
      <div
        className="flex w-full h-3 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800"
        onMouseLeave={() => setHovered(null)}
      >
        {buckets.map((b, i) => {
          const pct = total > 0 ? (b.total / total) * 100 : 0;
          if (pct <= 0) return null;
          const dim = hovered !== null && hovered !== i;
          return (
            <div
              key={b.label}
              onMouseEnter={() => setHovered(i)}
              style={{ width: `${pct}%` }}
              title={`${b.label}: ${fmtSEK(b.total)} kr (${pct.toFixed(1)}%) • ${b.invoices.length} st`}
              className={cn(
                "transition-opacity duration-150",
                BUCKET_BG_CLASSES[i],
                dim ? "opacity-40" : "opacity-100",
              )}
            />
          );
        })}
      </div>

      {/* Legend grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
        {buckets.map((b, i) => {
          const pct = total > 0 ? (b.total / total) * 100 : 0;
          return (
            <div
              key={b.label}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              className={cn(
                "min-w-0 transition-opacity",
                hovered !== null && hovered !== i ? "opacity-50" : "opacity-100",
              )}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    BUCKET_BG_CLASSES[i],
                  )}
                />
                <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 truncate">
                  {b.label}
                </span>
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-50 tabular-nums truncate">
                {fmtSEK(b.total)} kr
              </p>
              <p className="text-[11px] text-slate-500 tabular-nums">
                {pct.toFixed(1)}% • {b.invoices.length} st
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
