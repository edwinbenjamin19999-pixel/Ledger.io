// Edge function: ai-map-columns
// Uses Lovable AI to map CSV/Excel column headers to NorthLedger target fields.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RequestBody {
  headers: string[];
  sampleRows: Record<string, unknown>[];
  targetType: "customers" | "suppliers" | "invoices";
  targetFields: string[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return json({ error: "LOVABLE_API_KEY is not configured" }, 500);
    }

    const body = (await req.json()) as RequestBody;
    if (
      !body ||
      !Array.isArray(body.headers) ||
      !Array.isArray(body.sampleRows) ||
      !Array.isArray(body.targetFields) ||
      !body.targetType
    ) {
      return json({ error: "Invalid request body" }, 400);
    }

    const { headers, sampleRows, targetType, targetFields } = body;

    const systemPrompt =
      "You analyze tabular data files (CSV/Excel) for a Swedish accounting platform. Map source column headers to canonical target fields. Swedish field names are common (Namn=name, Org.nr=org_number, E-post=email, Förfallodatum=due_date, Belopp=amount_incl_vat). Respond by calling the provided tool only.";

    const userPrompt = `Headers: ${JSON.stringify(headers)}
Sample rows (max 3): ${JSON.stringify(sampleRows.slice(0, 3))}
Target type: ${targetType}
Allowed target fields: ${JSON.stringify(targetFields)}

For each header that maps to one of the allowed target fields, return a mapping. Skip headers with no good match. Confidence 0-100 — use >=90 for exact synonym matches, 70-89 for likely matches, <70 only when uncertain.`;

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
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
                name: "submit_column_mappings",
                description:
                  "Submit the source-to-target column mappings for the file.",
                parameters: {
                  type: "object",
                  properties: {
                    mappings: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          sourceColumn: { type: "string" },
                          targetField: {
                            type: "string",
                            enum: targetFields,
                          },
                          confidence: {
                            type: "number",
                            minimum: 0,
                            maximum: 100,
                          },
                          sampleValue: { type: "string" },
                        },
                        required: [
                          "sourceColumn",
                          "targetField",
                          "confidence",
                          "sampleValue",
                        ],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["mappings"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "submit_column_mappings" },
          },
        }),
      },
    );

    if (aiResponse.status === 429) {
      return json(
        { error: "Rate limits exceeded, please try again later." },
        429,
      );
    }
    if (aiResponse.status === 402) {
      return json(
        {
          error:
            "Payment required, please add funds to your Lovable AI workspace.",
        },
        402,
      );
    }

    if (!aiResponse.ok) {
      const txt = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, txt);
      return json({ error: "AI gateway error" }, 500);
    }

    const data = await aiResponse.json();
    const toolCall =
      data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;

    if (!toolCall) {
      return json({ mappings: [] });
    }

    let parsed: { mappings?: unknown };
    try {
      parsed = JSON.parse(toolCall);
    } catch (e) {
      console.error("Failed to parse tool call args:", e);
      return json({ mappings: [] });
    }

    const mappings = Array.isArray(parsed.mappings) ? parsed.mappings : [];
    return json({ mappings });
  } catch (e) {
    console.error("ai-map-columns error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return json({ error: msg }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
