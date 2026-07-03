import type { Generator, Insight } from "./types.ts";

export const pricingOpportunity: Generator = async (ctx) => {
  const { totals } = ctx;
  if (totals.revenue <= 0) return [];
  const margin = (totals.revenue - totals.costs) / totals.revenue;
  if (margin >= 0.20) return [];
  // 5% prisuppgång på samma volym → +5% av revenue rakt på resultatet
  const upside = totals.revenue * 0.05;
  return [{
    id: "pricing-opp",
    kind: "pricing",
    tier: "medium",
    title: "Möjlighet att höja priser",
    explanation: `Marginalen är ${(margin * 100).toFixed(1)}%. En prisuppgång på 5% (med oförändrad volym) skulle ge ca ${Math.round(upside).toLocaleString("sv-SE")} kr extra resultat på årsbasis.`,
    impact_sek: upside,
    confidence: 0.65,
    action_type: "generate_report",
    source: "RR · marginalanalys",
    cta_label: "Simulera +5% pris",
    priority_score: 0,
    recommended_action: { label: "Simulera prishöjning", type: "generate_report" },
    simulation: { kind: "price_increase", default_params: { pct: 5 } },
    _risk: 0,
    _trend: 0,
    _days_to_deadline: 60,
  }];
};
