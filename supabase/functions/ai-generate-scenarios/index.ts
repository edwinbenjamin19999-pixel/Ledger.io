/**
 * ai-generate-scenarios — Lovable AI Gateway, tool-calling for structured scenario suggestions.
 *
 * Input:  { drivers: BudgetDrivers, kpis: ScenarioKpis, fiscalYear: number }
 * Output: { scenarios: [{ name, description, kind, driverPatch, rationale }] }
 *
 * Returns three suggestions: optimistic, pessimistic, balanced.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors, corsError, corsJson } from "../_shared/cors.ts";

const MODEL = "google/gemini-3-flash-preview";

interface RequestBody {
  drivers: Record<string, number>;
  kpis: Record<string, number | null>;
  fiscalYear: number;
}

const TOOL = {
  type: "function",
  function: {
    name: "propose_scenarios",
    description: "Return three financially plausible scenario variants (optimistic / pessimistic / balanced).",
    parameters: {
      type: "object",
      properties: {
        scenarios: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              kind: { type: "string", enum: ["growth", "cost_cut", "survival", "ai", "custom"] },
              rationale: { type: "string" },
              driverPatch: {
                type: "object",
                description: "Partial BudgetDrivers — only the keys you want to change.",
                additionalProperties: { type: "number" },
              },
            },
            required: ["name", "description", "kind", "driverPatch", "rationale"],
            additionalProperties: false,
          },
        },
      },
      required: ["scenarios"],
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

    const body = (await req.json()) as RequestBody;
    if (!body?.drivers) return corsError("drivers required", 400);

    const systemPrompt = `Du är en svensk CFO-rådgivare som föreslår finansiella scenarier för småföretag.
Returnera ALLTID exakt 3 scenarier via verktyget propose_scenarios:
1) Optimistiskt — accelererad tillväxt med rimliga investeringsökningar.
2) Pessimistiskt — vikande efterfrågan eller kostnadsexplosion.
3) Balanserat — mellanvariant med både risk och möjlighet.

Varje driverPatch får bara innehålla nycklar som faktiskt ska ändras (inte hela drivers-objektet).
Belopp ska vara rimliga (±5–60% från bas) och resonemanget tydligt knutet till svenska SME-villkor.`;

    const userPrompt = `Räkenskapsår: ${body.fiscalYear}

Nuvarande drivers (JSON):
${JSON.stringify(body.drivers, null, 2)}

Nuvarande KPI-utfall:
${JSON.stringify(body.kpis, null, 2)}

Föreslå 3 scenarier.`;

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
        tool_choice: { type: "function", function: { name: "propose_scenarios" } },
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
    return corsJson({ scenarios: args.scenarios ?? [] });
  } catch (e) {
    console.error("ai-generate-scenarios", e);
    return corsError(e instanceof Error ? e.message : "Unknown error", 500);
  }
});
