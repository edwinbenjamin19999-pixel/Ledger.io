/**
 * Section 9 — Non-dismissible balance sheet alert hook.
 * Shows a persistent red banner if the accounting equation is broken.
 */

import { useState, useEffect, useCallback } from 'react';
import { validateBalanceSheet, ReconciliationResult } from '@/lib/balanceSheetReconciliation';

export function useBalanceAlert(companyId: string | undefined) {
  const [result, setResult] = useState<ReconciliationResult | null>(null);
  const [checking, setChecking] = useState(false);

  const check = useCallback(async () => {
    if (!companyId) return;
    setChecking(true);
    try {
      const r = await validateBalanceSheet(companyId);
      setResult(r);
    } catch {
      // Silently fail
    } finally {
      setChecking(false);
    }
  }, [companyId]);

  useEffect(() => {
    check();
    // Re-check every 5 minutes
    const interval = setInterval(check, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [check]);

  return {
    isImbalanced: result ? !result.balanced : false,
    difference: result?.difference ?? 0,
    details: result?.details,
    checking,
    recheck: check,
  };
}
