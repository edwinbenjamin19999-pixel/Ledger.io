/**
 * turningPointEngine — pure detector for forecast inflection events.
 *
 * Scans 12-month vectors and reports first-occurrence breaches:
 *  - EBIT turns negative (★, amber)
 *  - Closing cash turns negative (⚠, rose)
 *  - Cumulative EBIT trails the linear target path at year-end (◆, rose)
 *
 * Same input → same output. No randomness, no I/O.
 */

export type TurningPointType = "ebit_negative" | "cash_negative" | "target_miss";
export type TurningPointSeverity = "info" | "warning" | "critical";

export interface TurningPoint {
  type: TurningPointType;
  monthIdx: number; // 0..11
  value: number;
  severity: TurningPointSeverity;
  label: string;
}

export interface TurningPointInput {
  ebit: number[];        // 12-vector forecast EBIT per month
  closingCash: number[]; // 12-vector forecast closing cash per month
  targetEbit?: number | null; // annual EBIT target
}

const MONTHS = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

export function detectTurningPoints({ ebit, closingCash, targetEbit }: TurningPointInput): TurningPoint[] {
  const out: TurningPoint[] = [];

  // EBIT < 0 first month
  const ebitIdx = ebit.findIndex((v) => v < 0);
  if (ebitIdx >= 0) {
    out.push({
      type: "ebit_negative",
      monthIdx: ebitIdx,
      value: ebit[ebitIdx],
      severity: "warning",
      label: `EBIT vänder negativ i ${MONTHS[ebitIdx]}`,
    });
  }

  // Closing cash < 0 first month
  const cashIdx = closingCash.findIndex((v) => v < 0);
  if (cashIdx >= 0) {
    out.push({
      type: "cash_negative",
      monthIdx: cashIdx,
      value: closingCash[cashIdx],
      severity: "critical",
      label: `Kassan tar slut i ${MONTHS[cashIdx]}`,
    });
  }

  // Target miss at year-end
  if (typeof targetEbit === "number" && Number.isFinite(targetEbit)) {
    const annual = ebit.reduce((a, b) => a + b, 0);
    if (annual < targetEbit) {
      out.push({
        type: "target_miss",
        monthIdx: 11,
        value: annual - targetEbit,
        severity: "warning",
        label: `EBIT-mål missas med ${Math.round(annual - targetEbit).toLocaleString("sv-SE")} kr`,
      });
    }
  }

  return out;
}
