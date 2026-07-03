import { Check, X } from "lucide-react";

interface Row { label: string; traditional: string | boolean; ai: string | boolean }

export const ComparisonTable = ({ rows }: { rows: Row[] }) => (
  <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-100 bg-slate-50/60">
          <th className="text-left font-semibold text-[#0f1f35] px-6 py-4">Funktion</th>
          <th className="text-left font-semibold text-[#64748b] px-6 py-4">Traditionellt system</th>
          <th className="text-left font-semibold text-[#3b82f6] px-6 py-4">Ledger.io</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-slate-100 last:border-0">
            <td className="px-6 py-4 font-medium text-[#0f1f35]">{r.label}</td>
            <td className="px-6 py-4 text-[#64748b]">
              {typeof r.traditional === "boolean"
                ? (r.traditional ? <Check className="w-4 h-4 text-[#085041]" /> : <X className="w-4 h-4 text-slate-300" />)
                : r.traditional}
            </td>
            <td className="px-6 py-4 text-[#0f1f35]">
              {typeof r.ai === "boolean"
                ? (r.ai ? <Check className="w-4 h-4 text-[#3b82f6]" /> : <X className="w-4 h-4 text-slate-300" />)
                : r.ai}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
