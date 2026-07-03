/**
 * VAT Settlement Dialog — preview + approve clearing JE.
 * Builds the proposal from output/input balances using buildSettlementEntry().
 */
import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wallet, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatSEK } from "@/lib/formatNumber";
import { buildSettlementEntry, type AccountBalanceForSettlement } from "@/lib/vat/buildSettlementEntry";
import { useVATSettlement } from "@/hooks/useVATSettlement";

interface VATSettlementDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  companyId: string;
  periodLabel: string;
  periodEndDate: string;
  outputBalances: AccountBalanceForSettlement[];
  inputBalances: AccountBalanceForSettlement[];
  vatDeclarationId?: string | null;
  onSuccess?: (settlementId: string) => void;
}

export function VATSettlementDialog({
  open, onOpenChange, companyId, periodLabel, periodEndDate,
  outputBalances, inputBalances, vatDeclarationId, onSuccess,
}: VATSettlementDialogProps) {
  const { post, posting } = useVATSettlement();
  const proposal = useMemo(
    () => buildSettlementEntry(outputBalances, inputBalances),
    [outputBalances, inputBalances],
  );

  const handleApprove = async () => {
    const result = await post({
      companyId,
      proposal,
      entryDate: periodEndDate,
      description: `Momsavräkning ${periodLabel}`,
      periodLabel,
      vatDeclarationId,
      kind: "settlement",
    });
    if (result) {
      onSuccess?.(result.settlementId);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-[#C28A2B]" />
            Bokför momsavräkning — {periodLabel}
          </DialogTitle>
          <DialogDescription>
            Granska den föreslagna verifikationen. Vid godkännande nollas momskonton och nettot förs till {proposal.direction === "payable" ? "2650 (skuld)" : "1650 (fordran)"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Direction summary */}
          <div className={cn(
            "rounded-[10px] border p-4 flex items-center justify-between",
            proposal.direction === "payable"
              ? "bg-[#FCE8E8] border-[#F4C8C8] dark:bg-rose-950/20 dark:border-rose-900"
              : "bg-[#E1F5EE] border-[#BFE6D6] dark:bg-emerald-950/20 dark:border-emerald-900"
          )}>
            <div>
              <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                {proposal.direction === "payable" ? "Skuld till Skatteverket" : "Fordran på Skatteverket"}
              </div>
              <div className={cn(
                "text-2xl font-black font-mono tabular-nums mt-1",
                proposal.direction === "payable" ? "text-[#C73838] dark:text-[#C73838]" : "text-[#1D9E75] dark:text-[#1D9E75]"
              )}>
                {formatSEK(proposal.netAmount)}
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              {proposal.direction === "payable" ? "→ Konto 2650" : "→ Konto 1650"}
            </Badge>
          </div>

          {/* Lines table */}
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
                    <td className="py-2 px-3 font-mono text-foreground">{l.accountNumber}</td>
                    <td className="py-2 px-3 text-muted-foreground">{l.accountName}</td>
                    <td className="py-2 px-3 text-right font-mono text-foreground">{l.debit > 0 ? formatSEK(l.debit) : ""}</td>
                    <td className="py-2 px-3 text-right font-mono text-foreground">{l.credit > 0 ? formatSEK(l.credit) : ""}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-t-2 border-slate-200 dark:border-slate-700 font-semibold">
                  <td colSpan={2} className="py-2 px-3 text-right">Summa</td>
                  <td className="py-2 px-3 text-right font-mono">{formatSEK(proposal.totalDebit)}</td>
                  <td className="py-2 px-3 text-right font-mono">{formatSEK(proposal.totalCredit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Balance status */}
          {proposal.isBalanced ? (
            <div className="flex items-center gap-2 text-xs text-[#085041] dark:text-[#1D9E75]">
              <CheckCircle2 className="w-3.5 h-3.5" /> Verifikat balanserat (Σdebet = Σkredit)
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-[#7A1A1A] dark:text-[#C73838]">
              <AlertTriangle className="w-3.5 h-3.5" /> Verifikat ej i balans — granska underliggande momskonton
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            Bokföringsdatum: <span className="font-mono font-semibold text-foreground">{periodEndDate}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={posting}>Avbryt</Button>
          <Button
            onClick={handleApprove}
            disabled={posting || !proposal.isBalanced || proposal.lines.length === 0}
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
