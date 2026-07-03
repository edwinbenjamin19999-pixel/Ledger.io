import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { canMarkPaidManually } from "@/lib/supplier-ledger/canMarkPaidManually";

interface Attestant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  maxAmount: number;
  canApprove: boolean;
}

export type FourEyesMode = "two" | "four_always" | "four_threshold";

interface Settings {
  /** Legacy boolean — kept for backwards compatibility */
  fourEyesPrinciple: boolean;
  /** New explicit mode */
  fourEyesMode?: FourEyesMode;
  extraApprovalThreshold: number;
}

const DEFAULT_SETTINGS: Settings = {
  fourEyesPrinciple: true,
  fourEyesMode: "four_threshold",
  extraApprovalThreshold: 50000,
};

function loadSettings(companyId: string): Settings {
  try {
    const raw = localStorage.getItem(`supplier-invoice-settings-${companyId}`);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } as Settings;
    // Back-compat: derive mode from boolean if missing
    if (!parsed.fourEyesMode) {
      parsed.fourEyesMode = parsed.fourEyesPrinciple ? "four_threshold" : "two";
    }
    return parsed;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function loadAttestants(companyId: string): Attestant[] {
  try {
    const raw = localStorage.getItem(`supplier-invoice-attestants-${companyId}`);
    return raw ? (JSON.parse(raw) as Attestant[]) : [];
  } catch {
    return [];
  }
}

/**
 * Build the approval chain for an invoice based on company settings.
 * Modes:
 *  - "two"            → always 1 approver
 *  - "four_always"    → always 2 different approvers
 *  - "four_threshold" → 2 approvers if amount >= extraApprovalThreshold, else 1
 */
export function buildApprovalChain(
  companyId: string,
  amount: number,
): { chain: Attestant[]; requiredSteps: number; settings: Settings; mode: FourEyesMode } {
  const settings = loadSettings(companyId);
  const attestants = loadAttestants(companyId);

  const eligible = attestants.filter(
    (a) => a.canApprove && (a.maxAmount ?? 0) >= amount,
  );

  // Sort by maxAmount asc so lowest-allowed approver goes first
  eligible.sort((a, b) => (a.maxAmount ?? 0) - (b.maxAmount ?? 0));

  const mode: FourEyesMode = settings.fourEyesMode ?? "four_threshold";
  let requiredSteps = 1;
  if (mode === "four_always") requiredSteps = 2;
  else if (mode === "four_threshold" && amount >= settings.extraApprovalThreshold)
    requiredSteps = 2;

  return { chain: eligible.slice(0, requiredSteps), requiredSteps, settings, mode };
}

export function useInvoiceApproval(companyId: string) {
  const [busy, setBusy] = useState(false);

  const attest = async (invoice: {
    id: string;
    total_amount: number;
    approval_step?: number | null;
    attested_by?: string | null;
  }) => {
    setBusy(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Ej inloggad");

      const { chain, requiredSteps } = buildApprovalChain(
        companyId,
        invoice.total_amount,
      );

      const currentStep = invoice.approval_step ?? 0;
      const nextStep = currentStep + 1;

      // 4-eyes guard: same user can't approve twice
      if (
        requiredSteps > 1 &&
        invoice.attested_by &&
        invoice.attested_by === user.id &&
        currentStep >= 1
      ) {
        throw new Error(
          "Fyra-ögonsprincipen: en annan person måste attestera nästa steg",
        );
      }

      const isFinalStep = nextStep >= requiredSteps;
      const nextApprover = !isFinalStep ? chain[nextStep]?.email ?? null : null;

      const update: Record<string, unknown> = {
        approval_step: nextStep,
        next_approver_email: nextApprover,
      };

      if (isFinalStep) {
        update.status = "attested";
        update.attested_by = user.id;
        update.attested_at = new Date().toISOString();
      } else {
        // Keep status as draft, mark first approver
        if (currentStep === 0) {
          update.attested_by = user.id;
        }
      }

      const { error } = await supabase
        .from("invoices")
        .update(update)
        .eq("id", invoice.id);
      if (error) throw error;

      toast.success(
        isFinalStep
          ? "Faktura attesterad!"
          : `Steg ${nextStep}/${requiredSteps} klart — väntar på ${nextApprover ?? "nästa attestant"}`,
      );
      return { ok: true, isFinalStep };
    } catch (err: any) {
      toast.error(err.message || "Kunde inte attestera");
      return { ok: false, isFinalStep: false };
    } finally {
      setBusy(false);
    }
  };

  const reject = async (
    invoice: { id: string; counterparty_name?: string; journal_entry_id?: string | null },
    reason: string,
  ) => {
    if (!reason.trim()) {
      toast.error("Ange en motivering");
      return { ok: false };
    }
    setBusy(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Ej inloggad");

      const { error } = await supabase
        .from("invoices")
        .update({
          status: "rejected",
          rejected_at: new Date().toISOString(),
          rejected_by: user.id,
          rejection_reason: reason.trim(),
        })
        .eq("id", invoice.id);
      if (error) throw error;

      // Best-effort feedback to AI for learning
      try {
        await supabase.from("ai_feedback").insert({
          company_id: companyId,
          journal_entry_id: invoice.journal_entry_id ?? invoice.id,
          corrected_by: user.id,
          correction_type: "invoice_rejected",
          original_suggestion: { invoice_id: invoice.id },
          corrected_data: { reason: reason.trim() },
          rejection_reason: reason.trim(),
        } as any);
      } catch {
        // non-fatal
      }

      toast.success("Faktura avvisad");
      return { ok: true };
    } catch (err: any) {
      toast.error(err.message || "Kunde inte avvisa");
      return { ok: false };
    } finally {
      setBusy(false);
    }
  };

  /**
   * Cancel/void an invoice that should not be processed at all
   * (duplicate, wrong recipient, scam). Removes any draft journal entry.
   * Only allowed for status "draft" or "attested" (never "paid").
   */
  const cancelInvoice = async (
    invoice: { id: string; status: string; journal_entry_id?: string | null },
    reason: string,
  ) => {
    if (invoice.status === "paid") {
      toast.error("Betalda fakturor kan inte makuleras");
      return { ok: false };
    }
    if (!reason.trim()) {
      toast.error("Ange en orsak");
      return { ok: false };
    }
    setBusy(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Ej inloggad");

      // Try to delete a draft journal entry if it exists and is not approved
      if (invoice.journal_entry_id) {
        try {
          const { data: je } = await supabase
            .from("journal_entries")
            .select("id, status")
            .eq("id", invoice.journal_entry_id)
            .maybeSingle();
          if (je && (je as any).status !== "approved") {
            await supabase
              .from("journal_entry_lines")
              .delete()
              .eq("journal_entry_id", invoice.journal_entry_id);
            await supabase.from("journal_entries").delete().eq("id", invoice.journal_entry_id);
          }
        } catch {
          // non-fatal
        }
      }

      const { error } = await supabase
        .from("invoices")
        .update({
          status: "cancelled",
          rejected_at: new Date().toISOString(),
          rejected_by: user.id,
          rejection_reason: reason.trim(),
        })
        .eq("id", invoice.id);
      if (error) throw error;

      toast.success("Faktura makulerad");
      return { ok: true };
    } catch (err: any) {
      toast.error(err.message || "Kunde inte makulera");
      return { ok: false };
    } finally {
      setBusy(false);
    }
  };

  /**
   * Re-open a rejected/cancelled invoice for renewed processing.
   */
  const reopenInvoice = async (invoice: { id: string; status: string }) => {
    if (!["rejected", "cancelled"].includes(invoice.status)) {
      toast.error("Endast avvisade eller makulerade fakturor kan återöppnas");
      return { ok: false };
    }
    setBusy(true);
    try {
      const { error } = await supabase
        .from("invoices")
        .update({
          status: "draft",
          approval_step: 0,
          attested_by: null,
          attested_at: null,
          rejected_at: null,
          rejected_by: null,
          rejection_reason: null,
          next_approver_email: null,
        })
        .eq("id", invoice.id);
      if (error) throw error;
      toast.success("Faktura återöppnad");
      return { ok: true };
    } catch (err: any) {
      toast.error(err.message || "Kunde inte återöppna");
      return { ok: false };
    } finally {
      setBusy(false);
    }
  };

  const markPaidManual = async (invoice: {
    id: string;
    status: string;
    journal_entry_id?: string | null;
    total_amount?: number;
    approval_step?: number | null;
  }) => {
    setBusy(true);
    try {
      const check = await canMarkPaidManually(invoice, { companyId });
      if (!check.allowed) {
        toast.error(check.reason || "Manuell betalning ej tillåten");
        return { ok: false };
      }

      const { error } = await supabase
        .from("invoices")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", invoice.id);
      if (error) throw error;

      toast.success("Faktura markerad som betald");
      return { ok: true };
    } catch (err: any) {
      toast.error(err.message || "Kunde inte markera som betald");
      return { ok: false };
    } finally {
      setBusy(false);
    }
  };

  return { attest, reject, cancelInvoice, reopenInvoice, markPaidManual, busy };
}
