export type VerdictTone = "strong" | "watch" | "attention" | "critical";

export interface Verdict {
  tone: VerdictTone;
  label: string;
  /** Tailwind classes for badge bg + text + border */
  badgeClass: string;
  /** Tailwind ring/border accent for card */
  accentClass: string;
  /** Hex for chart marker */
  markerColor: string;
}

export function getVerdict(percentile: number, smartWarning?: string | null): Verdict {
  if (smartWarning || percentile < 15) {
    return {
      tone: "critical",
      label: "Kritisk",
      badgeClass:
        "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900",
      accentClass: "border-l-4 border-l-rose-500",
      markerColor: "#e11d48",
    };
  }
  if (percentile < 40) {
    return {
      tone: "attention",
      label: "Behöver åtgärd",
      badgeClass:
        "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
      accentClass: "border-l-4 border-l-amber-500",
      markerColor: "#d97706",
    };
  }
  if (percentile < 75) {
    return {
      tone: "watch",
      label: "Bevaka",
      badgeClass:
        "bg-cyan-50 text-[#3b82f6] border-cyan-200 dark:bg-cyan-950/40 dark:text-[#3b82f6] dark:border-[#3b82f6]",
      accentClass: "border-l-4 border-l-[#3b82f6]",
      markerColor: "#3b82f6",
    };
  }
  return {
    tone: "strong",
    label: "Stark",
    badgeClass:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
    accentClass: "border-l-4 border-l-emerald-500",
    markerColor: "#10b981",
  };
}

export function percentileLabel(p: number): string {
  if (p >= 95) return "Topp 5%";
  if (p >= 90) return "Topp 10%";
  if (p >= 75) return `P${p}`;
  return `P${p}`;
}

/** Estimate annual financial impact (kr) of closing the gap to P75. */
export function estimateImpactToP75(
  value: number,
  p75: number,
  base: number,
  unit: string,
): number | null {
  if (!base || !isFinite(value) || !isFinite(p75)) return null;
  const gap = p75 - value;
  if (gap <= 0) return 0;
  if (unit === "%") return Math.round((gap / 100) * base);
  return null;
}
