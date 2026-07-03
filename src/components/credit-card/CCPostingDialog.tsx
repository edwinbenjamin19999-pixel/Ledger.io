import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import type { CCTransaction } from "./CCTransactionRow";

interface CCPostingDialogProps {
  open: boolean;
  onClose: () => void;
  transactions: CCTransaction[];
  onConfirm: () => void;
  posting: boolean;
}

export function CCPostingDialog({ open, onClose, transactions, onConfirm, posting }: CCPostingDialogProps) {
  const totalAmount = transactions.reduce((s, t) => s + t.amount, 0);
  const liabilityAccount = "2890";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bokför {transactions.length} transaktioner</DialogTitle>
          <DialogDescription>
            Följande transaktioner bokförs per inköpsdatum mot kreditkortsskuld ({liabilityAccount}).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-60 overflow-y-auto">
          {transactions.map(txn => (
            <div key={txn.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-xs text-muted-foreground">{txn.ai_suggestion?.debit_account || "?"}</span>
                <span className="truncate">{txn.merchant_name}</span>
              </div>
              <span className="font-semibold tabular-nums shrink-0">{txn.amount.toLocaleString("sv-SE")} kr</span>
            </div>
          ))}
        </div>

        <div className="rounded-xl border p-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bokföringsmodell</p>
          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="font-medium">Debet: Kostnadskonton + 2640</p>
              <p className="text-xs text-muted-foreground">Kostnad + ingående moms</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="text-right">
              <p className="font-medium">Kredit: {liabilityAccount}</p>
              <p className="text-xs text-muted-foreground">Kreditkortsskuld</p>
            </div>
          </div>
          <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
            <span>Totalt</span>
            <span>{totalAmount.toLocaleString("sv-SE")} kr</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Avbryt</Button>
          <Button onClick={onConfirm} disabled={posting}>
            {posting ? "Bokför..." : `Bokför ${transactions.length} transaktioner`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
