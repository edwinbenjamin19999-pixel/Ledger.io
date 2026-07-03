import type { Generator, Insight } from "./types.ts";

export const overdueAR: Generator = async (ctx) => {
  const { supabase, companyId, tone, now } = ctx;
  const { data: overdue } = await supabase
    .from("invoices")
    .select("id, total_amount, due_date, status")
    .eq("company_id", companyId)
    .in("status", ["sent", "overdue"])
    .lt("due_date", now.toISOString().slice(0, 10))
    .limit(100);
  if (!overdue || overdue.length === 0) return [];
  const total = overdue.reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0);
  const oldest = Math.max(...overdue.map((i: any) =>
    Math.floor((now.getTime() - new Date(i.due_date).getTime()) / 86400000)));
  return [{
    id: "overdue-ar",
    kind: "overdue_ar",
    tier: "high",
    title: `${overdue.length} förfallna fakturor`,
    explanation: tone === "direct"
      ? `${overdue.length} kunder har inte betalat — totalt ${total.toLocaleString("sv-SE")} kr ute. Skicka påminnelser idag.`
      : `${overdue.length} kundfakturor förfallna, totalt ${total.toLocaleString("sv-SE")} kr. Äldsta ${oldest} dagar.`,
    impact_sek: -total,
    confidence: 0.95,
    action_type: "send_reminder",
    source: `invoices: ${overdue.length}`,
    cta_label: "Skicka påminnelser automatiskt",
    priority_score: 0,
    recommended_action: { label: "Skicka påminnelser", type: "send_reminder" },
    simulation: { kind: "collect_ar", default_params: { acceleration_days: 14 } },
    _risk: 0.5,
    _trend: 1,
    _days_to_deadline: 0,
  }];
};
