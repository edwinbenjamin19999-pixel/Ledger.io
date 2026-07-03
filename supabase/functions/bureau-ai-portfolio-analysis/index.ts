// Generate fresh AI insights for the bureau portfolio via Lovable AI Gateway.
// Returns 3-5 insights as structured JSON.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const SYSTEM_PROMPT = `Du är en AI-assistent för en svensk redovisningsbyrå.
Analysera portföljdata och generera 3–5 konkreta insikter på svenska.
Varje insikt ska ha: kategori (Likviditet, Kassaflöde, Bokföring, Moms, Granskning, Tillväxt, Automation, Benchmarking),
berörd klient/er, specifik observation med siffror, och en konkret rekommendation.`;

const TOOL = {
  type: "function",
  function: {
    name: "emit_insights",
    description: "Returnera 3-5 portföljinsikter på svenska.",
    parameters: {
      type: "object",
      properties: {
        insights: {
          type: "array",
          items: {
            type: "object",
            properties: {
              category: { type: "string" },
              severity: { type: "string", enum: ["critical", "watch", "opportunity"] },
              title: { type: "string" },
              affected_clients: { type: "array", items: { type: "string" } },
              observation: { type: "string" },
              recommendation: { type: "string" },
            },
            required: ["category", "severity", "title", "observation", "recommendation"],
            additionalProperties: false,
          },
        },
      },
      required: ["insights"],
      additionalProperties: false,
    },
  },
};

serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: claims, error: cErr } = await userClient.auth.getClaims(
      auth.replace("Bearer ", ""),
    );
    if (cErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);

    const { firm_id } = await req.json();
    if (!firm_id) return json({ error: "firm_id required" }, 400);

    const { data: member } = await userClient
      .from("firm_members").select("id, role")
      .eq("firm_id", firm_id).eq("user_id", claims.claims.sub).eq("is_active", true).maybeSingle();
    if (!member) return json({ error: "Forbidden" }, 403);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Build a compact portfolio snapshot for the model
    const { data: clients } = await admin
      .from("firm_clients")
      .select(`
        company_id, monthly_fee, profitability_score, risk_score, automation_share,
        revenue_ytd, cost_ytd, margin_pct,
        companies:company_id (name)
      `)
      .eq("firm_id", firm_id)
      .eq("is_active", true);

    const portfolio = (clients ?? []).map((c: any) => ({
      name: c.companies?.name ?? "Okänd",
      monthly_fee_sek: Number(c.monthly_fee ?? 0),
      revenue_ytd_sek: Number(c.revenue_ytd ?? 0),
      cost_ytd_sek: Number(c.cost_ytd ?? 0),
      margin_pct: c.margin_pct !== null ? Number(c.margin_pct) : null,
      automation_share: c.automation_share !== null ? Number(c.automation_share) : null,
      risk_score: c.risk_score !== null ? Number(c.risk_score) : null,
    }));

    const { data: openAlerts } = await admin
      .from("bureau_alerts")
      .select("severity, code, message")
      .eq("firm_id", firm_id)
      .eq("status", "open")
      .limit(50);

    const userPayload = JSON.stringify({
      portfolio_size: portfolio.length,
      clients: portfolio,
      open_alerts: openAlerts ?? [],
      generated_at: new Date().toISOString(),
    });

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Portföljdata:\n${userPayload}` },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "emit_insights" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429)
        return json({ error: "Rate limit — försök igen om en stund." }, 429);
      if (aiResp.status === 402)
        return json({ error: "AI-krediter slut — fyll på i arbetsytan." }, 402);
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      return json({ error: "AI-tjänsten gick ner — försök igen." }, 502);
    }

    const data = await aiResp.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    let insights: unknown[] = [];
    try {
      const args = JSON.parse(call?.function?.arguments ?? "{}");
      insights = args.insights ?? [];
    } catch (e) {
      console.error("parse error", e);
    }

    return json({ insights, generated_at: new Date().toISOString() }, 200);
  } catch (e) {
    console.error("bureau-ai-portfolio-analysis error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
