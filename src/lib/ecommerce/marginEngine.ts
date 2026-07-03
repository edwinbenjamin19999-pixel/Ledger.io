// Margin analysis engine (Section 8)

export interface ProductMargin {
  sku: string;
  productName: string;
  unitsSold: number;
  revenue: number;
  cogs: number;
  platformFees: number;
  paymentFees: number;
  grossMarginSek: number;
  grossMarginPct: number;
}

export interface MarginByCountry {
  country: string;
  revenue: number;
  cogs: number;
  margin: number;
  marginPct: number;
}

/**
 * Calculate per-product margin from order lines and cost data.
 */
export function calculateProductMargins(
  orderLines: Array<{
    sku: string | null;
    product_name: string | null;
    quantity: number;
    line_total_sek: number;
    vat_amount_sek: number;
  }>,
  costMap: Map<string, number>, // sku -> cost_price_sek per unit
  totalPlatformFee: number,
  totalPaymentFee: number,
  totalOrderLines: number
): ProductMargin[] {
  const productMap = new Map<string, {
    productName: string;
    unitsSold: number;
    revenue: number;
    lineCount: number;
  }>();

  for (const line of orderLines) {
    const sku = line.sku || 'UNKNOWN';
    const existing = productMap.get(sku) || {
      productName: line.product_name || sku,
      unitsSold: 0,
      revenue: 0,
      lineCount: 0,
    };
    existing.unitsSold += line.quantity;
    existing.revenue += line.line_total_sek - line.vat_amount_sek;
    existing.lineCount += 1;
    productMap.set(sku, existing);
  }

  const results: ProductMargin[] = [];
  for (const [sku, data] of productMap) {
    const costPerUnit = costMap.get(sku) || 0;
    const cogs = costPerUnit * data.unitsSold;
    const feeShare = totalOrderLines > 0 ? data.lineCount / totalOrderLines : 0;
    const platformFees = totalPlatformFee * feeShare;
    const paymentFees = totalPaymentFee * feeShare;
    const grossMarginSek = data.revenue - cogs - platformFees - paymentFees;
    const grossMarginPct = data.revenue > 0 ? (grossMarginSek / data.revenue) * 100 : 0;

    results.push({
      sku,
      productName: data.productName,
      unitsSold: data.unitsSold,
      revenue: Math.round(data.revenue),
      cogs: Math.round(cogs),
      platformFees: Math.round(platformFees),
      paymentFees: Math.round(paymentFees),
      grossMarginSek: Math.round(grossMarginSek),
      grossMarginPct: Math.round(grossMarginPct * 10) / 10,
    });
  }

  return results.sort((a, b) => b.grossMarginSek - a.grossMarginSek);
}

export function isLowMargin(marginPct: number): boolean {
  return marginPct < 10;
}
