/**
 * Auto-book a preliminary tax (F-skatt) payment.
 *
 *   Debit  2518 (Betald F-skatt)
 *   Credit 1930 (Företagskonto)
 *
 * Thin wrapper around bookSKVPayment for backward compatibility.
 */

import { bookSKVPayment } from "./bookSKVPayment";

export interface BookFTaxPaymentParams {
  companyId: string;
  userId: string;
  amount: number;
  /** ISO YYYY-MM-DD */
  entryDate: string;
  /** Optional reference text (bank reference, OCR, etc). */
  reference?: string;
  /** Optional: bank account number to credit instead of default 1930. */
  bankAccountNumber?: string;
}

export interface BookFTaxPaymentResult {
  journalEntryId: string;
  journalNumber: string | null;
  amount: number;
}

export async function bookFTaxPayment(
  params: BookFTaxPaymentParams,
): Promise<BookFTaxPaymentResult> {
  const result = await bookSKVPayment({ ...params, paymentType: "f_tax" });
  return {
    journalEntryId: result.journalEntryId,
    journalNumber: result.journalNumber,
    amount: result.amount,
  };
}
