// follow-up-explain — Edge Function for the Follow-up CFO Command Center.
// Takes top variance drivers + status + mode and returns a 1–2 sentence summary
// plus a per-driver root cause via Lovable AI Gateway tool-calling.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Driver {
  account_number: string;
  account_name: string;
  kind: "revenue" | "cost";
  actual: number;
  budget: number;
  variance: number;
  variancePct: number;
  ebitImpact: number;
  direction: "good" | "bad" | "neutral";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY saknas");

    const body = await req.json();
    const mode: string = body?.mode ?? "live";
    const status: string = body?.status ?? "at_risk";
    const monthIndex: number | undefined = body?.monthIndex;
    const drivers: Driver[] = Array.isArray(body?.topDrivers) ? body.topDrivers.slice(0, 5) : [];

    if (drivers.length === 0) {
      return new Response(
        JSON.stringify({ summary: "Inga väsentliga avvikelser att förklara just nu.", perDriverRootCause: {} }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const modeLabel =
      mode === "live"
        ? "YTD-utfall"
        : mode === "live_forecast"
          ? "live prognos för helår"
          : `månad ${(monthIndex ?? 0) + 1}`;

    const driversText = drivers
      .map(
        (d) =>
          `- ${d.account_number} ${d.account_name} (${d.kind}): utfall ${Math.round(d.actual).toLocaleString("sv-SE")} kr, budget ${Math.round(d.budget).toLocaleString("sv-SE")} kr, avvikelse ${d.variancePct.toFixed(1)}%, EBIT-påverkan ${Math.round(d.ebitImpact).toLocaleString("sv-SE")} kr`,
      )
      .join("\n");

    const systemPrompt =
      "Du är en svensk CFO-assistent. Du analyserar avvikelser mot budget och formulerar korta, " +
      "konkreta förklaringar baserat på BAS-konton och normala affärsmönster. Var saklig, undvik fluff. " +
      "Texten visas direkt i ett kontrolldashboard.";
    const userPrompt =
      `Verksamhetsstatus: ${status}. Läge: ${modeLabel}.\n` +
      `Top variansdrivare:\n${driversText}\n\n` +
      `Skriv en kort sammanfattning (max 2 meningar) som förklarar VAD som händer och VARFÖR. ` +
      `För varje konto: en mening med trolig grundorsak.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_followup_explanation",
              description: "Returnera sammanfattning och rotorsak per konto",
              parameters: {
                type: "object",
                properties: {
                  summary: {
                    type: "string",
                    description: "Max 2 meningar svenska som förklarar avvikelsen och affärspåverkan.",
                  },
                  perDriverRootCause: {
                    type: "object",
                    description:
                      "Mappning kontonummer → kort förklaring (max 1 mening) av sannolik rotorsak.",
                    additionalProperties: { type: "string" },
                  },
                },
                required: ["summary", "perDriverRootCause"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_followup_explanation" } },
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit overskridet" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(
        JSON.stringify({ error: "AI-krediter slut — fyll på under Settings → Workspace → Usage." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error", detail: t }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await response.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: { summary: string; perDriverRootCause: Record<string, string> } = {
      summary: "",
      perDriverRootCause: {},
    };
    if (toolCall?.function?.arguments) {
      try {
        parsed = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error("Tool call JSON parse failed", e);
      }
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("follow-up-explain crashed", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
