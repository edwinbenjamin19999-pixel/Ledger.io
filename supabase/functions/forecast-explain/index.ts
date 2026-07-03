import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ForecastInsightChip {
  label: string;
  detail?: string;
  patch?: { driver: string; deltaPct: number } | null;
}

interface InsightsResponse {
  headline: string;
  status: "on_track" | "at_risk" | "off_track";
  drivers: ForecastInsightChip[];
  risks: ForecastInsightChip[];
  actions: ForecastInsightChip[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const { drivers, turningPoints, deltas, mode, fiscalYear } = body ?? {};

    const sysPrompt = `Du är en svensk CFO-assistent. Returnera ENDAST strukturerade insikter via funktionen \`return_forecast_insights\`. 
Inga friform-paragrafer. Maximalt 4 chips per kategori. Skriv på svenska.
Headline ska vara EN mening, ≤120 tecken, börja med viktigaste signalen (kassa/EBIT/mål).
Status: 'on_track' om inga turning points; 'at_risk' om en varning; 'off_track' om kritisk eller flera.`;

    const userPrompt = `Mode: ${mode}. Räkenskapsår: ${fiscalYear}.
Drivers: ${JSON.stringify(drivers)}.
Vändpunkter: ${JSON.stringify(turningPoints)}.
Deltas vs budget/scenario: ${JSON.stringify(deltas)}.
Generera headline, status, drivers, risks, actions.`;

    const tools = [{
      type: "function",
      function: {
        name: "return_forecast_insights",
        description: "Strukturerade prognosinsikter för CFO-dashboard.",
        parameters: {
          type: "object",
          properties: {
            headline: { type: "string" },
            status: { type: "string", enum: ["on_track", "at_risk", "off_track"] },
            drivers: { type: "array", items: { type: "object", properties: { label: { type: "string" }, detail: { type: "string" } }, required: ["label"] } },
            risks: { type: "array", items: { type: "object", properties: { label: { type: "string" }, detail: { type: "string" } }, required: ["label"] } },
            actions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  detail: { type: "string" },
                  patch: {
                    type: "object",
                    properties: {
                      driver: { type: "string" },
                      deltaPct: { type: "number" },
                    },
                  },
                },
                required: ["label"],
              },
            },
          },
          required: ["headline", "status", "drivers", "risks", "actions"],
        },
      },
    }];

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: sysPrompt },
          { role: "user", content: userPrompt },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "return_forecast_insights" } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "credits_exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await aiRes.text();
      console.error("ai gateway error", aiRes.status, t);
      return new Response(JSON.stringify({ error: "ai_error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const json = await aiRes.json();
    const call = json.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: InsightsResponse;
    if (call?.function?.arguments) {
      parsed = JSON.parse(call.function.arguments);
    } else {
      parsed = {
        headline: "Prognos beräknad — inga starka AI-signaler.",
        status: "on_track",
        drivers: [],
        risks: [],
        actions: [],
      };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("forecast-explain error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
