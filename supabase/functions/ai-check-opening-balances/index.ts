/**
 * ai-check-opening-balances
 * Reviews opening balances and returns observations in Swedish.
 * Uses Lovable AI Gateway (no API key required).
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { transitionDate, balances } = await req.json();
    if (!Array.isArray(balances)) {
      return new Response(JSON.stringify({ error: "balances required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let observations: string[] = [];

    const summary = balances
      .map(
        (b: any) =>
          `${b.account_code} ${b.account_name ?? ""}: ${b.balance} (${b.balance_type ?? "?"})`,
      )
      .join("\n");

    if (LOVABLE_API_KEY) {
      try {
        const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content:
                  "Du är en svensk redovisningsexpert. Granska ingående balanser per ett övergångsdatum. Identifiera saknade förväntade konton (kund-/leverantörsskulder, kassa, eget kapital), ovanligt stora poster och eventuella inkonsekvenser. Returnera EN JSON-array av korta svenska observationer (max 6). Inget annat.",
              },
              {
                role: "user",
                content: `Övergångsdatum: ${transitionDate}\nBalanser:\n${summary}`,
              },
            ],
          }),
        });
        if (r.ok) {
          const j = await r.json();
          const txt: string = j.choices?.[0]?.message?.content ?? "";
          const match = txt.match(/\[[\s\S]*\]/);
          if (match) observations = JSON.parse(match[0]);
        }
      } catch (e) {
        console.error("AI gateway error:", e);
      }
    }

    return new Response(JSON.stringify({ observations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-check-opening-balances error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
