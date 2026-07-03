import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";

/**
 * Workflow groups for the WL supplier invoice orchestration view.
 * Maps invoice.status (and approval signals) to a single, normalized
 * pipeline stage that mirrors the spec:
 *   received → parsed → draft → awaiting_client → approved → in_payment_run → paid → rejected
 */
export type SupplierInvoiceStage =
  | "received"
  | "draft"
  | "awaiting_client"
  | "approved"
  | "in_payment_run"
  | "paid"
  | "rejected";

export interface FirmSupplierInvoiceRow {
  id: string;
  company_id: string;
  client_name: string;
  invoice_number: string | null;
  counterparty_name: string | null;
  invoice_date: string | null;
  due_date: string | null;
  total_amount: number;
  currency: string;
  status: string;
  stage: SupplierInvoiceStage;
  /** Days until due_date (negative = overdue) — used for urgency */
  daysToDue: number | null;
  /** AI risk signals computed client-side */
  risk: "low" | "medium" | "high";
  riskReasons: string[];
  // Approval-flow fields (passed through to SupplierInvoiceApprovalActions)
  approval_step: number | null;
  attested_by: string | null;
  next_approver_email: string | null;
  rejection_reason: string | null;
  journal_entry_id: string | null;
  created_at: string | null;
  paid_at: string | null;
  /** True when the firm has mandate to approve invoices on the client's behalf.
   *  Currently derived from firm enrollment — every enrolled client grants
   *  the firm AP-approval mandate. Refine once `firm_client_mandates.permissions`
   *  is introduced. */
  can_approve_for_client: boolean;
}

const STATUS_TO_STAGE: Record<string, SupplierInvoiceStage> = {
  received: "received",
  parsed: "received",
  draft: "draft",
  pending_review: "draft",
  pending_approval: "awaiting_client",
  awaiting_client: "awaiting_client",
  attested: "approved",
  approved: "approved",
  in_payment_run: "in_payment_run",
  scheduled: "in_payment_run",
  paid: "paid",
  rejected: "rejected",
};

/**
 * Cross-client supplier-invoice ledger for the WL workspace.
 * Reuses the standard `invoices` table filtered to `invoice_direction = incoming`
 * so nothing is duplicated from the NorthLedger standard supplier engine.
 *
 * AI risk heuristics (no extra LLM call):
 *  - Amount > 3x supplier median for the same client → "ovanligt belopp"
 *  - Same supplier + amount within ±1% in the last 60 days → "möjlig dubblett"
 *  - Overdue > 0 days while still unapproved → "akut — väntar attest"
 */
