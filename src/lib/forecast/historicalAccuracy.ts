/**
 * historicalAccuracy — pure helper that compares locked forecast snapshots
 * to actual outcomes (per BAS-account, per month).
 *
 * Returns:
 *  - per-version accuracy %
 *  - 12-month rolling average accuracy
 *
 * Accuracy = 1 - |actual - forecast| / max(|actual|, |forecast|, 1).
 * Uncovered months (no actual yet) are skipped.
 */

export interface VersionAccuracy {
  versionId: string;
  label: string;
  lockedAt: string;
  monthsCompared: number;
  accuracyPct: number; // 0..100
}

export interface HistoricalAccuracyInput {
  versions: Array<{
    id: string;
    label: string;
    locked_at: string;
    snapshot: { forecast?: Record<string, number[]> } | null;
  }>;
  actuals: Record<string, number[]>; // account_number → 12-vector actual values
  latestActualMonth: number; // 0..11
}

function pointAccuracy(forecast: number, actual: number): number {
  const denom = Math.max(Math.abs(actual), Math.abs(forecast), 1);
  return Math.max(0, 1 - Math.abs(actual - forecast) / denom);
}

export function computeHistoricalAccuracy({
  versions,
  actuals,
  latestActualMonth,
}: HistoricalAccuracyInput): { perVersion: VersionAccuracy[]; rollingAvgPct: number } {
  if (latestActualMonth < 0) return { perVersion: [], rollingAvgPct: NaN };

  const perVersion: VersionAccuracy[] = versions.map((v) => {
    const forecast = v.snapshot?.forecast ?? {};
    let total = 0;
    let count = 0;

    for (const acc of Object.keys(forecast)) {
      const fVec = forecast[acc] ?? [];
      const aVec = actuals[acc] ?? [];
      for (let m = 0; m <= latestActualMonth; m++) {
        const f = fVec[m];
        const a = aVec[m];
        if (typeof f !== "number" || typeof a !== "number") continue;
        // Skip months with no signal at all.
        if (f === 0 && a === 0) continue;
        total += pointAccuracy(f, a);
        count += 1;
      }
    }

    return {
      versionId: v.id,
      label: v.label,
      lockedAt: v.locked_at,
      monthsCompared: count,
      accuracyPct: count > 0 ? (total / count) * 100 : NaN,
    };
  });

  const valid = perVersion.filter((p) => Number.isFinite(p.accuracyPct));
  const rollingAvgPct = valid.length > 0
    ? valid.reduce((s, p) => s + p.accuracyPct, 0) / valid.length
    : NaN;

  return { perVersion, rollingAvgPct };
}
