import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

const MONTHS = [
  { key: "jan", label: "Jan", idx: 0 },
  { key: "feb", label: "Feb", idx: 1 },
  { key: "mar", label: "Mar", idx: 2 },
  { key: "apr", label: "Apr", idx: 3 },
  { key: "maj", label: "Maj", idx: 4 },
  { key: "jun", label: "Jun", idx: 5 },
  { key: "jul", label: "Jul", idx: 6 },
  { key: "aug", label: "Aug", idx: 7 },
  { key: "sep", label: "Sep", idx: 8 },
  { key: "okt", label: "Okt", idx: 9 },
  { key: "nov", label: "Nov", idx: 10 },
  { key: "dec", label: "Dec", idx: 11 },
] as const;

const _checkMonths: 12 = MONTHS.length;

export type RowVariant = "header" | "subtotal" | "total" | "metric" | "normal" | "milestone" | "result";

export interface BudgetRow {
  key: string;
  label: string;
  variant?: RowVariant;
  values: number[];
  color?: "indigo" | "cyan" | "rose" | "emerald" | "amber" | "slate";
  indent?: number;
  isExpandable?: boolean;
  className?: string;
}

interface BudgetMonthTableProps {
  rows: BudgetRow[];
  selectedMonth?: number;
  onMonthSelect?: (idx: number) => void;
  title?: string;
  editableKeys?: Set<string>;
  onCellEdit?: (rowKey: string, monthIndex: number, value: number) => void;
  manualOverrides?: Record<string, number>;
}

function getYearTotal(values: number[]): number {
  return values.reduce((sum, v) => sum + (v || 0), 0);
}

function formatValue(v: number): React.ReactNode {
  if (v === 0) return <span className="text-slate-300 dark:text-slate-600">—</span>;
  return (
    <span>
      {v < 0 ? "−" : ""}
      {new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(Math.abs(v))}
    </span>
  );
}

/* ── Inline Editable Cell ── */
function InlineEditableCell({ value, onSave, hasOverride }: { value: number; onSave: (v: number) => void; hasOverride: boolean }) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        autoFocus
        type="number"
        defaultValue={value || ""}
        className="w-full text-right bg-[#EFF6FF] dark:bg-indigo-950/30 border-2 border-indigo-400 dark:border-indigo-500 rounded px-2 py-1 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-300 tabular-nums font-mono [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        onBlur={e => { onSave(parseFloat(e.target.value) || 0); setEditing(false); }}
        onKeyDown={e => {
          if (e.key === "Enter") { onSave(parseFloat(e.currentTarget.value) || 0); setEditing(false); }
          if (e.key === "Escape") setEditing(false);
          if (e.key === "Tab") { onSave(parseFloat(e.currentTarget.value) || 0); setEditing(false); }
        }}
      />
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className="text-right px-2 py-1 cursor-text rounded hover:bg-[#EFF6FF] dark:hover:bg-indigo-950/20 hover:ring-1 hover:ring-indigo-200 dark:hover:ring-indigo-700 transition-all group relative"
    >
      {value === 0 ? <span className="text-slate-300 dark:text-slate-600">—</span> : formatValue(value)}
      {hasOverride && (
        <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-indigo-400" title="Manuellt värde" />
      )}
      <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity">✏</span>
    </div>
  );
}

/* ── 5-Tier Visual System ── */

