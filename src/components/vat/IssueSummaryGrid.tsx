import type { VATFinding } from "@/lib/vat/vatReviewEngine";
import { cn } from "@/lib/utils";

interface IssueSummaryGridProps {
  findings: VATFinding[];
  onFilterChange?: (severity: VATFinding["severity"] | null) => void;
  activeFilter?: VATFinding["severity"] | null;
}

const BUCKETS = [
  { key: "critical" as const, label: "Kritiska", color: "bg-[#C73838]", text: "text-[#C73838] dark:text-[#C73838]", border: "border-[#F4C8C8] dark:border-rose-900/50", bg: "bg-[#FCE8E8]/50 dark:bg-rose-950/20" },
  { key: "high" as const, label: "Hög prio", color: "bg-orange-500", text: "text-orange-600 dark:text-orange-400", border: "border-orange-200 dark:border-orange-900/50", bg: "bg-orange-50/50 dark:bg-orange-950/20" },
  { key: "medium" as const, label: "Medel", color: "bg-[#C28A2B]", text: "text-[#7A5417] dark:text-[#C28A2B]", border: "border-[#F0DDB7] dark:border-amber-900/50", bg: "bg-[#FAEEDA]/50 dark:bg-amber-950/20" },
  { key: "info" as const, label: "Info", color: "bg-[#1D9E75]", text: "text-[#1D9E75] dark:text-[#1D9E75]", border: "border-[#BFE6D6] dark:border-emerald-900/50", bg: "bg-[#E1F5EE]/50 dark:bg-emerald-950/20" },
];

export function IssueSummaryGrid({ findings, onFilterChange, activeFilter }: IssueSummaryGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {BUCKETS.map((b) => {
        const count = findings.filter((f) => f.severity === b.key).length;
        const isActive = activeFilter === b.key;
        return (
          <button
            key={b.key}
            onClick={() => onFilterChange?.(isActive ? null : b.key)}
            className={cn(
              "rounded-xl border p-3 text-left transition-all",
              b.border, b.bg,
              isActive ? "ring-2 ring-offset-1 ring-[#3b82f6] scale-[1.02]" : "hover:scale-[1.02]"
            )}
          >
            <div className="flex items-center gap-2">
              <span className={cn("w-2 h-2 rounded-full", b.color)} />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{b.label}</span>
            </div>
            <div className={cn("text-2xl font-bold mt-1 tabular-nums", b.text)}>{count}</div>
          </button>
        );
      })}
    </div>
  );
}
