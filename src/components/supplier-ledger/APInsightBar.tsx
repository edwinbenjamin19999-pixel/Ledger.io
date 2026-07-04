import { Brain, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { differenceInDays, parseISO } from "date-fns";
import { classify, type APClass, type ClassifiableInvoice } from "@/lib/supplier-ledger/classifyAP";

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

interface Props {
  invoices: ClassifiableInvoice[];
  cashBalance?: number | null;
  onOptimize: (payNowIds: string[]) => void;
}

export function APInsightBar({ invoices, cashBalance, onOptimize }: Props) {
  if (!invoices.length) return null;

  const classified = invoices.map(i => ({ inv: i, cls: classify(i) }));
  const counts: Record<APClass, number> = { pay_now: 0, pay_soon: 0, can_wait: 0, strategic_delay: 0 };
  const totals: Record<APClass, number> = { pay_now: 0, pay_soon: 0, can_wait: 0, strategic_delay: 0 };
  classified.forEach(({ inv, cls }) => { counts[cls]++; totals[cls] += inv.total_amount; });

  const payNowIds = classified.filter(c => c.cls === "pay_now").map(c => c.inv.id);

  // 7-day window
  const now = new Date();
  const due7 = invoices
    .filter(i => {
      const d = differenceInDays(parseISO(i.due_date), now);
      return d >= 0 && d <= 7;
    })
    .reduce((s, i) => s + i.total_amount, 0);
  const cashAfter7 = cashBalance != null ? cashBalance - due7 : null;

  return (
    <div className="rounded-2xl border border-blue-200/70 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:shadow-md transition-shadow p-5">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-xl bg-[#0F1F3D] flex items-center justify-center shrink-0">
          <Brain className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#3b82f6] bg-[#EFF6FF] px-2 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> AI-rekommendation
            </span>
          </div>
          <h3 className="text-base font-semibold text-slate-900">
            Nästa 7 dagar: <span className="tabular-nums">{fmt(due7)} kr</span>
            {cashAfter7 !== null && (
              <> · Kassa efter: <span className={`tabular-nums ${cashAfter7 < 0 ? "text-[#7A1A1A]" : "text-[#085041]"}`}>{fmt(cashAfter7)} kr</span></>
            )}
          </h3>
          <p className="text-sm text-slate-600">
            <span className="font-medium text-[#7A1A1A]">Betala nu: {counts.pay_now}</span>
            <span className="text-slate-400"> · </span>
            <span className="font-medium text-slate-600">Skjut upp: {counts.can_wait + counts.strategic_delay}</span>
            <span className="text-slate-400"> · </span>
            <span className="font-medium text-[#7A5417]">Bevaka: {counts.pay_soon}</span>
          </p>
          {counts.pay_now > 0 && (
            <p className="text-sm text-slate-700">
              Frigör <span className="font-semibold tabular-nums">{fmt(totals.can_wait + totals.strategic_delay)} kr</span> genom att skjuta upp icke-kritiska fakturor.
            </p>
          )}
        </div>
        {payNowIds.length > 0 && (
          <Button onClick={() => onOptimize(payNowIds)} className="shrink-0">
            Optimera betalningar
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
