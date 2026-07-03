import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  mode: "generate" | "suggest" | "target" | "narrative";
  company_id: string;
  context?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { mode, company_id, context }: Body = await req.json();
    if (!mode || !company_id) {
      return new Response(JSON.stringify({ error: "mode and company_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const systemPrompts: Record<Body["mode"], string> = {
      generate:
        "Du är en svensk CFO. Föreslå en realistisk 12-månadersbudget per BAS-konto utifrån historik. Returnera värden i SEK utan decimaler.",
      suggest:
        "Du är en svensk CFO. Föreslå realistiska prognosjusteringar per konto baserat på 3-mån glidande trend och budgetavvikelse. Reducera kostnader där utfall överskrider budget med >15%, höj intäktsprognos där utfall ligger >10% över.",
      target:
        "Du är en svensk CFO. Givet ett finansiellt mål, föreslå 3 konkreta åtgärder per period med uppskattad effekt i SEK.",
      narrative:
        "Du är en svensk CFO. Sammanfatta budgetstatus i tre korta meningar: vad händer, varför, vad ska göras.",
    };

    const tools: Record<Body["mode"], unknown> = {
      generate: {
        type: "function",
        function: {
          name: "generate_budget",
          description: "Return monthly values per BAS account",
          parameters: {
            type: "object",
            properties: {
              accounts: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    account_number: { type: "string" },
                    account_name: { type: "string" },
                    monthly: { type: "array", items: { type: "number" }, minItems: 12, maxItems: 12 },
                    reasoning: { type: "string" },
                    confidence: { type: "number" },
                  },
                  required: ["account_number", "monthly"],
                },
              },
            },
            required: ["accounts"],
          },
        },
      },
      suggest: {
        type: "function",
        function: {
          name: "suggest_forecast",
          description: "Per-account forecast suggestions",
          parameters: {
            type: "object",
            properties: {
              suggestions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    account_number: { type: "string" },
                    suggested_value: { type: "number" },
                    expected_impact_sek: { type: "number" },
                    reason: { type: "string" },
                    confidence: { type: "number" },
                  },
                  required: ["account_number", "suggested_value", "reason"],
                },
              },
            },
            required: ["suggestions"],
          },
        },
      },
      target: {
        type: "function",
        function: {
          name: "target_actions",
          description: "Concrete actions per period to hit target",
          parameters: {
            type: "object",
            properties: {
              actions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    expected_impact_sek: { type: "number" },
                    target_module: { type: "string" },
                    rationale: { type: "string" },
                  },
                  required: ["title", "expected_impact_sek"],
                },
              },
            },
            required: ["actions"],
          },
        },
      },
      narrative: {
        type: "function",
        function: {
          name: "narrative",
          description: "Three-part narrative",
          parameters: {
            type: "object",
            properties: {
              what: { type: "string" },
              why: { type: "string" },
              todo: { type: "string" },
              cta_module: { type: "string" },
            },
            required: ["what", "why", "todo"],
          },
        },
      },
    };

    const tool = tools[mode] as { function: { name: string } };

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompts[mode] },
          { role: "user", content: JSON.stringify(context ?? {}) },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: tool.function.name } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiRes.text();
      console.error("AI gateway error", aiRes.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = call ? JSON.parse(call.function.arguments) : {};

    return new Response(JSON.stringify({ mode, ...args }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("budget-planning-ai error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
