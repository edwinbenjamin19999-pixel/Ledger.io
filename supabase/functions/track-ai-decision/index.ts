import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { company_id, insight_id, insight_kind, action_type, decision, confidence, financial_impact, metadata } = body;

    if (!company_id || !insight_id || !decision) {
      return new Response(JSON.stringify({ error: "company_id, insight_id, decision required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SB_URL = Deno.env.get("SUPABASE_URL")!;
    const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = req.headers.get("Authorization") || "";
    const supabase = createClient(SB_URL, SB_KEY, { global: { headers: { Authorization: auth } } });
    const userResp = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    const userId = userResp.data.user?.id;

    if (!userId) {
      return new Response(JSON.stringify({ error: "Auth required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error } = await supabase.from("ai_ekonom_decisions").insert({
      company_id,
      user_id: userId,
      insight_id,
      insight_kind: insight_kind || "unknown",
      action_type: action_type || "none",
      decision,
      confidence: confidence ?? null,
      financial_impact: financial_impact ?? null,
      metadata: metadata || {},
    });
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("track-ai-decision error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
