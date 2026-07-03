import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { sourceSystem, transitionDate, stats, warnings } = await req.json();

    const prompt = `Du är en redovisningskonsult som sammanfattar en datamigrering till NorthLedger.

Migrationsdata:
- Källsystem: ${sourceSystem || "okänt"}
- Övergångsdatum: ${transitionDate || "ej satt"}
- Importerade kunder: ${stats?.customers ?? 0}
- Importerade leverantörer: ${stats?.suppliers ?? 0}
- Importerade kundfakturor: ${stats?.customerInvoices ?? 0} (totalt ${stats?.customerInvoicesTotal ?? 0} kr)
- Importerade leverantörsfakturor: ${stats?.supplierInvoices ?? 0} (totalt ${stats?.supplierInvoicesTotal ?? 0} kr)
- Öppna poster (obetalda): ${stats?.openInvoices ?? 0} st / ${stats?.openInvoicesTotal ?? 0} kr
- Ingående balanser: ${stats?.openingBalances ?? 0} konton
- Hoppad över (fel): ${stats?.skipped ?? 0} poster
- Varningar: ${JSON.stringify(warnings || [])}

Skriv en professionell sammanfattningsrapport på svenska (max 300 ord) som:
1. Bekräftar vad som importerats
2. Lyfter fram avvikelser eller saker att kontrollera
3. Ger konkreta rekommendationer för nästa steg
4. Avslutar med en bekräftelse att migreringen är klar

Ton: professionell men tillgänglig. Inga tekniska termer.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limit" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI-krediter slut" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway: ${aiResp.status}`);
    }

    const aiData = await aiResp.json();
    const report = aiData?.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ success: true, report }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-migration-report error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err instanceof Error ? err.message : err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
