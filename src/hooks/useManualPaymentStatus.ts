import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { PaymentBatchStatus } from "@/lib/payments/statusTaxonomy";

interface UpdatePayload {
  proposalId: string;
  companyId: string;
  fromStatus: string;
  toStatus: PaymentBatchStatus;
  note?: string;
  /** Optional companion fields written to payment_proposals when set. */
  patch?: Record<string, unknown>;
}

export function useManualPaymentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ proposalId, companyId, fromStatus, toStatus, note, patch }: UpdatePayload) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Inte inloggad");

      const update: Record<string, unknown> = { status: toStatus, ...(patch ?? {}) };
      if (toStatus === "exported_to_bank" && !("exported_at" in update)) {
        update.exported_at = new Date().toISOString();
      }
      if (toStatus === "paid" && !("paid_at" in update)) {
        update.paid_at = new Date().toISOString();
      }
      if (toStatus === "failed" && note && !("failure_reason" in update)) {
        update.failure_reason = note;
      }

      const { error: ue } = await supabase
        .from("payment_proposals")
        .update(update)
        .eq("id", proposalId);
      if (ue) throw ue;

      const { error: le } = await supabase.from("payment_status_log" as never).insert({
        proposal_id: proposalId,
        company_id: companyId,
        from_status: fromStatus,
        to_status: toStatus,
        changed_by: u.user.id,
        note: note ?? null,
      } as never);
      if (le) throw le;
    },
    onSuccess: (_d, vars) => {
      toast.success(`Status uppdaterad: ${vars.toStatus}`);
      qc.invalidateQueries({ queryKey: ["payment-proposals"] });
      qc.invalidateQueries({ queryKey: ["payment-status-log", vars.proposalId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
