import { useCallback, useState } from "react";
import type { SimulatedAction } from "@/lib/cashflow/simulate";

/**
 * Local store for the Impact Preview Mode.
 * Holds pending simulated actions that overlay base data without persisting.
 */
export function useSimulation() {
  const [previewMode, setPreviewMode] = useState(false);
  const [pending, setPending] = useState<SimulatedAction[]>([]);

  const add = useCallback((a: SimulatedAction) => {
    setPending((prev) => (prev.some((p) => p.id === a.id) ? prev : [...prev, a]));
  }, []);

  const remove = useCallback((id: string) => {
    setPending((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const clear = useCallback(() => setPending([]), []);

  const togglePreview = useCallback(() => setPreviewMode((v) => !v), []);

  return {
    previewMode,
    setPreviewMode,
    togglePreview,
    pending,
    add,
    remove,
    clear,
    overlay: { pendingActions: pending },
  };
}
