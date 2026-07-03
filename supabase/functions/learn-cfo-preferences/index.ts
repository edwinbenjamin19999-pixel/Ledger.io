// Aggregates last 30d of ai_cfo_signals → updates ai_cfo_preferences (kind_weights, tone, biases)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ACTION_WEIGHT: Record<string, number> = {
  view: 0.05, click: 0.2, simulate: 0.4, act: 0.6, ignore: -0.4, dismiss: -0.6,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { user_id, company_id } = await req.json();
    if (!user_id || !company_id) {
      return new Response(JSON.stringify({ error: "user_id and company_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: signals } = await supabase
      .from("ai_cfo_signals")
      .select("insight_kind, action, weight")
      .eq("user_id", user_id).eq("company_id", company_id)
      .gte("occurred_at", since);

    const kindAccum = new Map<string, number>();
    let costIgnoreCount = 0, criticalIgnoreCount = 0, growthActCount = 0;
    for (const s of (signals || []) as any[]) {
      const dir = ACTION_WEIGHT[s.action] ?? 0;
      const w = (Number(s.weight) || 1) * dir;
      kindAccum.set(s.insight_kind, (kindAccum.get(s.insight_kind) || 0) + w);
      if ((s.action === "ignore" || s.action === "dismiss") && s.insight_kind === "cost") costIgnoreCount++;
      if ((s.action === "ignore" || s.action === "dismiss") && (s.insight_kind === "liquidity" || s.insight_kind === "profit_trend")) criticalIgnoreCount++;
      if (s.action === "act" && (s.insight_kind === "revenue" || s.insight_kind === "pricing")) growthActCount++;
    }

    // Map accumulated score → kind weight (default 1.0, range 0.5..1.5)
    const kindWeights: Record<string, number> = {};
    for (const [kind, score] of kindAccum.entries()) {
      const w = 1 + Math.max(-0.5, Math.min(0.5, score / 5));
      kindWeights[kind] = Number(w.toFixed(2));
    }

    const tone = criticalIgnoreCount >= 3 ? "direct" : "soft";
    const growthBias = Math.min(1, Math.max(0, 0.5 + (growthActCount * 0.05) - (costIgnoreCount * 0.03)));

    const { data: existing } = await supabase
      .from("ai_cfo_preferences")
      .select("id, evidence_count")
      .eq("user_id", user_id).eq("company_id", company_id).maybeSingle();

    if (existing) {
      await supabase.from("ai_cfo_preferences").update({
        kind_weights: kindWeights, tone, growth_bias: growthBias,
        evidence_count: (existing.evidence_count || 0) + (signals?.length || 0),
      }).eq("id", existing.id);
    } else {
      await supabase.from("ai_cfo_preferences").insert({
        user_id, company_id, kind_weights: kindWeights, tone,
        growth_bias: growthBias, evidence_count: signals?.length || 0,
      });
    }

    return new Response(JSON.stringify({
      ok: true, kindWeights, tone, growth_bias: growthBias,
      signals_processed: signals?.length || 0,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("learn-cfo-preferences error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
