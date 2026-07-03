import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Send, XCircle, Loader2 } from "lucide-react";
import { useManualPaymentStatus } from "@/hooks/useManualPaymentStatus";
import { nextManualStatuses, PAYMENT_STATUS_LABEL, type PaymentBatchStatus } from "@/lib/payments/statusTaxonomy";

interface Props {
  proposalId: string;
  companyId: string;
  currentStatus: string;
}

const ICONS: Partial<Record<PaymentBatchStatus, React.ComponentType<{ className?: string }>>> = {
  awaiting_bank_approval: Send,
  paid: CheckCircle2,
  failed: XCircle,
  exported_to_bank: Send,
};

export function ManualStatusUpdater({ proposalId, companyId, currentStatus }: Props) {
  const [pending, setPending] = useState<PaymentBatchStatus | null>(null);
  const [note, setNote] = useState("");
  const mutation = useManualPaymentStatus();
  const transitions = nextManualStatuses(currentStatus);

  if (transitions.length === 0) return null;

  const submit = () => {
    if (!pending) return;
    mutation.mutate(
      { proposalId, companyId, fromStatus: currentStatus, toStatus: pending, note: note.trim() || undefined },
      {
        onSuccess: () => {
          setPending(null);
          setNote("");
        },
      },
    );
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {transitions.map((next) => {
          const Icon = ICONS[next] ?? CheckCircle2;
          return (
            <Button
              key={next}
              size="sm"
              variant={next === "failed" ? "outline" : "secondary"}
              onClick={() => setPending(next)}
              className="gap-1.5"
            >
              <Icon className="h-3.5 w-3.5" />
              {PAYMENT_STATUS_LABEL[next]}
            </Button>
          );
        })}
      </div>

      <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Markera som {pending && PAYMENT_STATUS_LABEL[pending]}</DialogTitle>
            <DialogDescription>
              {pending === "paid" &&
                "Bekräfta att betalningen är genomförd och godkänd i din bank. Detta loggas med tidsstämpel."}
              {pending === "failed" &&
                "Ange en kort anledning till varför betalningen inte gick igenom. Loggas i audit-spåret."}
              {pending === "awaiting_bank_approval" &&
                "Markera att filen är uppladdad i banken och inväntar BankID-godkännande där."}
              {pending === "exported_to_bank" &&
                "Markera att betalningsfilen har exporterats. Nästa steg sker i din bank."}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={pending === "failed" ? "Anledning (t.ex. otillräckligt saldo)" : "Anteckning (valfritt)"}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)} disabled={mutation.isPending}>
              Avbryt
            </Button>
            <Button onClick={submit} disabled={mutation.isPending || (pending === "failed" && !note.trim())}>
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Bekräfta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
