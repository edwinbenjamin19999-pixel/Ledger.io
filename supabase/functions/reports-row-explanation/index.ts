// Streaming edge function: explains a report row at level 1-4 using Lovable AI.
// SSE response — frontend renders tokens as they arrive.

import { corsHeaders } from "../_shared/cors.ts";

interface Period {
  from: string;
  to: string;
}

interface Body {
  companyId: string;
  level: 1 | 2 | 3 | 4;
  lens: string;
  period: Period;
  payload: Record<string, unknown>;
}

const SYSTEM_PROMPTS: Record<number, string> = {
  1: "Du är en svensk CFO. Förklara i 2-3 korta meningar vad som driver radens värde under perioden, baserat på topp-konton och eventuell jämförelse mot budget/prognos. Var konkret, undvik svamlande språk. Svara på svenska.",
  2: "Du är en svensk CFO. Lyft fram vilka 1-2 konton som dominerar bidraget och om något ser onormalt ut. Max 3 meningar. Svenska.",
  3: "Du är en svensk CFO. Bedöm om någon av de listade verifikationerna ser onormal ut (storlek, motpart, datum). Max 3 meningar. Svenska.",
  4: "Du är en svensk CFO. Sammanfatta vad underlaget visar och om det matchar bokföringen. Max 3 meningar. Svenska.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    if (!body || typeof body.level !== "number" || ![1, 2, 3, 4].includes(body.level)) {
      return new Response(JSON.stringify({ error: "Invalid level" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = [
      `Lins: ${body.lens}`,
      `Period: ${body.period?.from} – ${body.period?.to}`,
      `Data: ${JSON.stringify(body.payload).slice(0, 4000)}`,
    ].join("\n");

    const { callAIStreamWithFallback, MODEL_CHAINS } = await import("../_shared/ai-gateway.ts");
    let streamBody: ReadableStream<Uint8Array>;
    try {
      const r = await callAIStreamWithFallback({
        ...MODEL_CHAINS.streaming,
        messages: [
          { role: "system", content: SYSTEM_PROMPTS[body.level] },
          { role: "user", content: userPrompt },
        ],
      });
      streamBody = r.body;
      console.log(`[reports-row-explanation] modelUsed=${r.modelUsed}`);
    } catch (e: any) {
      const msg = e?.message || "";
      if (msg.includes("krediter slut")) return new Response(JSON.stringify({ error: msg }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (msg.includes("autentiseras")) return new Response(JSON.stringify({ error: msg }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      console.error("[reports-row-explanation] all models failed", e);
      return new Response(JSON.stringify({ error: "AI-tjänsten är överbelastad. Försök igen om en stund." }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(streamBody, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("reports-row-explanation fatal", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
