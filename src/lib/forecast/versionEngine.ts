/**
 * versionEngine — pure helpers for snapshotting a forecast state and diffing
 * two snapshots into a KPI-level comparison payload.
 */

export interface ForecastSnapshot {
  generatedAt: string;
  fiscalYear: number;
  forecast: Record<string, number[]>;
  ebit: number[];
  closingCash: number[];
  drivers?: Record<string, unknown>;
  meta?: { mode?: string; source?: string };
}

export interface SnapshotInput {
  fiscalYear: number;
  forecast: Record<string, number[]>;
  ebit: number[];
  closingCash: number[];
  drivers?: Record<string, unknown>;
  mode?: string;
  source?: string;
}

export function buildSnapshot(input: SnapshotInput): ForecastSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    fiscalYear: input.fiscalYear,
    forecast: input.forecast,
    ebit: input.ebit,
    closingCash: input.closingCash,
    drivers: input.drivers,
    meta: { mode: input.mode, source: input.source },
  };
}

export interface SnapshotDiff {
  ebitDelta: number[];   // 12-vector
  cashDelta: number[];   // 12-vector
  annualEbitDelta: number;
  endingCashDelta: number;
  changedAccounts: string[];
}

const sumVec = (v: number[]) => v.reduce((a, b) => a + b, 0);

export function diffSnapshots(a: ForecastSnapshot, b: ForecastSnapshot): SnapshotDiff {
  const ebitDelta = Array.from({ length: 12 }, (_, m) => (b.ebit?.[m] ?? 0) - (a.ebit?.[m] ?? 0));
  const cashDelta = Array.from({ length: 12 }, (_, m) => (b.closingCash?.[m] ?? 0) - (a.closingCash?.[m] ?? 0));

  const accounts = new Set<string>([
    ...Object.keys(a.forecast || {}),
    ...Object.keys(b.forecast || {}),
  ]);
  const changedAccounts: string[] = [];
  for (const acc of accounts) {
    const va = a.forecast?.[acc] ?? [];
    const vb = b.forecast?.[acc] ?? [];
    const sa = sumVec(va);
    const sb = sumVec(vb);
    if (Math.abs(sa - sb) > 1) changedAccounts.push(acc);
  }

  return {
    ebitDelta,
    cashDelta,
    annualEbitDelta: sumVec(ebitDelta),
    endingCashDelta: cashDelta[11] ?? 0,
    changedAccounts,
  };
}
