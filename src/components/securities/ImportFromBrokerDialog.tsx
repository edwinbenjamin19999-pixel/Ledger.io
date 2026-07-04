import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExternalLink, Upload, FileText, Download, ArrowRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { parseBrokerFile, type ParsedTx } from '@/lib/securities/brokerImport';
import { useSecuritiesAccounts, useCreateSecuritiesTransaction } from '@/hooks/useSecurities';
import { formatSEK } from '@/lib/formatNumber';

const BROKERS = [
  {
    id: 'nordnet',
    name: 'Nordnet',
    color: 'bg-blue-600',
    loginUrl: 'https://www.nordnet.se/se/inloggning',
    exportUrl: 'https://www.nordnet.se/se/min-depa/transaktioner',
    steps: [
      'Logga in på Nordnet med BankID',
      'Gå till Min Depå → Transaktioner',
      'Välj period (helst hela året)',
      'Klicka "Exportera" → välj CSV (semikolon)',
      'Dra filen hit nedan',
    ],
  },
  {
    id: 'avanza',
    name: 'Avanza',
    color: 'bg-emerald-600',
    loginUrl: 'https://www.avanza.se/min-ekonomi/transaktioner.html',
    exportUrl: 'https://www.avanza.se/min-ekonomi/transaktioner.html',
    steps: [
      'Logga in på Avanza med BankID',
      'Gå till Min ekonomi → Transaktioner',
      'Välj depå och period',
      'Klicka "Exportera till Excel/CSV"',
      'Dra filen hit nedan',
    ],
  },
  {
    id: 'seb',
    name: 'SEB',
    color: 'bg-emerald-700',
    loginUrl: 'https://privat.seb.se',
    exportUrl: 'https://privat.seb.se/cgi-bin/pts3/mpo/mpo7000c.aspx',
    steps: [
      'Logga in på SEB med BankID',
      'Gå till Sparande → Värdepapper → Årsbesked',
      'Ladda ner SRU-fil för Skatteverket',
      'Dra SRU-filen hit nedan',
    ],
  },
  {
    id: 'handelsbanken',
    name: 'Handelsbanken',
    color: 'bg-blue-800',
    loginUrl: 'https://www.handelsbanken.se',
    exportUrl: 'https://www.handelsbanken.se',
    steps: [
      'Logga in på Handelsbanken med BankID',
      'Gå till Sparande → Värdepapper → Skatteunderlag',
      'Ladda ner SRU- eller PDF-fil',
      'Dra filen hit nedan',
    ],
  },
  {
    id: 'swedbank',
    name: 'Swedbank',
    color: 'bg-orange-600',
    loginUrl: 'https://www.swedbank.se',
    exportUrl: 'https://www.swedbank.se',
    steps: [
      'Logga in på Swedbank med BankID',
      'Gå till Spara → Värdepapper → Deklarationsunderlag',
      'Ladda ner SRU-fil',
      'Dra SRU-filen hit nedan',
    ],
  },
];

