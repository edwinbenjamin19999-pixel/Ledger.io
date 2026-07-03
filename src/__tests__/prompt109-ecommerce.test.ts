import { describe, it, expect } from 'vitest';
import { classifyGeography, getVatRateForGeography, getMomsdeklarationRuta, OSS_THRESHOLD_SEK } from '../lib/ecommerce/geographyEngine';
import { bookEcommerceOrder, validateJournalBalance } from '../lib/ecommerce/ecommerceBookingEngine';
import { reconcilePayout, matchBankTransaction } from '../lib/ecommerce/payoutReconciliation';
import { processReturn } from '../lib/ecommerce/returnEngine';
import { calculateProductMargins, isLowMargin } from '../lib/ecommerce/marginEngine';
import { getStockAlertLevel, getAvailableStock, getStockBadge } from '../lib/ecommerce/inventoryEngine';
import type { EcommerceOrder, EcommerceOrderLine, EcommercePayout } from '../lib/ecommerce/types';

// ============= Geography Engine =============
describe('Geography Engine', () => {
  it('classifies SE as domestic', () => {
    expect(classifyGeography('SE', null)).toBe('domestic_se');
    expect(classifyGeography(null, null)).toBe('domestic_se');
  });

  it('classifies EU B2B with valid VAT number', () => {
    expect(classifyGeography('DE', 'DE123456789')).toBe('eu_b2b');
  });

  it('classifies EU B2C without VAT number', () => {
    expect(classifyGeography('DE', null)).toBe('eu_b2c_oss');
    expect(classifyGeography('FI', '')).toBe('eu_b2c_oss');
  });

  it('classifies non-EU as export', () => {
    expect(classifyGeography('US', null)).toBe('export_non_eu');
    expect(classifyGeography('JP', null)).toBe('export_non_eu');
  });

  it('returns correct VAT rate by geography', () => {
    expect(getVatRateForGeography('domestic_se', 25)).toBe(25);
    expect(getVatRateForGeography('eu_b2b', 25)).toBe(0);
    expect(getVatRateForGeography('export_non_eu', 25)).toBe(0);
    expect(getVatRateForGeography('eu_b2c_oss', 25, 19)).toBe(19); // German rate
  });

  it('maps momsdeklaration rutor correctly', () => {
    expect(getMomsdeklarationRuta('domestic_se', 25)).toEqual({ salesRuta: '05', vatRuta: '10' });
    expect(getMomsdeklarationRuta('domestic_se', 12)).toEqual({ salesRuta: '06', vatRuta: '11' });
    expect(getMomsdeklarationRuta('domestic_se', 6)).toEqual({ salesRuta: '07', vatRuta: '12' });
    expect(getMomsdeklarationRuta('eu_b2b', 0)).toEqual({ salesRuta: '39', vatRuta: null });
    expect(getMomsdeklarationRuta('export_non_eu', 0)).toEqual({ salesRuta: '36', vatRuta: null });
  });

  it('has correct OSS threshold', () => {
    expect(OSS_THRESHOLD_SEK).toBe(113000);
  });
});

