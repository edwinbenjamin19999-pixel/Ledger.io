import type { Generator, Insight } from "./types.ts";

// Detect single expense entries that are >2.5σ above account mean (last 90d).
export const expenseAnomalies: Generator = async (ctx) => {
  const { supabase, companyId, accountsById, now } = ctx;
  const expenseIds = Array.from(accountsById.entries()).filter(([_, n]) => /^[4-7]/.test(n)).map(([id]) => id);
  if (expenseIds.length === 0) return [];
  const start = new Date(now.getTime() - 90 * 86400000).toISOString().slice(0, 10);
  const { data: lines } = await supabase
    .from("journal_entry_lines")
    .select("account_id, debit, credit, journal_entry:journal_entries(entry_date)")
    .in("account_id", expenseIds)
    .gte("journal_entry.entry_date", start)
    .limit(5000);

  const byAcc = new Map<string, number[]>();
  for (const l of (lines || []) as any[]) {
    const amt = Number(l.debit || 0) - Number(l.credit || 0);
    if (amt <= 0) continue;
    const arr = byAcc.get(l.account_id) || [];
    arr.push(amt);
    byAcc.set(l.account_id, arr);
  }
  const out: Insight[] = [];
  for (const [accId, arr] of byAcc.entries()) {
    if (arr.length < 5) continue;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const sd = Math.sqrt(arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length);
    if (sd === 0) continue;
    const max = Math.max(...arr);
    const z = (max - mean) / sd;
    if (z < 2.5) continue;
    const num = accountsById.get(accId) || "?";
    out.push({
      id: `anomaly-${num}`,
      kind: "anomaly",
      tier: "medium",
      title: `Avvikande transaktion på konto ${num}`,
      explanation: `En transaktion (${Math.round(max).toLocaleString("sv-SE")} kr) är ${z.toFixed(1)}σ över snittet (${Math.round(mean).toLocaleString("sv-SE")} kr). Kontrollera underlag.`,
      impact_sek: -max,
      confidence: 0.7,
      action_type: "reclassify",
      source: `journal_entry_lines: ${num}`,
      cta_label: "Granska transaktion",
      priority_score: 0,
      _risk: 0.5,
      _trend: 0,
      _days_to_deadline: 14,
    });
  }
  return out.sort((a, b) => Math.abs(b.impact_sek) - Math.abs(a.impact_sek)).slice(0, 2);
};
