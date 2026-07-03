import { corsHeaders, handleCors, corsJson, corsError } from "../_shared/cors.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

interface SummarizeRequest {
  thread: Array<{ author: string; body: string; created_at: string }>;
  context?: { entity?: string; amount?: number; period?: string };
  mode?: "summary" | "explanation_draft";
}

Deno.serve(async (req) => {
  const pf = handleCors(req);
  if (pf) return pf;
  if (!LOVABLE_API_KEY) return corsError("LOVABLE_API_KEY saknas", 500);

  try {
    const { thread, context, mode = "summary" }: SummarizeRequest = await req.json();
    if (!Array.isArray(thread)) return corsError("thread krävs", 400);

    const system =
      mode === "explanation_draft"
        ? "Du skriver ett kort, professionellt utkast (max 60 ord, svenska) som förklarar avvikelsen baserat på diskussionen och kontexten."
        : "Du sammanfattar en finansiell diskussionstråd i 1-2 meningar (svenska) och föreslår en konkret åtgärd om relevant.";

    const userText = [
      context?.entity ? `Kontext: ${context.entity}` : null,
      context?.amount != null ? `Belopp: ${context.amount} SEK` : null,
      context?.period ? `Period: ${context.period}` : null,
      "Tråd:",
      ...thread.map((m) => `- [${m.created_at}] ${m.author}: ${m.body}`),
    ].filter(Boolean).join("\n");

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userText },
        ],
      }),
    });

    if (r.status === 429) return corsError("AI rate limit", 429);
    if (r.status === 402) return corsError("AI credits required", 402);
    if (!r.ok) return corsError(`AI error ${r.status}`, 500);

    const data = await r.json();
    const text = data.choices?.[0]?.message?.content ?? "";
    return corsJson({ text });
  } catch (e) {
    return corsError((e as Error).message, 500);
  }
});
