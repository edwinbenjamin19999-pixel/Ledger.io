import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileBase64, mimeType, fileName, companyId } = await req.json();

    if (!fileBase64 || !mimeType) {
      return new Response(
        JSON.stringify({ success: false, error: "fileBase64 och mimeType krävs" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Du är en AI-redovisningsexpert som automatiskt konterar och granskar leverantörsfakturor i ett svenskt ekonomisystem.

DU SKA:
1. Extrahera all data från fakturan
2. Föreslå kontering
3. Göra en riskbedömning
4. Ge tydliga varningar vid avvikelser

EXTRAKTION – hämta följande:
- Leverantörens namn, org-nummer om synligt
- Fakturanummer
- Fakturadatum (YYYY-MM-DD)
- Förfallodatum (YYYY-MM-DD)
- Totalbelopp INKLUSIVE moms
- Momsbelopp
- Belopp EXKLUSIVE moms
- Momssats (0%, 6%, 12% eller 25%)
- Valuta
- Beskrivning av vad fakturan avser

KONTOVAL-GUIDE (BAS 2026):
- 4010: Inköp varor/material
- 4300: Inköp handelsvaror
- 5010: Lokalhyra
- 5020: El
- 5060: Städning
- 5210: Hyra/leasing maskiner
- 5260: Leasing bilar
- 6040: Förbrukningsinventarier
- 6110: Kontorsmaterial
- 6211: Telefon
- 6212: Mobiltelefon
- 6214: Bredband/internet
- 6310: Företagsförsäkringar (0% moms)
- 6350: Fordonsförsäkring (0% moms)
- 6421: Revision
- 6460: Redovisningstjänster
- 6510: IT-tjänster
- 6550: Konsulttjänster
- 6570: Bankkostnader (0% moms)
- 6700: Resekostnader
- 6720: Hotell (12% moms)
- 6770: Drivmedel
- 6911: Programvarulicenser/SaaS
- 6930: Reklamkostnader
- 6940: Marknadsföring
- 7010: Löner (ej moms)
- 7510: Arbetsgivaravgifter (ej moms)

MOMSSATSER:
- 25%: De flesta varor/tjänster
- 12%: Restaurang, livsmedel, hotell, camping
- 6%: Böcker, tidningar, persontransport (tåg, flyg, taxi)
- 0%: Bankavgifter, försäkring, sjukvård, utbildning, hyra bostad

OBS: Matmoms sänkt till 6% fr.o.m. april 2026.

BERÄKNING om bara totalbelopp syns:
- moms = totalbelopp × momssats / (100 + momssats)
- netto = totalbelopp - moms

RISKBEDÖMNING – bedöm alltid:
1. Är OCR-data komplett och tydlig? (belopp, datum, leverantör läsbara?)
2. Är momssatsen rimlig för denna typ av kostnad?
3. Kan detta vara en privat kostnad? (t.ex. kläder, livsmedel utan företagskontext)
4. Finns det avvikelser i formatet? (saknade fält, ovanlig layout)
5. Behöver fakturan periodiseras? (t.ex. årsabonnemang, hyra i förskott)

ÅTGÄRDSFÖRSLAG – välj ett:
- "book_directly": Allt ser korrekt ut, kan bokföras direkt
- "send_to_attestation": Behöver manuell granskning/attest
- "request_more_info": Saknar information, behöver komplettering

Svara ENBART med JSON (ingen markdown, inga backticks):
{
  "supplier": "Leverantörens namn",
  "supplierOrgNumber": "Org-nummer om synligt, annars null",
  "invoiceNumber": "Fakturanummer",
  "date": "YYYY-MM-DD",
  "dueDate": "YYYY-MM-DD",
  "totalAmount": number,
  "netAmount": number,
  "vatAmount": number,
  "vatRate": number,
  "currency": "SEK",
  "description": "Kort beskrivning",
  "lineDescription": "Rad-beskrivning för kontering",
  "suggestedAccount": "kontonummer",
  "suggestedAccountName": "kontonamn",
  "confidence": 0.0-1.0,
  "review": {
    "verdict": "ok" | "warning" | "reject",
    "verdictText": "Kort motivering på svenska, max 2 meningar",
    "costType": "Typ av kostnad, t.ex. IT-tjänst, Kontorsmaterial",
    "accountingAssessment": "Är konteringen rimlig? Kort motivering",
    "controls": [
      {
        "check": "Namn på kontroll",
        "status": "ok" | "warning" | "error",
        "detail": "Kort beskrivning av resultatet"
      }
    ],
    "warnings": ["Varningstext 1", "Varningstext 2"],
    "suggestedAction": "book_directly" | "send_to_attestation" | "request_more_info",
    "suggestedActionText": "Motivering till åtgärdsförslaget",
    "needsPeriodization": false,
    "periodizationMonths": null
  }
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: `Analysera denna leverantörsfaktura (${fileName || "okänt"}). Extrahera all data, föreslå kontering, gör riskbedömning och ge åtgärdsförslag.` },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${fileBase64}` } },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 3000,
      }),
    });

    if (!aiResponse.ok) {
      const errBody = await aiResponse.text().catch(() => "");
      console.error("AI error:", aiResponse.status, errBody);
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "AI-tjänsten är tillfälligt överbelastad. Försök igen om en stund." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "AI-krediter slut. Kontakta administratören." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI-analys misslyckades (${aiResponse.status})`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error("Inget AI-svar");

    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("analyze-supplier-invoice error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Kunde inte analysera fakturan" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
