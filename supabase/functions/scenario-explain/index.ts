/**
 * scenario-explain — Lovable AI Gateway, structured explanation of a scenario.
 *
 * Input:  { scenarioId?: string, driverHash: string,
 *           baselineKpis, scenarioKpis, driverDiff: [{key, base, next, pctDelta}] }
 * Output: { summary, risks: string[], opportunities: string[], recommendation }
 *
 * Cached per (scenario_id, driver_hash) in `scenario_explanations`.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, handleCors, corsError, corsJson } from "../_shared/cors.ts";

const MODEL = "google/gemini-3-flash-preview";

interface DriverDiffItem {
  key: string;
  base: number;
  next: number;
  pctDelta: number;
}

interface Body {
  scenarioId?: string | null;
  driverHash: string;
  baselineKpis: Record<string, number | null>;
  scenarioKpis: Record<string, number | null>;
  driverDiff: DriverDiffItem[];
}

const TOOL = {
  type: "function",
  function: {
    name: "explain_scenario",
    description: "Explain a scenario delta with risks, opportunities and a recommendation.",
    parameters: {
      type: "object",
      properties: {
        summary: { type: "string", description: "1–2 sentence Swedish summary." },
        risks: { type: "array", items: { type: "string" }, maxItems: 4 },
        opportunities: { type: "array", items: { type: "string" }, maxItems: 4 },
        recommendation: { type: "string", description: "Concrete next step (Swedish)." },
      },
      required: ["summary", "risks", "opportunities", "recommendation"],
      additionalProperties: false,
    },
  },
};

serve(async (req) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return corsError("LOVABLE_API_KEY missing", 500);

    const body = (await req.json()) as Body;
    if (!body?.driverHash) return corsError("driverHash required", 400);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Cache lookup
    if (body.scenarioId) {
      const { data: cached } = await supabase
        .from("scenario_explanations")
        .select("summary, risks, opportunities, recommendation")
        .eq("scenario_id", body.scenarioId)
        .eq("driver_hash", body.driverHash)
        .maybeSingle();
      if (cached) return corsJson({ ...cached, cached: true });
    }

    const systemPrompt = `Du är en svensk CFO som förklarar konsekvensen av en scenario-justering.
Var konkret, undvik finansjargong, och knyt resonemanget till verkliga SME-beslut (anställning, marknad, prissättning, working capital).
Returnera ALLTID via verktyget explain_scenario.`;

    const userPrompt = `Driverdiff (positiv = ökning, negativ = minskning):
${body.driverDiff.map((d) => `- ${d.key}: ${d.base} → ${d.next} (${d.pctDelta > 0 ? "+" : ""}${d.pctDelta.toFixed(1)}%)`).join("\n")}

Baseline KPI:
${JSON.stringify(body.baselineKpis, null, 2)}

Scenario KPI:
${JSON.stringify(body.scenarioKpis, null, 2)}

Förklara påverkan, lista 2–4 risker, 2–4 möjligheter och ge en konkret rekommendation.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "explain_scenario" } },
      }),
    });

    if (aiResp.status === 429) return corsError("AI rate limit reached, try again shortly.", 429);
    if (aiResp.status === 402) return corsError("AI credits exhausted — top up Lovable AI workspace.", 402);
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      return corsError("AI gateway error", 500);
    }

    const data = await aiResp.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) return corsError("AI did not return tool call", 500);

    const args = JSON.parse(call.function.arguments || "{}");
    const result = {
      summary: String(args.summary ?? ""),
      risks: Array.isArray(args.risks) ? args.risks : [],
      opportunities: Array.isArray(args.opportunities) ? args.opportunities : [],
      recommendation: String(args.recommendation ?? ""),
    };

    if (body.scenarioId) {
      await supabase.from("scenario_explanations").upsert({
        scenario_id: body.scenarioId,
        driver_hash: body.driverHash,
        summary: result.summary,
        risks: result.risks,
        opportunities: result.opportunities,
        recommendation: result.recommendation,
      } as never, { onConflict: "scenario_id,driver_hash" });
    }

    return corsJson({ ...result, cached: false });
  } catch (e) {
    console.error("scenario-explain", e);
    return corsError(e instanceof Error ? e.message : "Unknown error", 500);
  }
});
