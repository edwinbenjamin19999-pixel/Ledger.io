import { useMemo } from 'react';
import type { JournalDetail, AnomalyType } from './types';

export function useAnomalyDetection(details: Omit<JournalDetail, 'anomalyType' | 'anomalyReason' | 'reviewed'>[]): JournalDetail[] {
  return useMemo(() => {
    if (!details.length) return [];

    // Skip virtual rows
    const realDetails = details.filter(d => !d.isVirtualRow);
    const virtualDetails = details.filter(d => d.isVirtualRow);

    // Pre-calculate averages by counter-account
    const counterAmounts: Record<string, number[]> = {};
    for (const d of realDetails) {
      const amount = Math.max(d.debit, d.credit);
      const key = d.counterAccounts.join(',') || '_none_';
      if (!counterAmounts[key]) counterAmounts[key] = [];
      counterAmounts[key].push(amount);
    }

    const counterAvg: Record<string, number> = {};
    for (const [k, vals] of Object.entries(counterAmounts)) {
      counterAvg[k] = vals.reduce((a, b) => a + b, 0) / vals.length;
    }

    const seenCombos = new Set<string>();

    const processedReal = realDetails.map((d, idx) => {
      const amount = Math.max(d.debit, d.credit);
      const counterKey = d.counterAccounts.join(',') || '_none_';
      let anomalyType: AnomalyType = null;
      let anomalyReason = '';

      // Missing document detection
      if (d.documentAttached === false && amount > 500) {
        anomalyType = 'missingDoc';
        anomalyReason = `Underlag saknas för transaktion på ${amount.toLocaleString('sv-SE')} kr`;
      }

      // SIZE: amount > 3× average
      if (!anomalyType) {
        const avg = counterAvg[counterKey];
        if (avg > 0 && amount > avg * 3 && counterAmounts[counterKey].length >= 3) {
          anomalyType = 'size';
          anomalyReason = `Beloppet (${amount.toLocaleString('sv-SE')} kr) är ${(amount / avg).toFixed(1)}× genomsnittet för denna motpart`;
        }
      }

      // NEW COMBO
      if (!anomalyType && counterKey !== '_none_') {
        if (!seenCombos.has(counterKey)) {
          seenCombos.add(counterKey);
          if (idx > 0) {
            anomalyType = 'newCombo';
            anomalyReason = `Ny kontokombination: motkonto ${d.counterAccounts.join(', ')}`;
          }
        } else {
          seenCombos.add(counterKey);
        }
      }

      // DUPLICATE
      if (!anomalyType && amount > 0) {
        const dDate = new Date(d.entry_date).getTime();
        for (let j = 0; j < idx; j++) {
          const other = realDetails[j];
          const otherAmount = Math.max(other.debit, other.credit);
          if (otherAmount === amount) {
            const diff = Math.abs(dDate - new Date(other.entry_date).getTime());
            if (diff <= 5 * 86400000) {
              anomalyType = 'duplicate';
              anomalyReason = `Samma belopp (${amount.toLocaleString('sv-SE')} kr) som ${other.entry_date}`;
              break;
            }
          }
        }
      }

      return { ...d, anomalyType, anomalyReason, reviewed: false };
    });

    // Virtual rows pass through with no anomaly
    const processedVirtual = virtualDetails.map(d => ({
      ...d, anomalyType: null as AnomalyType, anomalyReason: '', reviewed: false,
    }));

    // Reconstruct original order
    const result: JournalDetail[] = [];
    let realIdx = 0;
    let virtualIdx = 0;
    for (const d of details) {
      if (d.isVirtualRow) {
        result.push(processedVirtual[virtualIdx++]);
      } else {
        result.push(processedReal[realIdx++]);
      }
    }

    return result;
  }, [details]);
}
