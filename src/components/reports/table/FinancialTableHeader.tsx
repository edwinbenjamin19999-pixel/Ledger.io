import { cn } from "@/lib/utils";
import type { FinancialColumn } from "./types";

interface Props {
  columns: FinancialColumn[];
}

/**
 * Header row for FinancialReportTable.
 * Tokens: bg-slate-50, 11px uppercase, tracking 0.08em, color slate-500.
 */
export const FinancialTableHeader = ({ columns }: Props) => (
  <thead>
    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/60 dark:border-slate-700">
      {columns.map((col, idx) => (
        <th
          key={col.key}
          className={cn(
            "h-12 px-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400 whitespace-nowrap",
            col.align === "right" ? "text-right" : "text-left",
            idx === 0 && "pl-7",
            idx === columns.length - 1 && "pr-5",
            col.width,
          )}
        >
          {col.label}
        </th>
      ))}
    </tr>
  </thead>
);
