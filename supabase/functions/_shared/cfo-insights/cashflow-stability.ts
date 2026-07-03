import type { Generator, Insight } from "./types.ts";

export const cashflowStability: Generator = async (ctx) => {
  const { supabase, companyId, accountsById, now } = ctx;
  const cashIds = Array.from(accountsById.entries()).filter(([_, n]) => /^19/.test(n)).map(([id]) => id);
  if (cashIds.length === 0) return [];
  const start = new Date(now.getTime() - 180 * 86400000).toISOString().slice(0, 10);
  const { data: lines } = await supabase
    .from("journal_entry_lines")
    .select("debit, credit, journal_entry:journal_entries(entry_date)")
    .in("account_id", cashIds)
    .gte("journal_entry.entry_date", start)
    .limit(3000);
  const monthly = new Map<string, number>();
  for (const l of (lines || []) as any[]) {
    const date = l.journal_entry?.entry_date;
    if (!date) continue;
    const key = date.slice(0, 7);
    monthly.set(key, (monthly.get(key) || 0) + Number(l.debit || 0) - Number(l.credit || 0));
  }
  const arr = Array.from(monthly.values());
  if (arr.length < 3) return [];
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length;
  const sd = Math.sqrt(variance);
  if (Math.abs(mean) < 1 || sd / Math.abs(mean) < 0.6) return [];
  return [{
    id: "cashflow-volatility",
    kind: "cashflow_stability",
    tier: "medium",
    title: "Kassaflödet är volatilt",
    explanation: `Månadskassaflödet varierar kraftigt (CV ${(sd / Math.abs(mean) * 100).toFixed(0)}%). Bygg en buffert eller jämna ut kund- och leverantörsbetalningar.`,
    impact_sek: -sd,
    confidence: 0.7,
    action_type: "generate_report",
    source: "kassakonton 19xx · 6m",
    cta_label: "Visa kassaflödesgraf",
    priority_score: 0,
    _risk: 0.5,
    _trend: 0,
    _days_to_deadline: 60,
  }];
};
