import { ArrowRight } from 'lucide-react';
import type { AccountSummary } from './types';
import { formatSEK } from '@/lib/formatNumber';

interface PeriodSummaryStripProps {
  account: AccountSummary | null;
  allSummaries: AccountSummary[];
}

export const PeriodSummaryStrip = ({ account, allSummaries }: PeriodSummaryStripProps) => {
  const agg = account || {
    openingBalance: allSummaries.reduce((s, a) => s + a.openingBalance, 0),
    closingBalance: allSummaries.reduce((s, a) => s + a.closingBalance, 0),
    periodDebit: allSummaries.reduce((s, a) => s + a.periodDebit, 0),
    periodCredit: allSummaries.reduce((s, a) => s + a.periodCredit, 0),
    netChange: allSummaries.reduce((s, a) => s + a.netChange, 0),
    pctChange: 0,
    prevPeriodComparison: undefined as any,
  };

  const netChange = agg.closingBalance - agg.openingBalance;
  const comparison = account?.prevPeriodComparison;

  const items = [
    { label: 'Ingående saldo', value: formatSEK(agg.openingBalance), highlight: false },
    { label: 'Debet', value: formatSEK(agg.periodDebit), highlight: false },
    { label: 'Kredit', value: formatSEK(agg.periodCredit), highlight: false },
    { label: 'Netto', value: formatSEK(netChange), highlight: true, positive: netChange >= 0 },
    { label: 'Utgående saldo', value: formatSEK(agg.closingBalance), highlight: true },
  ];

  return (
    <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 px-5 py-3 shadow-sm">
      <div className="flex items-center gap-2 flex-wrap">
        {items.map((item, i) => (
          <div key={item.label} className="flex items-center gap-2">
            <div className="text-center min-w-[100px]">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">{item.label}</p>
              <p className={`text-sm font-bold tabular-nums ${
                item.highlight
                  ? item.positive !== undefined
                    ? item.positive ? 'text-[#085041] dark:text-[#1D9E75]' : 'text-[#7A1A1A] dark:text-[#C73838]'
                    : 'text-slate-800 dark:text-slate-200'
                  : 'text-slate-700 dark:text-slate-300'
              }`}>
                {item.value}
              </p>
            </div>
            {i < items.length - 1 && (
              <ArrowRight className="w-3 h-3 text-slate-300 dark:text-slate-600 flex-shrink-0" />
            )}
          </div>
        ))}

        {comparison && (
          <div className="ml-auto flex items-center gap-2 pl-4 border-l border-slate-200 dark:border-slate-700">
            <div className="text-center">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">vs föreg. period</p>
              <p className={`text-sm font-bold tabular-nums ${
                comparison.diff >= 0 ? 'text-[#085041] dark:text-[#1D9E75]' : 'text-[#7A1A1A] dark:text-[#C73838]'
              }`}>
                {comparison.diff >= 0 ? '+' : ''}{formatSEK(comparison.diff)}
                <span className="text-xs ml-1">({comparison.pctDiff >= 0 ? '+' : ''}{comparison.pctDiff.toFixed(1)}%)</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
