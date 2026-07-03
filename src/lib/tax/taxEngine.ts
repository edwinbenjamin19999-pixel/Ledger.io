/**
 * Pure deterministic tax engine for Swedish AB corporate tax.
 *
 * Flow (every step traceable in `appliedAdjustments`):
 *
 *   resultBeforeTax
 *    + nonDeductibleCosts          (auto from 6072/6982/6992/7632)
 *    ± depreciationDelta           (book − tax-allowed)
 *    ± interestLimitation          (disallowed > 30 % EBITDA)
 *    ± groupContributions          (8830 received − 8840 given)
 *    − lossCarryforward            (capped at remaining base)
 *    = taxableResult
 *    − periodiseringsfond          (max 25 % of taxableResult)
 *    = finalTaxableIncome
 *    × 20.6 % = corporateTax       (only if > 0)
 */

export const CORPORATE_TAX_RATE = 0.206;
export const PERIODISERINGSFOND_MAX_RATE = 0.25;
export const EBITDA_INTEREST_LIMIT_RATE = 0.30;

export interface TaxEngineInput {
  /** Result before tax (revenue − all bookkept costs incl. NDC and depreciation). */
  resultBeforeTax: number;
  /** Sum of accounts 6072 / 6982 / 6992 / 7632. */
  nonDeductibleCosts: number;
  /** Book depreciation (7810–7839, positive number). */
  bookDepreciation: number;
  /** Tax-allowed depreciation chosen by the user (defaults to bookDepreciation). */
  taxDepreciation: number;
  /** Net interest expense (interest_out − interest_in, only positive part). */
  netInterestExpense: number;
  /** Group contribution received (account 8830). */
  groupContribReceived: number;
  /** Group contribution given (account 8840). */
  groupContribGiven: number;
  /** Opening loss carryforward from prior years (positive number). */
  lossCarryforward: number;
  /** User-selected periodiseringsfond allocation (positive number, will be clamped to 25 %). */
  periodiseringsfondAllocation: number;
  /** Tax rate (defaults to 20.6 %). */
  taxRate?: number;
}

export interface AppliedAdjustment {
  step: string;
  label: string;
  amount: number;          // signed delta to running base
  runningBase: number;     // base after this step
  ink2Field?: string;
}

export interface TaxEngineResult {
  resultBeforeTax: number;
  /** Sum of every adjustment up to and including periodisation. */
  adjustmentsTotal: number;
  /** EBITDA used for the 30 % interest cap. */
  ebitda: number;
  /** Maximum interest deduction allowed (30 % of EBITDA). */
  interestDeductionLimit: number;
  /** Disallowed interest portion that gets added back to the base. */
  disallowedInterest: number;
  /** Result after NDC + depr delta + interest limit + group contrib. */
  taxableBaseBeforeLoss: number;
  /** Result after applied loss carryforward. */
  taxableResult: number;
  /** Maximum periodiseringsfond (25 % of taxableResult, ≥0). */
  maxPeriodiseringsfond: number;
  /** Actually applied periodiseringsfond (clamped to maxPeriodiseringsfond). */
  appliedPeriodiseringsfond: number;
  /** Loss carryforward actually used this year (≤ taxableBaseBeforeLoss). */
  appliedLoss: number;
  /** Remaining loss carryforward to next year. */
  remainingLossCarryforward: number;
  /** Final taxable income (= base after periodisation). */
  finalTaxableIncome: number;
  /** Corporate tax = max(0, finalTaxableIncome) × taxRate. */
  corporateTax: number;
  /** Effective tax rate vs result-before-tax (0 if base is 0). */
  effectiveTaxRate: number;
  /** Step-by-step trace for transparency / UI / audit. */
  appliedAdjustments: AppliedAdjustment[];
}

