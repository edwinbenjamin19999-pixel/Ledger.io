/**
 * Phase 3 — Bank payment initiation (PIS) types.
 * Sandbox-stub today; real provider plugs in here once PIS scope is granted.
 */

export type PISProviderId =
  | "enable_banking_sandbox"
  | "enable_banking" // real PIS — pending scope on the agreement
  | "tink"
  | "salt_edge";

export interface InitiatePaymentInput {
  companyId: string;
  paymentBatchId?: string | null;
  amount: number;
  currency: string;
  debtorIban?: string | null;
  creditorName: string;
  creditorIban?: string | null;
  reference?: string | null;
  /** Where the bank redirects the user after BankID approval. */
  returnUrl: string;
}

export interface InitiatePaymentResult {
  initiationId: string;
  providerPaymentId: string;
  redirectUrl: string;
  status: "pending" | "redirected";
  provider: PISProviderId;
}

export const PIS_PROVIDER_REGISTRY: Record<PISProviderId, { displayName: string; isLive: boolean }> = {
  enable_banking_sandbox: { displayName: "Enable Banking (sandbox)", isLive: false },
  enable_banking:         { displayName: "Enable Banking (PIS)",     isLive: false },
  tink:                   { displayName: "Tink (Visa)",               isLive: false },
  salt_edge:              { displayName: "Salt Edge",                 isLive: false },
};

/** Single switch — change here when real PIS is granted. */
export function getActivePISProvider(): PISProviderId {
  return "enable_banking_sandbox";
}