function getRowClasses(variant: RowVariant, row: BudgetRow): string {
  switch (variant) {
    case "header":
      return "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-[0.12em]";
    case "normal":
      return "bg-white dark:bg-card text-slate-800 dark:text-slate-200 text-sm hover:bg-slate-50/80 dark:hover:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800";
    case "subtotal":
      return "bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 text-sm font-semibold border-t border-slate-200 dark:border-slate-700";
    case "metric":
      return "bg-white dark:bg-card text-[#7A5417] dark:text-[#C28A2B] text-xs italic";
    case "milestone": {
      const k = row.key.toLowerCase();
      if (k.includes("brutto") || k === "gross_profit")
        return "bg-[#EFF6FF] dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-200 font-bold text-sm border-l-4 border-l-indigo-500 dark:border-l-indigo-400";
      if (k.includes("ebit") && !k.includes("margin") && !k.includes("ebt"))
        return "bg-[#F1F5F9] dark:bg-violet-950/20 text-violet-900 dark:text-violet-200 font-bold text-sm border-l-4 border-l-violet-500 dark:border-l-violet-400";
      return "bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 font-bold text-sm border-l-4 border-l-slate-400 dark:border-l-slate-500";
    }
    case "result": {
      const total = getYearTotal(row.values);
      return total >= 0
        ? "bg-[#E1F5EE] dark:bg-emerald-950/20 border-t-4 border-emerald-400 dark:border-emerald-500 text-[#085041] dark:text-emerald-200 font-black text-base"
        : "bg-[#FCE8E8] dark:bg-rose-950/20 border-t-4 border-rose-400 dark:border-rose-500 text-[#7A1A1A] dark:text-rose-200 font-black text-base";
    }
    case "total": {
      const colorMap: Record<string, string> = {
        rose: "bg-[#FCE8E8] dark:bg-rose-950/20 text-[#7A1A1A] dark:text-rose-200 font-bold text-sm border-t-2 border-rose-300 dark:border-rose-600",
        emerald: "bg-[#E1F5EE] dark:bg-emerald-950/20 text-[#085041] dark:text-emerald-200 font-bold text-sm border-t-2 border-[#BFE6D6] dark:border-emerald-600",
        indigo: "bg-[#EFF6FF] dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-200 font-bold text-sm border-t-2 border-indigo-300 dark:border-indigo-600",
      };
      return colorMap[row.color || ""] || "bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 font-bold text-sm border-t-2 border-slate-300 dark:border-slate-700";
    }
    default:
      return "bg-white dark:bg-card text-slate-800 dark:text-slate-200 text-sm hover:bg-slate-50/80 dark:hover:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800";
  }
}

function getRowHeight(variant: RowVariant): string {
  switch (variant) {
    case "header": return "h-9";
    case "milestone": return "h-[52px]";
    case "result": return "h-[60px]";
    case "metric": return "h-9";
    default: return "h-11";
  }
}

function getStickyBg(variant: RowVariant, row: BudgetRow): string {
  switch (variant) {
    case "header": return "bg-slate-100 dark:bg-slate-800";
    case "normal": return "bg-white dark:bg-card";
    case "subtotal": return "bg-slate-50 dark:bg-slate-800/50";
    case "metric": return "bg-white dark:bg-card";
    case "milestone": {
      const k = row.key.toLowerCase();
      if (k.includes("brutto") || k === "gross_profit") return "bg-[#EFF6FF] dark:bg-indigo-950/20";
      if (k.includes("ebit") && !k.includes("margin") && !k.includes("ebt")) return "bg-[#F1F5F9] dark:bg-violet-950/20";
      return "bg-slate-50 dark:bg-slate-800/50";
    }
    case "result": {
      const total = getYearTotal(row.values);
      return total >= 0 ? "bg-[#E1F5EE] dark:bg-emerald-950/20" : "bg-[#FCE8E8] dark:bg-rose-950/20";
    }
    case "total": {
      const colorMap: Record<string, string> = {
        rose: "bg-[#FCE8E8] dark:bg-rose-950/20",
        emerald: "bg-[#E1F5EE] dark:bg-emerald-950/20",
        indigo: "bg-[#EFF6FF] dark:bg-indigo-950/20",
      };
      return colorMap[row.color || ""] || "bg-slate-50 dark:bg-slate-800/50";
    }
    default: return "bg-white dark:bg-card";
  }
}

function getCellColor(value: number, variant: RowVariant, row?: BudgetRow): string {
  if (value === 0) return "text-slate-300 dark:text-slate-600";
  if (variant === "metric") return "text-[#7A5417] dark:text-[#C28A2B] font-semibold";

  if (variant === "milestone") {
    if (value < 0) return "text-[#7A1A1A] dark:text-[#C73838] font-bold";
    const k = row?.key?.toLowerCase() || "";
    if (k.includes("brutto") || k === "gross_profit") return "text-indigo-700 dark:text-indigo-300 font-bold";
    if (k.includes("ebit") && !k.includes("margin") && !k.includes("ebt")) return "text-violet-700 dark:text-violet-300 font-bold";
    return "text-slate-800 dark:text-slate-200 font-bold";
  }

  if (variant === "result") return value < 0 ? "text-[#7A1A1A] dark:text-rose-300 font-black" : "text-[#085041] dark:text-emerald-300 font-black";
  if (variant === "total") return value < 0 ? "text-[#7A1A1A] dark:text-[#C73838] font-semibold" : "text-slate-800 dark:text-slate-200 font-semibold";
  if (variant === "subtotal") return value < 0 ? "text-[#7A1A1A] dark:text-[#C73838] font-semibold" : "text-slate-800 dark:text-slate-200 font-semibold";

  return value < 0 ? "text-[#7A1A1A] dark:text-[#C73838]" : "";
}

