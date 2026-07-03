import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors, corsJson, corsError } from "../_shared/cors.ts";

serve(async (req) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { company_id, description, entry_date } = await req.json();

    if (!company_id || !description || description.trim().length < 2) {
      return corsError("company_id and description (min 2 chars) required", 400);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return corsError("AI not available", 500);
    }

    // Fetch company's recent journal patterns for historical learning
    const { data: recentEntries } = await supabaseClient
      .from("journal_entries")
      .select(`
        description,
        series_code,
        journal_entry_lines (
          account_id,
          debit,
          credit
        )
      `)
      .eq("company_id", company_id)
      .order("created_at", { ascending: false })
      .limit(200);

    // Fetch chart of accounts for context
    const { data: chartAccounts } = await supabaseClient
      .from("chart_of_accounts")
      .select("account_number, account_name, id")
      .eq("company_id", company_id)
      .eq("is_active", true)
      .order("account_number");

    // Build account lookup
    const accountMap: Record<string, { number: string; name: string }> = {};
    (chartAccounts || []).forEach((a: any) => {
      accountMap[a.id] = { number: a.account_number, name: a.account_name };
    });

    // Build historical patterns: description → accounts used
    const patterns: Record<string, { series: string; accounts: { number: string; name: string; debit: number; credit: number }[]; count: number }> = {};
    
    (recentEntries || []).forEach((entry: any) => {
      if (!entry.description) return;
      const key = entry.description.toLowerCase().replace(/\d+/g, '').trim().substring(0, 50);
      if (!key || key.length < 3) return;
      
      if (!patterns[key]) {
        const lines = (entry.journal_entry_lines || []).map((l: any) => {
          const acc = accountMap[l.account_id];
          return acc ? { number: acc.number, name: acc.name, debit: l.debit, credit: l.credit } : null;
        }).filter(Boolean);
        
        if (lines.length >= 2) {
          patterns[key] = { series: entry.series_code || "M", accounts: lines, count: 1 };
        }
      } else {
        patterns[key].count++;
      }
    });

    // Find matching historical pattern
    const descLower = description.toLowerCase().replace(/\d+/g, '').trim().substring(0, 50);
    let historicalMatch = null;
    let bestMatchScore = 0;
    
    for (const [key, pattern] of Object.entries(patterns)) {
      // Simple fuzzy: check if description words overlap
      const descWords = descLower.split(/\s+/);
      const keyWords = key.split(/\s+/);
      const overlap = descWords.filter((w: string) => w.length > 2 && keyWords.some((kw: string) => kw.includes(w) || w.includes(kw))).length;
      const score = overlap / Math.max(descWords.length, 1);
      
      if (score > 0.5 && score > bestMatchScore && pattern.count >= 2) {
        bestMatchScore = score;
        historicalMatch = pattern;
      }
    }

    const historicalContext = historicalMatch
      ? `\n\nHISTORISK DATA: Företaget har bokfört liknande poster ${historicalMatch.count} gånger med serie "${historicalMatch.series}" och konton: ${historicalMatch.accounts.map(a => `${a.number} ${a.name}`).join(", ")}. Använd detta som primär grund och sätt confidence till "high".`
      : "";

    const systemPrompt = `Du är en expert på svensk bokföring (BAS 2026 kontoplan). Analysera användarens beskrivning av en verifikation och föreslå korrekt bokföringsserie och konton.

SERIER:
- M = Manuell bokföring (periodiseringar, rättelser, avsättningar)
- B = Bankverifikation (banköverföringar, bankavgifter, räntor)
- LB = Likvidbokföring (batchbetalningar, autogiro)
- F = Kundfaktura (kundfordringar, försäljning)
- L = Leverantörsfaktura (leverantörsskulder, inköp)
- LN = Lönebokföring (löner, arbetsgivaravgifter, preliminärskatt)

KONTOREGLER (urval):
- Skattekonto/SKV: 1630 Skattekonto. Ränteintäkt SKV → 1630 debet + 8314 kredit. Kostnadsränta SKV → 8423 debet + 1630 kredit.
- Momsinbetalning: 2650 debet + 1630 kredit (serie B)
- Preliminärskatt: 2518 debet + 1630 kredit (serie B)
- Arbetsgivaravgifter betalning: 2731 debet + 1630 kredit (serie B)
- Bank: 1930 Företagskonto. Bankavgifter → 6570 debet + 1930 kredit. Ränteintäkt bank → 1930 debet + 8311 kredit.
- Kundfaktura: 1510 debet + 30xx kredit + 2611 kredit (moms). Serie F.
- Leverantörsfaktura: 4xxx/5xxx/6xxx debet + 2641 debet (ingående moms) + 2440 kredit. Serie L.
- Lön: 7010/7210 debet, 2710/2731 kredit, 1930 kredit nettolön. Serie LN.
- Periodisering: 17xx/29xx. Serie M. T.ex. förutbetald hyra 1710 debet + 5010 kredit.
- Upplupna kostnader: 29xx kredit + kostnads-konto debet.
- KONCERNMELLANHAVANDE — STRIKT MAPPNING:
  * Kortfristiga fordringar (löptid < 12 mån): 1660 Kortfristiga fordringar koncernföretag (ospecificerad), 1661 Kortfristiga fordringar moderföretag, 1662 Kortfristiga fordringar dotterföretag, 1663 Kortfristiga fordringar andra koncernföretag.
  * Långfristiga fordringar (löptid ≥ 12 mån): 1320 Långfristiga fordringar koncernföretag (ospecificerad), 1321 Fordringar hos moderföretag, 1322 Fordringar hos dotterföretag, 1381 Fordringar hos koncernföretag (alternativt).
  * Kortfristiga skulder (löptid < 12 mån): 2860 Kortfristiga skulder moderföretag, 2861 Kortfristiga skulder dotterföretag, 2862 Kortfristiga skulder andra koncernföretag.
  * Långfristiga skulder (löptid ≥ 12 mån): 2351 Skulder till koncernföretag.
  * STANDARDREGEL: Om löptid ej anges, anta kortfristig. Om relation (moder/dotter) ej anges, använd 1660 (fordran) eller 2860 (skuld).
  * FÖRBJUDET: Föreslå ALDRIG 2890 för koncernmellanhavanden.
  * Nyckelord: "mellanhavande", "koncern", "intercompany", "dotterbolag", "moderbolag" → 1660-serien som primärförslag.
  * Serie: B eller M beroende på kontext.

BELOPPSEXTRAKTION: Om beskrivningen innehåller ett belopp (t.ex. "45 kr", "1500 SEK"), extrahera det och fyll i debet/kredit.${historicalContext}

Svara ALLTID på svenska.`;

    const { callAIWithFallback, MODEL_CHAINS } = await import("../_shared/ai-gateway.ts");
    const tools = [
      {
        type: "function",
        function: {
          name: "suggest_journal_entry",
          description: "Föreslå bokföringsserie och konteringsrader baserat på beskrivning.",
          parameters: {
            type: "object",
            properties: {
              confidence: { type: "string", enum: ["high", "medium", "low"], description: "Hur säker AI:n är på förslaget" },
              series: { type: "string", enum: ["M", "B", "LB", "F", "L", "LN"], description: "Föreslagen bokföringsserie" },
              seriesReason: { type: "string", description: "Kort förklaring varför denna serie föreslås (svenska, max 20 ord)" },
              lines: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    account_number: { type: "string", description: "BAS-kontonummer (4 siffror)" },
                    account_name: { type: "string", description: "Kontonamn" },
                    debit: { type: "number", description: "Debetbelopp (0 om kredit)" },
                    credit: { type: "number", description: "Kreditbelopp (0 om debet)" }
                  },
                  required: ["account_number", "account_name", "debit", "credit"],
                  additionalProperties: false
                },
                description: "Föreslagna konteringsrader (minst 2)"
              },
              explanation: { type: "string", description: "Kort bokföringsmässig förklaring (svenska, max 40 ord)" },
              historicalMatch: { type: "boolean", description: "Om förslaget baseras på företagets historiska bokföring" }
            },
            required: ["confidence", "series", "seriesReason", "lines", "explanation", "historicalMatch"],
            additionalProperties: false
          }
        }
      }
    ];

    let aiData: any;
    try {
      const r = await callAIWithFallback({
        ...MODEL_CHAINS.classification,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Beskrivning: "${description}"\nDatum: ${entry_date || "idag"}\n\nFöreslå bokföring.` },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "suggest_journal_entry" } },
      });
      aiData = r.data;
      console.log(`[ai-suggest-journal-entry] modelUsed=${r.modelUsed}`);
    } catch (e: any) {
      const msg = e?.message || "";
      if (msg.includes("krediter slut")) return corsError("AI-krediter slut", 402);
      if (msg.includes("autentiseras")) return corsError("AI-tjänsten kunde inte autentiseras", 401);
      console.error("[ai-suggest-journal-entry] all models failed", e);
      return corsError("AI-tjänsten är överbelastad. Försök igen om en stund.", 503);
    }
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      return corsError("AI kunde inte tolka beskrivningen", 500);
    }

    let suggestion;
    try {
      suggestion = typeof toolCall.function.arguments === "string"
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
    } catch {
      return corsError("AI returnerade ogiltigt svar", 500);
    }

    // Map suggested account numbers to company's chart of accounts IDs
    const accountList = chartAccounts || [];
    suggestion.lines = (suggestion.lines || []).map((line: any) => {
      const match = accountList.find((a: any) => a.account_number === line.account_number);
      return {
        ...line,
        account_id: match?.id || null,
        accountMissing: !match,
      };
    });

    return corsJson({ success: true, suggestion });
  } catch (error) {
    console.error("Error in ai-suggest-journal-entry:", error);
    return corsError(error instanceof Error ? error.message : "Unknown error");
  }
});
