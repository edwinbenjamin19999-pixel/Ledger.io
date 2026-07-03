/**
 * Deterministic VAT review engine — runs rule checks before passing to LLM.
 * Returns candidate findings with severity, affected box, impact, and confidence.
 */

export type FindingSeverity = "critical" | "high" | "medium" | "info";

export interface VATFinding {
  id: string;
  severity: FindingSeverity;
  title: string;
  explanation: string;
  affectedBox: string | null;
  affectedTxCount: number;
  financialImpact: number;
  confidence: number;
  category: "completeness" | "rate_consistency" | "historical" | "classification" | "manual_adjustment";
  suggestedFix?: string;
}

export interface VATSnapshot {
  box05: number; box06: number; box07: number; box08: number;
  box10: number; box11: number; box12: number;
  box20: number; box21: number; box22: number; box23: number; box24: number;
  box30: number; box31: number; box32: number;
  box35: number; box36: number; box39: number; box40: number; box41: number; box42: number;
  box48: number; box49: number;
  box50: number; box60: number; box61: number; box62: number;
}

export interface VATReviewInput {
  current: VATSnapshot;
  previous?: VATSnapshot | null;
  overrides?: Record<string, number>;
}

export interface ConfidenceBreakdown {
  completeness: number;
  rate_consistency: number;
  historical: number;
  classification: number;
  manual_adjustment: number;
}

/**
 * Run deterministic rule checks. LLM layer adds reasoning on top.
 */
export function runVATRuleChecks(input: VATReviewInput): VATFinding[] {
  const f: VATFinding[] = [];
  const v = input.current;
  const prev = input.previous;
  const ovrCount = input.overrides ? Object.keys(input.overrides).length : 0;

  // 1. Sales reported but no output VAT
  if (v.box05 > 0 && v.box10 === 0) {
    f.push({
      id: "missing_output_25",
      severity: "critical",
      title: "Försäljning 25% utan utgående moms",
      explanation: `Ruta 05 har ${v.box05.toLocaleString("sv-SE")} kr men ruta 10 är 0. Saknas momskonto 2610 i bokningen?`,
      affectedBox: "10",
      affectedTxCount: 0,
      financialImpact: Math.round(v.box05 * 0.25),
      confidence: 95,
      category: "completeness",
      suggestedFix: "Granska försäljningsbokningar utan momskonto 2610.",
    });
  }
  if (v.box06 > 0 && v.box11 === 0) {
    f.push({
      id: "missing_output_12",
      severity: "high",
      title: "Försäljning 12% utan utgående moms",
      explanation: `Ruta 06 har ${v.box06.toLocaleString("sv-SE")} kr men ruta 11 är 0.`,
      affectedBox: "11",
      affectedTxCount: 0,
      financialImpact: Math.round(v.box06 * 0.12),
      confidence: 95,
      category: "completeness",
    });
  }
  if (v.box07 > 0 && v.box12 === 0) {
    f.push({
      id: "missing_output_6",
      severity: "high",
      title: "Försäljning 6% utan utgående moms",
      explanation: `Ruta 07 har ${v.box07.toLocaleString("sv-SE")} kr men ruta 12 är 0.`,
      affectedBox: "12",
      affectedTxCount: 0,
      financialImpact: Math.round(v.box07 * 0.06),
      confidence: 95,
      category: "completeness",
    });
  }

  // 2. Input VAT without taxable sales
  const totalSales = v.box05 + v.box06 + v.box07;
  if (v.box48 > 1000 && totalSales === 0) {
    f.push({
      id: "input_without_sales",
      severity: "medium",
      title: "Ingående moms utan momspliktig försäljning",
      explanation: "Avdragen ingående moms men inga skattepliktiga intäkter denna period. Vanligt i uppstart eller säsong — annars granska.",
      affectedBox: "48",
      affectedTxCount: 0,
      financialImpact: v.box48,
      confidence: 70,
      category: "classification",
    });
  }

  // 3. Output/input ratio anomaly
  if (totalSales > 0) {
    const expectedInput = totalSales * 0.10; // rough heuristic: 10% of sales typically deductible
    if (v.box48 > 0 && v.box48 < expectedInput * 0.3) {
      f.push({
        id: "low_input_vat_ratio",
        severity: "medium",
        title: "Ovanligt låg ingående moms",
        explanation: `Ingående moms (${v.box48.toLocaleString("sv-SE")} kr) är låg jämfört med försäljning. Saknas leverantörsfakturor?`,
        affectedBox: "48",
        affectedTxCount: 0,
        financialImpact: Math.round(expectedInput - v.box48),
        confidence: 65,
        category: "completeness",
        suggestedFix: "Kontrollera om alla leverantörsfakturor är inlästa.",
      });
    }
  }

  // 4. Large refund — Skatteverket may request docs
  if (v.box49 < -50000) {
    f.push({
      id: "large_refund",
      severity: "info",
      title: "Stor momsåterbetalning",
      explanation: `Återbetalning på ${Math.abs(v.box49).toLocaleString("sv-SE")} kr. Skatteverket kan begära underlag.`,
      affectedBox: "49",
      affectedTxCount: 0,
      financialImpact: Math.abs(v.box49),
      confidence: 100,
      category: "completeness",
      suggestedFix: "Säkerställ att alla bilagor finns tillgängliga.",
    });
  }

  // 5. Historical comparison
  if (prev) {
    const salesDelta = totalSales - (prev.box05 + prev.box06 + prev.box07);
    const prevSales = prev.box05 + prev.box06 + prev.box07;
    if (prevSales > 0 && Math.abs(salesDelta) / prevSales > 0.4) {
      f.push({
        id: "revenue_spike",
        severity: salesDelta > 0 ? "info" : "medium",
        title: salesDelta > 0 ? "Stor ökning av momspliktig försäljning" : "Stor minskning av momspliktig försäljning",
        explanation: `Försäljning ändrad ${Math.round((salesDelta / prevSales) * 100)}% jämfört med föregående period.`,
        affectedBox: null,
        affectedTxCount: 0,
        financialImpact: salesDelta,
        confidence: 90,
        category: "historical",
      });
    }

    const inputDelta = v.box48 - prev.box48;
    if (prev.box48 > 0 && Math.abs(inputDelta) / prev.box48 > 0.5) {
      f.push({
        id: "input_vat_shift",
        severity: "medium",
        title: "Stor förändring av ingående moms",
        explanation: `Ingående moms ändrad ${Math.round((inputDelta / prev.box48) * 100)}% — granska kostnadsklassificering.`,
        affectedBox: "48",
        affectedTxCount: 0,
        financialImpact: Math.abs(inputDelta),
        confidence: 80,
        category: "historical",
      });
    }
  }

  // 6. EU/reverse-charge consistency
  if ((v.box20 + v.box21 + v.box22 + v.box23 + v.box24) > 0 && (v.box30 + v.box31 + v.box32) === 0) {
    f.push({
      id: "reverse_charge_missing_output",
      severity: "high",
      title: "Omvänd skattskyldighet utan utgående moms",
      explanation: "Inköp med omvänd skattskyldighet rapporterad (rutor 20–24) men ingen utgående moms (rutor 30–32). Kontrollera momskonton 2614/2615.",
      affectedBox: "30",
      affectedTxCount: 0,
      financialImpact: Math.round((v.box20 + v.box21 + v.box22 + v.box23 + v.box24) * 0.25),
      confidence: 90,
      category: "completeness",
    });
  }

  // 7. Manual override flag
  if (ovrCount > 0) {
    f.push({
      id: "manual_overrides_present",
      severity: "info",
      title: `${ovrCount} manuella justeringar aktiva`,
      explanation: "Rutor har manuellt justerats. Säkerställ att skälen är dokumenterade.",
      affectedBox: null,
      affectedTxCount: ovrCount,
      financialImpact: 0,
      confidence: 100,
      category: "manual_adjustment",
    });
  }

  return f;
}

