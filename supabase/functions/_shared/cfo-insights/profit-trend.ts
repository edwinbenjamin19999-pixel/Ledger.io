import type { Generator, Insight } from "./types.ts";

export const profitTrend: Generator = async (ctx) => {
  const { supabase, companyId, accountsById, now, tone } = ctx;
  const incomeIds = Array.from(accountsById.entries()).filter(([_, n]) => /^3/.test(n)).map(([id]) => id);
  const expenseIds = Array.from(accountsById.entries()).filter(([_, n]) => /^[4-7]/.test(n)).map(([id]) => id);
  if (incomeIds.length === 0 || expenseIds.length === 0) return [];
  const start = new Date(now.getTime() - 120 * 86400000).toISOString().slice(0, 10);
  const { data: lines } = await supabase
    .from("journal_entry_lines")
    .select("account_id, debit, credit, journal_entry:journal_entries(entry_date)")
    .in("account_id", [...incomeIds, ...expenseIds])
    .gte("journal_entry.entry_date", start)
    .limit(8000);
  const incomeSet = new Set(incomeIds);
  const monthly = new Map<string, { rev: number; cost: number }>();
  for (const l of (lines || []) as any[]) {
    const date = l.journal_entry?.entry_date;
    if (!date) continue;
    const key = date.slice(0, 7);
    const cur = monthly.get(key) || { rev: 0, cost: 0 };
    const d = Number(l.debit || 0); const c = Number(l.credit || 0);
    if (incomeSet.has(l.account_id)) cur.rev += c - d;
    else cur.cost += d - c;
    monthly.set(key, cur);
  }
  const months = Array.from(monthly.entries()).sort().slice(-3);
  if (months.length < 3) return [];
  const ebits = months.map(([_, v]) => v.rev - v.cost);
  if (ebits[0] > ebits[1] && ebits[1] > ebits[2]) {
    const drop = ebits[0] - ebits[2];
    return [{
      id: "profit-trend-down",
      kind: "profit_trend",
      tier: "high",
      title: "EBIT-trenden är negativ 3 månader i rad",
      explanation: tone === "direct"
        ? `Resultatet faller månad för månad: ${ebits.map(fmt).join(" → ")} kr. Detta är en tydlig varning — vidta åtgärder nu.`
        : `Rörelseresultatet trendar nedåt: ${ebits.map(fmt).join(" → ")} kr senaste 3 månaderna.`,
      impact_sek: -drop,
      confidence: 0.85,
      action_type: "generate_report",
      source: "RR · 3m rolling",
      cta_label: "Analysera nedgång",
      priority_score: 0,
      recommended_action: { label: "Visa RR-utveckling", type: "generate_report" },
      simulation: { kind: "cost_cut", default_params: { pct: 5 } },
      _risk: 1,
      _trend: 1,
      _days_to_deadline: 30,
    }];
  }
  return [];
};

function fmt(n: number) { return Math.round(n).toLocaleString("sv-SE"); }
