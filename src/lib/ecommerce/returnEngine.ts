// Return and refund engine (Section 7)
import type { JournalLine } from './ecommerceBookingEngine';

export interface ReturnInput {
  orderId: string;
  platform: string;
  platformOrderId: string;
  returnType: 'full' | 'partial';
  refundAmountSek: number;
  restockingFeeSek?: number;
  originalGrossSek: number;
  originalVatSek: number;
  originalNetRevenueSek: number;
  originalPlatformFeeSek: number;
  customerCountry: string;
  returnableToStock: boolean;
  sku?: string;
  quantity?: number;
}

export interface ReturnResult {
  reversalEntry: JournalLine[];
  message: string;
  stockAdjustment: { sku: string; quantity: number } | null;
}

/**
 * Creates reversal journal entries for a return/refund.
 */
export function processReturn(input: ReturnInput): ReturnResult {
  const lines: JournalLine[] = [];
  const isFullRefund = input.returnType === 'full';
  
  // Calculate proportional amounts for partial refunds
  const proportion = isFullRefund ? 1 : input.refundAmountSek / input.originalGrossSek;
  
  const refundGross = isFullRefund ? input.originalGrossSek : input.refundAmountSek;
  const refundVat = Math.round(input.originalVatSek * proportion * 100) / 100;
  const refundNet = refundGross - refundVat;
  const refundFee = Math.round(input.originalPlatformFeeSek * proportion * 100) / 100;
  
  // Mirror the original entry (swap debit/credit)
  // 1. Credit clearing account (money goes back)
  lines.push({
    accountNumber: '1580',
    accountName: 'Fordringar hos koncernföretag',
    debit: 0,
    credit: refundGross,
    description: `Retur order #${input.platformOrderId}`,
  });
  
  // 2. Debit revenue (reverse the sale)
  lines.push({
    accountNumber: '3010',
    accountName: 'Försäljning varor 25% moms',
    debit: refundNet,
    credit: 0,
  });
  
  // 3. Debit VAT (reverse)
  if (refundVat > 0) {
    lines.push({
      accountNumber: '2611',
      accountName: 'Utgående moms på varor 25%',
      debit: refundVat,
      credit: 0,
    });
  }
  
  // 4. Credit platform fee reversal
  if (refundFee > 0) {
    lines.push({
      accountNumber: '6570',
      accountName: 'Bankkostnader',
      debit: 0,
      credit: refundFee,
    });
    lines.push({
      accountNumber: '1580',
      accountName: 'Fordringar hos koncernföretag',
      debit: refundFee,
      credit: 0,
    });
  }
  
  // 5. Restocking fee
  if (input.restockingFeeSek && input.restockingFeeSek > 0) {
    lines.push({
      accountNumber: '3740',
      accountName: 'Lämnade rabatter',
      debit: 0,
      credit: input.restockingFeeSek,
    });
  }
  
  const typeLabel = isFullRefund ? 'fullständig' : 'delvis';
  const message = `Returen för order #${input.platformOrderId} (${refundGross.toLocaleString('sv-SE')} kr) är bokförd. Vi har reverserat intäkten och momsen${input.returnableToStock && input.sku ? ', och uppdaterat lagret med +' + (input.quantity || 1) + ' enhet(er)' : ''}.`;
  
  const stockAdjustment = input.returnableToStock && input.sku 
    ? { sku: input.sku, quantity: input.quantity || 1 }
    : null;
  
  return {
    reversalEntry: lines,
    message,
    stockAdjustment,
  };
}
