import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, CheckCircle2, Shield, Eye } from "lucide-react";
import type { PaymentBatchSummary } from "@/hooks/usePaymentBatch";

interface Props {
  open: boolean;
  summary: PaymentBatchSummary;
  onClose: () => void;
  onReviewFlagged: () => void;
  onProceed: () => void;
  /** When true, user must tick the explicit acknowledgement before proceeding. */
  highRiskRequiresAck?: boolean;
  highRiskAck?: boolean;
  onHighRiskAckChange?: (v: boolean) => void;
}

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

export function BankIDRiskSummary({
  open,
  summary,
  onClose,
  onReviewFlagged,
  onProceed,
  highRiskRequiresAck = false,
  highRiskAck = false,
  onHighRiskAckChange,
}: Props) {
  const flagged =
    summary.newSupplierCount + summary.bgChangedCount + summary.amountAnomalyCount + summary.blockedCount;
  const hasFlags = flagged > 0;
  const blockedHard = summary.blockedCount > 0;
  const ackBlocking = highRiskRequiresAck && !highRiskAck;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Risköversikt — innan signering
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-[#475569]">
            Du är på väg att signera <strong>{summary.invoices.length} betalningar</strong> till ett
            totalt värde av <strong className="font-mono">{fmt(summary.totalAmount)} kr</strong>.
          </p>

          <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFB] p-3 space-y-1.5 text-sm">
            <Line
              icon={AlertTriangle}
              cls="text-[#7A5417]"
              count={summary.newSupplierCount}
              label="ny leverantör"
            />
            <Line
              icon={AlertTriangle}
              cls="text-[#7A1F1E]"
              count={summary.bgChangedCount}
              label="BG/PG ändrat"
            />
            <Line
              icon={AlertTriangle}
              cls="text-[#7A5417]"
              count={summary.amountAnomalyCount}
              label="avvikelse > 20%"
            />
            <Line
              icon={AlertTriangle}
              cls="text-[#7A5417]"
              count={summary.overbillingCount}
              label="prisavvikelse / dubblett"
            />
            {blockedHard && (
              <Line
                icon={AlertTriangle}
                cls="text-[#7A1A1A] font-bold"
                count={summary.blockedCount}
                label="BLOCKERADE — kräver explicit override"
              />
            )}
            <Line
              icon={CheckCircle2}
              cls="text-[#085041]"
              count={summary.normalCount}
              label="normala"
            />
          </div>

          {hasFlags && (
            <p className="text-[11px] text-[#475569]">
              Alla overrides loggas och kopplas till din BankID-signatur.
            </p>
          )}

          {highRiskRequiresAck && !blockedHard && (
            <label className="flex items-start gap-2 rounded-lg border border-[#E8C589] bg-[#FAEEDA] p-2.5 text-xs text-[#7A5417] cursor-pointer">
              <Checkbox
                checked={highRiskAck}
                onCheckedChange={(v) => onHighRiskAckChange?.(v === true)}
                className="mt-0.5"
              />
              <span>
                Jag bekräftar att jag granskat de flaggade riskerna och tar ansvar för att fortsätta
                till BankID-signering.
              </span>
            </label>
          )}

          <div className="flex flex-col gap-2 pt-1">
            {hasFlags && (
              <Button variant="outline" className="w-full" onClick={onReviewFlagged}>
                <Eye className="h-4 w-4 mr-1" />
                Granska flaggade
              </Button>
            )}
            <Button
              className="w-full"
              variant={hasFlags ? "destructive" : "default"}
              onClick={onProceed}
              disabled={blockedHard || ackBlocking}
            >
              {blockedHard
                ? "Lös blockerade fakturor först"
                : ackBlocking
                  ? "Bekräfta riskerna för att fortsätta"
                  : hasFlags
                    ? "Bekräfta & gå till BankID"
                    : "Fortsätt till BankID"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Line({
  icon: Icon,
  cls,
  count,
  label,
}: {
  icon: React.ElementType;
  cls: string;
  count: number;
  label: string;
}) {
  if (count === 0) return null;
  return (
    <div className={`flex items-center gap-2 ${cls}`}>
      <Icon className="h-3.5 w-3.5" />
      <span className="font-bold tabular-nums">{count}</span>
      <span>{label}</span>
    </div>
  );
}

