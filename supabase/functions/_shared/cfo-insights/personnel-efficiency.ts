import type { Generator, Insight } from "./types.ts";

export const personnelEfficiency: Generator = async (ctx) => {
  const { totals, accountsById } = ctx;
  if (totals.revenue <= 0) return [];
  // Personal kostnad approx: handled via totals.costs subset is complex; use ratio heuristic on accounts 7xxx
  // Use already-computed costs as bound; we need 7xxx alone — re-query small.
  const personnelIds = Array.from(accountsById.entries()).filter(([_, n]) => /^7[0-5]/.test(n)).map(([id]) => id);
  if (personnelIds.length === 0) return [];
  const { data: lines } = await ctx.supabase
    .from("journal_entry_lines")
    .select("debit, credit")
    .in("account_id", personnelIds);
  const personnel = (lines || []).reduce((s: number, l: any) => s + Number(l.debit || 0) - Number(l.credit || 0), 0);
  if (personnel <= 0) return [];
  const ratio = personnel / totals.revenue;
  if (ratio < 0.45) return [];
  return [{
    id: "personnel-eff",
    kind: "personnel",
    tier: "medium",
    title: `Personalkostnad ${(ratio * 100).toFixed(0)}% av intäkter`,
    explanation: `Personalkostnaden är hög i förhållande till omsättningen. Branschsnittet ligger ofta runt 30–40%. Granska bemanning och produktivitet.`,
    impact_sek: -(ratio - 0.4) * totals.revenue,
    confidence: 0.7,
    action_type: "generate_report",
    source: "konton 70-75",
    cta_label: "Analysera personal",
    priority_score: 0,
    recommended_action: { label: "Analysera personal", type: "generate_report" },
    _risk: ratio > 0.6 ? 1 : 0.5,
    _trend: 0,
    _days_to_deadline: 90,
  }];
};
