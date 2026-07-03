/**
 * Unified status taxonomy for the supplier payments module.
 * Maps existing legacy statuses (draft/approved/sent_to_bank/...) onto
 * the new client-facing labels without breaking existing data.
 */

export type PaymentBatchStatus =
  | "draft"
  | "ready_for_payment"
  | "pending_approval"
  | "approved_1"
  | "approved"
  | "rejected"
  | "exported_to_bank"
  | "awaiting_bank_approval"
  | "sent_to_bank"
  | "downloaded"
  | "completed"
  | "paid"
  | "failed";

export const PAYMENT_STATUS_LABEL: Record<PaymentBatchStatus, string> = {
  draft: "Utkast",
  ready_for_payment: "Klar för betalning",
  pending_approval: "Väntar på intern attest",
  approved_1: "Internt attest 1/2",
  approved: "Internt attesterad",
  rejected: "Avvisad",
  exported_to_bank: "Exporterad till bank",
  awaiting_bank_approval: "Inväntar bankgodkännande",
  sent_to_bank: "Skickad till bank",
  downloaded: "Filen nedladdad",
  completed: "Slutförd",
  paid: "Betald",
  failed: "Misslyckad",
};

export type StatusTone = "neutral" | "info" | "warning" | "success" | "danger";

export const PAYMENT_STATUS_TONE: Record<PaymentBatchStatus, StatusTone> = {
  draft: "neutral",
  ready_for_payment: "info",
  pending_approval: "warning",
  approved_1: "warning",
  approved: "info",
  rejected: "danger",
  exported_to_bank: "info",
  awaiting_bank_approval: "warning",
  sent_to_bank: "info",
  downloaded: "info",
  completed: "success",
  paid: "success",
  failed: "danger",
};

/** Allowed manual transitions from the UI. Server enforces nothing extra — RLS + check constraint. */
export const MANUAL_TRANSITIONS: Partial<Record<PaymentBatchStatus, PaymentBatchStatus[]>> = {
  exported_to_bank: ["awaiting_bank_approval", "paid", "failed"],
  awaiting_bank_approval: ["paid", "failed"],
  downloaded: ["awaiting_bank_approval", "paid", "failed"],
  sent_to_bank: ["awaiting_bank_approval", "paid", "failed"],
  approved: ["exported_to_bank"],
  completed: ["paid"],
};

export function nextManualStatuses(current: string): PaymentBatchStatus[] {
  return MANUAL_TRANSITIONS[current as PaymentBatchStatus] ?? [];
}
