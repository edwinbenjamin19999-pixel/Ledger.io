/**
 * Skatteagent — AI insight generator.
 *
 * Pure rule-based engine on top of the PreliminaryTaxState.
 * Generates actionable insights with severity, financial impact and CTAs.
 */

import type { PreliminaryTaxState } from "./preliminaryTaxEngine";

export type InsightSeverity = "critical" | "warning" | "info" | "success";
export type InsightActionKind =
  | "review_calculation"
  | "prepare_adjustment"
  | "simulate_impact"
  | "pay_now"
  | "schedule_payment";

export interface InsightAction {
  kind: InsightActionKind;
  label: string;
}

export interface TaxInsight {
  id: string;
  type:
    | "overpayment"
    | "underpayment"
    | "cashflow_risk"
    | "due_soon"
    | "overdue"
    | "all_clear";
  title: string;
  message: string;
  /** Financial impact in SEK (positive = money saved or owed; 0 if N/A). */
  impactKr: number;
  /** AI confidence 0–1. */
  confidence: number;
  severity: InsightSeverity;
  actions: InsightAction[];
}

export function analyzeTaxPosition(state: PreliminaryTaxState): TaxInsight[] {
  const insights: TaxInsight[] = [];

  if (state.isEmpty) {
    insights.push({
      id: "empty_data",
      type: "all_clear",
      title: "Bokför första månaden för att få rekommendationer",
      message:
        "Skatteagenten behöver minst en månads transaktioner för att kunna analysera din preliminärskatt och föreslå justeringar.",
      impactKr: 0,
      confidence: 1,
      severity: "info",
      actions: [],
    });
    return insights;
  }

  // 1. Overpayment (too high F-skatt)
  if (state.position === "too_high" && state.overpaymentEstimate > 0) {
    insights.push({
      id: "overpayment",
      type: "overpayment",
      title: "För hög preliminärskatt",
      message: `Baserat på årets resultattrend ser din nuvarande F-skatt ut att bli ca ${formatKr(
        state.overpaymentEstimate,
      )} för hög på årsbasis. Du kan begära jämkning hos Skatteverket och frigöra likviditet löpande.`,
      impactKr: state.overpaymentEstimate,
      confidence: clampConfidence(0.6 + Math.min(0.3, Math.abs(state.ratio))),
      severity: "warning",
      actions: [
        { kind: "prepare_adjustment", label: "Förbered jämkning" },
        { kind: "review_calculation", label: "Granska beräkning" },
      ],
    });
  }

  // 2. Underpayment (too low)
  if (state.position === "too_low" && state.diff > 0) {
    insights.push({
      id: "underpayment",
      type: "underpayment",
      title: "Risk för kvarskatt",
      message: `Förväntad årsskatt överstiger nuvarande F-skatt med ca ${formatKr(
        state.diff,
      )}. Höj F-skatten via jämkning för att undvika kvarskatt och eventuella kostnadsräntor.`,
      impactKr: state.diff,
      confidence: clampConfidence(0.6 + Math.min(0.3, state.ratio)),
      severity: "critical",
      actions: [
        { kind: "prepare_adjustment", label: "Höj F-skatt" },
        { kind: "simulate_impact", label: "Simulera kassaflöde" },
      ],
    });
  }

  // 3. Cashflow risk
  if (state.cashAfterPayment < 0 && state.nextDueAmount > 0) {
    insights.push({
      id: "cashflow_risk",
      type: "cashflow_risk",
      title: "Kassan räcker inte för nästa F-skatt",
      message: `Efter nästa betalning på ${formatKr(state.nextDueAmount)} blir kassasaldot ${formatKr(
        state.cashAfterPayment,
      )}. Säkerställ likviditet eller schemalägg betalningen.`,
      impactKr: Math.abs(state.cashAfterPayment),
      confidence: 0.95,
      severity: "critical",
      actions: [
        { kind: "schedule_payment", label: "Schemalägg" },
        { kind: "simulate_impact", label: "Simulera scenario" },
      ],
    });
  }

  // 4. Overdue
  if (state.status === "overdue") {
    insights.push({
      id: "overdue",
      type: "overdue",
      title: "Förfallen F-skatt",
      message: `Senaste F-skatten ${state.nextDueDate} är förfallen. Betala omgående för att undvika kostnadsränta på skattekontot.`,
      impactKr: state.nextDueAmount,
      confidence: 1,
      severity: "critical",
      actions: [{ kind: "pay_now", label: "Betala nu" }],
    });
  }

  // 5. Due soon
  if (state.status === "due_soon") {
    insights.push({
      id: "due_soon",
      type: "due_soon",
      title: `F-skatt förfaller om ${Math.max(0, state.daysUntilDue)} dagar`,
      message: `${formatKr(state.nextDueAmount)} ska betalas senast ${state.nextDueDate}. Slutför betalningen via bankintegrationen.`,
      impactKr: state.nextDueAmount,
      confidence: 1,
      severity: "warning",
      actions: [
        { kind: "pay_now", label: "Betala nu" },
        { kind: "schedule_payment", label: "Schemalägg" },
      ],
    });
  }

  // Always-on optimization insight if no critical issues
  if (insights.length === 0) {
    insights.push({
      id: "all_clear",
      type: "all_clear",
      title: "F-skatten är i balans",
      message: `Nuvarande F-skatt (${formatKr(
        state.currentMonthlyFtax,
      )}/mån) ligger inom 15 % av förväntad årsskatt. Skatteagenten bevakar och larmar vid avvikelse.`,
      impactKr: 0,
      confidence: 0.9,
      severity: "success",
      actions: [{ kind: "simulate_impact", label: "Simulera scenarier" }],
    });
  }

  return insights;
}

function formatKr(amount: number) {
  return `${Math.round(amount).toLocaleString("sv-SE")} kr`;
}

function clampConfidence(v: number) {
  return Math.max(0, Math.min(1, v));
}
