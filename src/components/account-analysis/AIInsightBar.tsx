import { useMemo } from 'react';
import type { AccountSummary, JournalDetail, AIInsight } from './types';
import { getAccountTypeLabels } from './accountTypeUtils';

interface AIInsightBarProps {
  account: AccountSummary | null;
  details: JournalDetail[];
}

export const AIInsightBar = ({ account, details }: AIInsightBarProps) => {
  const insights = useMemo<AIInsight[]>(() => {
    if (!account) return [];
    const result: AIInsight[] = [];
    const realDetails = details.filter(d => !d.isVirtualRow);
    const labels = getAccountTypeLabels(account.accountType);

    // Net change insight
    if (Math.abs(account.pctChange) > 10) {
      const dir = account.pctChange > 0 ? 'ökade' : 'minskade';
      result.push({
        type: Math.abs(account.pctChange) > 50 ? 'warning' : 'info',
        text: `${account.accountName} ${dir} ${Math.abs(account.pctChange).toFixed(1)}% under perioden (${account.netChange >= 0 ? '+' : ''}${account.netChange.toLocaleString('sv-SE')} kr)`,
      });
    }

    // Largest transaction
    if (account.largestTransaction > 0) {
      const largest = realDetails.reduce((max, d) => {
        const amount = Math.max(d.debit, d.credit);
        return amount > Math.max(max.debit, max.credit) ? d : max;
      }, realDetails[0]);
      if (largest) {
        result.push({
          type: 'info',
          text: `Största transaktion: ${account.largestTransaction.toLocaleString('sv-SE')} kr (${largest.entry_date}, ${largest.description.substring(0, 40)})`,
        });
      }
    }

    // Concentration by counter account
    if (realDetails.length >= 5) {
      const counterTotals: Record<string, number> = {};
      for (const d of realDetails) {
        const key = d.counterAccounts.join(', ') || 'Övriga';
        counterTotals[key] = (counterTotals[key] || 0) + Math.max(d.debit, d.credit);
      }
      const totalAmount = Object.values(counterTotals).reduce((a, b) => a + b, 0);
      const sorted = Object.entries(counterTotals).sort((a, b) => b[1] - a[1]);
      if (sorted.length > 0 && totalAmount > 0) {
        const topPct = (sorted[0][1] / totalAmount) * 100;
        if (topPct > 40) {
          result.push({
            type: 'warning',
            text: `Koncentration: ${topPct.toFixed(0)}% av rörelsen via motkonto ${sorted[0][0]}`,
          });
        }
      }
    }

    // Duplicate detection
    const anomalies = realDetails.filter(d => d.anomalyType === 'duplicate');
    if (anomalies.length > 0) {
      result.push({
        type: 'alert',
        text: `${anomalies.length} möjliga dubblettposter identifierade — granska dessa`,
      });
    }

    // Account-type specific
    if (account.accountType === 'vat') {
      result.push({
        type: 'info',
        text: `Momsposition: ${account.closingBalance.toLocaleString('sv-SE')} kr vid periodens slut`,
      });
    }

    return result.slice(0, 4);
  }, [account, details]);

  if (!account) {
    return (
      <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-3">
        <p className="text-xs text-slate-400">Välj ett konto för AI-analys</p>
      </div>
    );
  }

  if (insights.length === 0) return null;

  return (
    <div className="bg-[#EFF6FF] dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800/40 rounded-xl px-5 py-3 flex items-start gap-3">
      <span className="text-indigo-500 mt-0.5 text-sm">✦</span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 mb-1">
          AI-analys — {account.accountNumber} {account.accountName}
        </p>
        <ul className="space-y-0.5">
          {insights.map((insight, i) => (
            <li key={i} className="text-xs text-indigo-800 dark:text-indigo-300 flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                insight.type === 'warning' ? 'bg-amber-500' :
                insight.type === 'alert' ? 'bg-rose-500' : 'bg-indigo-400'
              }`} />
              {insight.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
