import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatSEK } from '@/lib/formatNumber';
import type { SecuritiesHolding } from '@/hooks/useSecurities';
import { cn } from '@/lib/utils';

interface Props {
  holdings: SecuritiesHolding[];
}

export function HoldingsTable({ holdings }: Props) {
  if (!holdings.length) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground border rounded-lg">
        Inga innehav ännu. Importera årsbesked eller lägg till köp manuellt.
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Värdepapper</TableHead>
            <TableHead>ISIN</TableHead>
            <TableHead className="text-right">Antal</TableHead>
            <TableHead className="text-right">GAV</TableHead>
            <TableHead className="text-right">Kurs</TableHead>
            <TableHead className="text-right">Värde</TableHead>
            <TableHead className="text-right">Utveckling</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {holdings.map(h => {
            const cost = Number(h.avg_cost ?? 0) * Number(h.quantity ?? 0);
            const value = Number(h.current_value ?? 0);
            const diff = value - cost;
            const pct = cost > 0 ? (diff / cost) * 100 : 0;
            const positive = diff >= 0;
            return (
              <TableRow key={h.id}>
                <TableCell>
                  <div className="font-medium">{h.name}</div>
                  {h.ticker && <div className="text-xs text-muted-foreground">{h.ticker}</div>}
                </TableCell>
                <TableCell className="font-mono text-xs">{h.isin ?? '—'}</TableCell>
                <TableCell className="text-right tabular-nums">{Number(h.quantity).toLocaleString('sv-SE')}</TableCell>
                <TableCell className="text-right tabular-nums">{formatSEK(h.avg_cost ?? 0)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatSEK(h.current_price ?? 0)}</TableCell>
                <TableCell className="text-right tabular-nums font-semibold">{formatSEK(value)}</TableCell>
                <TableCell className={cn('text-right tabular-nums text-sm font-medium', positive ? 'text-[#085041]' : 'text-[#7A1A1A]')}>
                  {positive ? '+' : ''}{formatSEK(diff)}<br/>
                  <span className="text-xs">({positive ? '+' : ''}{pct.toFixed(1)}%)</span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
