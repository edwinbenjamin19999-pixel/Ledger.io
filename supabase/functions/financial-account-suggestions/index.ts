import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AccountInput {
  account_number: string;
  account_name?: string;
  actual: number;
  budget: number;
  forecast?: number | null;
  trend_3m?: number | null;
  is_revenue?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { company_id, period_hash, accounts } = await req.json() as {
      company_id: string;
      period_hash: string;
      accounts: AccountInput[];
    };

    if (!company_id || !period_hash || !Array.isArray(accounts)) {
      return new Response(JSON.stringify({ error: "company_id, period_hash, accounts required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    // Cache lookup
    const { data: cached } = await supabase
      .from("ai_account_suggestions")
      .select("account_number, suggested_value, reason, expected_impact_sek, confidence, expires_at")
      .eq("company_id", company_id)
      .eq("period_hash", period_hash)
      .gt("expires_at", new Date().toISOString());

    if (cached && cached.length >= Math.min(accounts.length, 5)) {
      return new Response(JSON.stringify({ suggestions: cached, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter to accounts with material variance
    const candidates = accounts
      .filter(a => Math.abs((a.actual || 0) - (a.budget || 0)) > 1000)
      .slice(0, 25);

    if (candidates.length === 0) {
      return new Response(JSON.stringify({ suggestions: [], cached: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Du är CFO-assistent. Föreslå realistiska prognosjusteringar per BAS-konto baserat på utfall, budget och 3-månaders trend.
REGLER:
- Reducera kostnadsprognos om utfall > budget med >15%
- Höj intäktsprognos om utfall > budget med >10%
- Var konservativ vid små avvikelser
- Ange suggested_value som ABSOLUTT ny prognos i SEK för perioden
- expected_impact_sek = (suggested_value - current_forecast) signerat (positiv = förbättring av resultat)
- confidence 0-1

KONTON:
${JSON.stringify(candidates, null, 2)}`;

    const { callAIWithFallback, MODEL_CHAINS } = await import("../_shared/ai-gateway.ts");
    let aiData: any;
    try {
      const r = await callAIWithFallback({
        ...MODEL_CHAINS.balancedInsights,
        messages: [
          { role: "system", content: "Du är en svensk CFO-assistent som föreslår datadrivna prognosjusteringar." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "propose_adjustments",
            description: "Föreslå prognosjusteringar per konto",
            parameters: {
              type: "object",
              properties: {
                suggestions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      account_number: { type: "string" },
                      suggested_value: { type: "number" },
                      reason: { type: "string" },
                      expected_impact_sek: { type: "number" },
                      confidence: { type: "number" },
                    },
                    required: ["account_number", "suggested_value", "reason", "expected_impact_sek", "confidence"],
                  },
                },
              },
              required: ["suggestions"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "propose_adjustments" } },
      });
      aiData = r.data;
      console.log(`[financial-account-suggestions] modelUsed=${r.modelUsed}`);
    } catch (e: any) {
      const msg = e?.message || "";
      if (msg.includes("krediter slut")) return new Response(JSON.stringify({ error: msg }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (msg.includes("autentiseras")) return new Response(JSON.stringify({ error: msg }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      console.error("[financial-account-suggestions] all models failed", e);
      return new Response(JSON.stringify({ error: "AI-tjänsten är överbelastad. Försök igen om en stund." }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    const parsed = toolCall ? JSON.parse(toolCall.function.arguments) : { suggestions: [] };
    const suggestions = parsed.suggestions || [];

    // Cache insert (ignore duplicates)
    if (suggestions.length > 0) {
      const rows = suggestions.map((s: any) => ({
        company_id,
        period_hash,
        account_number: String(s.account_number),
        suggested_value: Number(s.suggested_value) || 0,
        reason: s.reason || null,
        expected_impact_sek: Number(s.expected_impact_sek) || 0,
        confidence: Number(s.confidence) || 0.5,
      }));
      await supabase.from("ai_account_suggestions").upsert(rows, {
        onConflict: "company_id,period_hash,account_number",
      });
    }

    return new Response(JSON.stringify({ suggestions, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("financial-account-suggestions error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
