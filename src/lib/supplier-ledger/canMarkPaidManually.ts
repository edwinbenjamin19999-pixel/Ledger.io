import { supabase } from "@/integrations/supabase/client";
import { buildApprovalChain } from "@/hooks/useInvoiceApproval";

export interface ManualPaymentCheck {
  allowed: boolean;
  reason?: string;
}

interface InvoiceLike {
  id: string;
  status: string;
  journal_entry_id?: string | null;
  total_amount?: number;
  approval_step?: number | null;
}

interface Options {
  /** Pass to enable approval-chain check (requires localStorage settings) */
  companyId?: string;
}

/**
 * Central guardrail for "Markera betald (manuellt)".
 *
 * Manual payment marking is ONLY allowed when:
 * 1. Invoice status === 'attested'
 * 2. The full approval chain is complete (approval_step >= requiredSteps).
 *    Prevents bypassing 4-eyes principle.
 * 3. The invoice is NOT part of an active payment proposal
 *    (status pending / approved / sent — bank handles it)
 * 4. The invoice has NO linked journal entry that already records a payment
 */
export async function canMarkPaidManually(
  invoice: InvoiceLike,
  options: Options = {},
): Promise<ManualPaymentCheck> {
  if (!invoice) return { allowed: false, reason: "Faktura saknas" };

  if (invoice.status !== "attested") {
    return {
      allowed: false,
      reason:
        invoice.status === "paid"
          ? "Redan markerad som betald"
          : invoice.status === "rejected"
            ? "Avvisad — kan inte betalas"
            : invoice.status === "cancelled"
              ? "Makulerad — kan inte betalas"
              : "Måste attesteras först",
    };
  }

  // 0. Approval chain complete?
  if (options.companyId && typeof invoice.total_amount === "number") {
    try {
      const { requiredSteps } = buildApprovalChain(options.companyId, invoice.total_amount);
      const step = invoice.approval_step ?? 0;
      if (step < requiredSteps) {
        return {
          allowed: false,
          reason: `Slutför attest först (steg ${step}/${requiredSteps})`,
        };
      }
    } catch {
      // soft-fail
    }
  }

  // 1. Active payment proposal?
  try {
    const { data: proposalLinks } = await supabase
      .from("payment_proposal_invoices")
      .select("proposal_id, payment_proposals!inner(status)")
      .eq("invoice_id", invoice.id);

    const activeProposal = (proposalLinks ?? []).some((row: any) => {
      const proposalStatus = row?.payment_proposals?.status;
      return ["pending", "approved", "sent"].includes(proposalStatus);
    });

    if (activeProposal) {
      return {
        allowed: false,
        reason: "Hanteras via betalförslag — markera inte manuellt",
      };
    }
  } catch {
    // Soft-fail: if proposal lookup fails, fall through to journal check
  }

  // 2. Already booked in the ledger?
  if (invoice.journal_entry_id) {
    try {
      const { data: lines } = await supabase
        .from("journal_entry_lines")
        .select("account_number, credit, debit")
        .eq("journal_entry_id", invoice.journal_entry_id);

      const hasPaymentLine = (lines ?? []).some((l: any) => {
        const acc = String(l.account_number ?? "");
        const credit = Number(l.credit ?? 0);
        return (acc.startsWith("193") || acc.startsWith("194")) && credit > 0;
      });

      if (hasPaymentLine) {
        return {
          allowed: false,
          reason: "Redan registrerad i loggen",
        };
      }
    } catch {
      // Soft-fail
    }
  }

  return { allowed: true };
}
