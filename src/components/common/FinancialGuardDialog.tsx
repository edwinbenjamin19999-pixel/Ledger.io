import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle, XCircle, Info } from "lucide-react";
import type { GuardResult, GuardCheck } from "@/lib/validators/financial-guard";

interface FinancialGuardDialogProps { open: boolean;
  onOpenChange: (open: boolean) => void;
  result: GuardResult | null;
  title: string;
  onConfirm?: () => void;
  confirmLabel?: string;
}

const CheckIcon = ({ check }: { check: GuardCheck }) => { if (check.passed) return <CheckCircle className="h-4 w-4 text-[#085041] shrink-0" />;
  if (check.severity === "error") return <XCircle className="h-4 w-4 text-destructive shrink-0" />;
  if (check.severity === "warning") return <AlertTriangle className="h-4 w-4 text-[#7A5417] shrink-0" />;
  return <Info className="h-4 w-4 text-muted-foreground shrink-0" />;
};

export const FinancialGuardDialog = ({ open, onOpenChange, result, title, onConfirm, confirmLabel = "Godkänn"
}: FinancialGuardDialogProps) => { if (!result) return null;

  const errors = result.checks.filter(c => !c.passed && c.severity === "error");
  const warnings = result.checks.filter(c => !c.passed && c.severity === "warning");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {result.passed ? (
              <ShieldCheck className="h-5 w-5 text-[#085041]" />
            ) : (
              <ShieldAlert className="h-5 w-5 text-destructive" />
            )}
            {title}
          </DialogTitle>
          <DialogDescription>{result.summary}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 mt-2">
          {result.checks.map((check, i) => (
            <div key={i} className="flex items-start gap-2 text-sm py-1 border-b border-border/50 last:border-0">
              <CheckIcon check={check} />
              <div className="flex-1 min-w-0">
                <span className="font-medium">{check.name}</span>
                <p className="text-muted-foreground text-xs mt-0.5">{check.message}</p>
              </div>
              <Badge variant={check.passed ? "secondary" : check.severity === "error" ? "destructive" : "outline"} className="shrink-0 text-xs">
                {check.passed ? "OK" : check.severity === "error" ? "Fel" : "Varning"}
              </Badge>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Stäng</Button>
          {onConfirm && (
            <Button
              onClick={onConfirm}
              disabled={!result.passed}
              variant={result.passed ? "default" : "destructive"}
            >
              {result.passed ? confirmLabel : `${errors.length} fel — kan inte godkänna`}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