export function BudgetMonthTable({ rows, selectedMonth, onMonthSelect, title, editableKeys, onCellEdit, manualOverrides }: BudgetMonthTableProps) {
  return (
    <div className="bg-white dark:bg-card rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse table-fixed" style={{ minWidth: "1200px" }}>
          <colgroup>
            <col style={{ width: "220px" }} />
            {MONTHS.map(m => <col key={m.key} style={{ width: "80px" }} />)}
            <col style={{ width: "100px" }} />
          </colgroup>
          <thead className="sticky top-0 z-30">
            <tr className="bg-slate-800 dark:bg-slate-900">
              <th className="sticky left-0 z-40 bg-slate-800 dark:bg-slate-900 text-left px-4 py-3 text-xs font-semibold text-slate-300 uppercase tracking-wider border-r border-slate-700">
                {title ?? "Post"}
              </th>
              {MONTHS.map((m) => (
                <th
                  key={m.key}
                  onClick={() => onMonthSelect?.(m.idx)}
                  className={cn(
                    "text-right px-2 py-3 text-xs font-semibold uppercase tracking-wider cursor-pointer transition-colors hover:bg-slate-700/50",
                    selectedMonth === m.idx ? "bg-indigo-800/50 text-indigo-200" : "text-slate-300"
                  )}
                >
                  {m.label}
                </th>
              ))}
              <th className="text-right px-3 py-3 text-xs font-semibold text-indigo-200 uppercase tracking-wider bg-indigo-900 dark:bg-indigo-950 border-l border-indigo-700">
                Helår
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const v = row.variant ?? "normal";
              const yearTotal = getYearTotal(row.values);
              const needsSpacer = v === "header" && idx > 0;
              const isEditable = editableKeys?.has(row.key) && v === "normal";

              return (
                <React.Fragment key={row.key}>
                  {needsSpacer && (
                    <tr className="h-3" aria-hidden="true">
                      <td colSpan={14} className="bg-transparent dark:bg-transparent" />
                    </tr>
                  )}
                  <tr className={cn(getRowClasses(v, row), getRowHeight(v), row.className)}>
                    <td
                      className={cn(
                        "sticky left-0 z-20 px-4 py-2 font-medium border-r border-slate-200 dark:border-slate-700",
                        getStickyBg(v, row)
                      )}
                      style={{ paddingLeft: row.indent ? `${16 + row.indent * 16}px` : "16px" }}
                    >
                      <span className="flex items-center gap-1.5">
                        {row.isExpandable && <span className="text-slate-400 dark:text-slate-500 text-xs">›</span>}
                        {row.label}
                      </span>
                    </td>
                    {MONTHS.map((m) => {
                      const val = row.values[m.idx] ?? 0;
                      const overrideKey = `${row.key}_${m.idx}`;
                      const hasOverride = !!(manualOverrides && manualOverrides[overrideKey] !== undefined);

                      if (isEditable && onCellEdit) {
                        return (
                          <td
                            key={m.key}
                            className={cn(
                              "text-sm tabular-nums font-mono p-0",
                              selectedMonth === m.idx && "bg-indigo-50/60 dark:bg-indigo-950/30",
                              getCellColor(val, v, row)
                            )}
                          >
                            <InlineEditableCell
                              value={val}
                              onSave={(newVal) => onCellEdit(row.key, m.idx, newVal)}
                              hasOverride={hasOverride}
                            />
                          </td>
                        );
                      }

                      return (
                        <td
                          key={m.key}
                          className={cn(
                            "text-right px-2 py-2 tabular-nums font-mono text-sm",
                            selectedMonth === m.idx && "bg-indigo-50/60 dark:bg-indigo-950/30",
                            getCellColor(val, v, row)
                          )}
                        >
                          {formatValue(val)}
                        </td>
                      );
                    })}
                    <td
                      className={cn(
                        "text-right px-3 py-2 font-semibold tabular-nums font-mono text-sm border-l border-[#C8DDF5] dark:border-indigo-800",
                        ["milestone", "result", "total", "subtotal"].includes(v)
                          ? "bg-[#EFF6FF] dark:bg-indigo-950/40"
                          : "bg-[#EFF6FF] dark:bg-indigo-950/20",
                        yearTotal === 0
                          ? "text-slate-300 dark:text-slate-600"
                          : yearTotal < 0
                            ? "text-[#7A1A1A] dark:text-[#C73838]"
                            : "text-indigo-700 dark:text-indigo-300"
                      )}
                    >
                      {formatValue(yearTotal)}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default BudgetMonthTable;