// ============= Booking Engine =============
describe('E-commerce Booking Engine', () => {
  const makeOrder = (overrides: Partial<EcommerceOrder> = {}): EcommerceOrder => ({
    id: 'test-1', company_id: 'c1', platform: 'shopify', platform_order_id: 'SH-1001',
    order_date: '2026-04-10', currency: 'SEK', customer_country: 'SE', customer_vat_number: null,
    gross_amount: 1250, gross_amount_sek: 1250, shipping_amount_sek: 0, discount_amount_sek: 0,
    platform_fee_sek: 37.5, payment_fee_sek: 12.5, vat_amount_sek: 250, net_revenue_sek: 1000,
    refunded_amount_sek: 0, status: 'paid', payout_id: null, bookkeeping_entry_id: null,
    ...overrides,
  });

  const makeLines = (): EcommerceOrderLine[] => [{
    id: 'l1', order_id: 'test-1', company_id: 'c1', product_id: 'p1',
    product_name: 'Test produkt', sku: 'TP-1', quantity: 1,
    unit_price_sek: 1000, vat_rate: 25, vat_amount_sek: 250, line_total_sek: 1250,
    product_category: 'physical_25',
  }];

  it('creates a balanced journal entry for domestic SE order', () => {
    const result = bookEcommerceOrder(makeOrder(), makeLines());
    expect(result.geography).toBe('domestic_se');
    expect(result.vatRate).toBe(25);
    expect(result.description).toContain('Shopify');
    expect(result.description).toContain('SH-1001');

    const { balanced } = validateJournalBalance(result.lines);
    expect(balanced).toBe(true);
  });

  it('creates 0% VAT for export orders', () => {
    const result = bookEcommerceOrder(
      makeOrder({ customer_country: 'US', vat_amount_sek: 0, net_revenue_sek: 1250 }),
      makeLines()
    );
    expect(result.geography).toBe('export_non_eu');
    expect(result.vatRate).toBe(0);
  });

  it('creates 0% VAT for EU B2B', () => {
    const result = bookEcommerceOrder(
      makeOrder({ customer_country: 'DE', customer_vat_number: 'DE123456789', vat_amount_sek: 0, net_revenue_sek: 1250 }),
      makeLines()
    );
    expect(result.geography).toBe('eu_b2b');
    expect(result.vatRate).toBe(0);
  });

  it('handles platform and payment fees', () => {
    const result = bookEcommerceOrder(makeOrder(), makeLines());
    const feeLines = result.lines.filter(l => l.accountNumber === '6570');
    expect(feeLines.length).toBeGreaterThan(0);
    const totalFees = feeLines.reduce((s, l) => s + l.debit, 0);
    expect(totalFees).toBe(50); // 37.5 + 12.5
  });
});

// ============= Payout Reconciliation =============
describe('Payout Reconciliation', () => {
  it('matches payout to orders within tolerance', () => {
    const payout: EcommercePayout = {
      id: 'po-1', company_id: 'c1', platform: 'stripe', platform_payout_id: 'po_123',
      payout_date: '2026-04-09', gross_amount_sek: 1250, fees_sek: 50,
      net_amount_sek: 950, status: 'pending', matched_bank_transaction_id: null, order_ids: ['o1'],
    };
    const orders: EcommerceOrder[] = [{
      id: 'o1', company_id: 'c1', platform: 'stripe', platform_order_id: 'S1',
      order_date: '2026-04-08', currency: 'SEK', customer_country: 'SE', customer_vat_number: null,
      gross_amount: 1250, gross_amount_sek: 1250, shipping_amount_sek: 0, discount_amount_sek: 0,
      platform_fee_sek: 37.5, payment_fee_sek: 12.5, vat_amount_sek: 250, net_revenue_sek: 1000,
      refunded_amount_sek: 0, status: 'paid', payout_id: 'po-1', bookkeeping_entry_id: null,
    }];

    const result = reconcilePayout(payout, orders);
    expect(result.matched).toBe(true);
    expect(result.clearingEntry).not.toBeNull();
    expect(result.clearingEntry!.length).toBe(2);
  });

  it('flags discrepancy > 1 kr', () => {
    const payout: EcommercePayout = {
      id: 'po-2', company_id: 'c1', platform: 'stripe', platform_payout_id: 'po_456',
      payout_date: '2026-04-09', gross_amount_sek: 1000, fees_sek: 0,
      net_amount_sek: 800, status: 'pending', matched_bank_transaction_id: null, order_ids: ['o2'],
    };
    const orders: EcommerceOrder[] = [{
      id: 'o2', company_id: 'c1', platform: 'stripe', platform_order_id: 'S2',
      order_date: '2026-04-08', currency: 'SEK', customer_country: 'SE', customer_vat_number: null,
      gross_amount: 1000, gross_amount_sek: 1000, shipping_amount_sek: 0, discount_amount_sek: 0,
      platform_fee_sek: 0, payment_fee_sek: 0, vat_amount_sek: 200, net_revenue_sek: 1000,
      refunded_amount_sek: 0, status: 'paid', payout_id: null, bookkeeping_entry_id: null,
    }];

    const result = reconcilePayout(payout, orders);
    expect(result.matched).toBe(false);
    expect(result.status).toBe('needs_review');
  });

  it('matches bank transaction within tolerance', () => {
    expect(matchBankTransaction(34782, 34782)).toBe(true);
    expect(matchBankTransaction(34782, 34783)).toBe(true);
    expect(matchBankTransaction(34782, 34784)).toBe(false);
  });
});

