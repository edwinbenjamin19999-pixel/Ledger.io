import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { MiniSparkline } from './MiniSparkline';
import type { AccountSummary, SortBy, AccountFilter } from './types';
import { formatSEK } from '@/lib/formatNumber';
import { getStatusLabel } from './accountTypeUtils';

interface AccountListPanelProps {
  summaries: AccountSummary[];
  selectedAccount: string | null;
  onSelectAccount: (accountNumber: string) => void;
}

export const AccountListPanel = ({ summaries, selectedAccount, onSelectAccount }: AccountListPanelProps) => {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('balance');
  const [filter, setFilter] = useState<AccountFilter>('all');

  const filtered = useMemo(() => {
    let list = summaries;

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a => a.accountNumber.includes(q) || a.accountName.toLowerCase().includes(q));
    }

    if (filter === 'active') list = list.filter(a => a.transactionCount > 0);
    if (filter === 'anomalies') list = list.filter(a => a.hasAnomaly || a.status === 'unusual');
    if (filter === 'large') list = list.filter(a => Math.abs(a.closingBalance) > 100000);
    if (filter === 'vat') list = list.filter(a => a.accountType === 'vat');
    if (filter === 'receivable_payable') list = list.filter(a => a.accountType === 'receivable' || a.accountType === 'supplier');

    if (sortBy === 'balance') list = [...list].sort((a, b) => Math.abs(b.closingBalance) - Math.abs(a.closingBalance));
    if (sortBy === 'activity') list = [...list].sort((a, b) => b.transactionCount - a.transactionCount);
    if (sortBy === 'change') list = [...list].sort((a, b) => Math.abs(b.pctChange) - Math.abs(a.pctChange));

    return list;
  }, [summaries, search, sortBy, filter]);

  const anomalyCount = summaries.filter(a => a.hasAnomaly || a.status === 'unusual').length;

  const filters: { key: AccountFilter; label: string }[] = [
    { key: 'all', label: 'Alla' },
    { key: 'active', label: 'Aktiva' },
    { key: 'anomalies', label: `⚠ Avvik.${anomalyCount > 0 ? ` (${anomalyCount})` : ''}` },
    { key: 'large', label: 'Stora' },
    { key: 'vat', label: 'Moms' },
    { key: 'receivable_payable', label: 'Fordr./Skuld.' },
  ];

  return (
    <>
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Konton ({filtered.length})
          </span>
          <div className="flex gap-1">
            {(['balance', 'activity', 'change'] as SortBy[]).map(s => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`text-[10px] px-2 py-1 rounded transition-colors ${
                  sortBy === s
                    ? 'bg-[#EFF6FF] text-[#3b82f6] dark:bg-blue-900/40 dark:text-[#1E3A5F]'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                {s === 'balance' ? 'Saldo' : s === 'activity' ? 'Aktivitet' : 'Förändring'}
              </button>
            ))}
          </div>
        </div>

        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
          <input
            placeholder="Sök konto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-xs
                       bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-[#3b82f6] focus:outline-none"
          />
        </div>

        <div className="flex gap-1 flex-wrap">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`text-[10px] px-2 py-1 rounded-full transition-colors ${
                filter === f.key
                  ? f.key === 'anomalies'
                    ? 'bg-[#FAEEDA] text-[#7A5417] dark:bg-amber-900/40 dark:text-[#C28A2B]'
                    : 'bg-[#EFF6FF] text-[#3b82f6] dark:bg-blue-900/40 dark:text-[#1E3A5F]'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-xs text-slate-400 p-4">Inga konton matchar</p>
        ) : (
          filtered.map(account => {
            const selected = selectedAccount === account.accountNumber;
            const statusInfo = account.status ? getStatusLabel(account.status) : null;
            return (
              <div
                key={account.accountNumber}
                onClick={() => onSelectAccount(account.accountNumber)}
                className={`px-4 py-3 cursor-pointer transition-colors border-b border-slate-50 dark:border-slate-700/50
                  ${selected
                    ? 'bg-[#EFF6FF] dark:bg-blue-900/20 border-l-2 border-l-[#3b82f6]'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 border-l-2 border-l-transparent'
                  }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 font-mono">
                      {account.accountNumber}
                    </span>
                    {statusInfo && statusInfo.label && (
                      <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    )}
                  </div>
                  <span className={`text-[11px] font-semibold flex items-center gap-0.5 ${
                    account.pctChange > 0 ? 'text-[#085041]' :
                    account.pctChange < 0 ? 'text-[#7A1A1A]' : 'text-slate-400'
                  }`}>
                    {account.pctChange > 0 ? '↑' : account.pctChange < 0 ? '↓' : '→'}
                    {Math.abs(account.pctChange).toFixed(1)}%
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate pr-2">
                    {account.accountName}
                  </span>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 tabular-nums whitespace-nowrap">
                    {formatSEK(account.closingBalance)}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center gap-2">
                    <MiniSparkline
                      data={account.monthlyTrend}
                      width={50}
                      height={14}
                      color={selected ? '#3b82f6' : '#94a3b8'}
                    />
                    <span className="text-[9px] text-slate-400 tabular-nums">{account.transactionCount} tx</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {account.netChange !== 0 && (
                      <span className={`text-[9px] font-medium ${account.netChange > 0 ? 'text-[#085041]' : 'text-[#7A1A1A]'}`}>
                        {account.netChange > 0 ? '+' : ''}{formatSEK(account.netChange)}
                      </span>
                    )}
                    {account.hasAnomaly && (
                      <span className="text-[9px] bg-[#FAEEDA] text-[#7A5417] dark:bg-amber-900/40 dark:text-[#C28A2B] px-1.5 py-0.5 rounded-full">
                        ⚠
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
};
