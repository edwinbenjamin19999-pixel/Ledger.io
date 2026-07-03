import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors, corsJson, corsError } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GATEWAY_URL = "https://ai.lovable.dev/v1/chat/completions";

serve(async (req) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return corsError("Missing authorization", 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return corsError("Unauthorized", 401);

    const { file_base64, file_type, company_id } = await req.json();
    if (!file_base64 || !company_id) {
      return corsError("Missing file_base64 or company_id", 400);
    }

    // Fetch existing receipts for matching
    const { data: receipts } = await supabase
      .from("documents")
      .select("id, file_name, amount, supplier_name, document_date, created_at")
      .eq("company_id", company_id)
      .eq("document_type", "receipt")
      .order("created_at", { ascending: false })
      .limit(200);

    // Fetch existing CC transactions for duplicate detection
    const { data: existingTxns } = await supabase
      .from("credit_card_transactions")
      .select("merchant_name, amount, transaction_date")
      .eq("company_id", company_id)
      .order("created_at", { ascending: false })
      .limit(500);

    // Fetch company chart of accounts for suggestions
    const { data: accounts } = await supabase
      .from("chart_of_accounts")
      .select("account_number, account_name, account_type, vat_code")
      .eq("company_id", company_id)
      .eq("is_active", true)
      .limit(500);

    const receiptSummary = (receipts || []).slice(0, 50).map(r => 
      `${r.supplier_name || 'okänd'} | ${r.amount || '?'} | ${r.document_date || r.created_at?.slice(0,10) || '?'} | id:${r.id}`
    ).join("\n");

    const existingTxnSummary = (existingTxns || []).slice(0, 100).map(t =>
      `${t.merchant_name}|${t.amount}|${t.transaction_date}`
    ).join("\n");

    const accountList = (accounts || []).slice(0, 100).map(a =>
      `${a.account_number} ${a.account_name} (${a.account_type}, moms:${a.vat_code || 'nej'})`
    ).join("\n");

    const systemPrompt = `Du är en expert på svensk bokföring och kreditkortsredovisning.

Du ska analysera ett kreditkortsutdrag och returnera strukturerad JSON.

UPPGIFT:
1. Identifiera att dokumentet är ett kreditkortsutdrag
2. Extrahera utdragsperiod, totalbelopp, kortutgivare
3. Extrahera ALLA individuella transaktioner
4. För varje transaktion: föreslå bokföringskonton enligt BAS-kontoplanen
5. Matcha mot befintliga kvitton om möjligt
6. Flagga känsliga köp (t.ex. Systembolaget, restauranger)
7. Detektera dubbletter mot befintliga transaktioner

BOKFÖRINGSLOGIK:
- Kreditkortsköp: Debet kostnadskonto + Debet 2640 (ingående moms) / Kredit 2890 (kreditkortsskuld)
- Vid betalning av kortfaktura: Debet 2890 / Kredit 1930
- Standardmomssats: 25% om inte annat anges
- Restaurang: Fråga om representation (avdragsgill/ej avdragsgill), personalmåltid eller annat
- Systembolaget: Flagga som känslig, möjligen ej avdragsgill
- Kontorsmaterial: 6110, IT/datorer: 6230/1250, Resor: 5800-serien

MATCHNING MOT KVITTON:
Befintliga kvitton (leverantör | belopp | datum | id):
${receiptSummary || "(inga kvitton)"}

BEFINTLIGA TRANSAKTIONER (för duplikatdetektering):
${existingTxnSummary || "(inga)"}

KONTOPLAN:
${accountList || "(standardkontoplan)"}

DUBBEL BOKFÖRING (köphändelse):
- Debet: kostnadskonto (ex moms) + Debet: 2641 (ingående moms, om avdragsgill)
- Kredit: 2890 (kreditkortsskuld) — totala beloppet inkl moms
Sätt vat_account="2641" om momsen är avdragsgill, annars null.
Sätt liability_account="2890" som standard (eller "2440" vid leverantörsfakturaflöde).

KONFIDENS-REGLER:
- ≥0.95 = AI är säker → bokförs automatiskt
- 0.75-0.94 = klar för granskning
- <0.75 = behöver manuell granskning

RETURNERA EXAKT DENNA JSON-STRUKTUR:
{
  "is_credit_card_statement": true/false,
  "card_issuer": "string eller null",
  "statement_period_start": "YYYY-MM-DD eller null",
  "statement_period_end": "YYYY-MM-DD eller null",
  "total_amount": number,
  "transactions": [
    {
      "transaction_date": "YYYY-MM-DD",
      "merchant_name": "string",
      "amount": number,
      "currency": "SEK",
      "category_hint": "string",
      "raw_text": "originaltext från utdraget",
      "ai_suggestion": {
        "debit_account": "kontonummer kostnad",
        "debit_account_name": "kontonamn",
        "vat_code": "25/12/6/0",
        "vat_amount": number,
        "vat_account": "2641 eller null",
        "credit_account": "2890",
        "liability_account": "2890",
        "explanation": "kort förklaring",
        "confidence": 0.0-1.0,
        "is_non_deductible": false,
        "journal_preview": [
          { "account": "kontonummer", "debit": number, "credit": 0 },
          { "account": "2641", "debit": number, "credit": 0 },
          { "account": "2890", "debit": 0, "credit": number }
        ]
      },
      "matched_receipt_id": "uuid eller null",
      "match_confidence": 0.0-1.0,
      "is_sensitive": false,
      "clarification_question": "fråga eller null",
      "clarification_options": ["alternativ1", "alternativ2"],
      "is_likely_duplicate": false
    }
  ]
}

Svara BARA med JSON, ingen annan text.`;

    const messages: Array<{ role: string; content: unknown }> = [
      { role: "system", content: systemPrompt },
    ];

    if (file_type?.startsWith("image") || file_type === "application/pdf") {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: "Analysera detta kreditkortsutdrag och returnera JSON enligt instruktionerna." },
          { type: "image_url", image_url: { url: `data:${file_type || "image/png"};base64,${file_base64}` } },
        ],
      });
    } else {
      // CSV or text content
      const textContent = atob(file_base64);
      messages.push({
        role: "user",
        content: `Analysera detta kreditkortsutdrag (CSV/text) och returnera JSON enligt instruktionerna:\n\n${textContent}`,
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return corsError("LOVABLE_API_KEY not configured", 500);

    const aiResponse = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        temperature: 0.1,
        max_tokens: 8000,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI API error:", errText);
      return corsError(`AI analysis failed: ${aiResponse.status}`, 502);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "{}";

    let parsed;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", content);
      return corsError("Failed to parse AI response", 500);
    }

    return corsJson(parsed);
  } catch (err) {
    console.error("analyze-cc-statement error:", err);
    return corsError(err.message || "Internal error", 500);
  }
});
