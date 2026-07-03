/**
 * Unified Commerce Accounting Engine
 * Handles all sales flows: POS, e-commerce, payment providers
 * Full accounting logic for sales, refunds, gift cards, multi-VAT
 */

export type SalesChannel = 'pos' | 'shopify' | 'amazon' | 'stripe' | 'klarna' | 'swish' | 'manual';
export type PaymentMethod = 'card' | 'swish' | 'cash' | 'klarna' | 'gift_card' | 'bank_transfer';
export type TransactionType = 'sale' | 'refund' | 'gift_card_sale' | 'gift_card_redeem' | 'gift_card_expire' | 'payout' | 'fee';

export interface CommerceTransaction {
  id: string;
  channel: SalesChannel;
  type: TransactionType;
  date: string;
  grossAmount: number;
  netAmount: number;
  vatBreakdown: VatLine[];
  paymentMethod: PaymentMethod;
  fees: number;
  discount: number;
  refundOfTransactionId?: string;
  giftCardId?: string;
  orderId?: string;
  description: string;
  status: 'pending' | 'booked' | 'reconciled' | 'error';
}

export interface VatLine {
  rate: number; // 25, 12, 6, 0
  baseAmount: number;
  vatAmount: number;
}

export interface JournalLine {
  accountNumber: string;
  accountName: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface AccountingResult {
  lines: JournalLine[];
  description: string;
  balanced: boolean;
}

// ═══════════════════════════════════════════
// 1. SALES — Multi-VAT booking
// ═══════════════════════════════════════════

export function bookSale(tx: CommerceTransaction): AccountingResult {
  const lines: JournalLine[] = [];
  const clearingAccount = getClearingAccount(tx.paymentMethod);
  
  // Debit: receivable/clearing account for gross amount
  lines.push({
    accountNumber: clearingAccount.number,
    accountName: clearingAccount.name,
    debit: tx.grossAmount,
    credit: 0,
    description: `Försäljning ${channelLabel(tx.channel)} — ${tx.orderId || tx.id}`,
  });
  
  // Credit: revenue per VAT rate
  for (const vat of tx.vatBreakdown) {
    const revenueAcc = getRevenueAccount(vat.rate);
    lines.push({
      accountNumber: revenueAcc.number,
      accountName: revenueAcc.name,
      debit: 0,
      credit: vat.baseAmount,
    });
    
    if (vat.vatAmount > 0) {
      const vatAcc = getVatAccount(vat.rate);
      lines.push({
        accountNumber: vatAcc.number,
        accountName: vatAcc.name,
        debit: 0,
        credit: vat.vatAmount,
      });
    }
  }
  
  // Discount reduces revenue
  if (tx.discount > 0) {
    lines.push({
      accountNumber: '3740',
      accountName: 'Lämnade rabatter',
      debit: tx.discount,
      credit: 0,
    });
  }
  
  // Fees
  if (tx.fees > 0) {
    lines.push({
      accountNumber: '6570',
      accountName: 'Bankkostnader',
      debit: tx.fees,
      credit: 0,
    });
    lines.push({
      accountNumber: clearingAccount.number,
      accountName: clearingAccount.name,
      debit: 0,
      credit: tx.fees,
    });
  }
  
  return finalize(lines, `Försäljning ${channelLabel(tx.channel)} — ${tx.orderId || tx.id}`);
}

// ═══════════════════════════════════════════
// 2. PAYMENT FLOWS — clearing → bank
// ═══════════════════════════════════════════

export function bookPayout(
  payoutAmount: number,
  fees: number,
  channel: SalesChannel,
  paymentMethod: PaymentMethod,
  payoutId: string
): AccountingResult {
  const lines: JournalLine[] = [];
  const clearing = getClearingAccount(paymentMethod);
  
  // Debit bank
  lines.push({
    accountNumber: '1930',
    accountName: 'Företagskonto/checkkonto',
    debit: payoutAmount,
    credit: 0,
    description: `Utbetalning ${channelLabel(channel)} — ${payoutId}`,
  });
  
  // Credit clearing
  lines.push({
    accountNumber: clearing.number,
    accountName: clearing.name,
    debit: 0,
    credit: payoutAmount + fees,
  });
  
  // Debit fees if present
  if (fees > 0) {
    lines.push({
      accountNumber: '6570',
      accountName: 'Bankkostnader',
      debit: fees,
      credit: 0,
    });
  }
  
  return finalize(lines, `Utbetalning ${channelLabel(channel)} — ${payoutId}`);
}

// ═══════════════════════════════════════════
// 3. REFUNDS — reverse original transaction
// ═══════════════════════════════════════════

export function bookRefund(
  originalTx: CommerceTransaction,
  refundAmount: number,
  isFullRefund: boolean
): AccountingResult {
  const lines: JournalLine[] = [];
  const proportion = isFullRefund ? 1 : refundAmount / originalTx.grossAmount;
  const clearing = getClearingAccount(originalTx.paymentMethod);
  
  // Credit clearing (money goes back)
  lines.push({
    accountNumber: clearing.number,
    accountName: clearing.name,
    debit: 0,
    credit: refundAmount,
    description: `Retur ${originalTx.orderId || originalTx.id}`,
  });
  
  // Debit revenue per VAT rate (reverse)
  for (const vat of originalTx.vatBreakdown) {
    const revenueAcc = getRevenueAccount(vat.rate);
    const baseRefund = Math.round(vat.baseAmount * proportion * 100) / 100;
    const vatRefund = Math.round(vat.vatAmount * proportion * 100) / 100;
    
    lines.push({
      accountNumber: revenueAcc.number,
      accountName: revenueAcc.name,
      debit: baseRefund,
      credit: 0,
    });
    
    if (vatRefund > 0) {
      const vatAcc = getVatAccount(vat.rate);
      lines.push({
        accountNumber: vatAcc.number,
        accountName: vatAcc.name,
        debit: vatRefund,
        credit: 0,
      });
    }
  }
  
  // Reverse fees proportionally
  const feeRefund = Math.round(originalTx.fees * proportion * 100) / 100;
  if (feeRefund > 0) {
    lines.push({
      accountNumber: '6570',
      accountName: 'Bankkostnader',
      debit: 0,
      credit: feeRefund,
    });
    lines.push({
      accountNumber: clearing.number,
      accountName: clearing.name,
      debit: feeRefund,
      credit: 0,
    });
  }
  
  return finalize(lines, `Retur ${isFullRefund ? 'fullständig' : 'delvis'} — ${originalTx.orderId || originalTx.id}`);
}

// ═══════════════════════════════════════════
// 4. GIFT CARDS — two-step logic
// ═══════════════════════════════════════════

export function bookGiftCardSale(amount: number, paymentMethod: PaymentMethod, giftCardId: string): AccountingResult {
  const lines: JournalLine[] = [];
  const paymentAcc = getClearingAccount(paymentMethod);
  
  // Debit payment
  lines.push({
    accountNumber: paymentAcc.number,
    accountName: paymentAcc.name,
    debit: amount,
    credit: 0,
    description: `Presentkort sålt — ${giftCardId}`,
  });
  
  // Credit gift card liability
  lines.push({
    accountNumber: '2421',
    accountName: 'Skuld presentkort',
    debit: 0,
    credit: amount,
  });
  
  return finalize(lines, `Presentkort sålt — ${giftCardId}`);
}

export function bookGiftCardRedemption(
  amount: number,
  vatBreakdown: VatLine[],
  giftCardId: string
): AccountingResult {
  const lines: JournalLine[] = [];
  
  // Debit gift card liability
  lines.push({
    accountNumber: '2421',
    accountName: 'Skuld presentkort',
    debit: amount,
    credit: 0,
    description: `Presentkort inlöst — ${giftCardId}`,
  });
  
  // Credit revenue + VAT
  for (const vat of vatBreakdown) {
    const revenueAcc = getRevenueAccount(vat.rate);
    lines.push({
      accountNumber: revenueAcc.number,
      accountName: revenueAcc.name,
      debit: 0,
      credit: vat.baseAmount,
    });
    if (vat.vatAmount > 0) {
      const vatAcc = getVatAccount(vat.rate);
      lines.push({
        accountNumber: vatAcc.number,
        accountName: vatAcc.name,
        debit: 0,
        credit: vat.vatAmount,
      });
    }
  }
  
  return finalize(lines, `Presentkort inlöst — ${giftCardId}`);
}

export function bookGiftCardExpiry(amount: number, giftCardId: string): AccountingResult {
  const lines: JournalLine[] = [];
  
  // Debit liability
  lines.push({
    accountNumber: '2421',
    accountName: 'Skuld presentkort',
    debit: amount,
    credit: 0,
  });
  
  // Credit revenue (expired gift card = income)
  lines.push({
    accountNumber: '3990',
    accountName: 'Övriga ersättningar och intäkter',
    debit: 0,
    credit: amount,
  });
  
  return finalize(lines, `Presentkort utgånget — ${giftCardId}`);
}

// ═══════════════════════════════════════════
// 5. INVENTORY — COGS on sale/refund
// ═══════════════════════════════════════════

export function bookInventorySale(costAmount: number, description: string): AccountingResult {
  const lines: JournalLine[] = [
    { accountNumber: '4010', accountName: 'Inköp varor och material', debit: costAmount, credit: 0 },
    { accountNumber: '1460', accountName: 'Lager av handelsvaror', debit: 0, credit: costAmount },
  ];
  return finalize(lines, `Lagerminskning — ${description}`);
}

export function bookInventoryReturn(costAmount: number, description: string): AccountingResult {
  const lines: JournalLine[] = [
    { accountNumber: '1460', accountName: 'Lager av handelsvaror', debit: costAmount, credit: 0 },
    { accountNumber: '4010', accountName: 'Inköp varor och material', debit: 0, credit: costAmount },
  ];
  return finalize(lines, `Lagerökning (retur) — ${description}`);
}

// ═══════════════════════════════════════════
// 6. RECONCILIATION
// ═══════════════════════════════════════════

export interface ReconciliationItem {
  date: string;
  channel: SalesChannel;
  expectedAmount: number;
  actualAmount: number;
  difference: number;
  status: 'matched' | 'partial' | 'missing' | 'timing';
  note?: string;
}

export function reconcilePayouts(
  expectedPayouts: { date: string; channel: SalesChannel; amount: number }[],
  bankTransactions: { date: string; amount: number; reference?: string }[],
  tolerance: number = 1
): ReconciliationItem[] {
  return expectedPayouts.map((exp) => {
    const match = bankTransactions.find(
      (bt) => Math.abs(bt.amount - exp.amount) <= tolerance
    );
    
    if (match) {
      return {
        date: exp.date,
        channel: exp.channel,
        expectedAmount: exp.amount,
        actualAmount: match.amount,
        difference: match.amount - exp.amount,
        status: 'matched' as const,
      };
    }
    
    // Check partial match
    const partial = bankTransactions.find(
      (bt) => Math.abs(bt.amount - exp.amount) <= exp.amount * 0.05
    );
    
    if (partial) {
      return {
        date: exp.date,
        channel: exp.channel,
        expectedAmount: exp.amount,
        actualAmount: partial.amount,
        difference: partial.amount - exp.amount,
        status: 'partial' as const,
        note: `Avvikelse: ${(partial.amount - exp.amount).toFixed(2)} kr (troligen avgifter)`,
      };
    }
    
    return {
      date: exp.date,
      channel: exp.channel,
      expectedAmount: exp.amount,
      actualAmount: 0,
      difference: -exp.amount,
      status: 'missing' as const,
      note: 'Utbetalning ej mottagen — kontrollera betalleverantör',
    };
  });
}

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

function getClearingAccount(method: PaymentMethod) {
  switch (method) {
    case 'card': return { number: '1580', name: 'Fordran kortinlösen' };
    case 'klarna': return { number: '1580', name: 'Fordran Klarna' };
    case 'swish': return { number: '1930', name: 'Företagskonto/checkkonto' };
    case 'cash': return { number: '1910', name: 'Kassa' };
    case 'gift_card': return { number: '2421', name: 'Skuld presentkort' };
    case 'bank_transfer': return { number: '1930', name: 'Företagskonto/checkkonto' };
  }
}

function getRevenueAccount(vatRate: number) {
  if (vatRate === 25) return { number: '3010', name: 'Försäljning varor 25% moms' };
  if (vatRate === 12) return { number: '3011', name: 'Försäljning varor 12% moms' };
  if (vatRate === 6) return { number: '3012', name: 'Försäljning varor 6% moms' };
  return { number: '3013', name: 'Försäljning varor momsfri' };
}

function getVatAccount(vatRate: number) {
  if (vatRate === 25) return { number: '2611', name: 'Utgående moms på varor 25%' };
  if (vatRate === 12) return { number: '2621', name: 'Utgående moms på varor 12%' };
  if (vatRate === 6) return { number: '2631', name: 'Utgående moms på varor 6%' };
  return { number: '2650', name: 'Redovisningskonto för moms' };
}

export function channelLabel(ch: SalesChannel): string {
  const map: Record<SalesChannel, string> = {
    pos: 'Kassa', shopify: 'Shopify', amazon: 'Amazon',
    stripe: 'Stripe', klarna: 'Klarna', swish: 'Swish', manual: 'Manuell',
  };
  return map[ch] || ch;
}

function finalize(lines: JournalLine[], description: string): AccountingResult {
  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  return {
    lines,
    description,
    balanced: Math.abs(totalDebit - totalCredit) < 0.01,
  };
}

// Split a gross amount across VAT rates
export function splitByVat(grossAmount: number, vatRates: { rate: number; share: number }[]): VatLine[] {
  return vatRates.map((vr) => {
    const portion = grossAmount * vr.share;
    const base = Math.round((portion / (1 + vr.rate / 100)) * 100) / 100;
    const vat = Math.round((portion - base) * 100) / 100;
    return { rate: vr.rate, baseAmount: base, vatAmount: vat };
  });
}
