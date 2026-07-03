import { useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { TrendingUp, Wallet, FileText, Receipt } from 'lucide-react';
import { MetricCard } from '@/components/shared/MetricCard';
import { useSecuritiesAccounts, useSecuritiesHoldings, type AccountType } from '@/hooks/useSecurities';
import { AccountCard } from '@/components/securities/AccountCard';
import { AddAccountDialog } from '@/components/securities/AddAccountDialog';
import { AddTransactionDialog } from '@/components/securities/AddTransactionDialog';
import { ImportFromBrokerDialog } from '@/components/securities/ImportFromBrokerDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

export default function SecuritiesPage() {
  const navigate = useNavigate();
  const { data: accounts = [], isLoading } = useSecuritiesAccounts();
  const { data: allHoldings = [] } = useSecuritiesHoldings();

  const totalValue = allHoldings.reduce((s, h) => s + Number(h.current_value ?? 0), 0);
  const totalCost = allHoldings.reduce((s, h) => s + Number(h.avg_cost ?? 0) * Number(h.quantity ?? 0), 0);
  const totalReturn = totalValue - totalCost;
  const accountsByType = accounts.reduce<Record<string, number>>((acc, a) => {
    acc[a.account_type] = (acc[a.account_type] ?? 0) + 1;
    return acc;
  }, {});

  const valueByAccount = (accountId: string) =>
    allHoldings.filter(h => h.securities_account_id === accountId)
      .reduce((s, h) => s + Number(h.current_value ?? 0), 0);

  return (
    <PageLayout title="Värdepapper">
      <PageHeader
        title="Värdepapper"
        subtitle="ISK, KF, AF & Depå i AB — komplett skattehantering"
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => navigate('/securities/import')}>Importera</Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/securities/transactions')}>Granskningskö</Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/securities/statements')}>Källdokument</Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/securities/unlisted')}>Onoterade</Button>
            <AddTransactionDialog />
            <AddAccountDialog />
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <MetricCard
          label="Totalt värde"
          value={new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(totalValue)}
          icon={Wallet}
          solidClass="bg-[#0F1F3D]"
          subLabel={`${accounts.length} depåer`}
        />
        <MetricCard
          label="Avkastning totalt"
          value={new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(totalReturn)}
          icon={TrendingUp}
          solidClass={totalReturn >= 0 ? 'bg-[#1D9E75]' : 'bg-[#C73838]'}
          subLabel={totalCost > 0 ? `${((totalReturn / totalCost) * 100).toFixed(1)}%` : '—'}
        />
        <MetricCard
          label="ISK / KF"
          value={`${(accountsByType['isk'] ?? 0) + (accountsByType['kf'] ?? 0)}`}
          icon={Receipt}
          solidClass="bg-[#1E3A5F]"
          subLabel={`${accountsByType['isk'] ?? 0} ISK · ${accountsByType['kf'] ?? 0} KF`}
        />
        <MetricCard
          label="AF / Depå AB"
          value={`${(accountsByType['af'] ?? 0) + (accountsByType['depot_ab'] ?? 0)}`}
          icon={FileText}
          solidClass="bg-[#1E3A5F]"
          subLabel={`${accountsByType['af'] ?? 0} AF · ${accountsByType['depot_ab'] ?? 0} Depå AB`}
        />
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Dina depåer</h2>
        <Button variant="ghost" size="sm" onClick={() => navigate('/securities/tax')}>
          Skattevy →
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : accounts.length === 0 ? (
        <Card className="p-12 text-center">
          <Wallet className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="font-semibold mb-1">Inga depåer registrerade</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Lägg till din första värdepappersdepå (ISK, KF, AF eller Depå i AB).
          </p>
          <AddAccountDialog />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map(account => (
            <AccountCard
              key={account.id}
              account={account}
              totalValue={valueByAccount(account.id)}
              ytdReturn={0}
              onClick={() => navigate(`/securities/accounts/${account.id}`)}
            />
          ))}
        </div>
      )}
    </PageLayout>
  );
}
