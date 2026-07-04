interface Props {
  rate: string;
  label: string;
  examples: string[];
  accent: string;
}

export const VatRateCard = ({ rate, label, examples, accent }: Props) => (
  <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
    <div className={`text-3xl md:text-4xl font-bold ${accent}`}>{rate}</div>
    <div className="mt-1 text-sm uppercase tracking-wider font-medium text-[#0F172A]">{label}</div>
    <ul className="mt-4 space-y-1.5 text-sm text-[#64748b]">
      {examples.map((e) => <li key={e}>• {e}</li>)}
    </ul>
  </div>
);
