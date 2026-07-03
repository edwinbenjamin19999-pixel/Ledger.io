import { useCallback, useEffect, useRef, useState } from "react";

export interface ReversibleEntry {
  id: string;
  label: string;
  expiresAt: number;
  onUndo: () => Promise<void> | void;
}

/**
 * Maintains a small queue of recently dispatched actions that can be undone
 * within a 30-second window.
 */
export function useReversibleAction(windowMs = 30_000) {
  const [entries, setEntries] = useState<ReversibleEntry[]>([]);
  const tick = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    tick.current = setInterval(() => {
      setEntries((prev) => prev.filter((e) => e.expiresAt > Date.now()));
    }, 1000);
    return () => {
      if (tick.current) clearInterval(tick.current);
    };
  }, []);

  const register = useCallback(
    (label: string, onUndo: () => Promise<void> | void) => {
      const id = crypto.randomUUID();
      setEntries((prev) => [
        ...prev,
        { id, label, expiresAt: Date.now() + windowMs, onUndo },
      ]);
      return id;
    },
    [windowMs]
  );

  const undo = useCallback(async (id: string) => {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    await entry.onUndo();
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, [entries]);

  return { entries, register, undo };
}
