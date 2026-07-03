// Financial Insights Narrative — generates AI CFO commentary on KPIs + drivers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

function fmtSEK(n: number): string {
  return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(n);
}

const MODE_LABELS: Record<string, string> = {
  actual: 'Utfall',
  actual_vs_budget: 'Utfall vs Budget',
  actual_vs_forecast: 'Utfall vs Prognos',
  forecast_vs_budget: 'Prognos vs Budget',
  variance: 'Avvikelseanalys',
};

const PERIOD_LABELS: Record<string, string> = {
  month: 'Månad',
  quarter: 'Kvartal',
  ytd: 'YTD (hittills i år)',
  full_year: 'Helår',
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { kpis = [], topDrivers = { positive: [], negative: [] }, mode = 'actual_vs_budget', period = 'ytd', year, query } = await req.json();

    const kpiSummary = kpis.map((k: any) =>
      `- ${k.label}: ${fmtSEK(k.actual)} (jämförelse: ${fmtSEK(k.comparison)}, avvikelse: ${k.varianceAmount >= 0 ? '+' : ''}${fmtSEK(k.varianceAmount)}${k.variancePercent !== null ? `, ${k.variancePercent >= 0 ? '+' : ''}${k.variancePercent.toFixed(1)}%` : ''})`
    ).join('\n');

    const posDrivers = topDrivers.positive.map((d: any) => `  • ${d.category}: +${fmtSEK(d.impactSEK)} (${d.variancePercent >= 0 ? '+' : ''}${d.variancePercent.toFixed(1)}%)`).join('\n') || '  (inga)';
    const negDrivers = topDrivers.negative.map((d: any) => `  • ${d.category}: ${fmtSEK(d.impactSEK)} (${d.variancePercent.toFixed(1)}%)`).join('\n') || '  (inga)';

    const userPrompt = query
      ? `Användarens fråga: "${query}"\n\nKontext:\nLäge: ${MODE_LABELS[mode]} | Period: ${PERIOD_LABELS[period]} ${year || ''}\n\nKPI:er:\n${kpiSummary}\n\nPositiva drivare:\n${posDrivers}\n\nNegativa drivare:\n${negDrivers}\n\nSvara på frågan kort och konkret. Ge en rubrik (max 8 ord) och 2-3 meningar plain language. Föreslå 3 actions (max 4 ord vardera).`
      : `Analysera följande finansiella data och ge en CFO-tolkning.\n\nLäge: ${MODE_LABELS[mode]} | Period: ${PERIOD_LABELS[period]} ${year || ''}\n\nKPI:er:\n${kpiSummary}\n\nPositiva drivare:\n${posDrivers}\n\nNegativa drivare:\n${negDrivers}\n\nGe en rubrik (max 8 ord) och 2-3 meningar som förklarar VAD som händer och VARFÖR. Föreslå sedan 3 konkreta actions (max 4 ord vardera) som användaren kan göra.`;

    const { callAIWithFallback, MODEL_CHAINS } = await import("../_shared/ai-gateway.ts");
    let data: any;
    try {
      const r = await callAIWithFallback({
        ...MODEL_CHAINS.balancedInsights,
        messages: [
          { role: "system", content: "Du är en erfaren svensk CFO-rådgivare som tolkar finansiell data för småföretagsägare. Var skarp, konkret och insiktsdriven. Inga floskler. Använd svenska. Fokusera på VAD som händer och VARFÖR — inte bara siffror." },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "respond",
            description: "Strukturerat CFO-svar",
            parameters: {
              type: "object",
              properties: {
                headline: { type: "string", description: "Kort rubrik, max 8 ord" },
                body: { type: "string", description: "2-3 meningar tolkning" },
                actions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      label: { type: "string", description: "Action-text, max 4 ord" },
                      actionType: { type: "string", enum: ["drill", "navigate", "simulate", "explain"] },
                    },
                    required: ["label", "actionType"],
                  },
                  minItems: 2, maxItems: 3,
                },
              },
              required: ["headline", "body", "actions"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "respond" } },
      });
      data = r.data;
      console.log(`[financial-insights-narrative] modelUsed=${r.modelUsed}`);
    } catch (e: any) {
      const msg = e?.message || "";
      if (msg.includes("krediter slut")) return new Response(JSON.stringify({ error: msg }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (msg.includes("autentiseras")) return new Response(JSON.stringify({ error: msg }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      console.error("[financial-insights-narrative] all models failed", e);
      return new Response(JSON.stringify({ error: "AI-tjänsten är överbelastad. Försök igen om en stund." }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({
        headline: "Analys ej tillgänglig",
        body: data.choices?.[0]?.message?.content || "AI returnerade inget strukturerat svar.",
        actions: [],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error('financial-insights-narrative error', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
