import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import type { WorkflowState } from "@/lib/ap/workflowState";

export type APRiskLevel = "safe" | "warning" | "high";

export interface APInvoice {
  id: string;
  company_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  counterparty_name: string;
  counterparty_org_number: string | null;
  total_amount: number;
  vat_amount: number;
  status: string;
  workflow_state: WorkflowState;
  approval_step: number | null;
  risk_score: number;
  risk_level: APRiskLevel;
  is_blocked: boolean;
  ai_confidence: number | null;
  periodization_plan: unknown;
  vat_code: string | null;
  bg_pg: string | null;
  supplier_id: string | null;
  document_id: string | null;
  journal_entry_id: string | null;
  paid_at: string | null;
  invoice_type: string | null;
  invoice_direction: string | null;
  notes: string | null;
  verification_ref: string | null;
  integrity_issues: string[];
}

export function useAPInvoices(companyId: string | null) {
  return useQuery({
    queryKey: ["ap-invoices", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<APInvoice[]> => {
      const { data, error } = await supabase
        .from("invoices")
        .select(
          "id,company_id,invoice_number,invoice_date,due_date,counterparty_name,counterparty_org_number,total_amount,vat_amount,status,workflow_state,approval_step,risk_score,risk_level,is_blocked,ai_confidence,periodization_plan,vat_code,bg_pg,supplier_id,document_id,journal_entry_id,paid_at,invoice_type,invoice_direction,notes,journal_entry:journal_entries!invoices_journal_entry_id_fkey(journal_number)",
        )
        .eq("company_id", companyId!)
        .or(
          "invoice_direction.eq.incoming,and(invoice_type.eq.incoming,invoice_direction.eq.outgoing),and(invoice_type.eq.incoming,invoice_direction.is.null)",
        )
        .order("due_date", { ascending: true });
      if (error) throw error;

      return ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
        const integrityIssues: string[] = [];
        if (!row.id) integrityIssues.push("missing_invoice_id");
        if (!row.counterparty_name) integrityIssues.push("missing_supplier_name");
        if (row.total_amount == null) integrityIssues.push("missing_amount");
        if (!row.invoice_date) integrityIssues.push("missing_invoice_date");
        if (!row.due_date) integrityIssues.push("missing_due_date");
        if (!row.workflow_state) integrityIssues.push("missing_state");
        if (!row.document_id) integrityIssues.push("missing_source_document");
        if (row.journal_entry_id && !(row.journal_entry as { journal_number?: string | null } | null)?.journal_number) {
          integrityIssues.push("missing_verification_ref");
        }

        return {
          ...(row as Omit<APInvoice, "verification_ref" | "integrity_issues">),
          verification_ref:
            (row.journal_entry as { journal_number?: string | null } | null)?.journal_number ?? null,
          integrity_issues: integrityIssues,
        } satisfies APInvoice;
      });
    },
  });
}

export function useApproveInvoice(companyId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const { error } = await supabase
        .from("invoices")
        .update({ status: "attested", attested_at: new Date().toISOString() })
        .eq("id", invoiceId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Faktura attesterad");
      qc.invalidateQueries({ queryKey: ["ap-invoices", companyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useReleaseBlock(companyId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      invoiceId,
      reason,
    }: {
      invoiceId: string;
      reason: string;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Inte inloggad");
      const { error: oe } = await supabase.from("invoice_overrides" as never).insert({
        invoice_id: invoiceId,
        company_id: companyId,
        user_id: u.user.id,
        override_type: "block_release",
        reason,
      } as never);
      if (oe) throw oe;
      const { error } = await supabase
        .from("invoices")
        .update({ is_blocked: false })
        .eq("id", invoiceId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Blockering hävd — loggad");
      qc.invalidateQueries({ queryKey: ["ap-invoices", companyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
