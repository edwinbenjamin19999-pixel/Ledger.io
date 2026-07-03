import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { ACCOUNT_TYPE_LABEL, BROKER_LABEL, useCreateSecuritiesAccount, type AccountType, type Broker } from '@/hooks/useSecurities';

export function AddAccountDialog() {
  const [open, setOpen] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>('isk');
  const [broker, setBroker] = useState<Broker>('avanza');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0');
  const create = useCreateSecuritiesAccount();

  const submit = async () => {
    if (!accountName.trim()) return;
    await create.mutateAsync({
      account_type: accountType,
      broker,
      account_name: accountName.trim(),
      account_number: accountNumber.trim() || null,
      opening_balance: parseFloat(openingBalance) || 0,
      opening_date: new Date().toISOString().split('T')[0],
    });
    setOpen(false);
    setAccountName(''); setAccountNumber(''); setOpeningBalance('0');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" /> Lägg till depå
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ny värdepappersdepå</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Kontotyp</Label>
            <Select value={accountType} onValueChange={(v) => setAccountType(v as AccountType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(ACCOUNT_TYPE_LABEL) as AccountType[]).map(k => (
                  <SelectItem key={k} value={k}>{ACCOUNT_TYPE_LABEL[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Mäklare</Label>
            <Select value={broker} onValueChange={(v) => setBroker(v as Broker)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(BROKER_LABEL) as Broker[]).map(k => (
                  <SelectItem key={k} value={k}>{BROKER_LABEL[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Namn på depå</Label>
            <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="t.ex. Företaget AB ISK" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Kontonr (valfritt)</Label>
              <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Ingående saldo (SEK)</Label>
              <Input type="number" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Avbryt</Button>
          <Button onClick={submit} disabled={create.isPending || !accountName.trim()}>
            {create.isPending ? 'Sparar…' : 'Skapa depå'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
