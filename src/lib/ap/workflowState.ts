/**
 * AP Ledger v5 — Workflow State Machine
 * Single source of truth for supplier-invoice lifecycle state.
 */

export type WorkflowState =
  | "INVOICE_LOGGED"
  | "AI_VERIFIED"
  | "SUPPLIER_REVIEW_REQUIRED"
  | "PRE_ACCOUNTED"
  | "IN_APPROVAL_FLOW"
  | "APPROVED_FOR_PAYMENT"
  | "IN_PAYMENT_PROPOSAL"
  | "PAYMENT_SIGNED"
  | "PAID"
  | "REJECTED"
  | "UNDER_INVESTIGATION"
  | "BLOCKED_HIGH_RISK";

export interface WorkflowStateMeta {
  label: string;
  /** Tailwind classes for badge surface (light bg + text + border) */
  className: string;
  /** Whether to render the approval-step counter (X/Y) inside the badge */
  showApprovalSteps: boolean;
  /** Group used by list filter chips */
  group:
    | "preparing"
    | "needs_action"
    | "in_approval"
    | "approved"
    | "in_proposal"
    | "signed"
    | "paid"
    | "blocked"
    | "rejected";
}

export const WORKFLOW_STATE_META: Record<WorkflowState, WorkflowStateMeta> = {
  INVOICE_LOGGED: {
    label: "Förbereder",
    className: "bg-[#F1F5F9] text-[#475569] border-[0.5px] border-[#E2E8F0]",
    showApprovalSteps: false,
    group: "preparing",
  },
  AI_VERIFIED: {
    label: "AI-verifierad",
    className: "bg-[#F1F5F9] text-[#475569] border-[0.5px] border-[#E2E8F0]",
    showApprovalSteps: false,
    group: "preparing",
  },
  SUPPLIER_REVIEW_REQUIRED: {
    label: "Ny leverantör",
    className: "bg-[#FAEEDA] text-[#7A5417] border-[0.5px] border-[#E8C589]",
    showApprovalSteps: false,
    group: "needs_action",
  },
  PRE_ACCOUNTED: {
    label: "Förkonterad",
    className: "bg-[#F1F5F9] text-[#475569] border-[0.5px] border-[#E2E8F0]",
    showApprovalSteps: false,
    group: "preparing",
  },
  IN_APPROVAL_FLOW: {
    label: "Attest",
    className: "bg-[#FAEEDA] text-[#7A5417] border-[0.5px] border-[#E8C589]",
    showApprovalSteps: true,
    group: "in_approval",
  },
  APPROVED_FOR_PAYMENT: {
    label: "Klar för betalning",
    className: "bg-[#E1F5EE] text-[#085041] border-[0.5px] border-[#5DCAA5]",
    showApprovalSteps: false,
    group: "approved",
  },
  IN_PAYMENT_PROPOSAL: {
    label: "I betalförslag",
    className: "bg-[#E6F4FA] text-[#0C447C] border-[0.5px] border-[#C8DDF5]",
    showApprovalSteps: false,
    group: "in_proposal",
  },
  PAYMENT_SIGNED: {
    label: "Signerad",
    className: "bg-[#EFF6FF] text-[#185FA5] border-[0.5px] border-[#C8DDF5]",
    showApprovalSteps: false,
    group: "signed",
  },
  PAID: {
    label: "Betald",
    className: "bg-[#E1F5EE] text-[#085041] border-[0.5px] border-[#5DCAA5]",
    showApprovalSteps: false,
    group: "paid",
  },
  REJECTED: {
    label: "Avvisad",
    className: "bg-[#F1F5F9] text-[#94A3B8] border-[0.5px] border-[#E2E8F0]",
    showApprovalSteps: false,
    group: "rejected",
  },
  UNDER_INVESTIGATION: {
    label: "Under utredning",
    className: "bg-[#FCE8E8] text-[#7A1F1E] border-[0.5px] border-[#F1A1A0]",
    showApprovalSteps: false,
    group: "needs_action",
  },
  BLOCKED_HIGH_RISK: {
    label: "Blockerad",
    className: "bg-[#FCE8E8] text-[#7A1F1E] border-[0.5px] border-[#F1A1A0]",
    showApprovalSteps: false,
    group: "blocked",
  },
};

/** Terminal states cannot transition back into the active flow. */
export const TERMINAL_STATES: WorkflowState[] = ["PAID", "REJECTED"];

/** True if the row should ever display approval progress (X/Y). */
export function shouldShowApprovalProgress(state: WorkflowState): boolean {
  return WORKFLOW_STATE_META[state].showApprovalSteps;
}

export function getStateMeta(state: string | null | undefined): WorkflowStateMeta {
  if (state && state in WORKFLOW_STATE_META) {
    return WORKFLOW_STATE_META[state as WorkflowState];
  }
  return WORKFLOW_STATE_META.INVOICE_LOGGED;
}

/**
 * Filter chip definitions for invoice list.
 * Mapping is STRICT (data foundation contract):
 *   Inkommande      → INVOICE_LOGGED (+ AI_VERIFIED, PRE_ACCOUNTED — pre-approval prep states)
 *   I attest        → IN_APPROVAL_FLOW
 *   Godkända        → APPROVED_FOR_PAYMENT
 *   I betalförslag  → IN_PAYMENT_PROPOSAL (+ PAYMENT_SIGNED)
 *   Betalda         → PAID
 *   Avvisade        → REJECTED
 *   Kräver åtgärd   → SUPPLIER_REVIEW_REQUIRED · UNDER_INVESTIGATION · BLOCKED_HIGH_RISK
 */
export const FILTER_CHIPS: { id: string; label: string; states: WorkflowState[] }[] = [
  { id: "all", label: "Alla", states: [] },
  {
    id: "needs_action",
    label: "Kräver åtgärd",
    states: ["SUPPLIER_REVIEW_REQUIRED", "UNDER_INVESTIGATION", "BLOCKED_HIGH_RISK"],
  },
  {
    id: "incoming",
    label: "Inkommande",
    states: ["INVOICE_LOGGED", "AI_VERIFIED", "PRE_ACCOUNTED"],
  },
  { id: "in_approval", label: "I attest", states: ["IN_APPROVAL_FLOW"] },
  { id: "approved", label: "Godkända", states: ["APPROVED_FOR_PAYMENT"] },
  { id: "proposal", label: "I betalförslag", states: ["IN_PAYMENT_PROPOSAL", "PAYMENT_SIGNED"] },
  { id: "paid", label: "Betalda", states: ["PAID"] },
  { id: "rejected", label: "Avvisade", states: ["REJECTED"] },
];
