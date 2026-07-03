import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { scoreInsight, tierOf, DEFAULT_WEIGHTS } from "../_shared/cfo-scoring.ts";
import {
  liquidityRisk, overdueAR, costInefficiency, revenueOpportunity,
  marginOptimization, customerConcentration, personnelEfficiency,
  cashflowStability, profitTrend, expenseAnomalies, pricingOpportunity, annualReport,
  type Insight, type GeneratorContext,
} from "../_shared/cfo-insights/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { company_id, persona_mode = "business_owner", user_id = null } = await req.json();
    if (!company_id) {
      return new Response(JSON.stringify({ error: "company_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Load chart of accounts
    const { data: accounts } = await supabase
      .from("chart_of_accounts")
      .select("id, account_number")
      .eq("company_id", company_id);
    const accountsByNumber = new Map<string, string>();
    const accountsById = new Map<string, string>();
    (accounts || []).forEach((a: any) => {
      accountsByNumber.set(a.account_number, a.id);
      accountsById.set(a.id, a.account_number);
    });

    // Compute high-level totals (revenue / costs / cash / monthly burn)
    let revenue = 0, costs = 0, cash = 0;
    if (accountsById.size > 0) {
      const ids = Array.from(accountsById.keys());
      const { data: lines } = await supabase
        .from("journal_entry_lines")
        .select("account_id, debit, credit")
        .in("account_id", ids);
      for (const l of (lines || []) as any[]) {
        const num = accountsById.get(l.account_id) || "";
        const d = Number(l.debit || 0), c = Number(l.credit || 0);
        if (num.startsWith("3")) revenue += c - d;
        else if (/^[4-7]/.test(num)) costs += d - c;
        if (/^19/.test(num)) cash += d - c;
      }
    }
    const monthlyBurn = costs / 12;

    // Load user preferences (kind_weights, tone)
    let kindWeights: Record<string, number> = {};
    let tone: "soft" | "direct" = "soft";
    if (user_id) {
      const { data: pref } = await supabase
        .from("ai_cfo_preferences")
        .select("kind_weights, tone")
        .eq("user_id", user_id).eq("company_id", company_id).maybeSingle();
      if (pref) {
        kindWeights = (pref.kind_weights as Record<string, number>) || {};
        tone = (pref.tone as "soft" | "direct") || "soft";
      }
    }

    const ctx: GeneratorContext = {
      supabase, companyId: company_id, personaMode: persona_mode, tone,
      now: new Date(), accountsByNumber, accountsById,
      totals: { revenue, costs, cash, monthlyBurn },
    };

    const generators = [
      liquidityRisk, overdueAR, costInefficiency, revenueOpportunity,
      marginOptimization, customerConcentration, personnelEfficiency,
      cashflowStability, profitTrend, expenseAnomalies, pricingOpportunity, annualReport,
    ];

    const settled = await Promise.allSettled(generators.map(g => g(ctx)));
    const insights: Insight[] = [];
    settled.forEach((s, idx) => {
      if (s.status === "fulfilled") insights.push(...s.value);
      else console.warn(`generator ${idx} failed`, s.reason);
    });

    // Score each insight (with persona weighting)
    for (const i of insights) {
      const score = scoreInsight({
        impactSek: i.impact_sek,
        risk: i._risk ?? 0.5,
        daysToDeadline: i._days_to_deadline ?? null,
        trend: i._trend ?? 0,
        kind: i.kind,
        kindWeights,
      }, DEFAULT_WEIGHTS, persona_mode);
      i.priority_score = score;
      i.tier = tierOf(score, i._risk === 1 ? 0.95 : 0);

      // Persona-aware tone: accountant gets technical detail, business owner gets short headline.
      if (persona_mode === "accountant" && i.explanation && i.explanation.length < 120) {
        // leave as-is — builders may already provide technical text
      } else if (persona_mode === "business_owner" && i.explanation && i.explanation.length > 180) {
        // shorten for owner
        const firstSentence = i.explanation.split(/(?<=[.!?])\s+/)[0];
        if (firstSentence && firstSentence.length > 30) i.explanation = firstSentence;
      }
    }

    insights.sort((a, b) => b.priority_score - a.priority_score);
    const top = insights.slice(0, 5);
    const more = insights.slice(5);

    return new Response(JSON.stringify({
      top, more,
      counts: {
        critical: insights.filter(i => i.tier === "critical").length,
        high: insights.filter(i => i.tier === "high").length,
        medium: insights.filter(i => i.tier === "medium").length,
        low: insights.filter(i => i.tier === "low").length,
      },
      tone, computed_at: new Date().toISOString(),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("score-cfo-priorities error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
