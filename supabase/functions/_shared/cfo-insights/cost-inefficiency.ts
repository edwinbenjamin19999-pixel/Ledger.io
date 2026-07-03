import type { Generator, Insight } from "./types.ts";

// Flag expense accounts (4xxx/5xxx/6xxx/7xxx) with >15% MoM increase last 60d.
export const costInefficiency: Generator = async (ctx) => {
  const { supabase, companyId, accountsByNumber, accountsById } = ctx;
  const expenseIds = Array.from(accountsById.entries())
    .filter(([_, num]) => /^[4-7]/.test(num))
    .map(([id]) => id);
  if (expenseIds.length === 0) return [];

  const today = new Date();
  const start = new Date(today.getTime() - 60 * 86400000);

  const { data: lines } = await supabase
    .from("journal_entry_lines")
    .select("account_id, debit, credit, journal_entry:journal_entries(entry_date)")
    .in("account_id", expenseIds)
    .gte("journal_entry.entry_date", start.toISOString().slice(0, 10))
    .limit(5000);

  const monthly = new Map<string, { m1: number; m0: number }>(); // accId -> {prev, curr}
  const monthBoundary = new Date(today.getTime() - 30 * 86400000);
  for (const l of (lines || []) as any[]) {
    const date = l.journal_entry?.entry_date;
    if (!date) continue;
    const d = new Date(date);
    const amt = Number(l.debit || 0) - Number(l.credit || 0);
    if (amt <= 0) continue;
    const cur = monthly.get(l.account_id) || { m1: 0, m0: 0 };
    if (d >= monthBoundary) cur.m0 += amt; else cur.m1 += amt;
    monthly.set(l.account_id, cur);
  }

  const out: Insight[] = [];
  for (const [accId, { m1, m0 }] of monthly.entries()) {
    if (m1 < 5000) continue;
    const pct = ((m0 - m1) / m1) * 100;
    if (pct < 15) continue;
    const num = accountsById.get(accId) || "";
    const delta = m0 - m1;
    out.push({
      id: `cost-${num}`,
      kind: "cost",
      tier: "medium",
      title: `Kostnad på konto ${num} ökar`,
      explanation: `Konto ${num} steg ${pct.toFixed(0)}% MoM (${fmt(m1)} → ${fmt(m0)} kr). Kontrollera leverantörer, prishöjningar eller dubbletter.`,
      impact_sek: -delta,
      confidence: 0.75,
      action_type: "reclassify",
      source: `journal_entry_lines: ${num}`,
      cta_label: "Granska konto",
      priority_score: 0,
      recommended_action: { label: "Granska konto", type: "reclassify", payload: { account_number: num } },
      simulation: { kind: "cost_cut", default_params: { account_number: num, monthly_amount: Math.round(delta * 0.5) } },
      _risk: 0.5,
      _trend: 1,
      _days_to_deadline: 30,
    });
  }
  // Cap to top 3 cost insights
  return out.sort((a, b) => Math.abs(b.impact_sek) - Math.abs(a.impact_sek)).slice(0, 3);
};

function fmt(n: number) { return Math.round(n).toLocaleString("sv-SE"); }
