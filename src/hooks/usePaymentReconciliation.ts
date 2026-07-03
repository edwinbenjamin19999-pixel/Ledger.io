import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BankTxCandidate {
  id: string;
  booking_date: string;
  amount: number;
  description: string | null;
  counterparty_name: string | null;
  status: string;
  bank_account_id: string;
}

export interface ReconcilableProposal {
  id: string;
  payment_date: string;
  total_amount: number;
  invoice_count: number;
  status: string;
  exported_at: string | null;
  paid_at: string | null;
  reconciliation_status: string | null;
  candidates: BankTxCandidate[];
}

const RECONCILABLE_STATUSES = [
  "exported_to_bank",
  "awaiting_bank_approval",
  "sent_to_bank",
  "downloaded",
  "paid",
];

/**
 * Returns proposals that have been handed off to the bank but are not yet
 * fully reconciled, together with bank transactions that look like a match.
 *
 * Matching rule (Phase 2, deterministic):
 *   - bank_transactions.amount === -proposal.total_amount (outgoing payment)
 *   - booking_date within ±5 days of proposal.payment_date
 *   - bank tx not already matched to a journal entry
 */
export function usePaymentReconciliation(companyId: string | null) {
  return useQuery({
    queryKey: ["payment-reconciliation", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<ReconcilableProposal[]> => {
      const { data: proposals, error: pErr } = await supabase
        .from("payment_proposals")
        .select("id,payment_date,total_amount,invoice_count,status,exported_at,paid_at,reconciliation_status")
        .eq("company_id", companyId!)
        .in("status", RECONCILABLE_STATUSES)
        .order("payment_date", { ascending: false })
        .limit(50);
      if (pErr) throw pErr;
      if (!proposals?.length) return [];

      const minDate = new Date();
      minDate.setDate(minDate.getDate() - 60);
      const { data: txs, error: tErr } = await supabase
        .from("bank_transactions")
        .select("id,booking_date,amount,description,counterparty_name,status,bank_account_id,journal_entry_id")
        .eq("company_id", companyId!)
        .lt("amount", 0)
        .gte("booking_date", minDate.toISOString().slice(0, 10))
        .is("journal_entry_id", null)
        .limit(500);
      if (tErr) throw tErr;

      const txList = (txs ?? []) as BankTxCandidate[];

      return proposals.map((p) => {
        const target = Number(p.total_amount);
        const ref = new Date(p.payment_date).getTime();
        const candidates = txList
          .filter((t) => Math.abs(Math.abs(Number(t.amount)) - target) < 0.51)
          .filter((t) => Math.abs(new Date(t.booking_date).getTime() - ref) <= 5 * 24 * 3600 * 1000)
          .sort((a, b) =>
            Math.abs(new Date(a.booking_date).getTime() - ref) -
            Math.abs(new Date(b.booking_date).getTime() - ref),
          )
          .slice(0, 5);
        return { ...p, candidates };
      });
    },
  });
}

export function useConfirmReconciliation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      proposalId,
      bankTxId,
      companyId,
    }: { proposalId: string; bankTxId: string; companyId: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Ej inloggad");

      const { data: prop, error: propErr } = await supabase
        .from("payment_proposals")
        .select("status")
        .eq("id", proposalId)
        .maybeSingle();
      if (propErr) throw propErr;
      const fromStatus = prop?.status ?? null;

      const { error: pErr } = await supabase
        .from("payment_proposals")
        .update({
          status: "paid",
          reconciliation_status: "matched",
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", proposalId);
      if (pErr) throw pErr;

      const { error: tErr } = await supabase
        .from("bank_transactions")
        .update({ status: "matched" })
        .eq("id", bankTxId);
      if (tErr) throw tErr;

      // Audit log — company_id is required by RLS + NOT NULL
      const { error: lErr } = await supabase.from("payment_status_log" as never).insert({
        proposal_id: proposalId,
        company_id: companyId,
        from_status: fromStatus,
        to_status: "paid",
        changed_by: userId,
        note: `Avstämd mot banktransaktion ${bankTxId}`,
      } as never);
      if (lErr) console.warn("payment_status_log insert failed", lErr);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["payment-reconciliation", vars.companyId] });
      qc.invalidateQueries({ queryKey: ["pending-payments", vars.companyId] });
      toast.success("Betalning avstämd");
    },
    onError: (e: Error) => toast.error(e.message || "Kunde inte stämma av"),
  });
}
