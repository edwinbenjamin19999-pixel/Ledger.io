import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const inputSchema = z.object({
  fileBase64: z.string().min(1),
  mimeType: z.string().min(1),
  fileName: z.string().optional(),
  companyId: z.string().uuid().optional(),
  matchBankTransaction: z.boolean().optional(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") return handleCors(req);

  try {
    const raw = await req.json();
    const { fileBase64, mimeType, fileName, companyId, matchBankTransaction } = inputSchema.parse(raw);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Du är en svensk redovisningsexpert som läser kvitton och fakturor från bilder/PDF.

Analysera bilden NOGGRANT och extrahera ALL information:

1. Totalbelopp INKLUSIVE moms (brutto)
2. Momsbelopp (om det syns på kvittot)
3. Belopp EXKLUSIVE moms (netto)
4. Momssats (0%, 6%, 12% eller 25%)
5. Datum på kvittot
6. Valuta (SEK, EUR, USD etc)
7. Leverantörens/butikens namn
8. Vad köpet avser (kort beskrivning)
9. Betalmetod om det syns (kort, kontant, Swish, faktura)
10. Alla RADPOSTER/artiklar som syns på kvittot
11. Om det finns OCR/referensnummer
12. Organisationsnummer på leverantören om det syns

MOMSSATSER:
- 25%: De flesta varor/tjänster, kontorsmaterial, programvara, drivmedel
- 12%: Restaurang/café, livsmedel, hotell/logi
- 6%: Böcker, persontransport (tåg, buss, flyg, taxi)
- 0%: Bankavgifter, försäkring, sjukvård, porto

BERÄKNING om bara totalbelopp syns:
- moms = totalbelopp × momssats / (100 + momssats)
- netto = totalbelopp - moms

VALIDERING:
- Kontrollera att totalAmount = netAmount + vatAmount (±0.5 kr avrundning)
- Om det finns radposter, kontrollera att summan stämmer

Svara ENBART med JSON:
{
  "totalAmount": number,
  "netAmount": number,
  "vatAmount": number,
  "vatRate": number,
  "date": "YYYY-MM-DD",
  "currency": "SEK",
  "supplier": "string",
  "supplierOrgNumber": "string eller null",
  "description": "kort beskrivning av köpet",
  "memo": "Detaljerad text: leverantör, vad som köptes, antal personer vid representation etc.",
  "paymentMethod": "card" | "cash" | "swish" | "invoice" | "unknown",
  "documentType": "receipt" | "invoice" | "statement" | "unknown",
  "dueDate": "YYYY-MM-DD eller null (om det finns förfallodatum)",
  "invoiceNumber": "string eller null",
  "paymentTerms": "string eller null (t.ex. '30 dagar netto')",
  "lineItems": [
    { "description": "string", "quantity": number, "unitPrice": number, "total": number, "vatRate": number }
  ],
  "reference": "OCR/referensnummer eller null",
  "confidence": 0.0-1.0,
  "validationWarnings": ["lista av varningar om något inte stämmer"]
}

DOKUMENTTYP-REGLER:
- "receipt" = kvitto från köp (POS, webbeställning)
- "invoice" = leverantörsfaktura med betalningsvillkor, förfallodatum, fakturanummer
- "statement" = kontoutdrag eller kreditkortsutdrag
- "unknown" = oklart`;

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
              { type: "text", text: `Analysera detta kvitto/faktura (${fileName || "okänt"}) och extrahera all ekonomisk information. Var extra noggrann med belopp och moms.` },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${fileBase64}` } },
            ],
          },
        ],
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      const errBody = await aiResponse.text().catch(() => "");
      console.error("AI error:", aiResponse.status, errBody);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ success: false, error: "Rate limit nådd, försök igen om en stund." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ success: false, error: "AI-krediter slut, kontakta administratören." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI-analys misslyckades (${aiResponse.status})`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error("Inget AI-svar");

    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    // Server-side validation
    const warnings: string[] = parsed.validationWarnings || [];
    const totalCheck = Math.abs((parsed.netAmount + parsed.vatAmount) - parsed.totalAmount);
    if (totalCheck > 1) {
      warnings.push(`Beloppsvarning: netto (${parsed.netAmount}) + moms (${parsed.vatAmount}) = ${parsed.netAmount + parsed.vatAmount}, men total = ${parsed.totalAmount}`);
    }

    // Credit card transaction matching
    let ccMatch = null;
    if (companyId && parsed.totalAmount && parsed.date) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const sbClient = createClient(supabaseUrl, supabaseKey);

        const ccAmount = Math.abs(parsed.totalAmount);
        const ccDateObj = new Date(parsed.date);
        const ccDayBefore = new Date(ccDateObj);
        ccDayBefore.setDate(ccDayBefore.getDate() - 2);
        const ccDayAfter = new Date(ccDateObj);
        ccDayAfter.setDate(ccDayAfter.getDate() + 2);

        const { data: ccMatches } = await sbClient
          .from("credit_card_transactions")
          .select("id, amount, transaction_date, merchant_name")
          .eq("company_id", companyId)
          .gte("transaction_date", ccDayBefore.toISOString().split("T")[0])
          .lte("transaction_date", ccDayAfter.toISOString().split("T")[0])
          .limit(20);

        if (ccMatches && ccMatches.length > 0) {
          const ccTolerance = ccAmount * 0.03;
          const ccBest = ccMatches
            .map(m => ({ ...m, amountDiff: Math.abs(Math.abs(m.amount) - ccAmount) }))
            .filter(m => m.amountDiff <= ccTolerance)
            .sort((a, b) => a.amountDiff - b.amountDiff)[0];

          if (ccBest) {
            ccMatch = {
              transactionId: ccBest.id,
              amount: ccBest.amount,
              date: ccBest.transaction_date,
              merchantName: ccBest.merchant_name,
              confidence: Math.max(0.7, 1 - ccBest.amountDiff / ccAmount),
            };
          }
        }
      } catch (ccErr) {
        console.warn("CC matching failed (non-critical):", ccErr);
      }
    }

    // Bank transaction matching
    let bankMatch = null;
    if (matchBankTransaction && companyId && parsed.totalAmount && parsed.date) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const amount = -Math.abs(parsed.totalAmount); // Bank outflows are negative
        const dateObj = new Date(parsed.date);
        const dayBefore = new Date(dateObj);
        dayBefore.setDate(dayBefore.getDate() - 1);
        const dayAfter = new Date(dateObj);
        dayAfter.setDate(dayAfter.getDate() + 1);

        const { data: matches } = await supabase
          .from("bank_transactions")
          .select("id, amount, booking_date, description, counterparty_name, status")
          .eq("company_id", companyId)
          .gte("booking_date", dayBefore.toISOString().split("T")[0])
          .lte("booking_date", dayAfter.toISOString().split("T")[0])
          .in("status", ["unmatched", "pending"])
          .limit(20);

        if (matches && matches.length > 0) {
          // Find best match by amount proximity (±5%)
          const tolerance = Math.abs(parsed.totalAmount) * 0.05;
          const best = matches
            .map(m => ({
              ...m,
              amountDiff: Math.abs(Math.abs(m.amount) - Math.abs(parsed.totalAmount)),
            }))
            .filter(m => m.amountDiff <= tolerance)
            .sort((a, b) => a.amountDiff - b.amountDiff)[0];

          if (best) {
            bankMatch = {
              transactionId: best.id,
              amount: best.amount,
              date: best.booking_date,
              description: best.description,
              counterparty: best.counterparty_name,
              confidence: Math.max(0.7, 1 - (best.amountDiff / Math.abs(parsed.totalAmount))),
            };
          }
        }
      } catch (matchErr) {
        console.warn("Bank matching failed (non-critical):", matchErr);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      data: { ...parsed, validationWarnings: warnings },
      bankMatch,
      ccMatch,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("analyze-expense-receipt error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Kunde inte analysera kvittot" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
