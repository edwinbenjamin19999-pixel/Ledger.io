import { corsHeaders, handleCors, corsJson, corsError } from "../_shared/cors.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

interface ParseRequest {
  query: string;
  hint?: string;
}

const SYSTEM = `Du tolkar finansiella vy-kommandon på svenska/engelska och returnerar JSON.
Mappa till en av rutterna: /budget, /forecast, /follow-up, /financial-analysis, /scenarios, /cashflow-forecast.
Tillåtna versions: actual, budget, forecast, P1, P2, P3, P4, rolling.
Tillåtna periods: month, quarter, ytd, year, Q1, Q2, Q3, Q4.`;

Deno.serve(async (req) => {
  const pf = handleCors(req);
  if (pf) return pf;
  if (!LOVABLE_API_KEY) return corsError("LOVABLE_API_KEY saknas", 500);

  try {
    const { query }: ParseRequest = await req.json();
    if (!query || typeof query !== "string") return corsError("query krävs", 400);

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: query },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "navigate",
              description: "Returnera tolkad navigation",
              parameters: {
                type: "object",
                properties: {
                  route: { type: "string", enum: ["/budget", "/forecast", "/follow-up", "/financial-analysis", "/scenarios", "/cashflow-forecast"] },
                  versions: { type: "array", items: { type: "string" } },
                  period: { type: "string" },
                  mode: { type: "string" },
                  focus: { type: "string" },
                  dimension: { type: "string" },
                  confidence: { type: "number" },
                },
                required: ["route", "confidence"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "navigate" } },
      }),
    });

    if (r.status === 429) return corsError("AI rate limit", 429);
    if (r.status === 402) return corsError("AI credits required", 402);
    if (!r.ok) return corsError(`AI error ${r.status}`, 500);

    const data = await r.json();
    const tc = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!tc?.function?.arguments) return corsJson({ route: "/financial-analysis", confidence: 0.2 });
    const parsed = JSON.parse(tc.function.arguments);
    return corsJson(parsed);
  } catch (e) {
    return corsError((e as Error).message, 500);
  }
});
