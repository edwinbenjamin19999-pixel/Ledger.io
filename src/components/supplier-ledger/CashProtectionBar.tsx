import { differenceInDays, parseISO } from "date-fns";
import { classify, type ClassifiableInvoice, type APClass } from "@/lib/supplier-ledger/classifyAP";

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

interface Props {
  invoices: ClassifiableInvoice[];
  cashBalance: number | null;
}

export function CashProtectionBar({ invoices, cashBalance }: Props) {
  const totalAP = invoices.reduce((s, i) => s + i.total_amount, 0);
  const now = new Date();
  const dueIn7 = invoices
    .filter(i => {
      const d = differenceInDays(parseISO(i.due_date), now);
      return d >= 0 && d <= 7;
    })
    .reduce((s, i) => s + i.total_amount, 0);

  const cashAfter7 = cashBalance !== null ? cashBalance - dueIn7 : null;
  const due7Pct = cashBalance && cashBalance > 0 ? (dueIn7 / cashBalance) * 100 : 0;

  // Composition by class
  const totals: Record<APClass, number> = { pay_now: 0, pay_soon: 0, can_wait: 0, strategic_delay: 0 };
  invoices.forEach(i => { totals[classify(i)] += i.total_amount; });
  const pct = (n: number) => (totalAP > 0 ? (n / totalAP) * 100 : 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-[10px]">
        {/* Kassa nu — TYP 2 blue */}
        <div className="relative overflow-hidden bg-[#F5F9FF] border-[0.5px] border-[#C7DCFA] rounded-[12px] p-[14px]">
          <span aria-hidden className="absolute top-0 left-0 right-0 h-[1.5px] bg-[#0040CC] rounded-t-[12px]" />
          <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8] mb-1">Kassa nu</p>
          <p className="text-[22px] font-medium tracking-[-0.03em] text-[#0C447C] tabular-nums">
            {cashBalance !== null ? `${fmt(cashBalance)} kr` : "—"}
          </p>
        </div>
        {/* Att betala 7d — TYP 1 (warn amber if >50%) */}
        <div className={`relative overflow-hidden border-[0.5px] rounded-[12px] p-[14px] ${due7Pct > 50 ? "bg-[#FFFBF0] border-[#F9DFA0]" : "bg-[#FAFBFC] border-[#DFE4EA]"}`}>
          <span aria-hidden className={`absolute top-0 left-0 right-0 h-[1.5px] rounded-t-[12px] ${due7Pct > 50 ? "bg-[#EF9F27]" : "bg-[#0040CC]"}`} />
          <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8] mb-1">Att betala 7d</p>
          <p className={`text-[22px] font-medium tracking-[-0.03em] tabular-nums ${due7Pct > 50 ? "text-[#633806]" : "text-[#0F172A]"}`}>
            {fmt(dueIn7)} kr
          </p>
        </div>
        {/* Kassa efter 7d — TYP 2 blue (red if negative) */}
        <div className={`relative overflow-hidden border-[0.5px] rounded-[12px] p-[14px] ${cashAfter7 !== null && cashAfter7 < 0 ? "bg-[#FFF5F5] border-[#FBBEBE]" : "bg-[#F5F9FF] border-[#C7DCFA]"}`}>
          <span aria-hidden className={`absolute top-0 left-0 right-0 h-[1.5px] rounded-t-[12px] ${cashAfter7 !== null && cashAfter7 < 0 ? "bg-[#E24B4A]" : "bg-[#0040CC]"}`} />
          <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8] mb-1">Kassa efter 7d</p>
          <p className={`text-[22px] font-medium tracking-[-0.03em] tabular-nums ${cashAfter7 !== null && cashAfter7 < 0 ? "text-[#791F1F]" : "text-[#0C447C]"}`}>
            {cashAfter7 !== null ? `${fmt(cashAfter7)} kr` : "—"}
          </p>
        </div>
        {/* Total skuld — TYP 1 */}
        <div className="relative overflow-hidden bg-[#FAFBFC] border-[0.5px] border-[#DFE4EA] rounded-[12px] p-[14px]">
          <span aria-hidden className="absolute top-0 left-0 right-0 h-[1.5px] bg-[#0040CC] rounded-t-[12px]" />
          <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-[#94A3B8] mb-1">Total skuld</p>
          <p className="text-[22px] font-medium tracking-[-0.03em] text-[#0F172A] tabular-nums">{fmt(totalAP)} kr</p>
        </div>
      </div>

      {totalAP > 0 && (
        <div className="flex gap-[8px] items-center flex-wrap px-1">
          <span className="flex items-center gap-[5px] text-[11px] text-[#475569]">
            <span className="w-[7px] h-[7px] rounded-full bg-[#E24B4A]" />
            Betala nu · {fmt(totals.pay_now)} kr
          </span>
          <span className="flex items-center gap-[5px] text-[11px] text-[#475569]">
            <span className="w-[7px] h-[7px] rounded-full bg-[#EF9F27]" />
            Förfaller snart · {fmt(totals.pay_soon)} kr
          </span>
          <span className="flex items-center gap-[5px] text-[11px] text-[#475569]">
            <span className="w-[7px] h-[7px] rounded-full bg-[#185FA5]" />
            Strategisk · {fmt(totals.strategic_delay)} kr
          </span>
        </div>
      )}
    </div>
  );
}