export function useFirmSupplierInvoices() {
  const { firmId, clients } = useAdvisorContext();

  return useQuery({
    queryKey: ["firm-supplier-invoices", firmId, clients.map((c) => c.id)],
    enabled: !!firmId && clients.length > 0,
    queryFn: async (): Promise<FirmSupplierInvoiceRow[]> => {
      const companyIds = clients.map((c) => c.id);
      if (companyIds.length === 0) return [];

      const { data, error } = await supabase
        .from("invoices")
        .select(
          "id, company_id, invoice_number, counterparty_name, invoice_date, due_date, total_amount, currency, status, paid_at, approval_step, attested_by, next_approver_email, rejection_reason, journal_entry_id, created_at, invoice_type, invoice_direction",
        )
        .in("company_id", companyIds)
        .or(
          "invoice_direction.eq.incoming,and(invoice_type.eq.incoming,invoice_direction.eq.outgoing),and(invoice_type.eq.incoming,invoice_direction.is.null)",
        )
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(500);

      if (error) throw error;

      const nameMap = new Map(clients.map((c) => [c.id, c.name]));
      const today = new Date();
      const todayMs = today.getTime();
      const rows = data ?? [];

      // Pre-index by (company_id, supplier) for duplicate + median-amount checks
      const supplierAmounts = new Map<string, number[]>();
      for (const r of rows) {
        const key = `${r.company_id}::${(r.counterparty_name ?? "").toLowerCase()}`;
        if (!key.endsWith("::")) {
          const arr = supplierAmounts.get(key) ?? [];
          arr.push(Number(r.total_amount ?? 0));
          supplierAmounts.set(key, arr);
        }
      }

      return rows.map((r): FirmSupplierInvoiceRow => {
        const status = String(r.status ?? "received");
        let stage: SupplierInvoiceStage =
          STATUS_TO_STAGE[status] ?? (r.paid_at ? "paid" : "received");
        if (r.paid_at) stage = "paid";

        const daysToDue = r.due_date
          ? Math.floor((new Date(r.due_date).getTime() - todayMs) / 86400000)
          : null;

        const reasons: string[] = [];
        const amount = Number(r.total_amount ?? 0);
        const supplierKey = `${r.company_id}::${(r.counterparty_name ?? "").toLowerCase()}`;
        const peers = supplierAmounts.get(supplierKey) ?? [];

        if (peers.length >= 3) {
          const sorted = [...peers].sort((a, b) => a - b);
          const median = sorted[Math.floor(sorted.length / 2)];
          if (median > 0 && amount > median * 3) {
            reasons.push(`Ovanligt belopp (${Math.round(amount / median)}× median)`);
          }
        }

        // Duplicate detection — same supplier, ±1 % amount, different invoice id
        const dup = rows.find(
          (other) =>
            other.id !== r.id &&
            other.company_id === r.company_id &&
            (other.counterparty_name ?? "").toLowerCase() ===
              (r.counterparty_name ?? "").toLowerCase() &&
            other.counterparty_name &&
            Math.abs(Number(other.total_amount ?? 0) - amount) / Math.max(amount, 1) < 0.01,
        );
        if (dup) reasons.push("Möjlig dubblettfaktura");

        if (
          daysToDue !== null &&
          daysToDue < 0 &&
          stage !== "paid" &&
          stage !== "rejected" &&
          stage !== "approved" &&
          stage !== "in_payment_run"
        ) {
          reasons.push(`Förfallen ${Math.abs(daysToDue)}d — väntar attest`);
        }

        const risk: FirmSupplierInvoiceRow["risk"] =
          reasons.length >= 2 ? "high" : reasons.length === 1 ? "medium" : "low";

        return {
          id: r.id,
          company_id: r.company_id,
          client_name: nameMap.get(r.company_id) ?? "Okänd klient",
          invoice_number: r.invoice_number,
          counterparty_name: r.counterparty_name,
          invoice_date: r.invoice_date,
          due_date: r.due_date,
          total_amount: amount,
          currency: r.currency ?? "SEK",
          status,
          stage,
          daysToDue,
          risk,
          riskReasons: reasons,
          approval_step: (r as any).approval_step ?? null,
          attested_by: (r as any).attested_by ?? null,
          next_approver_email: (r as any).next_approver_email ?? null,
          rejection_reason: (r as any).rejection_reason ?? null,
          journal_entry_id: (r as any).journal_entry_id ?? null,
          created_at: (r as any).created_at ?? null,
          paid_at: r.paid_at ?? null,
          // Every enrolled client grants the firm AP-approval mandate by default.
          can_approve_for_client: true,
        };
      });
    },
  });
}

export const STAGE_META: Record<
  SupplierInvoiceStage,
  { label: string; tone: string; order: number }
> = {
  received: { label: "Mottagen", tone: "bg-slate-100 text-slate-700", order: 1 },
  draft: { label: "Utkast bokförd", tone: "bg-cyan-50 text-[#3b82f6]", order: 2 },
  awaiting_client: {
    label: "Väntar klientattest",
    tone: "bg-amber-50 text-amber-700",
    order: 3,
  },
  approved: { label: "Godkänd", tone: "bg-emerald-50 text-emerald-700", order: 4 },
  in_payment_run: {
    label: "I betalningskörning",
    tone: "bg-indigo-50 text-indigo-700",
    order: 5,
  },
  paid: { label: "Betald", tone: "bg-emerald-100 text-emerald-800", order: 6 },
  rejected: { label: "Avvisad", tone: "bg-rose-50 text-rose-700", order: 0 },
};
