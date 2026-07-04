import { cn } from "@/lib/utils";

export type AgeingPeriod = "today" | "30d" | "60d" | "90d";

interface AgeingHeaderProps {
  type: "AR" | "AP";
  period: AgeingPeriod;
  onPeriodChange: (p: AgeingPeriod) => void;
}

const PERIODS: { key: AgeingPeriod; label: string }[] = [
  { key: "today", label: "Idag" },
  { key: "30d", label: "30d" },
  { key: "60d", label: "60d" },
  { key: "90d", label: "90d" },
];

export const AgeingHeader = ({ type, period, onPeriodChange }: AgeingHeaderProps) => {
  const subtitle =
    type === "AR"
      ? "Kundfordringar uppdelade efter förfallotid"
      : "Leverantörsskulder uppdelade efter förfallotid";

  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
          Åldersanalys
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {subtitle}
        </p>
      </div>
      <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => onPeriodChange(p.key)}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
              period === p.key
                ? "bg-[#3b82f6] text-white shadow-sm"
                : "text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-700",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
};
