import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EntityBreakdown } from "@/hooks/useBoardSummary";

const fmt = (n: number) => Math.round(n).toLocaleString("sv-SE");

export const EntityBreakdownPanel = ({ breakdown }: { breakdown: EntityBreakdown[] }) => {
  if (breakdown.length === 0) return null;
  const sorted = [...breakdown].sort((a, b) => b.revenue - a.revenue);
  const leader = sorted[0];

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl p-8">
      <div className="flex items-center gap-2 mb-2">
        <Building2 className="h-4 w-4 text-[#1E3A5F]" />
        <h3 className="text-xs uppercase tracking-[0.2em] text-[#3b82f6]/80 font-medium">
          Per bolag — koncernvy ({breakdown.length} bolag)
        </h3>
      </div>
      {leader && leader.revenue_share_pct >= 30 && (
        <p className="text-white/70 text-sm mb-6 italic">
          {leader.company_name} driver {leader.revenue_share_pct.toFixed(0)}% av koncernens omsättning.
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.18em] text-white/40 border-b border-white/5">
              <th className="text-left py-2 font-medium">Bolag</th>
              <th className="text-right py-2 font-medium">Omsättning</th>
              <th className="text-right py-2 font-medium">Andel</th>
              <th className="text-right py-2 font-medium">EBIT</th>
              <th className="text-right py-2 font-medium">Kassa</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(e => (
              <tr key={e.company_id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
                <td className="py-3 text-white/90">{e.company_name}</td>
                <td className="py-3 text-right text-white/85 tabular-nums">{fmt(e.revenue)} kr</td>
                <td className="py-3 text-right text-[#3b82f6] tabular-nums">{e.revenue_share_pct.toFixed(1)}%</td>
                <td className={cn(
                  "py-3 text-right tabular-nums",
                  e.ebit >= 0 ? "text-[#1D9E75]" : "text-[#C73838]"
                )}>
                  {e.ebit >= 0 ? "+" : ""}{fmt(e.ebit)} kr
                </td>
                <td className="py-3 text-right text-white/70 tabular-nums">
                  {e.cash !== null ? `${fmt(e.cash)} kr` : <span className="text-white/30 text-xs">Ingen bank</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
