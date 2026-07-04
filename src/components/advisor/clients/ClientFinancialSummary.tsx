interface Row {
  label: string;
  value: number;
  emphasis?: "positive" | "negative" | "neutral";
}

interface Props {
  monthLabel: string;
  income: number;
  costs: number;
  result: number;
  vsPrevPct: number;
  cash: number;
  receivables: number;
  liabilities: number;
  solidityPct: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(n);

const Line = ({ label, value, emphasis }: Row) => {
  const cls =
    emphasis === "positive"
      ? "text-emerald-600"
      : emphasis === "negative"
      ? "text-red-600"
      : "text-slate-900";
  return (
    <div className="flex items-center justify-between py-1.5 text-[13px]">
      <span className="text-slate-600">{label}</span>
      <span className={`font-medium tabular-nums ${cls}`}>{fmt(value)}</span>
    </div>
  );
};

export const ClientFinancialSummary = ({
  monthLabel,
  income,
  costs,
  result,
  vsPrevPct,
  cash,
  receivables,
  liabilities,
  solidityPct,
}: Props) => (
  <div className="bg-white border border-slate-200 rounded-[12px] p-[14px] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
    <h3 className="text-[12px] font-medium tracking-wide text-slate-500 uppercase mb-3">
      Finansiell sammanfattning — {monthLabel}
    </h3>

    <Line label="Intäkter" value={income} emphasis={income >= 0 ? "positive" : "negative"} />
    <Line label="Kostnader" value={costs} />
    <Line label="Resultat" value={result} emphasis={result >= 0 ? "positive" : "negative"} />

    <div className="flex items-center justify-between py-1.5 text-[12px] border-t border-slate-100 mt-2 pt-3">
      <span className="text-slate-500">vs föregående månad</span>
      <span className={vsPrevPct >= 0 ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>
        {vsPrevPct >= 0 ? "+" : ""}
        {vsPrevPct.toFixed(1)}%
      </span>
    </div>

    <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
      <h4 className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Balansposter</h4>
      <Line label="Kassa & Bank" value={cash} />
      <Line label="Kundfordringar" value={receivables} />
      <Line label="Skulder totalt" value={liabilities} />
      <div className="flex items-center justify-between py-1.5 text-[13px]">
        <span className="text-slate-600">Soliditet</span>
        <span className="font-medium tabular-nums text-slate-900">{solidityPct.toFixed(1)}%</span>
      </div>
    </div>
  </div>
);
