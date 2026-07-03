import type { Generator, Insight } from "./types.ts";

export const marginOptimization: Generator = async (ctx) => {
  const { totals } = ctx;
  if (totals.revenue <= 0) return [];
  const margin = ((totals.revenue - totals.costs) / totals.revenue) * 100;
  if (margin >= 15) return [];
  const target = 15;
  const gap = (target - margin) / 100 * totals.revenue;
  return [{
    id: "margin-opt",
    kind: "margin",
    tier: "medium",
    title: `EBIT-marginal under mål (${margin.toFixed(1)}%)`,
    explanation: `Marginalen ligger på ${margin.toFixed(1)}% mot mål 15%. Att nå målet kräver ${Math.round(gap).toLocaleString("sv-SE")} kr i ökat resultat — via prishöjning eller kostnadssänkning.`,
    impact_sek: gap,
    confidence: 0.8,
    action_type: "generate_report",
    source: "RR",
    cta_label: "Simulera prishöjning",
    priority_score: 0,
    recommended_action: { label: "Simulera prishöjning", type: "generate_report" },
    simulation: { kind: "price_increase", default_params: { pct: 5 } },
    _risk: 0.5,
    _trend: margin < 5 ? 1 : 0,
    _days_to_deadline: 60,
  }];
};
