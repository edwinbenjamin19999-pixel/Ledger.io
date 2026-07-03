import { useMemo } from 'react';
import type { JournalDetail, FlowItem } from './types';
import { formatSEK } from '@/lib/formatNumber';

interface FlowViewProps {
  details: JournalDetail[];
  accountName: string;
  accounts: { account_number: string; account_name: string }[];
}

export const FlowView = ({ details, accountName, accounts }: FlowViewProps) => {
  const realDetails = useMemo(() => details.filter(d => !d.isVirtualRow), [details]);

  const { inflows, outflows, totalInflow, totalOutflow, netFlow } = useMemo(() => {
    const inflowMap = new Map<string, number>();
    const outflowMap = new Map<string, number>();

    for (const d of realDetails) {
      const key = d.counterAccounts.join(', ') || 'Övriga';
      if (d.debit > 0) inflowMap.set(key, (inflowMap.get(key) || 0) + d.debit);
      if (d.credit > 0) outflowMap.set(key, (outflowMap.get(key) || 0) + d.credit);
    }

    const toItems = (map: Map<string, number>, total: number): FlowItem[] => {
      const items = Array.from(map.entries())
        .map(([motkonto, amount]) => ({
          motkonto,
          name: accounts.find(a => a.account_number === motkonto)?.account_name || '',
          amount,
          pct: total > 0 ? (amount / total) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount);

      // Show top 8 + bucket
      if (items.length > 8) {
        const top = items.slice(0, 8);
        const rest = items.slice(8);
        const restTotal = rest.reduce((s, i) => s + i.amount, 0);
        top.push({ motkonto: 'Övriga', name: `${rest.length} övriga konton`, amount: restTotal, pct: total > 0 ? (restTotal / total) * 100 : 0 });
        return top;
      }
      return items;
    };

    const ti = Array.from(inflowMap.values()).reduce((a, b) => a + b, 0);
    const to = Array.from(outflowMap.values()).reduce((a, b) => a + b, 0);

    return {
      inflows: toItems(inflowMap, ti),
      outflows: toItems(outflowMap, to),
      totalInflow: ti,
      totalOutflow: to,
      netFlow: ti - to,
    };
  }, [realDetails, accounts]);

  if (realDetails.length === 0) {
    return (
      <div className="flex-1 bg-white dark:bg-slate-800/60 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center">
        <p className="text-sm text-slate-400">Välj ett konto för att se flöde</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white dark:bg-slate-800/60 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-auto p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Pengarnas rörelse — {accountName}
        </h3>
        <div className={`text-sm font-bold px-3 py-1 rounded-full ${
          netFlow >= 0 ? 'bg-[#E1F5EE] text-[#085041] dark:bg-emerald-900/40 dark:text-[#1D9E75]' : 'bg-[#FCE8E8] text-[#7A1A1A] dark:bg-rose-900/40 dark:text-[#C73838]'
        }`}>
          Netto: {netFlow >= 0 ? '+' : ''}{formatSEK(netFlow)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <p className="text-xs text-[#085041] dark:text-[#1D9E75] font-semibold uppercase tracking-wider mb-3">
            Inflöde (Debet) — {formatSEK(totalInflow)}
          </p>
          {inflows.map(item => (
            <div key={item.motkonto} className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-700 dark:text-slate-300 truncate font-medium">
                  {item.motkonto} {item.name}
                </span>
                <span className="text-[#085041] dark:text-[#1D9E75] font-semibold tabular-nums ml-2 flex items-center gap-1">
                  {formatSEK(item.amount)}
                  <span className="text-slate-400 text-[10px]">({item.pct.toFixed(1)}%)</span>
                </span>
              </div>
              <div className="h-5 bg-slate-100 dark:bg-slate-700 rounded overflow-hidden">
                <div
                  className="h-full bg-emerald-400 dark:bg-emerald-500 rounded transition-all"
                  style={{ width: `${Math.min(item.pct, 100)}%` }}
                />
              </div>
            </div>
          ))}
          {inflows.length === 0 && <p className="text-xs text-slate-400">Inget inflöde</p>}
        </div>

        <div>
          <p className="text-xs text-[#7A1A1A] dark:text-[#C73838] font-semibold uppercase tracking-wider mb-3">
            Utflöde (Kredit) — {formatSEK(totalOutflow)}
          </p>
          {outflows.map(item => (
            <div key={item.motkonto} className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-700 dark:text-slate-300 truncate font-medium">
                  {item.motkonto} {item.name}
                </span>
                <span className="text-[#7A1A1A] dark:text-[#C73838] font-semibold tabular-nums ml-2 flex items-center gap-1">
                  {formatSEK(item.amount)}
                  <span className="text-slate-400 text-[10px]">({item.pct.toFixed(1)}%)</span>
                </span>
              </div>
              <div className="h-5 bg-slate-100 dark:bg-slate-700 rounded overflow-hidden">
                <div
                  className="h-full bg-rose-400 dark:bg-rose-500 rounded transition-all"
                  style={{ width: `${Math.min(item.pct, 100)}%` }}
                />
              </div>
            </div>
          ))}
          {outflows.length === 0 && <p className="text-xs text-slate-400">Inget utflöde</p>}
        </div>
      </div>
    </div>
  );
};
