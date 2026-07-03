import type { Generator, Insight } from "./types.ts";

export const customerConcentration: Generator = async (ctx) => {
  const { supabase, companyId, now } = ctx;
  const start = new Date(now.getTime() - 365 * 86400000).toISOString().slice(0, 10);
  const { data: invs } = await supabase
    .from("invoices")
    .select("customer_name, total_amount")
    .eq("company_id", companyId)
    .gte("invoice_date", start)
    .limit(2000);
  const total = (invs || []).reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0);
  if (total <= 0) return [];
  const map = new Map<string, number>();
  for (const i of (invs || []) as any[]) {
    if (!i.customer_name) continue;
    map.set(i.customer_name, (map.get(i.customer_name) || 0) + Number(i.total_amount || 0));
  }
  const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const top3Sum = sorted.reduce((s, [_, v]) => s + v, 0);
  const ratio = top3Sum / total;
  if (ratio < 0.5) return [];
  return [{
    id: "concentration-top3",
    kind: "concentration",
    tier: "medium",
    title: `Top 3 kunder = ${(ratio * 100).toFixed(0)}% av intäkterna`,
    explanation: `${sorted.map(s => s[0]).join(", ")} står för majoriteten av omsättningen. Kundförlust skulle få stor påverkan — diversifiera kundbasen.`,
    impact_sek: -top3Sum * 0.3,
    confidence: 0.85,
    action_type: "generate_report",
    source: "invoices · 12m",
    cta_label: "Visa kundanalys",
    priority_score: 0,
    recommended_action: { label: "Granska beroende", type: "generate_report" },
    _risk: ratio > 0.7 ? 1 : 0.5,
    _trend: 0,
    _days_to_deadline: 90,
  }];
};
