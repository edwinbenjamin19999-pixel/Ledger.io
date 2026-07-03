// Payout reconciliation engine (Section 5)
import type { EcommercePayout, EcommerceOrder } from './types';
import type { JournalLine } from './ecommerceBookingEngine';

export interface ReconciliationResult {
  matched: boolean;
  discrepancy: number;
  status: 'matched' | 'needs_review' | 'pending';
  clearingEntry: JournalLine[] | null;
  message: string;
}

/**
 * Verifies payout against constituent orders and creates clearing entry.
 */
export function reconcilePayout(
  payout: EcommercePayout,
  orders: EcommerceOrder[]
): ReconciliationResult {
  // Sum net revenue from all constituent orders
  const ordersNetTotal = orders.reduce((sum, o) => sum + (o.net_revenue_sek || 0), 0);
  const ordersFees = orders.reduce((sum, o) => sum + (o.platform_fee_sek || 0) + (o.payment_fee_sek || 0), 0);
  const expectedNet = ordersNetTotal - ordersFees;
  
  const discrepancy = Math.abs(expectedNet - payout.net_amount_sek);
  
  if (discrepancy > 1) {
    return {
      matched: false,
      discrepancy,
      status: 'needs_review',
      clearingEntry: null,
      message: `Avvikelse på ${discrepancy.toFixed(2)} kr mellan ordersumma och utbetalning. Granskning krävs.`,
    };
  }
  
  // Create clearing journal entry
  const clearingEntry: JournalLine[] = [
    {
      accountNumber: '1930',
      accountName: 'Företagskonto/checkkonto',
      debit: payout.net_amount_sek,
      credit: 0,
      description: `Utbetalning ${payout.platform} — ${payout.platform_payout_id}`,
    },
    {
      accountNumber: '1580',
      accountName: 'Fordringar hos koncernföretag',
      debit: 0,
      credit: payout.net_amount_sek,
      description: `Clearing ${payout.platform}`,
    },
  ];
  
  return {
    matched: true,
    discrepancy: 0,
    status: 'matched',
    clearingEntry,
    message: `Utbetalningen på ${payout.net_amount_sek.toLocaleString('sv-SE')} kr från ${capitalize(payout.platform)} har matchats mot ${orders.length} ordrar och bokförts mot ditt bankkonto. Ingen manuell åtgärd krävs.`,
  };
}

/**
 * Try to match a bank transaction to a payout by amount (±1 kr tolerance).
 */
export function matchBankTransaction(
  payoutAmount: number,
  bankTransactionAmount: number
): boolean {
  return Math.abs(payoutAmount - bankTransactionAmount) <= 1;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
