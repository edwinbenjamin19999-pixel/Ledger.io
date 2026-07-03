/**
 * VAT Payment Dialog — register a payment to Skatteverket or a refund received.
 *   Payable paid:  Debit 2650 / Credit 1930
 *   Refund recv'd: Debit 1930 / Credit 1650
 */
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Wallet, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatSEK } from "@/lib/formatNumber";
import { buildPaymentEntry } from "@/lib/vat/buildSettlementEntry";
import { useVATSettlement } from "@/hooks/useVATSettlement";

interface VATPaymentDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  companyId: string;
  periodLabel: string;
  direction: "payable" | "receivable";
  defaultAmount: number;
  vatDeclarationId?: string | null;
  vatSettlementId?: string | null;
  onSuccess?: () => void;
}

export function VATPaymentDialog({
  open, onOpenChange, companyId, periodLabel, direction, defaultAmount,
  vatDeclarationId, vatSettlementId, onSuccess,
}: VATPaymentDialogProps) {
  const { post, posting } = useVATSettlement();
  const [amount, setAmount] = useState<string>(String(Math.round(defaultAmount)));
  const [bankAccount, setBankAccount] = useState<string>("1930");
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const proposal = useMemo(() => {
    const n = parseFloat(amount) || 0;
    return buildPaymentEntry(direction, n, bankAccount);
  }, [amount, bankAccount, direction]);

  const handleApprove = async () => {
    const result = await post({
      companyId,
      proposal,
      entryDate: paymentDate,
      description: direction === "payable" ? `Momsbetalning ${periodLabel}` : `Momsåterbetalning ${periodLabel}`,
      periodLabel,
      vatDeclarationId,
      vatSettlementId,
      kind: "payment",
    });
    if (result) {
      onSuccess?.();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-[#C28A2B]" />
            {direction === "payable" ? "Registrera momsbetalning" : "Registrera momsåterbetalning"} — {periodLabel}
          </DialogTitle>
          <DialogDescription>
            {direction === "payable"
              ? "Bokför betalning till Skatteverket. Debit 2650 / Credit bank."
              : "Bokför mottagen återbetalning från Skatteverket. Debit bank / Credit 1650."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="payment-amount" className="text-xs">Belopp (kr)</Label>
              <Input id="payment-amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payment-bank" className="text-xs">Bankkonto</Label>
              <Input id="payment-bank" value={bankAccount} onChange={e => setBankAccount(e.target.value)} className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payment-date" className="text-xs">Datum</Label>
              <Input id="payment-date" type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
            </div>
          </div>

          <div className="rounded-[10px] border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-2 px-3 text-left">Konto</th>
                  <th className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-2 px-3 text-left">Namn</th>
                  <th className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-2 px-3 text-right">Debet</th>
                  <th className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-2 px-3 text-right">Kredit</th>
                </tr>
              </thead>
              <tbody>
                {proposal.lines.map((l, i) => (
                  <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-2 px-3 font-mono">{l.accountNumber}</td>
                    <td className="py-2 px-3 text-muted-foreground">{l.accountName}</td>
                    <td className="py-2 px-3 text-right font-mono">{l.debit > 0 ? formatSEK(l.debit) : ""}</td>
                    <td className="py-2 px-3 text-right font-mono">{l.credit > 0 ? formatSEK(l.credit) : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {proposal.isBalanced && proposal.netAmount > 0 && (
            <div className="flex items-center gap-2 text-xs text-[#085041] dark:text-[#1D9E75]">
              <CheckCircle2 className="w-3.5 h-3.5" /> Verifikat balanserat
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={posting}>Avbryt</Button>
          <Button
            onClick={handleApprove}
            disabled={posting || proposal.netAmount <= 0}
            className="bg-[#0F1F3D] hover:bg-[#0F1F3D]/90 text-white gap-2"
          >
            {posting && <Loader2 className="w-4 h-4 animate-spin" />}
            Godkänn & bokför
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
