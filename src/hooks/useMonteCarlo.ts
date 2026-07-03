import { useEffect, useState } from "react";
import { runMonteCarlo, type MonteCarloResult, type MonteCarloInput } from "@/lib/scenarios/monteCarlo";

/**
 * Runs Monte Carlo in an idle callback so the UI never blocks.
 * Re-runs whenever the seed changes (debounced via React batching).
 */
export function useMonteCarlo(input: MonteCarloInput | null) {
  const [result, setResult] = useState<MonteCarloResult | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!input) { setResult(null); return; }
    let cancelled = false;
    setRunning(true);

    const run = () => {
      if (cancelled) return;
      try {
        const r = runMonteCarlo(input);
        if (!cancelled) setResult(r);
      } finally {
        if (!cancelled) setRunning(false);
      }
    };

    const ric = (window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    }).requestIdleCallback;
    const handle = ric ? ric(run, { timeout: 200 }) : window.setTimeout(run, 16);
    return () => {
      cancelled = true;
      const cic = (window as unknown as { cancelIdleCallback?: (h: number) => void }).cancelIdleCallback;
      if (cic && ric) cic(handle as number);
      else clearTimeout(handle as number);
    };
    // Stringify the input as stable key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input ? JSON.stringify(input) : null]);

  return { result, running };
}
