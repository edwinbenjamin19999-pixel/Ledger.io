import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  Ban,
  XCircle,
  Loader2,
  CreditCard,
  RotateCcw,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { useInvoiceApproval, buildApprovalChain } from "@/hooks/useInvoiceApproval";
import { canMarkPaidManually } from "@/lib/supplier-ledger/canMarkPaidManually";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface ApprovalActionsInvoice {
  id: string;
  status: string;
  total_amount: number;
  approval_step?: number | null;
  attested_by?: string | null;
  rejection_reason?: string | null;
  journal_entry_id?: string | null;
  counterparty_name?: string;
  invoice_number?: string;
}

interface Props {
  invoice: ApprovalActionsInvoice;
  companyId: string;
  onUpdated?: () => void;
  /** Compact mode for list rows */
  size?: "sm" | "default";
  /** Hide “Markera betald”-knappen (used when row already has its own pay-button) */
  hidePayAction?: boolean;
}

/**
 * Re-usable Rillion/Medius-style action group for supplier invoices.
 * Renders Approve / Reject / Cancel / Reopen / Mark-paid based on status
 * and approval chain progress. Enforces 4-eyes when configured.
 */
export const SupplierInvoiceApprovalActions = ({
  invoice,
  companyId,
  onUpdated,
  size = "sm",
  hidePayAction = false,
}: Props) => {
  const { attest, reject, cancelInvoice, reopenInvoice, markPaidManual, busy } =
    useInvoiceApproval(companyId);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [paymentCheck, setPaymentCheck] = useState<{ allowed: boolean; reason?: string }>({
    allowed: false,
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (invoice?.status === "attested") {
      canMarkPaidManually(invoice, { companyId }).then(setPaymentCheck);
    }
  }, [invoice?.id, invoice?.status, invoice?.approval_step, companyId]);

  const { requiredSteps } = buildApprovalChain(companyId, invoice.total_amount ?? 0);
  const currentStep = invoice.approval_step ?? 0;
  const isFinalStep = currentStep + 1 >= requiredSteps;

  // 4-eyes lock: same user can't do step 2
  const sameUserBlocked =
    requiredSteps > 1 &&
    currentStep >= 1 &&
    currentUserId &&
    invoice.attested_by === currentUserId;

  const handleAttest = async () => {
    const r = await attest(invoice);
    if (r.ok) onUpdated?.();
  };

  const handleReject = async () => {
    const r = await reject(invoice, rejectReason);
    if (r.ok) {
      setRejectOpen(false);
      setRejectReason("");
      onUpdated?.();
    }
  };

  const handleCancel = async () => {
    const r = await cancelInvoice(invoice, cancelReason);
    if (r.ok) {
      setCancelOpen(false);
      setCancelReason("");
      onUpdated?.();
    }
  };

  const handleReopen = async () => {
    const r = await reopenInvoice(invoice);
    if (r.ok) onUpdated?.();
  };

  const handleMarkPaid = async () => {
    const r = await markPaidManual(invoice);
    if (r.ok) onUpdated?.();
  };

  const btnH = size === "sm" ? "h-7 text-xs px-2" : "h-9 text-sm px-3";

  // ─── Status: rejected ───
  if (invoice.status === "rejected") {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant="outline" className="text-[#7A1A1A] border-[#F4C8C8] bg-[#FCE8E8] gap-1">
          <Ban className="h-3 w-3" />
          Avvisad
          {invoice.rejection_reason && (
            <span className="ml-1 font-normal opacity-70 max-w-[140px] truncate">
              · {invoice.rejection_reason}
            </span>
          )}
        </Badge>
        <Button
          size="sm"
          variant="outline"
          className={btnH}
          disabled={busy}
          onClick={handleReopen}
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Återöppna
        </Button>
      </div>
    );
  }

  // ─── Status: cancelled ───
  if (invoice.status === "cancelled") {
    return (
      <div className="flex items-center gap-1.5">
        <Badge variant="outline" className="text-slate-600 border-slate-200 bg-slate-50 gap-1">
          <XCircle className="h-3 w-3" />
          Makulerad
        </Badge>
        <Button
          size="sm"
          variant="ghost"
          className={btnH}
          disabled={busy}
          onClick={handleReopen}
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Återöppna
        </Button>
      </div>
    );
  }

  // ─── Status: paid (locked) ───
  if (invoice.status === "paid") {
    return (
      <Badge variant="outline" className="text-[#085041] border-[#BFE6D6] bg-[#E1F5EE] gap-1">
        <Lock className="h-3 w-3" />
        Betald
      </Badge>
    );
  }

  return (
    <>
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Draft → approve / reject / cancel */}
        {invoice.status === "draft" && (
          <>
            {sameUserBlocked ? (
              <Badge
                variant="outline"
                className="text-[#7A5417] border-[#F0DDB7] bg-[#FAEEDA] gap-1"
                title="Du attesterade steg 1 — annan attestant krävs"
              >
                <AlertTriangle className="h-3 w-3" />
                Väntar annan attest
              </Badge>
            ) : (
              <Button
                size="sm"
                className={`${btnH} bg-[#3b82f6] hover:bg-[#3b82f6] text-white`}
                disabled={busy}
                onClick={handleAttest}
              >
                {busy ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                )}
                {requiredSteps > 1
                  ? isFinalStep
                    ? `Godkänn (steg ${currentStep + 1}/${requiredSteps})`
                    : `Godkänn (steg ${currentStep + 1}/${requiredSteps})`
                  : "Godkänn"}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className={`${btnH} text-[#7A1A1A] border-[#F4C8C8] hover:bg-[#FCE8E8]`}
              disabled={busy}
              onClick={() => setRejectOpen(true)}
            >
              <Ban className="h-3 w-3 mr-1" />
              Avvisa
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className={`${btnH} text-slate-500 hover:text-slate-700`}
              disabled={busy}
              onClick={() => setCancelOpen(true)}
              title="Makulera (dubblett, fel mottagare etc.)"
            >
              <XCircle className="h-3 w-3 mr-1" />
              Makulera
            </Button>
          </>
        )}

        {/* Attested → mark paid (if guard allows) + revert (avvisa) */}
        {invoice.status === "attested" && (
          <>
            {!hidePayAction && paymentCheck.allowed && (
              <Button
                size="sm"
                className={`${btnH} bg-emerald-600 hover:bg-emerald-700 text-white`}
                disabled={busy}
                onClick={handleMarkPaid}
              >
                <CreditCard className="h-3 w-3 mr-1" />
                Markera betald
              </Button>
            )}
            {!hidePayAction && !paymentCheck.allowed && paymentCheck.reason && (
              <span className="text-[10px] text-muted-foreground italic px-1">
                {paymentCheck.reason}
              </span>
            )}
            <Button
              size="sm"
              variant="outline"
              className={`${btnH} text-[#7A1A1A] border-[#F4C8C8] hover:bg-[#FCE8E8]`}
              disabled={busy}
              onClick={() => setRejectOpen(true)}
            >
              <Ban className="h-3 w-3 mr-1" />
              Avvisa
            </Button>
          </>
        )}

        {/* Sent (legacy) — treat like draft for actions */}
        {invoice.status === "sent" && (
          <>
            <Button
              size="sm"
              className={`${btnH} bg-[#3b82f6] hover:bg-[#3b82f6] text-white`}
              disabled={busy}
              onClick={handleAttest}
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Godkänn
            </Button>
            <Button
              size="sm"
              variant="outline"
              className={`${btnH} text-[#7A1A1A] border-[#F4C8C8] hover:bg-[#FCE8E8]`}
              disabled={busy}
              onClick={() => setRejectOpen(true)}
            >
              <Ban className="h-3 w-3 mr-1" />
              Avvisa
            </Button>
          </>
        )}
      </div>

      {/* ── Reject dialog ── */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-[#FCE8E8]">
                <Ban className="h-4 w-4 text-[#7A1A1A]" />
              </div>
              Avvisa faktura
            </DialogTitle>
            <DialogDescription className="text-left pt-1">
              {invoice.counterparty_name && (
                <>
                  Faktura <strong>#{invoice.invoice_number ?? ""}</strong> från{" "}
                  <strong>{invoice.counterparty_name}</strong>.
                  <br />
                </>
              )}
              Ange orsak — denna sparas i revisionsloggen och skickas till
              fakturahanteraren. AI-bokföraren reverserar utkastet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">Motivering (krävs)</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="T.ex. Felaktigt belopp, dubblett, saknar underlag…"
              className="min-h-[100px]"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectOpen(false)} disabled={busy}>
              Avbryt
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={busy || !rejectReason.trim()}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Bekräfta avvisning
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Cancel/void dialog ── */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-slate-100">
                <XCircle className="h-4 w-4 text-slate-600" />
              </div>
              Makulera faktura
            </DialogTitle>
            <DialogDescription className="text-left pt-1">
              Makulering används för fakturor som inte ska bokföras alls
              (dubbletter, fel mottagare, bedrägeri). Eventuellt utkast i
              loggen tas bort. Åtgärden går att återöppna.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">Orsak (krävs)</Label>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="T.ex. Dubblett av faktura #1234"
              className="min-h-[80px]"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCancelOpen(false)} disabled={busy}>
              Avbryt
            </Button>
            <Button
              onClick={handleCancel}
              disabled={busy || !cancelReason.trim()}
              className="bg-slate-700 hover:bg-slate-800 text-white"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Bekräfta makulering
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
