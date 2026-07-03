import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const EXTRACTION_PROMPT = `Du är ett system för att extrahera data från svenska fakturor.

Analysera den bifogade fakturan och returnera ETT JSON-objekt med exakt denna struktur:
{
  "invoiceType": "supplier" | "customer",
  "invoiceNumber": string,
  "invoiceDate": "YYYY-MM-DD",
  "dueDate": "YYYY-MM-DD" | null,
  "supplierName": string | null,
  "supplierOrgNumber": "XXXXXX-XXXX" | null,
  "supplierBankgiro": string | null,
  "customerName": string | null,
  "customerOrgNumber": string | null,
  "amountExclVat": number,
  "vatAmount": number,
  "amountInclVat": number,
  "vatRate": number,
  "currency": "SEK",
  "description": string,
  "accountSuggestion": string,
  "confidence": number
}

Regler:
- Returnera ALLTID giltig JSON, inget annat
- Saknade fält: null (aldrig tom sträng)
- Svenska org.nr: XXXXXX-XXXX
- Belopp som tal med punkt som decimaltecken
- accountSuggestion: föreslå BAS-kontonummer
- confidence: 0-100`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { fileBase64, fileName, mediaType } = await req.json();
    if (!fileBase64) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dataUrl = `data:${mediaType || "application/pdf"};base64,${fileBase64}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: EXTRACTION_PROMPT },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "AI rate limit — försök igen om en stund" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI-krediter slut — fyll på i Workspace-inställningar" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const errText = await aiResp.text();
      throw new Error(`AI gateway: ${aiResp.status} ${errText}`);
    }

    const aiData = await aiResp.json();
    const text = aiData?.choices?.[0]?.message?.content || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI returnerade ingen giltig JSON");
    const extracted = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify({ success: true, data: extracted, fileName }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("parse-pdf-invoice error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err instanceof Error ? err.message : err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
