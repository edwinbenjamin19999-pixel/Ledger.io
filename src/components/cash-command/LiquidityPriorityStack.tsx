import { useMemo } from "react";
import { Sparkles, ShieldCheck } from "lucide-react";
import { LiquidityPriorityCard } from "./LiquidityPriorityCard";
import type { ActionableInsight } from "@/lib/cashflow/types";

interface InvoiceLite {
  id: string;
  counterparty_name?: string | null;
  total_amount?: number | null;
  due_date?: string | null;
  invoice_number?: string | null;
}

interface Props {
  insights: ActionableInsight[];
  arInvoices: InvoiceLite[];
  apInvoices: InvoiceLite[];
  avgDailyOutflow: number;
  pendingId: string | null;
  onExecute: (insight: ActionableInsight, selectedIds: string[]) => void;
  onSimulate: (insight: ActionableInsight) => void;
}

export function LiquidityPriorityStack({
  insights,
  arInvoices,
  apInvoices,
  avgDailyOutflow,
  pendingId,
  onExecute,
  onSimulate,
}: Props) {
  const sorted = useMemo(() => [...insights].sort((a, b) => b.priority - a.priority), [insights]);

  if (sorted.length === 0) {
    return (
      <div className="rounded-2xl border border-[#BFE6D6] bg-emerald-50/40 dark:bg-[#E1F5EE] dark:border-[#BFE6D6] p-6 text-center">
        <ShieldCheck className="w-6 h-6 text-[#085041] mx-auto mb-2" />
        <h3 className="font-semibold text-sm text-[#085041] dark:text-emerald-200">
          Inga akuta åtgärder
        </h3>
        <p className="text-xs text-emerald-700/80 dark:text-emerald-300/70 mt-1">
          Likviditeten är under kontroll — AI bevakar utvecklingen kontinuerligt.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-[#3b82f6]" />
        <h2 className="text-sm font-semibold">Topprioriteringar</h2>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#EFF6FF] text-[#3b82f6] font-medium">
          {sorted.length}
        </span>
        <span className="text-xs text-muted-foreground ml-1">
          · Beslut → simulera → utför
        </span>
      </div>
      <div className="space-y-3">
        {sorted.map((insight) => {
          const ids = insight.invoiceIds || [];
          const pool = insight.kind === "ap_pressure" ? apInvoices : arInvoices;
          const items = pool
            .filter((i) => ids.includes(i.id))
            .slice(0, 50)
            .map((i) => ({
              id: i.id,
              primary: i.counterparty_name || i.invoice_number || "Faktura",
              secondary: i.due_date
                ? `Förfallen ${new Date(i.due_date).toLocaleDateString("sv-SE", { day: "numeric", month: "short" })}`
                : undefined,
              amount: i.total_amount ?? undefined,
            }));
          return (
            <LiquidityPriorityCard
              key={insight.id}
              insight={insight}
              items={items}
              avgDailyOutflow={avgDailyOutflow}
              pending={pendingId === insight.id}
              onExecute={onExecute}
              onSimulate={onSimulate}
            />
          );
        })}
      </div>
    </section>
  );
}
