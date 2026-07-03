// ar-explain-text — streams a Swedish explanation of why a text block is written as it is.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { handleCors, corsError } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return corsError("Saknar auth", 401);

    const { blockId } = await req.json();
    if (!blockId) return corsError("blockId krävs", 400);

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: block, error } = await sb
      .from("ar_blocks")
      .select("id, content, ai_generated, ai_confidence, annual_report_id")
      .eq("id", blockId)
      .maybeSingle();
    if (error || !block) return corsError("Block hittades inte", 404);

    const content = block.content as { html?: string; rationale?: string } | null;
    const html = String(content?.html ?? "");
    const plain = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        stream: true,
        messages: [
          {
            role: "system",
            content:
              "Du är en svensk redovisningskonsult. Förklara på max 4 meningar varför textblocket nedan är skrivet som det är, och referera till ÅRL/K2/K3 om relevant.",
          },
          {
            role: "user",
            content: `Textblock:\n"""${plain}"""\n\nKontext: ai_generated=${block.ai_generated}, confidence=${block.ai_confidence ?? "n/a"}.`,
          },
        ],
      }),
    });

    if (aiResp.status === 429) return corsError("Rate limit nådd", 429);
    if (aiResp.status === 402) return corsError("Krediter slut", 402);
    if (!aiResp.ok || !aiResp.body) return corsError("AI-anrop misslyckades", 500);

    return new Response(aiResp.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    console.error("ar-explain-text error:", e);
    return corsError(e instanceof Error ? e.message : "Internal error", 500);
  }
});
