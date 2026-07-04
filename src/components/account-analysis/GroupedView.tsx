import { useState, useMemo } from 'react';
import type { JournalDetail, GroupedData, GroupByOption } from './types';
import { formatSEK } from '@/lib/formatNumber';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

interface GroupedViewProps {
  details: JournalDetail[];
  accounts: { account_number: string; account_name: string }[];
}

export const GroupedView = ({ details, accounts }: GroupedViewProps) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [groupBy, setGroupBy] = useState<GroupByOption>('counterAccount');

  const realDetails = useMemo(() => details.filter(d => !d.isVirtualRow), [details]);

  const grouped = useMemo<GroupedData[]>(() => {
    const map = new Map<string, GroupedData>();
    const totalAll = realDetails.reduce((s, d) => s + Math.max(d.debit, d.credit), 0);

    for (const d of realDetails) {
      let key: string;
      let name: string;

      switch (groupBy) {
        case 'month':
          key = d.entry_date ? d.entry_date.substring(0, 7) : 'Okänd';
          name = d.entry_date ? format(new Date(d.entry_date), 'MMMM yyyy', { locale: sv }) : 'Okänd';
          break;
        case 'type':
          key = d.debit > 0 ? 'Debet' : 'Kredit';
          name = key;
          break;
        case 'creator':
          key = d.createdBy || 'manual';
          name = key === 'ai' ? 'AI-skapad' : key === 'import' ? 'Importerad' : key === 'bank_sync' ? 'Banksynk' : 'Manuell';
          break;
        default:
          key = d.counterAccounts.join(', ') || 'Ingen';
          name = accounts.find(a => a.account_number === d.counterAccounts[0])?.account_name || '';
      }

      if (!map.has(key)) {
        map.set(key, {
          motkonto: key,
          motkontoName: name,
          count: 0,
          total: 0,
          totalIncrease: 0,
          totalDecrease: 0,
          netEffect: 0,
          pct: 0,
          lastDate: '',
          transactions: [],
        });
      }
      const g = map.get(key)!;
      g.count++;
      const amount = Math.max(d.debit, d.credit);
      g.total += amount;
      g.totalIncrease += d.debit;
      g.totalDecrease += d.credit;
      g.netEffect += d.debit - d.credit;
      g.lastDate = d.entry_date > g.lastDate ? d.entry_date : g.lastDate;
      g.transactions.push({ date: d.entry_date, description: d.description, amount, debit: d.debit, credit: d.credit });
    }

    for (const g of map.values()) {
      g.pct = totalAll > 0 ? (g.total / totalAll) * 100 : 0;
    }

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [realDetails, accounts, groupBy]);

  const toggleGroup = (key: string) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  if (realDetails.length === 0) {
    return (
      <div className="flex-1 bg-white dark:bg-slate-800/60 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center">
        <p className="text-sm text-slate-400">Välj ett konto för att se grupperat</p>
      </div>
    );
  }

  const groupByOptions: { key: GroupByOption; label: string }[] = [
    { key: 'counterAccount', label: 'Motkonto' },
    { key: 'month', label: 'Månad' },
    { key: 'type', label: 'Typ' },
    { key: 'creator', label: 'Skapare' },
  ];

  return (
    <div className="flex-1 bg-white dark:bg-slate-800/60 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
      {/* Group by selector */}
      <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
        <span className="text-[10px] text-slate-400 uppercase tracking-wider">Gruppera efter:</span>
        {groupByOptions.map(opt => (
          <button
            key={opt.key}
            onClick={() => setGroupBy(opt.key)}
            className={`text-xs px-3 py-1 rounded-full transition-colors ${
              groupBy === opt.key
                ? 'bg-[#3b82f6] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="max-h-[calc(100vh-420px)] overflow-auto flex-1">
        <table className="w-full">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-800 dark:bg-slate-900 text-white">
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Grupp</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider w-16">Antal</th>
              <th className="text-right px-4 py-3 text-[11px] font-semibold uppercase tracking-wider w-24">Ökning</th>
              <th className="text-right px-4 py-3 text-[11px] font-semibold uppercase tracking-wider w-24">Minskning</th>
              <th className="text-right px-4 py-3 text-[11px] font-semibold uppercase tracking-wider w-24">Netto</th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider w-36">Andel</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map(group => (
              <GroupRow key={group.motkonto} group={group} expanded={!!expanded[group.motkonto]} onToggle={() => toggleGroup(group.motkonto)} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const GroupRow = ({ group, expanded, onToggle }: { group: GroupedData; expanded: boolean; onToggle: () => void }) => (
  <>
    <tr
      onClick={onToggle}
      className="bg-white dark:bg-slate-800/60 hover:bg-[#EFF6FF] dark:hover:bg-blue-900/10 cursor-pointer border-b border-slate-200 dark:border-slate-700 transition-colors"
    >
      <td className="px-4 py-3">
        <span className="flex items-center gap-2">
          <span className="text-slate-400 text-xs">{expanded ? '▼' : '▶'}</span>
          <span className="font-mono text-sm bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{group.motkonto}</span>
          {group.motkontoName && <span className="text-sm text-slate-600 dark:text-slate-400 truncate">{group.motkontoName}</span>}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{group.count}</td>
      <td className="px-4 py-3 text-sm font-semibold text-right text-[#085041] tabular-nums">{formatSEK(group.totalIncrease)}</td>
      <td className="px-4 py-3 text-sm font-semibold text-right text-[#7A1A1A] tabular-nums">{formatSEK(group.totalDecrease)}</td>
      <td className={`px-4 py-3 text-sm font-bold text-right tabular-nums ${group.netEffect >= 0 ? 'text-[#085041]' : 'text-[#7A1A1A]'}`}>
        {group.netEffect >= 0 ? '+' : ''}{formatSEK(group.netEffect)}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
            <div className="bg-[#3b82f6] h-1.5 rounded-full transition-all" style={{ width: `${Math.min(group.pct, 100)}%` }} />
          </div>
          <span className="text-xs text-slate-500 w-10 text-right tabular-nums">{group.pct.toFixed(1)}%</span>
        </div>
      </td>
    </tr>
    {expanded && group.transactions.map((t, i) => (
      <tr key={i} className="bg-slate-50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-700/50 text-sm">
        <td className="pl-12 py-2 text-slate-600 dark:text-slate-400">{t.date} — {t.description}</td>
        <td />
        <td className="text-right px-4 text-[#085041] tabular-nums">{t.debit > 0 ? formatSEK(t.debit) : ''}</td>
        <td className="text-right px-4 text-[#7A1A1A] tabular-nums">{t.credit > 0 ? formatSEK(t.credit) : ''}</td>
        <td className="text-right px-4 text-slate-700 dark:text-slate-300 tabular-nums">{formatSEK(t.debit - t.credit)}</td>
        <td />
      </tr>
    ))}
  </>
);
