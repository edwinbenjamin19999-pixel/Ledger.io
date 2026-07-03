import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useCreateSecuritiesTransaction, useSecuritiesAccounts } from '@/hooks/useSecurities';

const TX_TYPES = [
  { v: 'buy', l: 'Köp' },
  { v: 'sell', l: 'Sälj' },
  { v: 'dividend', l: 'Utdelning' },
  { v: 'fee', l: 'Avgift' },
  { v: 'deposit', l: 'Insättning' },
  { v: 'withdrawal', l: 'Uttag' },
];

export function AddTransactionDialog({ defaultAccountId }: { defaultAccountId?: string }) {
  const [open, setOpen] = useState(false);
  const { data: accounts = [] } = useSecuritiesAccounts();
  const create = useCreateSecuritiesTransaction();
  const [accountId, setAccountId] = useState(defaultAccountId ?? '');
  const [type, setType] = useState('buy');
  const [tradeDate, setTradeDate] = useState(new Date().toISOString().split('T')[0]);
  const [isin, setIsin] = useState('');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [fee, setFee] = useState('0');

  const submit = async () => {
    const q = parseFloat(quantity) || 0;
    const p = parseFloat(price) || 0;
    const f = parseFloat(fee) || 0;
    const amount = type === 'buy' ? -(q * p + f) : type === 'sell' ? (q * p - f) : (q * p);
    await create.mutateAsync({
      securities_account_id: accountId,
      trade_date: tradeDate,
      transaction_type: type,
      isin: isin.trim() || null,
      name: name.trim() || null,
      quantity: q,
      price: p,
      amount,
      fee: f,
      currency: 'SEK',
      source: 'manual',
    });
    setOpen(false);
    setIsin(''); setName(''); setQuantity(''); setPrice(''); setFee('0');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="h-4 w-4 mr-2" /> Ny transaktion
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrera transaktion</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Depå</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger><SelectValue placeholder="Välj depå" /></SelectTrigger>
                <SelectContent>
                  {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.account_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Typ</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TX_TYPES.map(t => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Datum</Label>
            <Input type="date" value={tradeDate} onChange={e => setTradeDate(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>ISIN</Label>
              <Input value={isin} onChange={e => setIsin(e.target.value)} placeholder="SE0000148884" />
            </div>
            <div className="space-y-2">
              <Label>Namn</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Investor B" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Antal</Label>
              <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Pris (SEK)</Label>
              <Input type="number" value={price} onChange={e => setPrice(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Avgift</Label>
              <Input type="number" value={fee} onChange={e => setFee(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Avbryt</Button>
          <Button onClick={submit} disabled={!accountId || create.isPending}>
            {create.isPending ? 'Sparar…' : 'Spara'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
