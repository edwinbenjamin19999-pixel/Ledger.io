import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import type { DuplicateCandidate, IncomingTx } from '@/lib/securities/duplicateDetector';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  incoming: IncomingTx | null;
  candidates: DuplicateCandidate[];
  onSkip: () => void;
  onImportAnyway: () => void;
}

export function DuplicateWarningDialog({ open, onOpenChange, incoming, candidates, onSkip, onImportAnyway }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" /> Möjliga dubbletter hittade
          </DialogTitle>
        </DialogHeader>

        {incoming && (
          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            <div className="font-medium mb-1">Ny transaktion</div>
            <div className="text-muted-foreground">
              {incoming.trade_date} · {incoming.name ?? incoming.isin ?? '—'} ·{' '}
              {incoming.quantity ?? '—'} st · {incoming.amount ?? '—'} kr
            </div>
          </div>
        )}

        <div className="space-y-2 max-h-72 overflow-auto">
          <div className="text-sm font-medium">Befintliga liknande transaktioner</div>
          {candidates.map(c => (
            <div key={c.existing.id} className="rounded-lg border p-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="font-medium">
                  {c.existing.trade_date} · {c.existing.name ?? c.existing.isin}
                </div>
                <div className="text-xs px-2 py-0.5 rounded bg-warning/15 text-warning-foreground">
                  {Math.round(c.score * 100)}% match
                </div>
              </div>
              <div className="text-muted-foreground text-xs mt-1">
                {c.existing.quantity ?? '—'} st · {c.existing.amount ?? '—'} kr
              </div>
              <div className="text-xs mt-1">{c.reasons.join(' · ')}</div>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onSkip}>Hoppa över</Button>
          <Button onClick={onImportAnyway}>Importera ändå</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
