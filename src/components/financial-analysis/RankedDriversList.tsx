import { useState, useMemo } from "react";
import { ChevronRight, ChevronDown, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { formatSEK, formatPercent } from "@/lib/formatNumber";
import { cn } from "@/lib/utils";
import type { Driver, VarianceRow } from "./types";

interface Props {
  drivers: { positive: Driver[]; negative: Driver[] };
  rows: VarianceRow[];
  onDrill: (row: VarianceRow) => void;
}

interface RankedItem {
  key: string;
  category: string;
  accountNumber?: string;
  impactSEK: number;
  variancePercent: number;
  isFavorable: boolean;
  rowRef: VarianceRow;
  /** Section row whose children should be shown when expanded. */
  sectionRow?: VarianceRow;
  riskTag?: 'cost-growth' | 'volatility' | 'concentration';
}

function getRiskTag(row: VarianceRow): RankedItem['riskTag'] | undefined {
  if (!row.isFavorable && (row.variancePercent ?? 0) > 20 && row.id !== 'revenue') return 'cost-growth';
  return undefined;
}

const RISK_LABEL: Record<NonNullable<RankedItem['riskTag']>, string> = {
  'cost-growth': 'Kostnadstillväxt',
  'volatility': 'Volatilitet',
  'concentration': 'Koncentration',
};

export function RankedDriversList({ drivers, rows, onDrill }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const ranked = useMemo<RankedItem[]>(() => {
    const all = [...drivers.positive, ...drivers.negative];
    // Section-level (no accountNumber) become section items; account-level become children
    const sections: RankedItem[] = [];
    const seen = new Set<string>();
    for (const d of all) {
      // Match against rows: if rowRef has children, treat as section
      const isSection = d.rowRef.children && d.rowRef.children.length > 0;
      const key = (d.accountNumber || d.rowRef.id) + ':' + d.category;
      if (seen.has(key)) continue;
      seen.add(key);
      sections.push({
        key,
        category: d.category,
        accountNumber: d.accountNumber,
        impactSEK: d.impactSEK,
        variancePercent: d.variancePercent,
        isFavorable: d.direction === 'positive',
        rowRef: d.rowRef,
        sectionRow: isSection ? d.rowRef : undefined,
        riskTag: getRiskTag(d.rowRef),
      });
    }
    return sections.sort((a, b) => Math.abs(b.impactSEK) - Math.abs(a.impactSEK)).slice(0, 8);
  }, [drivers]);

  const maxImpact = Math.max(...ranked.map(r => Math.abs(r.impactSEK)), 1);

  const toggle = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (ranked.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
        <h3 className="text-sm font-semibold text-slate-900 mb-2">Topp drivare</h3>
        <p className="text-sm text-slate-400 italic py-4">Inga avvikelser identifierade.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200/60 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200/60">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Varför avvikelsen</h3>
          <p className="text-[11px] text-slate-500">Rankat efter absolut påverkan · klicka för drilldown</p>
        </div>
        <span className="text-[11px] text-slate-400">{ranked.length} drivare</span>
      </div>

      <ul className="divide-y divide-slate-100">
        {ranked.map((item, idx) => {
          const isOpen = expanded.has(item.key);
          const hasChildren = item.sectionRow?.children && item.sectionRow.children.length > 0;
          const barWidth = (Math.abs(item.impactSEK) / maxImpact) * 100;

          return (
            <li key={item.key} className="group">
              <div
                className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/80 transition-colors cursor-pointer"
                onClick={() => onDrill(item.rowRef)}
              >
                {/* Rank */}
                <div className={cn(
                  "shrink-0 h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold tabular-nums",
                  idx === 0 ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
                )}>
                  {idx + 1}
                </div>

                {/* Category + bar */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-slate-900 truncate">{item.category}</span>
                    {item.riskTag && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#FAEEDA] text-[#7A5417] border border-[#F0DDB7]">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        {RISK_LABEL[item.riskTag]}
                      </span>
                    )}
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", item.isFavorable ? "bg-emerald-400" : "bg-rose-400")}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>

                {/* Impact */}
                <div className="text-right shrink-0">
                  <div className={cn(
                    "text-sm font-bold tabular-nums inline-flex items-center gap-1",
                    item.isFavorable ? "text-[#085041]" : "text-[#7A1A1A]"
                  )}>
                    {item.isFavorable ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                    {item.impactSEK >= 0 ? '+' : ''}{formatSEK(item.impactSEK)}
                  </div>
                  <div className="text-[11px] text-slate-500 tabular-nums">
                    {item.variancePercent >= 0 ? '+' : ''}{formatPercent(item.variancePercent)}
                  </div>
                </div>

                {/* Expand */}
                {hasChildren && (
                  <button
                    onClick={(e) => { e.stopPropagation(); toggle(item.key); }}
                    className="shrink-0 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  >
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                )}
              </div>

              {/* Children (top 5 BAS accounts) */}
              {isOpen && hasChildren && (
                <ul className="bg-slate-50/40 border-t border-slate-100">
                  {item.sectionRow!.children!
                    .slice()
                    .sort((a, b) => Math.abs(b.varianceAmount) - Math.abs(a.varianceAmount))
                    .slice(0, 5)
                    .map(child => (
                      <li
                        key={child.id}
                        onClick={() => onDrill(child)}
                        className="flex items-center gap-3 pl-16 pr-5 py-2 hover:bg-white cursor-pointer text-sm"
                      >
                        <span className="flex-1 truncate text-slate-700">{child.label}</span>
                        <span className={cn(
                          "tabular-nums font-semibold",
                          child.isFavorable ? "text-[#085041]" : child.varianceAmount !== 0 ? "text-[#7A1A1A]" : "text-slate-400"
                        )}>
                          {child.varianceAmount >= 0 ? '+' : ''}{formatSEK(child.varianceAmount)}
                        </span>
                        <span className="text-[11px] text-slate-400 tabular-nums w-14 text-right">
                          {child.variancePercent !== null ? `${child.variancePercent >= 0 ? '+' : ''}${formatPercent(child.variancePercent)}` : '—'}
                        </span>
                      </li>
                    ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