export function calculateConfidenceBreakdown(findings: VATFinding[], hasHistory: boolean): ConfidenceBreakdown {
  const dim = (cat: VATFinding["category"]) => {
    const relevant = findings.filter((f) => f.category === cat);
    if (relevant.length === 0) return 100;
    const penalty = relevant.reduce((sum, f) => {
      const w = f.severity === "critical" ? 35 : f.severity === "high" ? 20 : f.severity === "medium" ? 10 : 3;
      return sum + w;
    }, 0);
    return Math.max(0, 100 - penalty);
  };
  return {
    completeness: dim("completeness"),
    rate_consistency: dim("rate_consistency"),
    historical: hasHistory ? dim("historical") : 0,
    classification: dim("classification"),
    manual_adjustment: dim("manual_adjustment"),
  };
}

export function calculateOverallConfidence(b: ConfidenceBreakdown, hasHistory: boolean): number {
  const dims = hasHistory
    ? [b.completeness, b.rate_consistency, b.historical, b.classification, b.manual_adjustment]
    : [b.completeness, b.rate_consistency, b.classification, b.manual_adjustment];
  return Math.round(dims.reduce((a, c) => a + c, 0) / dims.length);
}

export function deriveVerdict(findings: VATFinding[]): "correct" | "review" | "critical" {
  if (findings.some((f) => f.severity === "critical")) return "critical";
  if (findings.some((f) => f.severity === "high" || f.severity === "medium")) return "review";
  return "correct";
}

export function deriveRecommendation(verdict: "correct" | "review" | "critical"): "ready" | "review" | "do_not_submit" {
  if (verdict === "critical") return "do_not_submit";
  if (verdict === "review") return "review";
  return "ready";
}
