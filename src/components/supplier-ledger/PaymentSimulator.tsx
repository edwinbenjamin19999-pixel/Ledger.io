import { Wallet, TrendingUp } from "lucide-react";
import { classify, type ClassifiableInvoice } from "@/lib/supplier-ledger/classifyAP";

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

interface Props {
  invoices: ClassifiableInvoice[];
  cashBalance: number | null;
}

export function PaymentSimulator({ invoices, cashBalance }: Props) {
  if (cashBalance === null || !invoices.length) return null;

  const totalAP = invoices.reduce((s, i) => s + i.total_amount, 0);
  const payNowTotal = invoices
    .filter(i => classify(i) === "pay_now")
    .reduce((s, i) => s + i.total_amount, 0);

  const cashIfAll = cashBalance - totalAP;
  const cashIfOpt = cashBalance - payNowTotal;
  const diff = cashIfOpt - cashIfAll;

  return (
    <div className="bg-[#EFF6FF] border-[0.5px] border-[#B5D4F4] rounded-[12px] p-[14px]">
      <div className="flex items-center gap-2 mb-3">
        <Wallet className="h-[14px] w-[14px] text-[#0C447C]" />
        <h3 className="text-[11px] font-medium text-[#0C447C] uppercase tracking-[0.06em]">
          Likviditetssimulator
        </h3>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] font-medium text-[#0C447C] uppercase tracking-[0.06em] mb-1">Allt betalas idag</p>
          <p className={`text-[20px] font-medium tracking-[-0.02em] tabular-nums ${cashIfAll < 0 ? "text-[#791F1F]" : "text-[#0F172A]"}`}>
            {fmt(cashIfAll)} kr
          </p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-[#0C447C] uppercase tracking-[0.06em] mb-1">Optimerad plan</p>
          <p className={`text-[20px] font-medium tracking-[-0.02em] tabular-nums ${cashIfOpt < 0 ? "text-[#791F1F]" : "text-[#0F172A]"}`}>
            {fmt(cashIfOpt)} kr
          </p>
        </div>
      </div>
      {diff > 0 && (
        <div className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-[#1D9E75]">
          <TrendingUp className="h-3 w-3" />
          +{fmt(diff)} kr bevarad likviditet
        </div>
      )}
    </div>
  );
}
