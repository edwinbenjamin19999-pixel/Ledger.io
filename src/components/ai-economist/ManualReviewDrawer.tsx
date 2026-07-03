import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, X, Info } from "lucide-react";
import type { CFOPriority } from "@/hooks/useCFOPriorities";

interface Props {
  insight: CFOPriority | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: () => Promise<void> | void;
  onReject: () => void;
  pending: boolean;
}

function fmtSEK(n: number) {
  return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(Math.round(Math.abs(n))) + " kr";
}

export function ManualReviewDrawer({ insight, open, onOpenChange, onApprove, onReject, pending }: Props) {
  if (!insight) return null;
  const isNeg = insight.impact_sek < 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg">Granska & godkänn åtgärd</SheetTitle>
          <SheetDescription>
            I manuellt läge utförs inga åtgärder utan ditt uttryckliga godkännande.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <h3 className="font-semibold text-base">{insight.title}</h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{insight.explanation}</p>
          </div>

          {insight.impact_sek !== 0 && (
            <div className="rounded-xl border border-border p-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Finansiell påverkan</div>
              <div className={`text-2xl font-bold tabular-nums mt-1 ${isNeg ? "text-[#7A1A1A] dark:text-rose-300" : "text-[#085041] dark:text-emerald-300"}`}>
                {isNeg ? "−" : "+"}{fmtSEK(insight.impact_sek)}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-border p-4 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5"><Info className="h-3.5 w-3.5" /> Källa</span>
              <span className="font-medium">{insight.source}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">AI-konfidens</span>
              <span className="font-medium">{Math.round(insight.confidence * 100)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Föreslagen åtgärd</span>
              <span className="font-medium font-mono text-xs">{insight.action_type}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Prioritetspoäng</span>
              <span className="font-medium">{insight.priority_score.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button
              onClick={() => onApprove()}
              disabled={pending}
              className="flex-1 bg-[#0F1F3D] hover:from-[#3b82f6] hover:to-[#3b82f6] text-white"
            >
              {pending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Godkänn & utför
            </Button>
            <Button variant="outline" onClick={onReject} disabled={pending}>
              <X className="h-4 w-4 mr-2" /> Avvisa
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
