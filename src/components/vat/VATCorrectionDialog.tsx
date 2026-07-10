/**
 * VAT Correction Dialog — preview an AI-suggested fix for a finding.
 * Lightweight: shows the suggestion text and points the user to the affected box.
 * (Full automatic correction posting requires a separate review flow; this is the entry point.)
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, FileText } from "lucide-react";
import { formatSEK } from "@/lib/formatNumber";
import type { VATFinding } from "@/lib/vat/vatReviewEngine";

interface VATCorrectionDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  finding: VATFinding | null;
  onOpenDrilldown?: (boxId: string) => void;
}

export function VATCorrectionDialog({ open, onOpenChange, finding, onOpenDrilldown }: VATCorrectionDialogProps) {
  if (!finding) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#C28A2B]" />
            Föreslagen korrigering
          </DialogTitle>
          <DialogDescription>{finding.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Problem</div>
            <p className="text-sm text-foreground">{finding.explanation}</p>
          </div>

          {finding.suggestedFix && (
            <div className="rounded-xl border border-[#F0DDB7] dark:border-amber-900 p-4 bg-[#FAEEDA]/40 dark:bg-amber-950/10">
              <div className="text-xs font-semibold text-[#7A5417] dark:text-[#C28A2B] uppercase tracking-wider mb-1">Förslag</div>
              <p className="text-sm text-foreground">{finding.suggestedFix}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-muted-foreground uppercase tracking-wider font-semibold mb-1">Påverkad ruta</div>
              <div className="font-mono font-bold text-foreground">{finding.affectedBox || "—"}</div>
            </div>
            <div>
              <div className="text-muted-foreground uppercase tracking-wider font-semibold mb-1">Beräknad påverkan</div>
              <div className="font-mono font-bold text-foreground">{formatSEK(finding.financialImpact)}</div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Stäng</Button>
          {finding.affectedBox && (
            <Button
              onClick={() => { onOpenDrilldown?.(finding.affectedBox!); onOpenChange(false); }}
              className="bg-[#0052FF] hover:bg-[#0052FF]/90 text-white gap-2"
            >
              <FileText className="w-4 h-4" /> Granska transaktioner <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
