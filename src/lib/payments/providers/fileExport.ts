import type {
  PaymentProvider,
  PreparedPayment,
  PreparePaymentResult,
} from "./types";

/**
 * Manual file export — user downloads the pain.001 XML and uploads it
 * to their bank. Approval and execution happen in the bank, never here.
 */
export const fileExportProvider: PaymentProvider = {
  type: "file_export",
  name: "manual_file_export",
  displayName: "Manuell filexport (ISO 20022)",

  async preparePayment(payment: PreparedPayment, pain001Xml: string): Promise<PreparePaymentResult> {
    const filename = `payment-${payment.proposalId.slice(0, 8)}-${payment.paymentDate}.xml`;
    return {
      artifact: { filename, mimeType: "application/xml", content: pain001Xml },
      requiresUserAction: true,
      nextStepLabel: "Ladda upp filen i din bank och godkänn där",
    };
  },
};
