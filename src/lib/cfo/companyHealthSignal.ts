/**
 * Single source of truth for "How is this company doing right now?"
 *
 * Every dashboard widget that shows a tone (greeting, runway, burn, command center)
 * MUST derive its tone from this helper. That guarantees we never end up with
 * "STABIL 12+ mån" and "KRITISKT — negativ kassa" on the same screen.
 *
 * Rules:
 *  - cash <= 0           => critical, runway = 0, monthlyBurn = null (n/a)
 *  - monthlyBurn < 1000  => burn data not meaningful, monthlyBurn = null, runway = null
 *  - runway < 3 months   => critical
 *  - runway < 6 months   => warning
 *  - else                => ok
 */

export type CompanyHealthStatus = "critical" | "warning" | "ok";

export interface CompanyHealthInput {
  /** Cash & bank balance (account 19xx). Can be negative. */
  cash: number;
  /** Net monthly burn in SEK (positive number = outflow > inflow). 0 or negative means inflow exceeds outflow. */
  monthlyBurn: number;
}

export interface CompanyHealthSignal {
  status: CompanyHealthStatus;
  cash: number;
  /** null = "Otillräcklig data" (cannot meaningfully compute) */
  monthlyBurn: number | null;
  /** Runway in months, capped at 24. null when not computable. */
  runwayMonths: number | null;
  /** Short headline used for greeting / banner. Always safe to render. */
  headline: string;
  /** Whether widgets may render the cheerful "Allt ser bra ut" greeting. */
  allowPositiveGreeting: boolean;
}

const BURN_FLOOR_SEK = 1000;

export function computeCompanyHealth({ cash, monthlyBurn }: CompanyHealthInput): CompanyHealthSignal {
  // Negative cash trumps everything.
  if (!Number.isFinite(cash) || cash <= 0) {
    return {
      status: "critical",
      cash: Number.isFinite(cash) ? cash : 0,
      monthlyBurn: null,
      runwayMonths: 0,
      headline: "Negativ kassa — likviditet kritisk",
      allowPositiveGreeting: false,
    };
  }

  const burnPositive = Math.max(0, monthlyBurn);

  // Burn too small (or zero / inflow positive) — runway is not a meaningful number.
  if (!Number.isFinite(burnPositive) || burnPositive < BURN_FLOOR_SEK) {
    return {
      status: "ok",
      cash,
      monthlyBurn: null,
      runwayMonths: null,
      headline: "Stabilt kassaflöde just nu",
      allowPositiveGreeting: true,
    };
  }

  const months = Math.min(24, cash / burnPositive);
  let status: CompanyHealthStatus;
  let headline: string;
  if (months < 3) {
    status = "critical";
    headline = `Endast ${months.toFixed(1)} mån runway — kritiskt`;
  } else if (months < 6) {
    status = "warning";
    headline = `${months.toFixed(1)} mån runway — bevaka likviditet`;
  } else {
    status = "ok";
    headline = `${months >= 24 ? "24+" : months.toFixed(0)} mån runway — stabil`;
  }

  return {
    status,
    cash,
    monthlyBurn: burnPositive,
    runwayMonths: months,
    headline,
    allowPositiveGreeting: status === "ok",
  };
}
