import { TrendingUp, TrendingDown, Activity, Hash, ArrowUpRight, Wallet, BarChart3, ArrowDownRight } from 'lucide-react';
import { MiniSparkline } from './MiniSparkline';
import type { AccountSummary } from './types';
import { formatSEK } from '@/lib/formatNumber';
import { getAccountTypeLabels } from './accountTypeUtils';

interface KPISummaryBarProps {
  account: AccountSummary | null;
  allSummaries: AccountSummary[];
}

type ValueTone = 'neutral' | 'positive' | 'negative';

export const KPISummaryBar = ({ account, allSummaries }: KPISummaryBarProps) => {
  const labels = account
    ? getAccountTypeLabels(account.accountType)
    : { increase: 'Periodökning', decrease: 'Periodminskning', balance: 'Saldo', typeName: 'Alla konton' };

  const agg = account || {
    openingBalance: allSummaries.reduce((s, a) => s + a.openingBalance, 0),
    closingBalance: allSummaries.reduce((s, a) => s + a.closingBalance, 0),
    periodIncrease: allSummaries.reduce((s, a) => s + a.periodIncrease, 0),
    periodDecrease: allSummaries.reduce((s, a) => s + a.periodDecrease, 0),
    netChange: allSummaries.reduce((s, a) => s + a.netChange, 0),
    transactionCount: allSummaries.reduce((s, a) => s + a.transactionCount, 0),
    largestTransaction: Math.max(0, ...allSummaries.map((a) => a.largestTransaction)),
    pctChange: 0,
    monthlyTrend: new Array(12).fill(0).map((_, m) => allSummaries.reduce((s, a) => s + (a.monthlyTrend[m] || 0), 0)),
    prevPeriodComparison: undefined as any,
  };

  const chips: Array<{ label: string; value: string; icon: typeof Wallet; tone: ValueTone }> = [
    { label: 'Ingående saldo', value: formatSEK(agg.openingBalance), icon: Wallet, tone: 'neutral' },
    { label: labels.increase, value: formatSEK(agg.periodIncrease), icon: TrendingUp, tone: 'positive' },
    { label: labels.decrease, value: formatSEK(agg.periodDecrease), icon: TrendingDown, tone: 'negative' },
    {
      label: 'Nettoförändring',
      value: formatSEK(agg.netChange),
      icon: Activity,
      tone: agg.netChange === 0 ? 'neutral' : agg.netChange > 0 ? 'positive' : 'negative',
    },
    { label: 'Utgående saldo', value: formatSEK(agg.closingBalance), icon: BarChart3, tone: 'neutral' },
    { label: 'Antal transaktioner', value: String(agg.transactionCount), icon: Hash, tone: 'neutral' },
    { label: 'Största transaktion', value: formatSEK(agg.largestTransaction), icon: ArrowUpRight, tone: 'neutral' },
    {
      label: 'Förändring',
      value: `${agg.pctChange >= 0 ? '+' : ''}${agg.pctChange.toFixed(1)}%`,
      icon: agg.pctChange >= 0 ? ArrowUpRight : ArrowDownRight,
      tone: agg.pctChange === 0 ? 'neutral' : agg.pctChange > 0 ? 'positive' : 'negative',
    },
  ];

  const valueColor = (tone: ValueTone) =>
    tone === 'positive' ? '#10B981' : tone === 'negative' ? '#EF4444' : '#0F1B2D';

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
      {chips.map((chip) => {
        const Icon = chip.icon;
        return (
          <div
            key={chip.label}
            className="bg-[#F1F5F9] dark:bg-white/[0.06] rounded-lg overflow-hidden"
            style={{
              border: '1px solid rgba(0,0,0,0.09)',
              padding: '10px 16px',
            }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className="w-3 h-3 text-black/35 dark:text-white/40" strokeWidth={1.75} />
              <p
                className="uppercase font-medium truncate text-black/45 dark:text-white/40"
                style={{ fontSize: 11, letterSpacing: '0.04em' }}
              >
                {chip.label}
              </p>
            </div>
            <p
              className="font-semibold tabular-nums truncate"
              style={{ fontSize: 14, color: valueColor(chip.tone) }}
              title={chip.value}
            >
              {chip.value}
            </p>
            <div className="mt-1.5">
              <MiniSparkline data={agg.monthlyTrend} width={60} height={16} color="rgba(11,31,47,0.25)" />
            </div>
          </div>
        );
      })}
    </div>
  );
};
