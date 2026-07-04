/**
 * Payment provider abstraction — Phase 1 ships file_export only.
 * Phase 3 will add Salt Edge / Tink / TrueLayer / Yapily implementations
 * without changing this interface.
 *
 * Important: Cogniq does not hold a PSD2 license. The platform never
 * initiates payments directly. Every provider must terminate in a flow
 * where the user approves the payment in their own bank or via a
 * licensed PIS provider's redirect.
 */

export type PaymentProviderType = "file_export" | "open_banking";

export type PaymentProviderName =
  | "manual_file_export"
  | "salt_edge"
  | "tink"
  | "truelayer"
  | "yapily";

export type PaymentProviderStatus = "inactive" | "sandbox" | "active";

export interface PaymentProviderConfig {
  id: string;
  company_id: string;
  provider_type: PaymentProviderType;
  provider_name: PaymentProviderName;
  display_name: string;
  supports_account_information: boolean;
  supports_payment_initiation: boolean;
  status: PaymentProviderStatus;
}

export interface PreparedPayment {
  proposalId: string;
  totalAmount: number;
  currency: string;
  invoiceCount: number;
  paymentDate: string;
}

export interface PreparePaymentResult {
  /** Payload the user submits to their bank — for file_export this is the pain.001 XML. */
  artifact?: { filename: string; mimeType: string; content: string };
  /** Optional handoff URL (Phase 3 redirect flows). */
  handoffUrl?: string;
  /** Provider-side reference for later reconciliation. */
  externalReference?: string;
  /** Whether the user must take an explicit next step (always true for file_export). */
  requiresUserAction: true;
  /** Human-readable instruction shown after preparation. */
  nextStepLabel: string;
}

export interface PaymentProvider {
  readonly type: PaymentProviderType;
  readonly name: PaymentProviderName;
  readonly displayName: string;

  /**
   * Prepare a payment. NEVER initiates — only produces an artifact or
   * a handoff that the user completes in their own bank / licensed PIS.
   */
  preparePayment(payment: PreparedPayment, pain001Xml: string): Promise<PreparePaymentResult>;
}
