import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, FileText, Filter } from 'lucide-react';
import { useReviewQueue, useReviewQueueCounts, useUpdateReviewStatus, type ReviewStatus } from '@/hooks/useSecuritiesReview';
import { ClassificationBadge } from './ClassificationBadge';
import { Skeleton } from '@/components/ui/skeleton';

const fmt = (n: number | null | undefined) =>
  n == null ? '—' : new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(n);

export function TransactionReviewQueue() {
  const [filter, setFilter] = useState<ReviewStatus>('needs_review');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { data: rows = [], isLoading } = useReviewQueue(filter);
  const { data: counts } = useReviewQueueCounts();
  const update = useUpdateReviewStatus();

  const allSelected = rows.length > 0 && rows.every(r => selected.has(r.id));
  const highConfIds = useMemo(
    () => rows.filter(r => Number(r.classification_confidence ?? 0) >= 0.95).map(r => r.id),
    [rows],
  );

  function toggle(id: string) {
    setSelected(s => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map(r => r.id)));
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <Tabs value={filter} onValueChange={(v) => { setFilter(v as ReviewStatus); setSelected(new Set()); }}>
          <TabsList>
            <TabsTrigger value="needs_review">
              Behöver granskas {counts?.needs_review ? <Badge variant="secondary" className="ml-2">{counts.needs_review}</Badge> : null}
            </TabsTrigger>
            <TabsTrigger value="reviewed">
              Granskade {counts?.reviewed ? <Badge variant="secondary" className="ml-2">{counts.reviewed}</Badge> : null}
            </TabsTrigger>
            <TabsTrigger value="posted">
              Bokförda {counts?.posted ? <Badge variant="secondary" className="ml-2">{counts.posted}</Badge> : null}
            </TabsTrigger>
            <TabsTrigger value="draft">Utkast</TabsTrigger>
          </TabsList>
        </Tabs>
      </Card>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Button
            size="sm"
            variant="outline"
            disabled={selected.size === 0 || update.isPending}
            onClick={() => update.mutate({ ids: Array.from(selected), status: 'reviewed' })}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" /> Markera som granskade ({selected.size})
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={highConfIds.length === 0 || update.isPending}
            onClick={() => update.mutate({ ids: highConfIds, status: 'reviewed' })}
          >
            <Filter className="h-4 w-4 mr-1" /> Godkänn alla ≥95% ({highConfIds.length})
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
            Inga transaktioner i denna status.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="p-2 w-8">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                  </th>
                  <th className="p-2 text-left">Datum</th>
                  <th className="p-2 text-left">Typ</th>
                  <th className="p-2 text-left">Instrument</th>
                  <th className="p-2 text-right">Antal</th>
                  <th className="p-2 text-right">Belopp</th>
                  <th className="p-2 text-left">Klassificering</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-b hover:bg-muted/30">
                    <td className="p-2">
                      <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} />
                    </td>
                    <td className="p-2">{r.trade_date}</td>
                    <td className="p-2">
                      <Badge variant="outline">{r.transaction_type}</Badge>
                    </td>
                    <td className="p-2">
                      <div className="font-medium">{r.name ?? r.ticker ?? '—'}</div>
                      {r.isin && <div className="text-xs text-muted-foreground">{r.isin}</div>}
                    </td>
                    <td className="p-2 text-right tabular-nums">{r.quantity ?? '—'}</td>
                    <td className="p-2 text-right tabular-nums">{fmt(r.amount as number)}</td>
                    <td className="p-2">
                      <ClassificationBadge
                        confidence={r.classification_confidence as number | null}
                        flags={r.ambiguity_notes ? [r.ambiguity_notes] : []}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
