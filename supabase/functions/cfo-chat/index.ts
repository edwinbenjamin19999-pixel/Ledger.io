// AI CFO Chat — context-aware structured strategic dialog
// Returns streaming SSE response with optional structured tool-call output.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

interface ContextPayload {
  type?: "kpi" | "benchmark" | "scenario" | "action" | "general";
  kpi?: string;
  value?: number;
  percentile?: number;
  peer_median?: number;
  scenario_name?: string;
  insight_id?: string;
  source?: string;
  notes?: string;
}

function buildSystemPrompt(context: ContextPayload, prefs: Record<string, number>) {
  const tone = prefs.tone > 0.3 ? "kortfattad direkt" : prefs.tone < -0.3 ? "utförlig pedagogisk" : "balanserad professionell";
  const growthBias = prefs.growth_bias > 0.3 ? "Användaren prefererar tillväxt-orienterade rekommendationer." :
    prefs.growth_bias < -0.3 ? "Användaren prefererar kostnadsdisciplin före tillväxt." : "";
  const riskBias = prefs.risk_appetite < -0.3 ? "Användaren är riskavers — föreslå konservativa åtgärder." : "";

  return `Du är AI CFO — en senior finansiell rådgivare för svenska SME. Inte en chatbot, utan en beslutsmotor.

TON: ${tone}. Svenska. Tabular siffror i SEK.
${growthBias}
${riskBias}

KONTEXT:
${context.type === "kpi" ? `- KPI under analys: ${context.kpi} = ${context.value} (P${context.percentile}, peer-median ${context.peer_median})` : ""}
${context.scenario_name ? `- Aktivt scenario: ${context.scenario_name}` : ""}
${context.notes ? `- Anteckningar: ${context.notes}` : ""}

REGLER:
1. Svara ALLTID via verktyget "deliver_cfo_response" med struktur Summary/Interpretation/RiskOrOpportunity/Recommendation/Actions.
2. Summary = 1-2 meningar, direkt.
3. Interpretation = vad som faktiskt händer (orsak).
4. Risk eller Opportunity (välj en, color-coded).
5. Recommendation = ETT konkret nästa steg.
6. Actions = 1-3 körbara system-åtgärder med action_type från: simulate_scenario, open_account_analysis, create_task, adjust_forecast, flag_anomaly, navigate_to.
7. Inga tabeller. Inga konton i Summary. Konkret, beslutsfokuserat.`;
}

const TOOL = {
  type: "function",
  function: {
    name: "deliver_cfo_response",
    description: "Strukturerat AI CFO-svar.",
    parameters: {
      type: "object",
      properties: {
        summary: { type: "string", description: "1-2 meningars huvudbudskap." },
        interpretation: { type: "string", description: "Vad händer egentligen och varför." },
        risk_or_opportunity: {
          type: "object",
          properties: {
            kind: { type: "string", enum: ["risk", "opportunity", "neutral"] },
            severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
            text: { type: "string" },
          },
          required: ["kind", "text"],
        },
        recommendation: { type: "string", description: "Ett konkret nästa steg." },
        suggested_actions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { type: "string" },
              action_type: { type: "string", enum: ["simulate_scenario", "open_account_analysis", "create_task", "adjust_forecast", "flag_anomaly", "navigate_to"] },
              payload: { type: "object", additionalProperties: true },
            },
            required: ["label", "action_type"],
          },
          maxItems: 3,
        },
        confidence: { type: "number", minimum: 0, maximum: 1 },
      },
      required: ["summary", "interpretation", "risk_or_opportunity", "recommendation", "suggested_actions", "confidence"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const { company_id, conversation_id, message, context_payload } = body as {
      company_id: string; conversation_id?: string; message: string; context_payload?: ContextPayload;
    };

    if (!company_id || !message) {
      return new Response(JSON.stringify({ error: "missing company_id or message" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Ensure conversation
    let convId = conversation_id;
    const ctx = context_payload || { type: "general" };
    if (!convId) {
      const title = ctx.kpi ? `${ctx.kpi.toUpperCase()}-analys` : ctx.scenario_name ? `Scenario: ${ctx.scenario_name}` : "Strategisk dialog";
      const { data: conv, error: convErr } = await supabase
        .from("cfo_conversations")
        .insert({ company_id, user_id: userId, title, context_type: ctx.type || "general", context_payload: ctx })
        .select("id")
        .single();
      if (convErr) throw convErr;
      convId = conv.id;
    }

    // Load preferences
    const { data: prefRows } = await supabase
      .from("cfo_user_preferences")
      .select("dimension, score")
      .eq("company_id", company_id)
      .eq("user_id", userId);
    const prefs: Record<string, number> = {};
    (prefRows || []).forEach((r: { dimension: string; score: number }) => { prefs[r.dimension] = Number(r.score) || 0; });

    // Load recent history
    const { data: history } = await supabase
      .from("cfo_conversation_messages")
      .select("role, content")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true })
      .limit(20);

    // Save user message
    await supabase.from("cfo_conversation_messages").insert({
      conversation_id: convId, company_id, role: "user", content: message,
    });

    const messages = [
      { role: "system", content: buildSystemPrompt(ctx, prefs) },
      ...(history || []).map((h: { role: string; content: string }) => ({ role: h.role, content: h.content })),
      { role: "user", content: message },
    ];

    let aiJson: any;
    try {
      const { callAIWithFallback, MODEL_CHAINS } = await import("../_shared/ai-gateway.ts");
      const { data, modelUsed } = await callAIWithFallback({
        ...MODEL_CHAINS.balancedInsights,
        messages,
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "deliver_cfo_response" } },
      });
      aiJson = data;
      console.log(`[cfo-chat] modelUsed=${modelUsed}`);
    } catch (e: any) {
      const msg = e?.message || "";
      console.error("cfo-chat AI gateway", e);
      if (msg.includes("krediter slut")) return new Response(JSON.stringify({ error: msg }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (msg.includes("autentiseras")) return new Response(JSON.stringify({ error: msg }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "AI CFO är överbelastad. Försök igen om en stund." }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    let structured: Record<string, unknown> | null = null;
    let textContent = aiJson.choices?.[0]?.message?.content || "";
    if (toolCall?.function?.arguments) {
      try {
        structured = JSON.parse(toolCall.function.arguments);
        textContent = (structured?.summary as string) || textContent;
      } catch (e) {
        console.warn("structured parse fail", e);
      }
    }

    const { data: savedMsg, error: saveErr } = await supabase
      .from("cfo_conversation_messages")
      .insert({
        conversation_id: convId, company_id, role: "assistant",
        content: textContent || "(inget svar)", structured: structured ?? undefined,
      })
      .select("id")
      .single();
    if (saveErr) console.error("save msg fail", saveErr);

    // Bump conversation updated_at
    await supabase.from("cfo_conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);

    return new Response(
      JSON.stringify({ conversation_id: convId, message_id: savedMsg?.id, content: textContent, structured }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("cfo-chat error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
