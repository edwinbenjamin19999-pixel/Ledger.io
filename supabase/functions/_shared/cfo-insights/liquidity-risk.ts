import type { Generator, Insight } from "./types.ts";

export const liquidityRisk: Generator = async (ctx) => {
  const { supabase, companyId, totals, tone } = ctx;
  const out: Insight[] = [];

  const in30 = new Date(ctx.now.getTime() + 30 * 86400000);
  const { data: ap } = await supabase
    .from("supplier_invoices")
    .select("amount, due_date, status")
    .eq("company_id", companyId)
    .in("status", ["pending", "approved"])
    .lt("due_date", in30.toISOString().slice(0, 10));
  const apTotal = (ap || []).reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
  const projected = totals.cash - apTotal;

  if (totals.cash > 0 && (projected < totals.cash * 0.2 || projected < 0)) {
    const days = projected < 0 ? 0 : Math.max(0, Math.round((projected / Math.max(1, totals.monthlyBurn)) * 30));
    out.push({
      id: "liquidity-30d",
      kind: "liquidity",
      tier: "high",
      title: projected < 0 ? "Likviditet riskerar bli negativ" : "Likviditet sjunker snabbt",
      explanation: tone === "direct"
        ? `Du har ${fmt(totals.cash)} kr kassa men ${fmt(apTotal)} kr i räkningar inom 30 dagar. Prognos: ${fmt(projected)} kr. Agera nu.`
        : `Saldo ${fmt(totals.cash)} kr · upcoming AP 30d ${fmt(apTotal)} kr · prognos ${fmt(projected)} kr.`,
      impact_sek: projected - totals.cash,
      confidence: 0.9,
      action_type: "generate_report",
      source: "supplier_invoices + cash",
      cta_label: "Visa kassaflödesprognos",
      priority_score: 0,
      recommended_action: { label: "Visa kassaflödesprognos", type: "generate_report" },
      simulation: { kind: "collect_ar", default_params: { acceleration_days: 14 } },
      _risk: projected < 0 ? 1 : 0.5,
      _trend: 1,
      _days_to_deadline: days,
    });
  }
  return out;
};

function fmt(n: number) { return Math.round(n).toLocaleString("sv-SE"); }
