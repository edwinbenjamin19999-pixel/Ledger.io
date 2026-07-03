import { useParams, useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useSecuritiesAccounts, useSecuritiesHoldings, useSecuritiesTransactions, ACCOUNT_TYPE_LABEL, type AccountType } from '@/hooks/useSecurities';
import { HoldingsTable } from '@/components/securities/HoldingsTable';
import { K4Generator } from '@/components/securities/K4Generator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatSEK } from '@/lib/formatNumber';
import { Badge } from '@/components/ui/badge';
import { AddTransactionDialog } from '@/components/securities/AddTransactionDialog';
import { BookTransactionDialog } from '@/components/securities/BookTransactionDialog';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function SecuritiesAccountDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: accounts = [] } = useSecuritiesAccounts();
  const account = accounts.find(a => a.id === id);
  const { data: holdings = [] } = useSecuritiesHoldings(id);
  const { data: txs = [] } = useSecuritiesTransactions(id);
  const [companyId, setCompanyId] = useState<string | null>(null);
  useEffect(() => setCompanyId(localStorage.getItem('selectedCompanyId')), []);

  if (!account) {
    return (
      <PageLayout title="Värdepapper">
        <Button variant="ghost" onClick={() => navigate('/securities')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Tillbaka
        </Button>
        <p className="text-muted-foreground">Depå hittades inte.</p>
      </PageLayout>
    );
  }

  const isAF = account.account_type === 'af';

  return (
    <PageLayout title="Värdepapper">
      <Button variant="ghost" onClick={() => navigate('/securities')} className="mb-3">
        <ArrowLeft className="h-4 w-4 mr-2" /> Värdepapper
      </Button>
      <PageHeader
        title={account.account_name}
        subtitle={ACCOUNT_TYPE_LABEL[account.account_type as AccountType]}
        actions={<AddTransactionDialog defaultAccountId={account.id} />}
      />

      <Tabs defaultValue="holdings">
        <TabsList>
          <TabsTrigger value="holdings">Innehav ({holdings.length})</TabsTrigger>
          <TabsTrigger value="transactions">Transaktioner ({txs.length})</TabsTrigger>
          {isAF && <TabsTrigger value="k4">K4-bilaga</TabsTrigger>}
        </TabsList>

        <TabsContent value="holdings" className="mt-4">
          <HoldingsTable holdings={holdings} />
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Värdepapper</TableHead>
                  <TableHead className="text-right">Antal</TableHead>
                  <TableHead className="text-right">Pris</TableHead>
                  <TableHead className="text-right">Belopp</TableHead>
                  <TableHead className="text-right">Bokföring</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txs.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="text-sm">{t.trade_date}</TableCell>
                    <TableCell><Badge variant="outline">{t.transaction_type}</Badge></TableCell>
                    <TableCell>{t.name ?? t.isin ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(t.quantity ?? 0).toLocaleString('sv-SE')}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatSEK(t.price ?? 0)}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{formatSEK(t.amount)}</TableCell>
                    <TableCell className="text-right">
                      {companyId && (
                        <BookTransactionDialog
                          companyId={companyId}
                          account={{ id: account.id, account_name: account.account_name, account_type: account.account_type as AccountType }}
                          tx={t}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {txs.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Inga transaktioner</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {isAF && (
          <TabsContent value="k4" className="mt-4">
            <K4Generator accountId={account.id} />
          </TabsContent>
        )}
      </Tabs>
    </PageLayout>
  );
}