export function ImportFromBrokerDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'select' | 'instructions' | 'upload' | 'preview'>('select');
  const [brokerId, setBrokerId] = useState<string>('');
  const [parsed, setParsed] = useState<ParsedTx[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [accountId, setAccountId] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const { data: accounts = [] } = useSecuritiesAccounts();
  const create = useCreateSecuritiesTransaction();

  const broker = BROKERS.find(b => b.id === brokerId);

  const reset = () => {
    setStep('select');
    setBrokerId('');
    setParsed([]);
    setWarnings([]);
    setAccountId('');
  };

  const handleFile = async (file: File) => {
    const text = await file.text();
    const result = parseBrokerFile(file.name, text);
    setParsed(result.rows);
    setWarnings(result.warnings);
    if (result.rows.length === 0) {
      toast.error('Inga transaktioner kunde läsas');
      return;
    }
    toast.success(`${result.rows.length} transaktioner från ${result.detectedBroker}`);
    setStep('preview');
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const importAll = async () => {
    if (!accountId) { toast.error('Välj depå'); return; }
    setImporting(true);
    try {
      let ok = 0;
      for (const r of parsed) {
        try {
          await create.mutateAsync({
            securities_account_id: accountId,
            trade_date: r.trade_date,
            transaction_type: r.transaction_type,
            isin: r.isin,
            ticker: r.ticker,
            name: r.name,
            quantity: r.quantity,
            price: r.price,
            amount: r.amount,
            fee: r.fee,
            currency: r.currency,
            fx_rate: r.fx_rate,
            source: r.source,
          });
          ok++;
        } catch (e) { void e; }
      }
      toast.success(`${ok} av ${parsed.length} transaktioner importerade`);
      reset();
      setOpen(false);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" /> Importera från bank
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Hämta värdepapper från din bank</DialogTitle>
        </DialogHeader>

        {step === 'select' && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Logga in hos din bank/broker med <strong>deras BankID</strong>, ladda ner transaktionsfilen,
              och dra in den här. Vi tar inte ut någon BankID-kostnad — du använder bankens egen inloggning.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {BROKERS.map(b => (
                <Card
                  key={b.id}
                  className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => { setBrokerId(b.id); setStep('instructions'); }}
                >
                  <div className={`${b.color} h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-sm mb-2`}>
                    {b.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="font-medium">{b.name}</div>
                  <div className="text-xs text-muted-foreground">CSV / SRU-import</div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {step === 'instructions' && broker && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`${broker.color} h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold`}>
                {broker.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="font-semibold text-lg">{broker.name}</div>
                <div className="text-xs text-muted-foreground">Logga in med BankID hos {broker.name}</div>
              </div>
            </div>

            <Alert>
              <AlertDescription>
                <strong>Så här gör du:</strong>
                <ol className="list-decimal pl-5 mt-2 space-y-1 text-sm">
                  {broker.steps.map((s, i) => <li key={i}>{s}</li>)}
                </ol>
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button asChild variant="default" className="flex-1">
                <a href={broker.loginUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Öppna {broker.name} (ny flik)
                </a>
              </Button>
              <Button variant="outline" onClick={() => setStep('upload')}>
                Jag har filen <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 'upload' && broker && (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Dra in din CSV/SRU-fil från {broker.name} eller klicka för att välja.
            </div>
            <label
              onDragOver={e => e.preventDefault()}
              onDrop={onDrop}
              className="block border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <div className="font-medium">Släpp filen här</div>
              <div className="text-xs text-muted-foreground mt-1">eller klicka för att välja (.csv, .sru, .txt)</div>
              <input type="file" accept=".csv,.sru,.txt" className="hidden" onChange={onChange} />
            </label>
            <Button variant="ghost" size="sm" onClick={() => setStep('instructions')}>
              ← Tillbaka till instruktioner
            </Button>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <div className="font-medium">{parsed.length} transaktioner redo att importera</div>
            </div>

            {warnings.length > 0 && (
              <Alert>
                <AlertDescription>
                  <ul className="list-disc pl-5 text-sm">
                    {warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div>
              <label className="text-sm font-medium mb-1 block">Importera till depå</label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger><SelectValue placeholder="Välj depå" /></SelectTrigger>
                <SelectContent>
                  {accounts.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.account_name} <Badge variant="outline" className="ml-2">{a.account_type.toUpperCase()}</Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border max-h-72 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Värdepapper</TableHead>
                    <TableHead className="text-right">Antal</TableHead>
                    <TableHead className="text-right">Belopp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsed.slice(0, 50).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">{r.trade_date}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{r.transaction_type}</Badge></TableCell>
                      <TableCell className="text-sm">{r.name ?? r.isin ?? '—'}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{r.quantity.toLocaleString('sv-SE')}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{formatSEK(r.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {parsed.length > 50 && (
                <div className="text-xs text-muted-foreground text-center py-2">… och {parsed.length - 50} till</div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => { setOpen(false); reset(); }}>Stäng</Button>
          {step === 'preview' && (
            <Button onClick={importAll} disabled={!accountId || importing}>
              {importing ? 'Importerar…' : `Importera ${parsed.length} transaktioner`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
