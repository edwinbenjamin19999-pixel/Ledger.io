// E-commerce automatic bookkeeping engine (Section 4)
import { classifyGeography, getVatRateForGeography } from './geographyEngine';
import type { EcommerceOrder, EcommerceOrderLine, TransactionGeography, ProductCategory } from './types';
import { VAT_RATE_BY_CATEGORY } from './types';

export interface JournalLine {
  accountNumber: string;
  accountName: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface EcommerceJournalEntry {
  description: string;
  lines: JournalLine[];
  geography: TransactionGeography;
  vatRate: number;
}

/**
 * Creates a complete journal entry for an e-commerce order.
 * Follows BAS 2026 standard accounts.
 */
export function bookEcommerceOrder(
  order: EcommerceOrder,
  lines: EcommerceOrderLine[],
  ossCountryRate?: number
): EcommerceJournalEntry {
  const geography = classifyGeography(order.customer_country, order.customer_vat_number);
  
  // Determine primary VAT rate from order lines
  const primaryCategory = lines[0]?.product_category as ProductCategory || 'physical_25';
  const baseVatRate = VAT_RATE_BY_CATEGORY[primaryCategory] || 25;
  const effectiveVatRate = getVatRateForGeography(geography, baseVatRate, ossCountryRate);
  
  const journalLines: JournalLine[] = [];
  const desc = `E-handel ${capitalize(order.platform)} — Order #${order.platform_order_id} — ${order.customer_country || 'SE'}`;
  
  // Calculate amounts
  const netRevenue = order.net_revenue_sek;
  const vatAmount = order.vat_amount_sek;
  const grossAmount = order.gross_amount_sek;
  const platformFee = order.platform_fee_sek;
  const paymentFee = order.payment_fee_sek;
  const shippingAmount = order.shipping_amount_sek;
  const discountAmount = order.discount_amount_sek;
  
  // 1. Debit receivable/bank for gross amount
  journalLines.push({
    accountNumber: '1580', // Clearing account (Stripe/Shopify)
    accountName: 'Fordringar hos koncernföretag',
    debit: grossAmount,
    credit: 0,
    description: `Fordran ${capitalize(order.platform)}`,
  });
  
  // 2. Credit revenue account based on geography and VAT rate
  const revenueAccount = getRevenueAccount(geography, effectiveVatRate);
  const revenueAmount = netRevenue - (shippingAmount || 0) + (discountAmount || 0);
  if (revenueAmount > 0) {
    journalLines.push({
      accountNumber: revenueAccount.number,
      accountName: revenueAccount.name,
      debit: 0,
      credit: revenueAmount,
    });
  }
  
  // 3. Credit VAT account if applicable
  if (vatAmount > 0 && effectiveVatRate > 0) {
    const vatAccount = getVatAccount(geography, effectiveVatRate);
    journalLines.push({
      accountNumber: vatAccount.number,
      accountName: vatAccount.name,
      debit: 0,
      credit: vatAmount,
    });
  }
  
  // 4. Credit shipping revenue
  if (shippingAmount && shippingAmount > 0) {
    const shippingNet = Math.round(shippingAmount * 100 / (100 + effectiveVatRate));
    const shippingVat = shippingAmount - shippingNet;
    journalLines.push({
      accountNumber: '3520',
      accountName: 'Fakturerade frakter',
      debit: 0,
      credit: shippingNet,
    });
    if (shippingVat > 0 && effectiveVatRate > 0) {
      // VAT on shipping already included in total VAT line
    }
  }
  
  // 5. Debit discount account
  if (discountAmount && discountAmount > 0) {
    journalLines.push({
      accountNumber: '3740',
      accountName: 'Lämnade rabatter',
      debit: discountAmount,
      credit: 0,
    });
  }
  
  // 6. Debit platform fee
  if (platformFee && platformFee > 0) {
    journalLines.push({
      accountNumber: '6570',
      accountName: 'Bankkostnader',
      debit: platformFee,
      credit: 0,
    });
    journalLines.push({
      accountNumber: '1580',
      accountName: 'Fordringar hos koncernföretag',
      debit: 0,
      credit: platformFee,
    });
  }
  
  // 7. Debit payment fee
  if (paymentFee && paymentFee > 0) {
    journalLines.push({
      accountNumber: '6570',
      accountName: 'Bankkostnader',
      debit: paymentFee,
      credit: 0,
    });
    journalLines.push({
      accountNumber: '1580',
      accountName: 'Fordringar hos koncernföretag',
      debit: 0,
      credit: paymentFee,
    });
  }
  
  return {
    description: desc,
    lines: journalLines,
    geography,
    vatRate: effectiveVatRate,
  };
}

function getRevenueAccount(geography: TransactionGeography, vatRate: number) {
  switch (geography) {
    case 'domestic_se':
      if (vatRate === 25) return { number: '3010', name: 'Försäljning varor 25% moms' };
      if (vatRate === 12) return { number: '3011', name: 'Försäljning varor 12% moms' };
      if (vatRate === 6) return { number: '3012', name: 'Försäljning varor 6% moms' };
      return { number: '3013', name: 'Försäljning varor momsfri' };
    case 'eu_b2b':
      return { number: '3300', name: 'Försäljning varor EU' };
    case 'eu_b2c_oss':
      return { number: '3010', name: 'Försäljning varor 25% moms' };
    case 'export_non_eu':
      return { number: '3310', name: 'Försäljning varor utanför EU' };
  }
}

function getVatAccount(_geography: TransactionGeography, vatRate: number) {
  if (vatRate === 25) return { number: '2611', name: 'Utgående moms på varor 25%' };
  if (vatRate === 12) return { number: '2621', name: 'Utgående moms på varor 12%' };
  if (vatRate === 6) return { number: '2631', name: 'Utgående moms på varor 6%' };
  return { number: '2650', name: 'Redovisningskonto för moms' };
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Validates that total debits equal total credits.
 */
export function validateJournalBalance(lines: JournalLine[]): { balanced: boolean; diff: number } {
  const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
  const diff = Math.abs(totalDebit - totalCredit);
  return { balanced: diff < 0.01, diff };
}
