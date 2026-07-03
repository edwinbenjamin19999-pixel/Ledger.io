import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors, corsJson, corsError } from "../_shared/cors.ts";
import { callAIWithFallback, MODEL_CHAINS } from "../_shared/ai-gateway.ts";

serve(async (req) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { company_id, comparison_data } = await req.json();

    if (!company_id) {
      return corsError("company_id is required", 400);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return corsError("AI insights not available", 500);
    }

    const { data: company } = await supabaseClient
      .from("companies")
      .select("name, industry")
      .eq("id", company_id)
      .maybeSingle();

    const prompt = `Du är en erfaren svensk ekonomirådgivare. Analysera denna finansiella jämförelse och ge 2-3 korta, konkreta insikter.

FÖRETAG: ${company?.name || "Okänt"}
BRANSCH: ${company?.industry || "Allmänt"}

DATA:
${JSON.stringify(comparison_data, null, 2)}

Ge insikter i format:
- En rad per insikt
- Max 3 insikter
- Fokusera på avvikelser och åtgärder
- Var specifik med siffror
- Skriv på svenska`;

    const { data: aiData, modelUsed } = await callAIWithFallback({
      ...MODEL_CHAINS.balancedInsights,
      messages: [
        { role: "system", content: "Du är en CFO-assistent som ger korta, datadrivna finansiella insikter på svenska." },
        { role: "user", content: prompt },
      ],
    });

    const insights = aiData.choices?.[0]?.message?.content;
    console.log(`[financial-insights] modelUsed=${modelUsed}`);

    return corsJson({ success: true, insights });
  } catch (error) {
    console.error("Error in financial-insights:", error);
    return corsError(error instanceof Error ? error.message : "Unknown error");
  }
});
