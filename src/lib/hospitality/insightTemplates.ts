// Restaurant-specific insight templates with metric receipts.

export type Severity = "info" | "good" | "warn" | "critical";

export interface HospitalityInsight {
  insight_type: string;
  severity: Severity;
  title: string;
  body: string;
  metric_label?: string;
  metric_value?: number;
  metric_change_pct?: number;
  action_suggestion?: string;
  source_receipt: string;
}

export const TEMPLATES = {
  foodCostHigh: (pct: number, prevPct: number, deltaPct: number): HospitalityInsight => ({
    insight_type: "food_cost",
    severity: "warn",
    title: `Food cost ${pct.toFixed(1)}% — över branschsnitt`,
    body: `Råvarukonton (4010+4011) ökade från ${prevPct.toFixed(1)}% till ${pct.toFixed(1)}% av omsättningen. Branschsnitt ligger på 28–32%.`,
    metric_label: "Food cost %",
    metric_value: pct,
    metric_change_pct: deltaPct,
    action_suggestion: "Granska inköpspriser, spill och portionsstorlekar",
    source_receipt: "Konto 4010+4011 / POS-omsättning, senaste 30 dagar",
  }),

  staffCostHigh: (pct: number): HospitalityInsight => ({
    insight_type: "staff_cost",
    severity: "warn",
    title: `Personalkostnad ${pct.toFixed(1)}% av omsättning`,
    body: `Mål för restaurang: 28–32%. Du ligger ${(pct - 32).toFixed(1)}% över målet.`,
    metric_label: "Staff cost %",
    metric_value: pct,
    action_suggestion: "Justera bemanningen vid låg-traffik och optimera schemat",
    source_receipt: "staff_cost_imports / pos_daily_sales, innevarande månad",
  }),

  weekendConcentration: (weekendPct: number): HospitalityInsight => ({
    insight_type: "revenue_pattern",
    severity: "info",
    title: `Helger genererar ${weekendPct.toFixed(0)}% av omsättning`,
    body: `Tydlig koncentration till fre–sön. Överväg vardagskampanjer för att jämna ut beläggningen.`,
    metric_label: "Helgandel",
    metric_value: weekendPct,
    action_suggestion: "Lansera lunch- eller vardagserbjudande",
    source_receipt: "pos_daily_sales by weekday, senaste 90 dagar",
  }),

  supplierPriceHike: (
    supplierName: string,
    deltaPct: number,
    lastAmount: number,
  ): HospitalityInsight => ({
    insight_type: "supplier_anomaly",
    severity: deltaPct > 15 ? "warn" : "info",
    title: `${supplierName} höjt priser ${deltaPct.toFixed(1)}%`,
    body: `Senaste fakturan ${lastAmount.toLocaleString("sv-SE")} kr vs 90-dagars snitt. Kontrollera prisavtal.`,
    metric_label: "Prisförändring",
    metric_value: lastAmount,
    metric_change_pct: deltaPct,
    action_suggestion: "Kontakta leverantören, jämför med alternativ",
    source_receipt: `Senaste 3 fakturor från ${supplierName} mot 90-dagars rullande snitt`,
  }),

  avgTicket: (amount: number, txns: number, monthlyRevenue: number): HospitalityInsight => ({
    insight_type: "avg_ticket",
    severity: "info",
    title: `Snittnota ${amount.toFixed(0)} kr`,
    body: `${txns} notor denna månad. 10% mersälj = +${(monthlyRevenue * 0.1).toFixed(0)} kr.`,
    metric_label: "Snittnota",
    metric_value: amount,
    action_suggestion: "Träna personal i mersälj (förrätt/dessert/dryck)",
    source_receipt: `pos_daily_sales: ${txns} transaktioner / ${monthlyRevenue.toFixed(0)} kr omsättning`,
  }),

  noPosData: (): HospitalityInsight => ({
    insight_type: "setup",
    severity: "info",
    title: "Inga dagskassor registrerade",
    body: "Anslut kassaregistret (Caspeco/Zettle) eller registrera dagskassor manuellt.",
    action_suggestion: "Gå till /workspace/hospitality/onboarding",
    source_receipt: "pos_daily_sales tom för senaste 30 dagar",
  }),
};
