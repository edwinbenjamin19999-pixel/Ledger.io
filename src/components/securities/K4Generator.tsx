import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, FileText } from 'lucide-react';
import { calculateK4 } from '@/lib/securities/k4Calculator';
import { useSecuritiesTransactions } from '@/hooks/useSecurities';
import { formatSEK } from '@/lib/formatNumber';
import { cn } from '@/lib/utils';

interface Props {
  accountId?: string;
}

export function K4Generator({ accountId }: Props) {
  const currentYear = new Date().getFullYear() - 1;
  const [taxYear, setTaxYear] = useState(currentYear);
  const { data: txs = [] } = useSecuritiesTransactions(accountId);

  const result = useMemo(() => calculateK4(txs, taxYear), [txs, taxYear]);

  const exportCsv = () => {
    const rows = [
      ['ISIN', 'Värdepapper', 'Antal', 'Försäljning', 'Omkostnad', 'Vinst/förlust', 'Datum'],
      ...result.sales.map(s => [s.isin, s.name, s.quantity, s.proceeds, s.cost, s.gainLoss, s.saleDate]),
    ];
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `K4-${taxYear}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-[#FAEEDA] dark:bg-amber-950/40">
            <FileText className="h-5 w-5 text-[#7A5417] dark:text-amber-300" />
          </div>
          <div>
            <h3 className="font-semibold">K4-bilaga (AF)</h3>
            <p className="text-xs text-muted-foreground">FIFO-omkostnad, 70/100-regeln</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs">År</Label>
          <Input type="number" value={taxYear} onChange={e => setTaxYear(parseInt(e.target.value))} className="w-24" />
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!result.sales.length}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <SummaryStat label="Total vinst" value={result.totalGains} positive />
        <SummaryStat label="Total förlust" value={result.totalLosses} />
        <SummaryStat label="Netto" value={result.netResult} positive={result.netResult >= 0} />
        <SummaryStat label="Beskattas" value={result.taxableAmount} positive={result.taxableAmount >= 0} />
      </div>

      {result.sales.length > 0 ? (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Värdepapper</TableHead>
                <TableHead>ISIN</TableHead>
                <TableHead className="text-right">Antal</TableHead>
                <TableHead className="text-right">Försäljning</TableHead>
                <TableHead className="text-right">Omkostnad</TableHead>
                <TableHead className="text-right">Vinst/förlust</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.sales.map((s, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="font-mono text-xs">{s.isin}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.quantity.toLocaleString('sv-SE')}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatSEK(s.proceeds)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatSEK(s.cost)}</TableCell>
                  <TableCell className={cn('text-right tabular-nums font-semibold', s.gainLoss >= 0 ? 'text-[#085041]' : 'text-[#7A1A1A]')}>
                    {s.gainLoss >= 0 ? '+' : ''}{formatSEK(s.gainLoss)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="p-6 text-center text-sm text-muted-foreground border rounded-lg">
          Inga försäljningar registrerade för {taxYear}.
        </div>
      )}
    </Card>
  );
}

function SummaryStat({ label, value, positive }: { label: string; value: number; positive?: boolean }) {
  return (
    <div className="rounded-lg border p-3 bg-muted/20">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn('text-lg font-bold tabular-nums mt-1',
        positive === true ? 'text-[#085041]' : positive === false ? 'text-[#7A1A1A]' : '')}>
        {value >= 0 ? '+' : ''}{formatSEK(value)}
      </div>
    </div>
  );
}
