import React, { useState } from "react";
import { ChevronDown, ChevronRight, AlertTriangle, Clock, Send } from "lucide-react";
import { differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CounterpartySummary, fmtSEK } from "./ageingUtils";
import { sendInvoiceReminder } from "./AgeingActions";

interface Props {
  grouped: CounterpartySummary[];
  type: "AR" | "AP";
  rowFlags?: Map<string, "critical" | "warning">;
  companyId?: string;
}

const numCell = (v: number, extra?: string) => (
  <td
    className={cn(
      "px-3 py-3 text-right tabular-nums text-slate-500 dark:text-slate-400",
      extra,
    )}
  >
    {v > 0 ? fmtSEK(v) : "–"}
  </td>
);

export const AgeingCustomerTable = ({
  grouped,
  type,
  rowFlags,
  companyId,
}: Props) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const entityLabel = type === "AR" ? "Kund" : "Leverantör";

  if (grouped.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center text-sm text-slate-500">
        Inga {type === "AR" ? "kundfordringar" : "leverantörsskulder"} att visa
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
        <div className="px-5 py-4 border-b border-slate-200/60 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            {type === "AR" ? "Kunder med utestående" : "Leverantörer med utestående"}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200/60 dark:border-slate-800">
                <th className="text-left px-3 py-3 text-[11px] uppercase tracking-[0.08em] text-slate-500 font-semibold">
                  {entityLabel}
                </th>
                <th className="text-right px-3 py-3 text-[11px] uppercase tracking-[0.08em] text-slate-500 font-semibold">
                  Totalt
                </th>
                <th className="text-right px-3 py-3 text-[11px] uppercase tracking-[0.08em] text-slate-500 font-semibold">
                  Ej förfallen
                </th>
                <th className="text-right px-3 py-3 text-[11px] uppercase tracking-[0.08em] text-slate-500 font-semibold">
                  1-30
                </th>
                <th className="text-right px-3 py-3 text-[11px] uppercase tracking-[0.08em] text-slate-500 font-semibold">
                  31-60
                </th>
                <th className="text-right px-3 py-3 text-[11px] uppercase tracking-[0.08em] text-slate-500 font-semibold">
                  61-90
                </th>
                <th className="text-right px-3 py-3 text-[11px] uppercase tracking-[0.08em] text-slate-500 font-semibold">
                  90+
                </th>
                <th className="text-right px-3 py-3 text-[11px] uppercase tracking-[0.08em] text-slate-500 font-semibold">
                  Förfallet
                </th>
              </tr>
            </thead>
            <tbody>
              {grouped.map((g) => {
                const isOpen = expanded === g.name;
                const flag = rowFlags?.get(g.name);
                return (
                  <React.Fragment key={g.name}>
                    <tr
                      className="border-b border-slate-100 dark:border-slate-800/60 cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                      onClick={() => setExpanded(isOpen ? null : g.name)}
                    >
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2 min-w-0">
                          {isOpen ? (
                            <ChevronDown className="w-4 h-4 shrink-0 text-slate-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 shrink-0 text-slate-400" />
                          )}
                          {flag && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="shrink-0 inline-flex">
                                  {flag === "critical" ? (
                                    <AlertTriangle className="w-3.5 h-3.5 text-[#7A1A1A]" />
                                  ) : (
                                    <Clock className="w-3.5 h-3.5 text-[#7A5417]" />
                                  )}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                {flag === "critical"
                                  ? `90+ dagar: ${fmtSEK(g.buckets[4])} kr`
                                  : `61-90 dagar: ${fmtSEK(g.buckets[3])} kr`}
                              </TooltipContent>
                            </Tooltip>
                          )}
                          <span
                            className="font-medium text-slate-900 dark:text-slate-50 truncate max-w-[240px]"
                            title={g.name}
                          >
                            {g.name}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] ml-1 shrink-0 border-slate-200 text-slate-500"
                          >
                            {g.invoices.length}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums font-semibold text-slate-900 dark:text-slate-50">
                        {fmtSEK(g.total)}
                      </td>
                      {numCell(g.buckets[0])}
                      {numCell(g.buckets[1])}
                      {numCell(g.buckets[2])}
                      {numCell(
                        g.buckets[3],
                        g.buckets[3] > 0 ? "text-[#7A5417] font-semibold" : "",
                      )}
                      {numCell(
                        g.buckets[4],
                        g.buckets[4] > 0 ? "text-[#7A1A1A] font-semibold" : "",
                      )}
                      <td
                        className={cn(
                          "px-3 py-3 text-right tabular-nums font-bold",
                          g.overdue > 0
                            ? "bg-rose-50/40 dark:bg-rose-950/20 text-[#7A1A1A] dark:text-[#C73838]"
                            : "text-slate-400",
                        )}
                      >
                        {g.overdue > 0 ? fmtSEK(g.overdue) : "–"}
                      </td>
                    </tr>
                    {isOpen &&
                      g.invoices.map((inv) => {
                        const days = differenceInDays(
                          new Date(),
                          new Date(inv.due_date),
                        );
                        const canRemind = days > 30 && type === "AR";
                        return (
                          <tr
                            key={inv.id}
                            className="bg-slate-50/40 dark:bg-slate-800/20 border-b border-dashed border-slate-200/60 dark:border-slate-800/60"
                          >
                            <td className="px-3 py-2 pl-12 text-xs text-slate-600 dark:text-slate-400">
                              <div className="flex items-center gap-2">
                                <span>#{inv.invoice_number}</span>
                                <span className="text-slate-400">
                                  förfaller {inv.due_date}
                                </span>
                                {canRemind && companyId && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      sendInvoiceReminder(
                                        inv.invoice_number,
                                        g.name,
                                        companyId,
                                        type,
                                      );
                                    }}
                                    className="inline-flex items-center gap-1 text-[11px] h-6 px-2 rounded-md border border-[#C8DDF5] dark:border-[#3b82f6]/60 text-[#3b82f6] dark:text-[#1E3A5F] hover:bg-[#EFF6FF] dark:hover:bg-cyan-950/30 transition-colors"
                                  >
                                    <Send className="w-2.5 h-2.5" />
                                    Påminn
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-300">
                              {fmtSEK(inv.total_amount)}
                            </td>
                            <td colSpan={5} />
                            <td className="px-3 py-2 text-right">
                              {days > 0 ? (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10px]",
                                    days > 90
                                      ? "border-rose-300 text-[#7A1A1A]"
                                      : days > 60
                                        ? "border-[#F0DDB7] text-[#7A5417]"
                                        : "border-slate-200 text-slate-500",
                                  )}
                                >
                                  {days}d
                                </Badge>
                              ) : (
                                <span className="text-[10px] text-slate-400">
                                  Ej förfallen
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </TooltipProvider>
  );
};
