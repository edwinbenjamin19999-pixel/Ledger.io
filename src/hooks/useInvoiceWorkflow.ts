/**
 * AP Ledger v5 — Workflow transitions hook.
 * Centralised mutations that respect the workflow_state machine + DB triggers.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { WorkflowState } from "@/lib/ap/workflowState";
import { buildApprovalChain } from "@/hooks/useInvoiceApproval";

export interface VerifySupplierPayload {
  invoice_id: string;
  name: string;
  org_number?: string | null;
  bg_pg?: string | null;
  iban?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface PreAccountingPatch {
  invoice_id: string;
  company_id: string;
  account?: string | null;
  vat_code?: string | null;
  cost_center?: string | null;
  project_code?: string | null;
  periodization_plan?: unknown;
}

export function useInvoiceWorkflow(companyId: string | null) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["ap-invoices", companyId] });
    qc.invalidateQueries({ queryKey: ["invoice-preaccounting"] });
    qc.invalidateQueries({ queryKey: ["invoice-comments"] });
  };

  const verifySupplier = useMutation({
    mutationFn: async (payload: VerifySupplierPayload) => {
      const { data, error } = await supabase.functions.invoke("ap-create-supplier", {
        body: payload,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Leverantör verifierad och skapad");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rejectSupplier = useMutation({
    mutationFn: async ({ invoiceId, reason }: { invoiceId: string; reason: string }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Inte inloggad");
      const { error } = await supabase
        .from("invoices")
        .update({
          workflow_state: "REJECTED" as never,
          status: "rejected",
          rejected_at: new Date().toISOString(),
          rejected_by: u.user.id,
          rejection_reason: reason,
        } as never)
        .eq("id", invoiceId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Faktura avvisad");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const investigate = useMutation({
    mutationFn: async ({ invoiceId, reason }: { invoiceId: string; reason: string }) => {
      const { error } = await supabase
        .from("invoices")
        .update({
          workflow_state: "UNDER_INVESTIGATION" as never,
          notes: reason,
        } as never)
        .eq("id", invoiceId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Markerad för utredning");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const approveStep = useMutation({
    mutationFn: async ({
      invoiceId,
      totalAmount,
      currentStep,
    }: {
      invoiceId: string;
      totalAmount: number;
      currentStep: number;
    }) => {
      if (!companyId) throw new Error("Ingen aktiv bolagskontext");
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Inte inloggad");

      const { requiredSteps } = buildApprovalChain(companyId, totalAmount);
      const nextStep = currentStep + 1;
      const isFinal = nextStep >= requiredSteps;

      const update: Record<string, unknown> = {
        approval_step: nextStep,
      };
      if (isFinal) {
        update.workflow_state = "APPROVED_FOR_PAYMENT";
        update.status = "attested";
        update.attested_by = u.user.id;
        update.attested_at = new Date().toISOString();
      } else {
        update.workflow_state = "IN_APPROVAL_FLOW";
      }

      const { error } = await supabase
        .from("invoices")
        .update(update as never)
        .eq("id", invoiceId);
      if (error) throw error;
      return { isFinal, nextStep, requiredSteps };
    },
    onSuccess: (r) => {
      if (r.isFinal) toast.success("Godkänd för betalning");
      else toast.success(`Steg ${r.nextStep}/${r.requiredSteps} klart`);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addToProposal = useMutation({
    mutationFn: async (invoiceIds: string[]) => {
      if (invoiceIds.length === 0) return;
      const { error } = await supabase
        .from("invoices")
        .update({ workflow_state: "IN_PAYMENT_PROPOSAL" } as never)
        .in("id", invoiceIds);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tillagda i betalförslag");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const markSigned = useMutation({
    mutationFn: async ({
      invoiceIds,
      signerCount,
    }: {
      invoiceIds: string[];
      signerCount: 1 | 2;
    }) => {
      if (invoiceIds.length === 0) return;
      void signerCount;
      const { error } = await supabase
        .from("invoices")
        .update({ workflow_state: "PAYMENT_SIGNED" } as never)
        .in("id", invoiceIds);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Signerad — överförd till bank");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /**
   * Mark invoices as PAID after BankID signing succeeded.
   * Guard: only invoices currently in APPROVED_FOR_PAYMENT, IN_PAYMENT_PROPOSAL
   * or PAYMENT_SIGNED can transition to PAID — anything else throws.
   */
  const markPaid = useMutation({
    mutationFn: async ({
      invoiceIds,
      signerCount,
    }: {
      invoiceIds: string[];
      signerCount: 1 | 2;
    }) => {
      if (invoiceIds.length === 0) return;
      void signerCount;
      const allowed = ["APPROVED_FOR_PAYMENT", "IN_PAYMENT_PROPOSAL", "PAYMENT_SIGNED"];
      const { data: rows, error: fe } = await supabase
        .from("invoices")
        .select("id, workflow_state")
        .in("id", invoiceIds);
      if (fe) throw fe;
      const blocked = (rows ?? []).filter(
        (r) => !allowed.includes((r as { workflow_state: string }).workflow_state),
      );
      if (blocked.length > 0) {
        throw new Error(
          `Endast godkända fakturor kan markeras betalda (${blocked.length} blockerades).`,
        );
      }
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from("invoices")
        .update({
          workflow_state: "PAID",
          status: "paid",
          paid_at: nowIso,
        } as never)
        .in("id", invoiceIds);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Betalningar signerade och bokförda");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const savePreAccounting = useMutation({
    mutationFn: async (patch: PreAccountingPatch) => {
      const { error } = await supabase
        .from("invoice_preaccounting")
        .upsert(
          {
            invoice_id: patch.invoice_id,
            company_id: patch.company_id,
            account: patch.account ?? null,
            vat_code: patch.vat_code ?? null,
            cost_center: patch.cost_center ?? null,
            project_code: patch.project_code ?? null,
            periodization_plan: patch.periodization_plan ?? null,
            source: "user",
            updated_at: new Date().toISOString(),
          } as never,
          { onConflict: "invoice_id" } as never,
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoice-preaccounting"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    verifySupplier,
    rejectSupplier,
    investigate,
    approveStep,
    addToProposal,
    markSigned,
    markPaid,
    savePreAccounting,
  };
}

export type { WorkflowState };