// ============= Return Engine =============
describe('Return Engine', () => {
  it('creates full reversal entry', () => {
    const result = processReturn({
      orderId: 'o1', platform: 'shopify', platformOrderId: 'SH-4521',
      returnType: 'full', refundAmountSek: 1250, originalGrossSek: 1250,
      originalVatSek: 250, originalNetRevenueSek: 1000, originalPlatformFeeSek: 37.5,
      customerCountry: 'SE', returnableToStock: true, sku: 'BS-42', quantity: 1,
    });
    expect(result.reversalEntry.length).toBeGreaterThan(0);
    expect(result.message).toContain('SH-4521');
    expect(result.stockAdjustment).toEqual({ sku: 'BS-42', quantity: 1 });
  });

  it('creates partial reversal with proportion', () => {
    const result = processReturn({
      orderId: 'o2', platform: 'shopify', platformOrderId: 'SH-4522',
      returnType: 'partial', refundAmountSek: 625, originalGrossSek: 1250,
      originalVatSek: 250, originalNetRevenueSek: 1000, originalPlatformFeeSek: 37.5,
      customerCountry: 'SE', returnableToStock: false,
    });
    // Partial: 50% proportion
    const revenueReversal = result.reversalEntry.find(l => l.accountNumber === '3010');
    expect(revenueReversal).toBeDefined();
    expect(result.stockAdjustment).toBeNull();
  });
});

// ============= Margin Engine =============
describe('Margin Engine', () => {
  it('calculates product margins correctly', () => {
    const lines = [
      { sku: 'A1', product_name: 'Produkt A', quantity: 10, line_total_sek: 5000, vat_amount_sek: 1000 },
      { sku: 'B1', product_name: 'Produkt B', quantity: 5, line_total_sek: 2500, vat_amount_sek: 500 },
    ];
    const costMap = new Map([['A1', 200], ['B1', 150]]);
    const results = calculateProductMargins(lines, costMap, 300, 100, 2);

    expect(results.length).toBe(2);
    const a1 = results.find(r => r.sku === 'A1')!;
    expect(a1.unitsSold).toBe(10);
    expect(a1.revenue).toBe(4000); // 5000 - 1000 VAT
    expect(a1.cogs).toBe(2000); // 200 * 10
  });

  it('identifies low margin products', () => {
    expect(isLowMargin(9)).toBe(true);
    expect(isLowMargin(10)).toBe(false);
    expect(isLowMargin(50)).toBe(false);
  });
});

// ============= Inventory Engine =============
describe('Inventory Engine', () => {
  it('calculates available stock', () => {
    expect(getAvailableStock(100, 20)).toBe(80);
    expect(getAvailableStock(5, 5)).toBe(0);
  });

  it('classifies stock alert levels', () => {
    expect(getStockAlertLevel(0, 0, 10)).toBe('out_of_stock');
    expect(getStockAlertLevel(3, 3, 10)).toBe('out_of_stock');
    expect(getStockAlertLevel(8, 4, 10)).toBe('critical'); // available=4, reorder/2=5
    expect(getStockAlertLevel(15, 5, 10)).toBe('low_stock'); // available=10, at reorder point
    expect(getStockAlertLevel(100, 5, 10)).toBe('in_stock');
  });

  it('returns correct badge info', () => {
    expect(getStockBadge('out_of_stock').label).toBe('SLUTSÅLD');
    expect(getStockBadge('low_stock').label).toBe('LÅGT LAGER');
    expect(getStockBadge('in_stock').label).toBe('I lager');
  });
});
