import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Wallet, Building, PiggyBank, AlertCircle, Coins } from 'lucide-react';
import { formatSEK } from '@/lib/formatNumber';
import { cn } from '@/lib/utils';

interface KPI {
  key: string;
  label: string;
  value: number;
  trend?: number;
  status?: 'ok' | 'warning' | 'critical';
  icon: any;
  accent: string;
}

interface Props {
  revenue: number;
  ebit: number;
  totalAssets: number;
  groupEquity: number;
  cash: number;
  unresolvedICDiff: number;
}

export function GroupKPIPanel({ revenue, ebit, totalAssets, groupEquity, cash, unresolvedICDiff }: Props) {
  const kpis: KPI[] = [
    { key: 'rev', label: 'Konsoliderad omsättning', value: revenue, icon: TrendingUp, accent: 'from-[#3b82f6]/20 to-[#3b82f6]/5' },
    { key: 'ebit', label: 'EBIT', value: ebit, icon: ebit >= 0 ? TrendingUp : TrendingDown, accent: ebit >= 0 ? 'from-emerald-500/20 to-emerald-600/5' : 'from-red-500/20 to-red-600/5' },
    { key: 'assets', label: 'Totala tillgångar', value: totalAssets, icon: Building, accent: 'from-blue-500/20 to-blue-600/5' },
    { key: 'equity', label: 'Eget kapital koncern', value: groupEquity, icon: PiggyBank, accent: 'from-purple-500/20 to-purple-600/5' },
    { key: 'cash', label: 'Likviditet', value: cash, icon: Wallet, accent: 'from-teal-500/20 to-teal-600/5' },
    {
      key: 'ic',
      label: 'Olösta IC-differenser',
      value: unresolvedICDiff,
      icon: AlertCircle,
      status: unresolvedICDiff > 0 ? (unresolvedICDiff > 10000 ? 'critical' : 'warning') : 'ok',
      accent: unresolvedICDiff > 0 ? 'from-amber-500/20 to-amber-600/5' : 'from-emerald-500/20 to-emerald-600/5',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {kpis.map(k => {
        const Icon = k.icon;
        return (
          <Card
            key={k.key}
            className={cn(
              'relative overflow-hidden border bg-white p-4 hover:shadow-md transition-all',
              k.status === 'critical' && 'border-red-300',
              k.status === 'warning' && 'border-[#F0DDB7]',
            )}
          >
            <div className={cn('absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl bg-gradient-to-br', k.accent)} />
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{k.label}</span>
                <Icon className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="text-lg font-semibold tabular-nums text-slate-900">
                {formatSEK(k.value)}
              </div>
              {k.status && k.status !== 'ok' && (
                <div className={cn(
                  'text-[10px] mt-1 font-medium',
                  k.status === 'critical' ? 'text-[#7A1A1A]' : 'text-[#7A5417]',
                )}>
                  {k.status === 'critical' ? 'Kritiskt' : 'Granskning krävs'}
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
