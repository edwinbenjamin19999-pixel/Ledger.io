/**
 * Settings + helpers for the AI value tracker ("Vad AI har gjort åt dig").
 *
 * The user can adjust how many minutes a manual transaction takes them.
 * Default = 3 min (per spec). Corrected actions count as half (1.5 min)
 * since the AI did most of the work but the user still had to intervene.
 *
 * Tone rules baked in here:
 *  - never claim time saved when there is no data (caller must check `hasData`)
 *  - never count actions the user performed manually (callers filter by ai_confidence)
 *  - first 7 days after company creation: suppress value metrics entirely
 */

const STORAGE_KEY = "ai_value_minutes_per_tx";
const DEFAULT_MIN_PER_TX = 3;

export const MIN_DAYS_BEFORE_VALUE_VISIBLE = 7;

/** Confidence threshold above which an AI action counts as fully autonomous. */
export const AUTO_CONFIDENCE_THRESHOLD = 0.9;

export function getMinutesPerTransaction(): number {
  if (typeof window === "undefined") return DEFAULT_MIN_PER_TX;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const n = raw ? parseFloat(raw) : NaN;
    return Number.isFinite(n) && n > 0 && n < 30 ? n : DEFAULT_MIN_PER_TX;
  } catch {
    return DEFAULT_MIN_PER_TX;
  }
}

export function setMinutesPerTransaction(min: number) {
  if (typeof window === "undefined") return;
  if (!Number.isFinite(min) || min <= 0) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(min));
    window.dispatchEvent(new CustomEvent("ai-value-settings-changed"));
  } catch {
    /* ignore */
  }
}

/**
 * Format a minute count as a human-readable Swedish string.
 * Examples: 8 → "8 min", 90 → "1 tim 30 min", 480 → "8 timmar".
 */
export function formatTimeSaved(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} min`;
  const hours = Math.floor(m / 60);
  const rest = m % 60;
  if (rest === 0) return `${hours} ${hours === 1 ? "timme" : "timmar"}`;
  return `${hours} tim ${rest} min`;
}

/**
 * Compute total minutes saved given counts of fully-automatic and corrected actions.
 * Corrected = AI proposed something the user changed → AI still did half the work.
 */
export function calcMinutesSaved(autoCount: number, correctedCount: number, minPerTx = getMinutesPerTransaction()): number {
  return autoCount * minPerTx + correctedCount * (minPerTx / 2);
}
