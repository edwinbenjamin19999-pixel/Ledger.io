// Cross-module insight detector — connects benchmark ↔ budget ↔ accounting ↔ closing
// Writes proactive insights as ai_economist_actions with status='insight'.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Insight {
  title: string;
  explanation: string;
  action_type: string;
  payload: Record<string, unknown>;
  financial_impact?: number;
  confidence: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { company_id } = await req.json();
    if (!company_id) {
      return new Response(JSON.stringify({ error: "missing company_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Pull live KPI snapshot
    const { data: accounts } = await supabase
      .from("chart_of_accounts")
      .select("id, account_number")
      .eq("company_id", company_id);
    const accMap = new Map<string, string>();
    (accounts || []).forEach((a: { id: string; account_number: string }) => accMap.set(a.id, a.account_number));

    const accountIds = Array.from(accMap.keys());
    let revenue = 0, costs = 0, personnelCost = 0;
    if (accountIds.length > 0) {
      const { data: lines } = await supabase
        .from("journal_entry_lines")
        .select("account_id, debit, credit")
        .in("account_id", accountIds);
      for (const l of (lines || []) as Array<{ account_id: string; debit: number | null; credit: number | null }>) {
        const acc = accMap.get(l.account_id) || "";
        const d = Number(l.debit || 0); const c = Number(l.credit || 0);
        if (acc.startsWith("3")) revenue += c - d;
        if (acc.startsWith("4") || acc.startsWith("5") || acc.startsWith("6") || acc.startsWith("7")) costs += d - c;
        if (acc.startsWith("7")) personnelCost += d - c;
      }
    }

    const ebitda = revenue - costs;
    const ebitdaMargin = revenue > 0 ? ebitda / revenue : 0;
    const personnelRatio = revenue > 0 ? personnelCost / revenue : 0;

    const insights: Insight[] = [];

    // Cross-module rule 1: low personnel cost + EBITDA-marginal high → potential underinvestment
    if (personnelRatio > 0 && personnelRatio < 0.10 && ebitdaMargin > 0.30) {
      insights.push({
        title: "Möjlig underinvestering i personal",
        explanation: `Personalkostnad är endast ${(personnelRatio * 100).toFixed(1)}% av omsättningen samtidigt som lönsamheten är ${(ebitdaMargin * 100).toFixed(1)}%. Det kan indikera underbemanning som hämmar tillväxt.`,
        action_type: "none",
        payload: { kpi: "personnel_ratio", value: personnelRatio, ebitda_margin: ebitdaMargin },
        confidence: 0.72,
      });
    }

    // Rule 2: high EBITDA but flat revenue (no growth scenarios pushed)
    const { data: scenarios } = await supabase
      .from("budget_scenarios")
      .select("id, name, growth_assumption")
      .eq("company_id", company_id)
      .limit(5);
    const hasGrowthScenario = (scenarios || []).some((s: { growth_assumption?: number }) => (s.growth_assumption || 0) > 0.05);
    if (ebitdaMargin > 0.25 && !hasGrowthScenario && revenue > 0) {
      insights.push({
        title: "Stark lönsamhet — utmana tillväxtscenariot",
        explanation: `Marginalen är hög (${(ebitdaMargin * 100).toFixed(0)}%) men inget scenario testar tillväxt. Simulera +10–15% omsättning för att utvärdera kapacitet.`,
        action_type: "none",
        payload: { kpi: "ebitda_margin", value: ebitdaMargin },
        confidence: 0.68,
      });
    }

    // Rule 3: cash trend negative
    const { data: cashLines } = await supabase
      .from("journal_entry_lines")
      .select("debit, credit, account_id")
      .in("account_id", accountIds.length > 0 ? accountIds : ["00000000-0000-0000-0000-000000000000"])
      .limit(5000);
    let cash = 0;
    for (const l of (cashLines || []) as Array<{ account_id: string; debit: number | null; credit: number | null }>) {
      const acc = accMap.get(l.account_id) || "";
      if (acc.startsWith("19")) cash += Number(l.debit || 0) - Number(l.credit || 0);
    }
    const monthlyBurn = costs / 12;
    if (monthlyBurn > 0 && cash > 0) {
      const runwayDays = Math.round((cash / monthlyBurn) * 30);
      if (runwayDays < 90) {
        insights.push({
          title: "Likviditetsrisk inom 90 dagar",
          explanation: `Likviditet räcker ca ${runwayDays} dagar vid nuvarande burn. Föreslå re-forecast och kostnadsåtgärder.`,
          action_type: "generate_report",
          payload: { runway_days: runwayDays, cash, monthly_burn: monthlyBurn },
          financial_impact: -cash,
          confidence: 0.85,
        });
      }
    }

    // Persist as ai_economist_actions (status=insight)
    const inserted: string[] = [];
    for (const ins of insights) {
      const { data: row, error } = await supabase
        .from("ai_economist_actions")
        .insert({
          company_id,
          action_type: ins.action_type,
          automation_mode: "manual",
          status: "pending",
          title: ins.title,
          payload: { ...ins.payload, explanation: ins.explanation, source: "detect-cross-module-insights" },
          confidence: ins.confidence,
          financial_impact: ins.financial_impact ?? null,
        })
        .select("id")
        .single();
      if (!error && row) inserted.push(row.id);
    }

    return new Response(
      JSON.stringify({ detected: insights.length, inserted, insights }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("detect-cross-module-insights error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
