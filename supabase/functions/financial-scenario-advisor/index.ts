// Financial Scenario Advisor — AI recommendations for what-if scenarios
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

function fmtSEK(n: number): string {
  return new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(n);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { kpis = [], topNegativeDrivers = [], scenarioInputs = null, focusRow = null } = await req.json();

    const kpiSummary = kpis.map((k: any) =>
      `- ${k.label}: utfall ${fmtSEK(k.actual)}, jämförelse ${fmtSEK(k.comparison)}, avvikelse ${k.varianceAmount >= 0 ? "+" : ""}${fmtSEK(k.varianceAmount)}`
    ).join("\n");

    const negSummary = topNegativeDrivers.slice(0, 5).map((d: any) =>
      `- ${d.category}: ${fmtSEK(d.impactSEK)} (${d.variancePercent?.toFixed?.(1) ?? "?"}%)`
    ).join("\n") || "(inga betydande negativa drivare)";

    const scenarioContext = scenarioInputs
      ? `\n\nAnvändarens scenario:\n- Personalkostnader: ${scenarioInputs.personnelDelta ?? 0}%\n- Intäkter: ${scenarioInputs.revenueDelta ?? 0}%\n- Senarelagd investering: ${scenarioInputs.investmentDelayMonths ?? 0} månader`
      : "";

    const focusContext = focusRow
      ? `\n\nFokus: ${focusRow.label} — utfall ${fmtSEK(focusRow.actual)}, budget ${fmtSEK(focusRow.comparison)}, avvikelse ${fmtSEK(focusRow.varianceAmount)}`
      : "";

    const userPrompt = `Du är CFO-rådgivare. Analysera nedan och ge 3 konkreta åtgärder med beräknad impact.\n\nKPI:er:\n${kpiSummary}\n\nNegativa drivare:\n${negSummary}${scenarioContext}${focusContext}\n\nGe 3 åtgärder med expected_impact_sek (positivt = ökad EBIT), confidence (0-1) och reasoning (max 2 meningar). Lista 2-3 risker. Föreslå next_step.`;

    const { callAIWithFallback, MODEL_CHAINS } = await import("../_shared/ai-gateway.ts");
    let data: any;
    try {
      const r = await callAIWithFallback({
        ...MODEL_CHAINS.balancedInsights,
        messages: [
          { role: "system", content: "Du är en svensk CFO som ger handlingsbara råd till SMB-ägare. Var konkret, datadriven och realistisk i konsekvenser." },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "advise",
            description: "Strukturerad rådgivning",
            parameters: {
              type: "object",
              properties: {
                recommended_actions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      action: { type: "string", description: "Konkret åtgärd, max 12 ord" },
                      expected_impact_sek: { type: "number", description: "Förväntad EBIT-påverkan i SEK (positivt = bättre)" },
                      confidence: { type: "number", description: "0-1" },
                      reasoning: { type: "string", description: "Max 2 meningar" },
                      target_module: { type: "string", description: "Modul att navigera till, t.ex. /payroll, /budget, /suppliers", nullable: true },
                    },
                    required: ["action", "expected_impact_sek", "confidence", "reasoning"],
                  },
                  minItems: 2, maxItems: 3,
                },
                risks: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 },
                next_step: { type: "string", description: "Vad användaren bör göra först, max 1 mening" },
              },
              required: ["recommended_actions", "risks", "next_step"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "advise" } },
      });
      data = r.data;
      console.log(`[financial-scenario-advisor] modelUsed=${r.modelUsed}`);
    } catch (e: any) {
      const msg = e?.message || "";
      if (msg.includes("krediter slut")) return new Response(JSON.stringify({ error: msg }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (msg.includes("autentiseras")) return new Response(JSON.stringify({ error: msg }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      console.error("[financial-scenario-advisor] all models failed", e);
      return new Response(JSON.stringify({ error: "AI-tjänsten är överbelastad. Försök igen om en stund." }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ recommended_actions: [], risks: [], next_step: "AI returnerade inget strukturerat svar." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const parsed = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("financial-scenario-advisor error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
