/**
 * Lightweight haptic feedback for mobile devices.
 * Falls back silently on desktop / browsers without Vibration API.
 *
 * Patterns are tuned to feel like Apple Wallet / Revolut:
 * - light: 10ms (tab switch, toggle)
 * - medium: 20ms (button press, selection)
 * - success: 10-30-10 (transaction confirmed)
 * - warning: 30-50-30 (something needs attention)
 * - error: 60-30-60 (action failed)
 */

export type HapticPattern = "light" | "medium" | "success" | "warning" | "error";

const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 20,
  success: [10, 30, 10],
  warning: [30, 50, 30],
  error: [60, 30, 60],
};

export function haptic(pattern: HapticPattern = "light"): void {
  if (typeof window === "undefined") return;
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  try {
    navigator.vibrate(PATTERNS[pattern]);
  } catch {
    // Silently ignore — vibration is a polish, never a hard requirement.
  }
}
