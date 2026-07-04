import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, Building2, Shield, Briefcase, ChevronRight } from 'lucide-react';
import { formatSEK } from '@/lib/formatNumber';
import { ACCOUNT_TYPE_SHORT, BROKER_LABEL, type SecuritiesAccount, type AccountType } from '@/hooks/useSecurities';
import { cn } from '@/lib/utils';

const ACCOUNT_ICON: Record<AccountType, typeof TrendingUp> = {
  isk: TrendingUp,
  kf: Shield,
  af: Briefcase,
  depot_ab: Building2,
};

const ACCOUNT_COLOR: Record<AccountType, string> = {
  isk: 'bg-[#EFF6FF] text-[#3b82f6] border-[#C8DDF5] dark:bg-blue-950/40 dark:text-[#3b82f6] dark:border-[#3b82f6]',
  kf: 'bg-[#F1F5F9] text-violet-700 border-[#E2E8F0] dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800',
  af: 'bg-[#FAEEDA] text-[#7A5417] border-[#F0DDB7] dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  depot_ab: 'bg-[#E1F5EE] text-[#085041] border-[#BFE6D6] dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
};

const TAX_HINT: Record<AccountType, string> = {
  isk: 'Schablonskatt 30 nov',
  kf: 'Skatt via försäkringsbolag',
  af: 'K4 vid sälj — 30%',
  depot_ab: 'Näringsbetingad / kapitalplacering',
};

interface Props {
  account: SecuritiesAccount;
  totalValue?: number;
  ytdReturn?: number;
  onClick?: () => void;
}

export function AccountCard({ account, totalValue = 0, ytdReturn = 0, onClick }: Props) {
  const type = account.account_type as AccountType;
  const Icon = ACCOUNT_ICON[type];
  const positive = ytdReturn >= 0;

  return (
    <Card
      className="p-5 hover:shadow-md transition-all cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn('p-2 rounded-lg border', ACCOUNT_COLOR[type])}>
          <Icon className="h-5 w-5" />
        </div>
        <Badge variant="outline" className={cn('text-[10px] font-semibold', ACCOUNT_COLOR[type])}>
          {ACCOUNT_TYPE_SHORT[type]}
        </Badge>
      </div>

      <div className="space-y-1 mb-4">
        <h3 className="font-semibold text-sm leading-tight truncate">{account.account_name}</h3>
        <p className="text-xs text-muted-foreground">
          {BROKER_LABEL[account.broker as keyof typeof BROKER_LABEL]}
          {account.account_number && ` · ${account.account_number}`}
        </p>
      </div>

      <div className="space-y-2">
        <div>
          <div className="text-xs text-muted-foreground">Värde</div>
          <div className="text-xl font-bold tabular-nums">{formatSEK(totalValue)}</div>
        </div>
        <div className="flex items-center justify-between">
          <span className={cn('text-xs font-medium tabular-nums', positive ? 'text-[#085041]' : 'text-[#7A1A1A]')}>
            {positive ? '↑' : '↓'} {formatSEK(Math.abs(ytdReturn))} YTD
          </span>
          <Button variant="ghost" size="sm" className="h-7 px-2 opacity-0 group-hover:opacity-100 transition">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t text-[11px] text-muted-foreground">
        {TAX_HINT[type]}
      </div>
    </Card>
  );
}
