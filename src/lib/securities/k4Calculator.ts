/**
 * K4 Calculator — Aktie-/fondkonto (AF), reavinst med FIFO-omkostnad
 *
 * Regler:
 * - FIFO för omkostnadsberäkning per ISIN
 * - Avgifter ingår i omkostnaden (köp) eller minskar försäljningspriset (sälj)
 * - Kvittning: 70% av kapitalförluster är avdragsgilla mot annan kapitalvinst
 *   (genomsnittsmetoden enligt 70/100-regeln för marknadsnoterade)
 */

import type { Database } from '@/integrations/supabase/types';
type SecuritiesTransaction = Database['public']['Tables']['securities_transactions']['Row'];

export interface K4Lot {
  isin: string;
  ticker: string | null;
  name: string;
  quantity: number;
  unitCost: number;
  acquiredAt: string;
}

export interface K4Sale {
  isin: string;
  ticker: string | null;
  name: string;
  quantity: number;
  proceeds: number;        // Försäljningspris efter avgifter
  cost: number;             // Total FIFO-omkostnad
  gainLoss: number;         // proceeds - cost
  saleDate: string;
}

export interface K4Result {
  taxYear: number;
  sales: K4Sale[];
  totalGains: number;
  totalLosses: number;
  netResult: number;
  deductibleLoss: number;   // 70% av förlust om netto är negativt
  taxableAmount: number;    // Det belopp som beskattas (30% kapitalskatt)
}

export function calculateK4(
  transactions: SecuritiesTransaction[],
  taxYear: number,
): K4Result {
  // Sortera kronologiskt
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime(),
  );

  const lots: Map<string, K4Lot[]> = new Map();
  const sales: K4Sale[] = [];

  for (const tx of sorted) {
    if (!tx.isin) continue;
    const isin = tx.isin;
    const qty = Number(tx.quantity ?? 0);
    const price = Number(tx.price ?? 0);
    const fee = Number(tx.fee ?? 0);

    if (tx.transaction_type === 'buy') {
      const totalCost = qty * price + fee;
      const unitCost = qty > 0 ? totalCost / qty : 0;
      const lot: K4Lot = {
        isin,
        ticker: tx.ticker,
        name: tx.name ?? isin,
        quantity: qty,
        unitCost,
        acquiredAt: tx.trade_date,
      };
      const existing = lots.get(isin) ?? [];
      existing.push(lot);
      lots.set(isin, existing);
    } else if (tx.transaction_type === 'sell') {
      const saleYear = new Date(tx.trade_date).getFullYear();
      let remaining = qty;
      let totalCost = 0;
      const proceeds = qty * price - fee;
      const queue = lots.get(isin) ?? [];

      while (remaining > 0 && queue.length > 0) {
        const lot = queue[0];
        const used = Math.min(lot.quantity, remaining);
        totalCost += used * lot.unitCost;
        lot.quantity -= used;
        remaining -= used;
        if (lot.quantity <= 0.0000001) queue.shift();
      }
      lots.set(isin, queue);

      if (saleYear === taxYear) {
        sales.push({
          isin,
          ticker: tx.ticker,
          name: tx.name ?? isin,
          quantity: qty,
          proceeds: Math.round(proceeds * 100) / 100,
          cost: Math.round(totalCost * 100) / 100,
          gainLoss: Math.round((proceeds - totalCost) * 100) / 100,
          saleDate: tx.trade_date,
        });
      }
    }
  }

  const totalGains = sales.filter(s => s.gainLoss > 0).reduce((s, x) => s + x.gainLoss, 0);
  const totalLosses = sales.filter(s => s.gainLoss < 0).reduce((s, x) => s + x.gainLoss, 0);
  const netResult = totalGains + totalLosses;

  // 70/100-regeln: vinst kvittas 100% mot förlust, överskjutande förlust dras av till 70%
  let deductibleLoss = 0;
  let taxableAmount = 0;
  if (netResult >= 0) {
    taxableAmount = netResult;
  } else {
    deductibleLoss = Math.round(netResult * 0.7);
    taxableAmount = deductibleLoss; // negativ
  }

  return {
    taxYear,
    sales,
    totalGains: Math.round(totalGains),
    totalLosses: Math.round(totalLosses),
    netResult: Math.round(netResult),
    deductibleLoss,
    taxableAmount,
  };
}

export function getCurrentLots(
  transactions: SecuritiesTransaction[],
): Map<string, K4Lot[]> {
  const result = calculateK4(transactions, 9999); // dummy year, just to build lots
  // Re-run to extract remaining lots
  const lots: Map<string, K4Lot[]> = new Map();
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime(),
  );
  for (const tx of sorted) {
    if (!tx.isin) continue;
    const qty = Number(tx.quantity ?? 0);
    const price = Number(tx.price ?? 0);
    const fee = Number(tx.fee ?? 0);
    if (tx.transaction_type === 'buy') {
      const unitCost = qty > 0 ? (qty * price + fee) / qty : 0;
      const arr = lots.get(tx.isin) ?? [];
      arr.push({ isin: tx.isin, ticker: tx.ticker, name: tx.name ?? tx.isin, quantity: qty, unitCost, acquiredAt: tx.trade_date });
      lots.set(tx.isin, arr);
    } else if (tx.transaction_type === 'sell') {
      let remaining = qty;
      const queue = lots.get(tx.isin) ?? [];
      while (remaining > 0 && queue.length > 0) {
        const lot = queue[0];
        const used = Math.min(lot.quantity, remaining);
        lot.quantity -= used;
        remaining -= used;
        if (lot.quantity <= 0.0000001) queue.shift();
      }
      lots.set(tx.isin, queue);
    }
  }
  void result;
  return lots;
}
