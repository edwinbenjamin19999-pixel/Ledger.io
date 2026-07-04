interface KPIBandProps {
  grossMargin: number;
  ebitMargin: number;
  netMargin: number;
}

export function KPIBand({ grossMargin, ebitMargin, netMargin }: KPIBandProps) {
  const items = [
    { label: "Bruttomarginal", value: grossMargin, color: "text-[#C28A2B]" },
    { label: "EBIT-marginal", value: ebitMargin, color: "text-[#1E3A5F]" },
    { label: "Nettomarginal", value: netMargin, color: "text-indigo-400" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 sm:divide-x divide-slate-700 bg-slate-950 rounded-xl mx-0 overflow-hidden">
      {items.map(item => (
        <div key={item.label} className="p-4 text-center">
          <span className="text-slate-500 text-xs uppercase tracking-wider block mb-1">{item.label}</span>
          <span className={`font-bold text-2xl tabular-nums ${item.color}`}>
            {item.value.toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
}