/** Run the deterministic tax flow. Pure — no I/O. */
export function computeTax(input: TaxEngineInput): TaxEngineResult {
  const taxRate = input.taxRate ?? CORPORATE_TAX_RATE;
  const trace: AppliedAdjustment[] = [];

  let base = input.resultBeforeTax;
  trace.push({ step: "0", label: "Resultat före skatt", amount: 0, runningBase: base, ink2Field: "4.3" });

  // 1. Non-deductible costs added back
  if (input.nonDeductibleCosts !== 0) {
    base += input.nonDeductibleCosts;
    trace.push({ step: "1", label: "Ej avdragsgilla kostnader", amount: input.nonDeductibleCosts, runningBase: base, ink2Field: "4.4" });
  }

  // 2. Depreciation delta = book − tax-allowed (positive = add back to base)
  const depreciationDelta = input.bookDepreciation - input.taxDepreciation;
  if (depreciationDelta !== 0) {
    base += depreciationDelta;
    trace.push({ step: "2", label: "Avskrivningsjustering (bokf. − skattem.)", amount: depreciationDelta, runningBase: base, ink2Field: "4.5" });
  }

  // 3. EBITDA + interest limitation
  // EBITDA = result-before-tax + depreciation + net interest expense
  const ebitda = input.resultBeforeTax + input.bookDepreciation + Math.max(0, input.netInterestExpense);
  const interestDeductionLimit = Math.max(0, ebitda * EBITDA_INTEREST_LIMIT_RATE);
  const disallowedInterest = Math.max(0, input.netInterestExpense - interestDeductionLimit);
  if (disallowedInterest > 0) {
    base += disallowedInterest;
    trace.push({
      step: "3",
      label: `Räntebegränsning (>${Math.round(EBITDA_INTEREST_LIMIT_RATE * 100)} % av EBITDA)`,
      amount: disallowedInterest,
      runningBase: base,
      ink2Field: "4.6",
    });
  }

  // 4. Group contributions
  const groupNet = input.groupContribReceived - input.groupContribGiven;
  if (groupNet !== 0) {
    base += groupNet;
    trace.push({ step: "4", label: "Koncernbidrag (netto)", amount: groupNet, runningBase: base, ink2Field: "4.7" });
  }

  const taxableBaseBeforeLoss = base;

  // 5. Loss carryforward (cannot exceed remaining base)
  const appliedLoss = Math.max(0, Math.min(input.lossCarryforward, Math.max(0, base)));
  if (appliedLoss > 0) {
    base -= appliedLoss;
    trace.push({ step: "5", label: "Underskott från tidigare år", amount: -appliedLoss, runningBase: base, ink2Field: "4.14a" });
  }
  const remainingLossCarryforward = Math.max(0, input.lossCarryforward - appliedLoss);
  const taxableResult = base;

  // 6. Periodiseringsfond (max 25 % of taxableResult, only when positive)
  const maxPeriodiseringsfond = taxableResult > 0 ? taxableResult * PERIODISERINGSFOND_MAX_RATE : 0;
  const appliedPeriodiseringsfond = Math.max(0, Math.min(input.periodiseringsfondAllocation, maxPeriodiseringsfond));
  if (appliedPeriodiseringsfond > 0) {
    base -= appliedPeriodiseringsfond;
    trace.push({ step: "6", label: "Periodiseringsfond", amount: -appliedPeriodiseringsfond, runningBase: base, ink2Field: "4.6a" });
  }

  const finalTaxableIncome = base;
  const corporateTax = finalTaxableIncome > 0 ? Math.round(finalTaxableIncome * taxRate) : 0;
  const effectiveTaxRate = input.resultBeforeTax !== 0 ? (corporateTax / Math.abs(input.resultBeforeTax)) * 100 : 0;

  const adjustmentsTotal = finalTaxableIncome - input.resultBeforeTax;

  return {
    resultBeforeTax: input.resultBeforeTax,
    adjustmentsTotal,
    ebitda,
    interestDeductionLimit,
    disallowedInterest,
    taxableBaseBeforeLoss,
    taxableResult,
    maxPeriodiseringsfond,
    appliedPeriodiseringsfond,
    appliedLoss,
    remainingLossCarryforward,
    finalTaxableIncome,
    corporateTax,
    effectiveTaxRate,
    appliedAdjustments: trace,
  };
}
