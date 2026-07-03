import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BookOpen, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatSEK } from '@/lib/formatNumber';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  planSecuritiesBooking,
  bookSecuritiesTransaction,
  type SecurityTxInput,
  type SecAccountType,
  type SecTxType,
} from '@/lib/securities/bookkeeping';

interface Props {
  companyId: string;
  account: { id: string; account_name: string; account_type: SecAccountType };
  tx: {
    id: string;
    trade_date: string;
    transaction_type: string;
    isin: string | null;
    name: string | null;
    quantity: number | null;
    price: number | null;
    amount: number;
    fee: number | null;
    journal_entry_id?: string | null;
  };
  isUnlisted?: boolean;
  costBasis?: number;
  classification?: SecurityTxInput['classification'];
}

export function BookTransactionDialog({ companyId, account, tx, isUnlisted, costBasis, classification }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const plan = useMemo(() => planSecuritiesBooking({
    companyId,
    userId: userId ?? '',
    accountType: account.account_type,
    accountName: account.account_name,
    txType: tx.transaction_type as SecTxType,
    tradeDate: tx.trade_date,
    isin: tx.isin,
    name: tx.name,
    quantity: Number(tx.quantity ?? 0),
    price: Number(tx.price ?? 0),
    amount: Math.abs(Number(tx.amount ?? 0)),
    fee: Number(tx.fee ?? 0),
    isUnlisted,
    costBasis,
    classification,
    securitiesTransactionId: tx.id,
  }), [companyId, userId, account, tx, isUnlisted, costBasis, classification]);

  const alreadyBooked = !!tx.journal_entry_id;
  const totDebit = plan?.lines.reduce((s, l) => s + l.debit, 0) ?? 0;
  const totCredit = plan?.lines.reduce((s, l) => s + l.credit, 0) ?? 0;

  const handleBook = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const id = await bookSecuritiesTransaction({
        companyId,
        userId,
        accountType: account.account_type,
        accountName: account.account_name,
        txType: tx.transaction_type as SecTxType,
        tradeDate: tx.trade_date,
        isin: tx.isin,
        name: tx.name,
        quantity: Number(tx.quantity ?? 0),
        price: Number(tx.price ?? 0),
        amount: Math.abs(Number(tx.amount ?? 0)),
        fee: Number(tx.fee ?? 0),
        isUnlisted,
        costBasis,
        classification,
        securitiesTransactionId: tx.id,
      });
      if (id) {
        toast.success('Verifikat skapat');
        setOpen(false);
      } else {
        toast.info('Denna transaktion ska inte bokföras (privat ISK/AF).');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Okänt fel';
      toast.error(`Kunde inte bokföra: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={alreadyBooked ? 'ghost' : 'outline'}>
          {alreadyBooked ? (
            <><CheckCircle2 className="h-3 w-3 mr-1 text-success" /> Bokförd</>
          ) : (
            <><BookOpen className="h-3 w-3 mr-1" /> Bokför</>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bokföringsförslag</DialogTitle>
        </DialogHeader>

        {!plan ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Denna transaktion bokförs inte i bolagets bokföring (privat ISK/AF eller okänd typ).
              Skattekonsekvenser hanteras separat (K4 / schablonskatt).
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Beskrivning</div>
              <div className="font-medium">{plan.description}</div>
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Konto</TableHead>
                    <TableHead>Beskrivning</TableHead>
                    <TableHead className="text-right">Debet</TableHead>
                    <TableHead className="text-right">Kredit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plan.lines.map((l, i) => (
                    <TableRow key={i}>
                      <TableCell><Badge variant="outline">{l.accountNumber}</Badge></TableCell>
                      <TableCell className="text-sm">{l.description}</TableCell>
                      <TableCell className="text-right tabular-nums">{l.debit > 0 ? formatSEK(l.debit) : '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{l.credit > 0 ? formatSEK(l.credit) : '—'}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-medium border-t-2">
                    <TableCell colSpan={2}>Summa</TableCell>
                    <TableCell className="text-right tabular-nums">{formatSEK(totDebit)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatSEK(totCredit)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {plan.warning && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{plan.warning}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Stäng</Button>
          {plan && !alreadyBooked && (
            <Button onClick={handleBook} disabled={saving || !userId}>
              {saving ? 'Bokför…' : 'Skapa verifikat'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
