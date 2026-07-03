// ar-rewrite-text — rewrite an existing block with formal/simple/shorter/longer instruction.
import { handleCors, corsError, corsJson } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const INSTRUCTIONS: Record<string, string> = {
  formal: "Skriv om i formell, juridiskt korrekt ton enligt ÅRL och K2/K3. Behåll alla siffror.",
  simple: "Skriv om i klar och lättillgänglig svenska. Behåll alla siffror och faktauppgifter.",
  shorter: "Korta ner till hälften så långt utan att tappa väsentlig information.",
  longer: "Utveckla med mer kontext kring orsaker och konsekvenser. Lägg inte till fiktiva siffror.",
  reuse_prior: "Anpassa fjolårets formuleringar till årets siffror. Behåll struktur men uppdatera värden.",
};

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return corsError("Saknar auth", 401);

    const { blockId, instruction } = await req.json();
    if (!blockId || !instruction) return corsError("blockId + instruction krävs", 400);
    const instr = INSTRUCTIONS[instruction];
    if (!instr) return corsError("Okänd instruktion", 400);

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: block } = await sb.from("ar_blocks").select("*").eq("id", blockId).maybeSingle();
    if (!block) return corsError("Block saknas", 404);

    const currentHtml = (block.content as { html?: string })?.html ?? "";
    if (!currentHtml.trim()) return corsError("Blocket är tomt", 400);

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Du är en svensk redovisningskonsult. Returnera ENDAST omskriven HTML — inga förklaringar, inga code fences." },
          { role: "user", content: `Instruktion: ${instr}\n\nText (HTML):\n${currentHtml}` },
        ],
      }),
    });

    if (aiResp.status === 429) return corsError("AI-rate limit nådd", 429);
    if (aiResp.status === 402) return corsError("AI-krediter slut", 402);
    if (!aiResp.ok) return corsError("AI-anrop misslyckades", 500);

    const j = await aiResp.json();
    const newHtml = (j.choices?.[0]?.message?.content ?? "").trim().replace(/^```(?:html)?\s*|\s*```$/g, "");
    if (!newHtml) return corsError("AI returnerade tom text", 500);

    const meta = ((block.metadata as Record<string, unknown>) ?? {});
    const history = Array.isArray(meta.history) ? (meta.history as unknown[]).slice(-9) : [];
    history.push({ at: new Date().toISOString(), html: currentHtml, reason: instruction });

    await sb.from("ar_blocks").update({
      content: { html: newHtml },
      metadata: { ...meta, history, last_rewrite: instruction },
    } as never).eq("id", blockId);

    return corsJson({ html: newHtml, rationale: `Omskriven med instruktion: ${instruction}` });
  } catch (e) {
    console.error("ar-rewrite-text error:", e);
    return corsError(e instanceof Error ? e.message : "Internal error", 500);
  }
});
