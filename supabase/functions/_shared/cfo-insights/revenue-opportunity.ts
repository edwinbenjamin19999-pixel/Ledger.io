import type { Generator, Insight } from "./types.ts";

export const revenueOpportunity: Generator = async (ctx) => {
  const { supabase, companyId, totals } = ctx;
  if (totals.revenue <= 0) return [];

  // Customers with declining invoice frequency (last 90d vs prior 90d)
  const today = new Date();
  const d90 = new Date(today.getTime() - 90 * 86400000);
  const d180 = new Date(today.getTime() - 180 * 86400000);
  const { data: invs } = await supabase
    .from("invoices")
    .select("customer_name, total_amount, invoice_date")
    .eq("company_id", companyId)
    .gte("invoice_date", d180.toISOString().slice(0, 10))
    .limit(1000);

  const byCustomer = new Map<string, { recent: number; prev: number }>();
  for (const i of (invs || []) as any[]) {
    if (!i.customer_name) continue;
    const dt = new Date(i.invoice_date);
    const cur = byCustomer.get(i.customer_name) || { recent: 0, prev: 0 };
    if (dt >= d90) cur.recent += Number(i.total_amount || 0);
    else cur.prev += Number(i.total_amount || 0);
    byCustomer.set(i.customer_name, cur);
  }

  const declining = Array.from(byCustomer.entries())
    .filter(([_, v]) => v.prev > 10000 && v.recent < v.prev * 0.6)
    .map(([name, v]) => ({ name, drop: v.prev - v.recent }))
    .sort((a, b) => b.drop - a.drop)
    .slice(0, 1);

  if (declining.length === 0) return [];
  const top = declining[0];
  return [{
    id: `revenue-${top.name.slice(0, 30)}`,
    kind: "revenue",
    tier: "medium",
    title: `${top.name} fakturerar mindre`,
    explanation: `Kunden har minskat med ${Math.round(top.drop).toLocaleString("sv-SE")} kr senaste 90 dagar. Föreslå merförsäljning eller följ upp orsak.`,
    impact_sek: top.drop,
    confidence: 0.7,
    action_type: "generate_report",
    source: "invoices",
    cta_label: "Visa kund",
    priority_score: 0,
    recommended_action: { label: "Kontakta kund", type: "generate_report" },
    simulation: { kind: "price_increase", default_params: { pct: 5, scope: "customer", customer: top.name } },
    _risk: 0.5,
    _trend: 1,
    _days_to_deadline: 30,
  }];
};
