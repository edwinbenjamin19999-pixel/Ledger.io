import type { JournalExampleData } from "@/data/guides/articles/types";

const fmt = (n: number) => n.toLocaleString("sv-SE", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export const JournalExample = ({ data }: { data: JournalExampleData }) => {
  const totalDebit = data.lines.reduce((s, l) => s + (l.debit ?? 0), 0);
  const totalCredit = data.lines.reduce((s, l) => s + (l.credit ?? 0), 0);

  return (
    <figure className="not-prose my-14 rounded-[20px] border border-slate-900/[0.06] bg-[#F8FAFC] overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <figcaption className="border-b border-slate-900/[0.06] bg-white px-6 py-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#3b82f6]">Exempel</div>
        <div className="mt-1.5 text-[17px] font-semibold text-[#0f1f35] tracking-tight">{data.title}</div>
        <p className="mt-1 text-[15px] text-slate-600 leading-relaxed">{data.scenario}</p>
      </figcaption>
      <div className="overflow-x-auto">
        <table className="w-full text-[14px]">
          <thead>
            <tr className="border-b border-slate-900/[0.06] bg-slate-100/70 text-[11px] uppercase tracking-[0.12em] text-slate-600 font-semibold">
              <th className="px-6 py-3 text-left">Konto</th>
              <th className="px-6 py-3 text-left">Benämning</th>
              <th className="px-6 py-3 text-right">Debet</th>
              <th className="px-6 py-3 text-right">Kredit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900/[0.05]">
            {data.lines.map((line, i) => (
              <tr key={i} className="hover:bg-white/60 transition-colors">
                <td className="px-6 py-3.5">
                  <span className="inline-flex items-center rounded-md bg-white border border-slate-900/[0.06] px-2 py-0.5 font-mono text-[12px] font-semibold text-[#0f1f35]">
                    {line.account}
                  </span>
                </td>
                <td className="px-6 py-3.5 text-slate-700">{line.label}</td>
                <td className={`px-6 py-3.5 text-right tabular-nums font-medium ${line.debit ? "text-[#085041]" : "text-slate-300"}`}>
                  {line.debit ? fmt(line.debit) : "—"}
                </td>
                <td className={`px-6 py-3.5 text-right tabular-nums font-medium ${line.credit ? "text-blue-700" : "text-slate-300"}`}>
                  {line.credit ? fmt(line.credit) : "—"}
                </td>
              </tr>
            ))}
            <tr className="bg-white font-semibold border-t border-slate-900/[0.08]">
              <td className="px-6 py-3.5 text-slate-700" colSpan={2}>Summa</td>
              <td className="px-6 py-3.5 text-right tabular-nums text-[#085041]">{fmt(totalDebit)}</td>
              <td className="px-6 py-3.5 text-right tabular-nums text-blue-700">{fmt(totalCredit)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {data.note && (
        <div className="border-t border-slate-900/[0.06] bg-white px-6 py-3.5 text-[13px] text-slate-600">
          {data.note}
        </div>
      )}
    </figure>
  );
};
