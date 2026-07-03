// HR Smart Input — naturligt språk → strukturerat HR-event via Lovable AI
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, company_id, employee_id, default_date } = await req.json();
    if (!text || !company_id) {
      return new Response(JSON.stringify({ error: "text och company_id krävs" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY saknas");

    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader || "" } } }
    );

    // Hämta tillgängliga kategorier för att begränsa AI:n
    const { data: categories } = await supabase
      .from("hr_event_categories")
      .select("category_key, label_sv, group_type");

    const categoryList = (categories || [])
      .map((c) => `- ${c.category_key}: ${c.label_sv} (${c.group_type})`)
      .join("\n");

    const today = default_date || new Date().toISOString().slice(0, 10);

    const systemPrompt = `Du tolkar svenska fritext-beskrivningar av arbetsdagar och konverterar dem till strukturerade HR-events.

Tillgängliga kategorier (använd EXAKT category_key):
${categoryList}

Returnera ETT eller FLERA events. Om texten beskriver flera saker (t.ex. "Halv semester på morgonen, jobbade 4h på eftermiddagen") returnera flera events.

Datum: tolka relativa uttryck mot ${today}. "Idag"=${today}, "igår"=föregående dag.

Tider:
- "8h" eller "8 timmar" → hours: 8
- "halvdag" → hours: 4
- "heldag" → hours: 8
- "övertid" utan tid → hours: 2 (default)

Var konservativ med konfidens. Om något är otydligt, sätt confidence < 0.7.`;

    const tools = [
      {
        type: "function",
        function: {
          name: "extract_hr_events",
          description: "Returnera strukturerade HR-events från fritext",
          parameters: {
            type: "object",
            properties: {
              events: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    category_key: { type: "string", description: "EXAKT en av tillgängliga keys" },
                    event_date: { type: "string", description: "YYYY-MM-DD" },
                    event_end_date: { type: "string", description: "YYYY-MM-DD om flera dagar, annars utelämna" },
                    hours: { type: "number" },
                    amount: { type: "number", description: "kr för utlägg/bonus" },
                    quantity: { type: "number", description: "km för milersättning" },
                    description: { type: "string" },
                    confidence: { type: "number", minimum: 0, maximum: 1 },
                  },
                  required: ["category_key", "event_date", "confidence"],
                  additionalProperties: false,
                },
              },
              clarification_needed: {
                type: "string",
                description: "Om något är oklart, fråga användaren här. Annars tom sträng.",
              },
            },
            required: ["events", "clarification_needed"],
            additionalProperties: false,
          },
        },
      },
    ];

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "extract_hr_events" } },
      }),
    });

    if (aiResp.status === 429) {
      return new Response(JSON.stringify({ error: "AI rate limit. Försök igen om en stund." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiResp.status === 402) {
      return new Response(JSON.stringify({ error: "AI-krediter slut. Lägg till krediter i workspace." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI error:", aiResp.status, errText);
      throw new Error("AI-anrop misslyckades");
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(
        JSON.stringify({ events: [], clarification_needed: "Kunde inte tolka. Försök vara mer specifik." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("hr-smart-input error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
