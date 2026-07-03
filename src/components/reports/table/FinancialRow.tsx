import { ArrowDownRight, ArrowUpRight, AlertTriangle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FinancialColumn, FinancialRowData, RowSignal } from "./types";
import { EMPTY_DASH, formatNumber, formatPercent } from "./format";
import { getSignalTokens } from "./signalTokens";

interface Props {
  row: FinancialRowData;
  columns: FinancialColumn[];
  density?: "comfortable" | "compact";
}

const variantRowClassComfortable: Record<FinancialRowData["variant"], string> = {
  section:
    "h-14 bg-slate-50/60 dark:bg-slate-800/50 border-l-2 border-[#3b82f6] border-b border-slate-200/60 dark:border-slate-700 font-semibold text-slate-900 dark:text-slate-100",
  subcategory:
    "h-12 bg-slate-50/30 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800 font-medium text-slate-700 dark:text-slate-300",
  account:
    "h-12 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300",
  total:
    "h-14 bg-slate-100 dark:bg-slate-800 border-y border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-slate-100",
};

/** Statement / document-grade density — tighter, classic accounting borders. */
const variantRowClassCompact: Record<FinancialRowData["variant"], string> = {
  section:
    "h-10 bg-white dark:bg-slate-900 border-b border-slate-300 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200",
  subcategory:
    "h-8 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 font-medium text-slate-700 dark:text-slate-300",
  account:
    "h-8 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300",
  total:
    "h-9 bg-white dark:bg-slate-900 border-t-2 border-b border-slate-400 dark:border-slate-600 font-semibold text-slate-900 dark:text-slate-100",
};

const indentClass = (indent: 0 | 1 | 2) =>
  indent === 2 ? "pl-12" : indent === 1 ? "pl-8" : "pl-7";

const formatCell = (
  value: number | string | null,
  format: FinancialColumn["format"],
): { text: string; isEmpty: boolean; isNegative: boolean } => {
  if (value === null || value === undefined || value === "")
    return { text: EMPTY_DASH, isEmpty: true, isNegative: false };
  if (typeof value === "string")
    return { text: value, isEmpty: false, isNegative: false };
  if (format === "percent")
    return {
      text: formatPercent(value),
      isEmpty: Math.abs(value) < 0.05,
      isNegative: value < 0,
    };
  if (format === "number")
    return {
      text: formatNumber(value),
      isEmpty: Math.abs(value) < 0.5,
      isNegative: value < 0,
    };
  return { text: String(value), isEmpty: false, isNegative: false };
};

const SignalIcon = ({ signal, className }: { signal: RowSignal; className: string }) => {
  if (signal === "positive") return <ArrowUpRight className={cn("w-3 h-3", className)} aria-hidden />;
  if (signal === "negative") return <ArrowDownRight className={cn("w-3 h-3", className)} aria-hidden />;
  if (signal === "anomaly") return <Sparkles className={cn("w-3 h-3", className)} aria-hidden />;
  return <AlertTriangle className={cn("w-3 h-3", className)} aria-hidden />;
};

/** Decide which signal layers apply for a given variant (consistency rule). */
const getSignalRendering = (
  variant: FinancialRowData["variant"],
  signal?: RowSignal,
) => {
  if (!signal) return { showEdge: false, showTint: false, showIcon: false };
  if (variant === "account") return { showEdge: true, showTint: false, showIcon: false };
  if (variant === "subcategory") return { showEdge: true, showTint: true, showIcon: false };
  return { showEdge: true, showTint: true, showIcon: true };
};

export const FinancialRow = ({ row, columns, density = "comfortable" }: Props) => {
  const variantRowClass =
    density === "compact" ? variantRowClassCompact : variantRowClassComfortable;
  const indent = row.indent ?? (row.variant === "subcategory" ? 1 : row.variant === "account" ? 2 : 0);
  const clickable = !!row.onClick;
  const negativeAccent =
    row.tone === "negative" ? "text-[#7A1A1A] dark:text-[#C73838]" : "";
  const positiveAccent =
    row.tone === "positive" ? "text-[#085041] dark:text-[#1D9E75]" : "";

  const tokens = getSignalTokens(row.signal);
  const { showEdge, showTint, showIcon } = getSignalRendering(row.variant, row.signal);

  return (
    <tr
      onClick={row.onClick}
      title={row.signalReason}
      className={cn(
        variantRowClass[row.variant],
        clickable && "cursor-pointer",
        // Edge indicator (positioned via ::before on first cell — applied below)
        showTint && tokens?.tintClass,
      )}
    >
      {columns.map((col, idx) => {
        const raw = row.cells[col.key] ?? null;
        const isFirst = idx === 0;
        const isLast = idx === columns.length - 1;
        const isText = !col.format || col.format === "text";

        if (isText) {
          if (isFirst) {
            return (
              <td
                key={col.key}
                className={cn(
                  "relative pr-4 text-[13px] whitespace-nowrap",
                  indentClass(indent),
                  // Left edge indicator (3px vertical line)
                  showEdge && tokens && [
                    "before:content-['']",
                    "before:absolute before:left-0 before:top-1 before:bottom-1",
                    "before:w-[3px] before:rounded-r",
                    tokens.edgeClass,
                  ],
                )}
              >
                <span
                  className={cn(
                    "report-numeric text-[#3b82f6] dark:text-[#1E3A5F] font-semibold text-[12px]",
                    row.variant === "total" && "uppercase tracking-wider text-slate-900 dark:text-slate-100 text-[14px]",
                    row.variant === "section" && "uppercase tracking-wider text-slate-900 dark:text-slate-100 text-[15px]",
                  )}
                >
                  {raw ?? ""}
                </span>
              </td>
            );
          }
          return (
            <td
              key={col.key}
              className={cn(
                "px-4 text-[14px] truncate max-w-[280px]",
                isLast && "pr-5",
              )}
              title={raw ? String(raw) : undefined}
            >
              <span className="inline-flex items-center gap-1.5">
                {raw ?? ""}
                {/* Show signal icon next to the label (second text cell) */}
                {showIcon && row.signal && tokens && idx === 1 && (
                  <SignalIcon signal={row.signal} className={tokens.iconClass} />
                )}
              </span>
            </td>
          );
        }

        const { text, isEmpty, isNegative } = formatCell(raw, col.format);
        return (
          <td
            key={col.key}
            className={cn(
              "report-numeric pr-4 pl-4 text-[13px] text-right",
              isLast && "pr-5",
              row.variant === "total" && "text-[14px] font-bold",
              row.variant === "account" && "font-medium",
              isEmpty && "text-slate-300 dark:text-slate-600",
              !isEmpty && isNegative && row.variant !== "total" && "text-slate-500 italic",
              negativeAccent,
              positiveAccent,
            )}
          >
            {text}
          </td>
        );
      })}
    </tr>
  );
};
