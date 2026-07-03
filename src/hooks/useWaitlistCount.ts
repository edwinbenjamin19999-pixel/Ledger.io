import { useEffect, useState } from "react";

const WAITLIST_BASE = 607;
const WAITLIST_KEY = "waitlist_data";

const todayISO = () => new Date().toISOString().slice(0, 10);

const daysBetween = (from: string, to: string) => {
  const a = new Date(from + "T00:00:00Z").getTime();
  const b = new Date(to + "T00:00:00Z").getTime();
  if (isNaN(a) || isNaN(b)) return 0;
  return Math.max(0, Math.floor((b - a) / 86400000));
};

// ─── SINGLETON STATE (module level, shared across all instances) ───
let globalCount = WAITLIST_BASE;
let initialized = false;
const listeners = new Set<(n: number) => void>();

const notifyAll = (n: number) => {
  globalCount = n;
  listeners.forEach((fn) => fn(n));
};

const persist = (n: number) => {
  try {
    localStorage.setItem(
      WAITLIST_KEY,
      JSON.stringify({ count: n, lastUpdated: todayISO() })
    );
  } catch {}
};

export const incrementWaitlist = (by = 1) => {
  const next = globalCount + by;
  persist(next);
  notifyAll(next);
};

// Initialize once globally
const initGlobal = () => {
  if (initialized) return;
  initialized = true;

  const today = todayISO();
  let initial = WAITLIST_BASE;
  try {
    const raw = localStorage.getItem(WAITLIST_KEY);
    if (raw) {
      const { count: c, lastUpdated: d } = JSON.parse(raw);
      const days = daysBetween(
        typeof d === "string" ? d : today,
        today
      );
      let growth = 0;
      for (let i = 0; i < days; i++) {
        growth += 1 + Math.floor(Math.random() * 2);
      }
      initial = Math.max(
        WAITLIST_BASE,
        (typeof c === "number" ? c : WAITLIST_BASE) + growth
      );
    }
  } catch {}

  persist(initial);
  globalCount = initial;

  // Random increment every 4-8 minutes
  const schedule = () => {
    window.setTimeout(() => {
      incrementWaitlist(1 + Math.floor(Math.random() * 2));
      schedule();
    }, (4 + Math.random() * 4) * 60000);
  };
  schedule();
};

// ─── HOOK (just subscribes to singleton) ───
export const useWaitlistCount = () => {
  initGlobal();
  const [count, setCount] = useState(globalCount);

  useEffect(() => {
    setCount(globalCount);
    listeners.add(setCount);
    return () => { listeners.delete(setCount); };
  }, []);

  return { count };
};
