import { useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { JournalDetail, AccountSummary } from './types';
import { formatSEK } from '@/lib/formatNumber';
import { getAccountTypeLabels } from './accountTypeUtils';

interface AnalysisViewProps {
  details: JournalDetail[];
  account: AccountSummary | null;
  accounts: { account_number: string; account_name: string }[];
}

export const AnalysisView = ({ details, account, accounts }: AnalysisViewProps) => {
  const realDetails = useMemo(() => details.filter(d => !d.isVirtualRow), [details]);

  const topDrivers = useMemo(() => {
    const map = new Map<string, { name: string; debit: number; credit: number }>();
    for (const d of realDetails) {
      const key = d.counterAccounts.join(', ') || 'Övriga';
      if (!map.has(key)) {
        const accName = accounts.find(a => a.account_number === d.counterAccounts[0])?.account_name || key;
        map.set(key, { name: `${key} ${accName}`, debit: 0, credit: 0 });
      }
      const entry = map.get(key)!;
      entry.debit += d.debit;
      entry.credit += d.credit;
    }
    return Array.from(map.values())
      .sort((a, b) => (b.debit + b.credit) - (a.debit + a.credit))
      .slice(0, 8);
  }, [realDetails, accounts]);

  const monthlyTrend = useMemo(() => {
    const map = new Map<string, { month: string; debit: number; credit: number; net: number }>();
    for (const d of realDetails) {
      const month = d.entry_date?.substring(0, 7) || 'Okänd';
      if (!map.has(month)) map.set(month, { month, debit: 0, credit: 0, net: 0 });
      const entry = map.get(month)!;
      entry.debit += d.debit;
      entry.credit += d.credit;
      entry.net += d.debit - d.credit;
    }
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [realDetails]);

  const anomalies = useMemo(() => realDetails.filter(d => d.anomalyType !== null), [realDetails]);

  if (!account) {
    return (
      <div className="flex-1 bg-white dark:bg-slate-800/60 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center py-16">
        <p className="text-sm text-slate-400">Välj ett konto för att se analysen</p>
      </div>
    );
  }

  const labels = getAccountTypeLabels(account.accountType);

  return (
    <div className="flex-1 overflow-auto space-y-4">
      {/* Monthly Trend */}
      <div className="bg-white dark:bg-slate-800/60 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Månadstrend</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatSEK(v)} labelStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="debit" stroke="#10b981" strokeWidth={2} name="Debet" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="credit" stroke="#f43f5e" strokeWidth={2} name="Kredit" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="net" stroke="#6366f1" strokeWidth={2} name="Netto" strokeDasharray="5 5" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Drivers */}
      <div className="bg-white dark:bg-slate-800/60 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Drivande motkonton</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topDrivers} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 10 }} stroke="#94a3b8" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 9 }} stroke="#94a3b8" />
              <Tooltip formatter={(v: number) => formatSEK(v)} />
              <Bar dataKey="debit" fill="#10b981" name="Debet" stackId="a" radius={[0, 0, 0, 0]} />
              <Bar dataKey="credit" fill="#f43f5e" name="Kredit" stackId="a" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Anomalies */}
      {anomalies.length > 0 && (
        <div className="bg-white dark:bg-slate-800/60 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
            Avvikelser ({anomalies.length})
          </h3>
          <div className="space-y-2">
            {anomalies.slice(0, 10).map(d => (
              <div key={d.id} className="flex items-start gap-3 p-3 bg-[#FAEEDA] dark:bg-amber-900/10 rounded-lg">
                <span className="text-sm">
                  {d.anomalyType === 'size' ? '🔴' : d.anomalyType === 'duplicate' ? '🔵' : d.anomalyType === 'missingDoc' ? '📎' : '🟡'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    {d.entry_date} — {d.description}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{d.anomalyReason}</p>
                </div>
                <span className="text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-300">
                  {formatSEK(Math.max(d.debit, d.credit))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="bg-white dark:bg-slate-800/60 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Sammanfattning</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Ingående</p>
            <p className="text-lg font-bold text-slate-800 dark:text-slate-200 tabular-nums">{formatSEK(account.openingBalance)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">{labels.increase}</p>
            <p className="text-lg font-bold text-[#085041] tabular-nums">{formatSEK(account.periodIncrease)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">{labels.decrease}</p>
            <p className="text-lg font-bold text-[#7A1A1A] tabular-nums">{formatSEK(account.periodDecrease)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Utgående</p>
            <p className="text-lg font-bold text-slate-800 dark:text-slate-200 tabular-nums">{formatSEK(account.closingBalance)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
