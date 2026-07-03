/**
 * AI tax-optimization engine.
 *
 * Builds three scenarios from the SAME baseline TaxEngineInput:
 *   • current     – exactly what the user has today
 *   • optimized   – realistic optimizations (max p-fond, use group contrib if available)
 *   • aggressive  – pushes boundaries (max p-fond + boost tax depreciation by 10 %)
 *
 * Recommendations explain WHAT, HOW MUCH (kr), and WHY in plain Swedish.
 */

import { computeTax, PERIODISERINGSFOND_MAX_RATE, type TaxEngineInput, type TaxEngineResult } from "./taxEngine";

export type OptimizationType =
  | "maximize_pfond"
  | "use_group_contrib"
  | "tax_depreciation_boost"
  | "review_ndc"
  | "use_loss_carryforward";

export type RiskLevel = "low" | "medium" | "high";

export interface Recommendation {
  type: OptimizationType;
  title: string;
  explanation: string;
  /** Tax saving in kronor (positive = saves money). */
  savingKr: number;
  riskLevel: RiskLevel;
  /** Mutator applied to the base input when "Tillämpa" is clicked. */
  apply: (input: TaxEngineInput) => TaxEngineInput;
}

export interface OptimizationPlan {
  current: TaxEngineResult;
  optimized: TaxEngineResult;
  aggressive: TaxEngineResult;
  totalPotentialSavingKr: number;
  recommendations: Recommendation[];
}

/** Build the full optimization plan for a given baseline input. */
export function optimizeTax(baseline: TaxEngineInput): OptimizationPlan {
  const current = computeTax(baseline);
  const recommendations: Recommendation[] = [];

  // ── 1. Periodiseringsfond not maxed ──────────────────────────────
  const pfondHeadroom = Math.max(0, current.maxPeriodiseringsfond - baseline.periodiseringsfondAllocation);
  if (pfondHeadroom > 1000) {
    const trial = computeTax({ ...baseline, periodiseringsfondAllocation: current.maxPeriodiseringsfond });
    const saving = current.corporateTax - trial.corporateTax;
    if (saving > 0) {
      recommendations.push({
        type: "maximize_pfond",
        title: "Maximera periodiseringsfond",
        explanation: `Du har ${Math.round(pfondHeadroom).toLocaleString("sv-SE")} kr ledigt utrymme i periodiseringsfond (max ${Math.round(PERIODISERINGSFOND_MAX_RATE * 100)} % av skattemässigt resultat). Avsätt allt → minska årets skatt med ${Math.round(saving).toLocaleString("sv-SE")} kr. Återförs senast år 6.`,
        savingKr: Math.round(saving),
        riskLevel: "low",
        apply: (i) => ({ ...i, periodiseringsfondAllocation: computeTax(i).maxPeriodiseringsfond }),
      });
    }
  }

  // ── 2. Loss carryforward not used ────────────────────────────────
  if (baseline.lossCarryforward > 0 && current.appliedLoss < baseline.lossCarryforward && current.taxableBaseBeforeLoss > 0) {
    const trial = computeTax({ ...baseline, lossCarryforward: baseline.lossCarryforward });
    const saving = Math.max(0, current.corporateTax - trial.corporateTax);
    if (saving > 0) {
      recommendations.push({
        type: "use_loss_carryforward",
        title: "Använd underskott från tidigare år",
        explanation: `Du har ${Math.round(baseline.lossCarryforward).toLocaleString("sv-SE")} kr i ackumulerade underskott. Tillämpa mot årets resultat → −${Math.round(saving).toLocaleString("sv-SE")} kr i skatt.`,
        savingKr: Math.round(saving),
        riskLevel: "low",
        apply: (i) => i, // already applied automatically; flagged for visibility
      });
    }
  }

  // ── 3. Tax depreciation underutilized ────────────────────────────
  // Suggest +10 % over book depreciation as a soft optimization
  if (baseline.bookDepreciation > 0) {
    const proposedTaxDepr = baseline.bookDepreciation * 1.1;
    const trial = computeTax({ ...baseline, taxDepreciation: proposedTaxDepr });
    const saving = current.corporateTax - trial.corporateTax;
    if (saving > 500) {
      recommendations.push({
        type: "tax_depreciation_boost",
        title: "Öka skattemässig avskrivning (+10 %)",
        explanation: `Räkenskapsenlig avskrivning tillåter ofta större avdrag än bokförd plan. Höj skattemässig avskrivning till ${Math.round(proposedTaxDepr).toLocaleString("sv-SE")} kr → −${Math.round(saving).toLocaleString("sv-SE")} kr i skatt. Kräver inventarieunderlag.`,
        savingKr: Math.round(saving),
        riskLevel: "medium",
        apply: (i) => ({ ...i, taxDepreciation: i.bookDepreciation * 1.1 }),
      });
    }
  }

  // ── 4. NDC review (informational, no automatic mutator) ──────────
  if (baseline.nonDeductibleCosts > 5000) {
    recommendations.push({
      type: "review_ndc",
      title: "Granska ej avdragsgilla kostnader",
      explanation: `${Math.round(baseline.nonDeductibleCosts).toLocaleString("sv-SE")} kr bokfört på ej avdragsgilla konton (6072/6982/6992/7632). Granska om någon post kan omklassificeras (t.ex. extern representation > 60 kr/person). Potentiell besparing: upp till ${Math.round(baseline.nonDeductibleCosts * 0.206).toLocaleString("sv-SE")} kr.`,
      savingKr: 0,
      riskLevel: "high",
      apply: (i) => i,
    });
  }

  // ── Optimized scenario: apply all "low" + "medium" risk mutators ──
  let optimizedInput = baseline;
  for (const r of recommendations) {
    if (r.riskLevel !== "high" && r.savingKr > 0) {
      optimizedInput = r.apply(optimizedInput);
    }
  }
  const optimized = computeTax(optimizedInput);

  // ── Aggressive scenario: max p-fond + +25 % tax depreciation ──────
  const aggressiveInput: TaxEngineInput = {
    ...baseline,
    taxDepreciation: baseline.bookDepreciation * 1.25,
  };
  const aggressivePre = computeTax(aggressiveInput);
  aggressiveInput.periodiseringsfondAllocation = aggressivePre.maxPeriodiseringsfond;
  const aggressive = computeTax(aggressiveInput);

  const totalPotentialSavingKr = Math.max(0, current.corporateTax - optimized.corporateTax);

  return { current, optimized, aggressive, totalPotentialSavingKr, recommendations };
}
