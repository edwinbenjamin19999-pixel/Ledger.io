import { useEffect, useState } from "react";

const STATUSES = [
  "Analyserar kassaflöde…",
  "Validerar moms…",
  "Uppdaterar prognos…",
  "Granskar verifikat…",
  "Matchar banktransaktioner…",
  "Bevakar deadlines…",
];

/**
 * Rotating AI status text — gives the dashboard a "living" feel (Law 5).
 * Swaps every `intervalMs` (default 3500ms).
 */
export function useAIStatus(intervalMs = 3500) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % STATUSES.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return STATUSES[index];
}
