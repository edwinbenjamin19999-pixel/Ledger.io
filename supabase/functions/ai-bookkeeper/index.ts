import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

import { corsHeaders, handleCors } from "../_shared/cors.ts";

// Input validation schema
const inputSchema = z.object({
  message: z.string().min(1, "Meddelande krävs").max(10000, "Meddelandet är för långt"),
  companyId: z.string().uuid("Ogiltigt företags-ID format"),
  attachments: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    url: z.string().url().optional(),
    status: z.string()
  })).optional().default([]),
  conversationHistory: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string()
  })).optional().default([])
});

// Helper to create safe error response
function safeErrorResponse(error: unknown) {
  console.error("Error in ai-bookkeeper:", error);
  
  if (error instanceof z.ZodError) {
    return new Response(
      JSON.stringify({ 
        error: error.errors.map(e => e.message).join(", "),
        response: "Det uppstod ett valideringsfel. Kontrollera din inmatning."
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  
  // Handle rate limiting
  const errorMessage = error instanceof Error ? error.message : "";
  if (errorMessage.includes("429") || errorMessage.includes("rate limit")) {
    return new Response(
      JSON.stringify({ 
        error: "För många förfrågningar. Vänta en stund och försök igen.",
        response: "AI-tjänsten är tillfälligt överbelastad. Försök igen om en minut."
      }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  
  return new Response(
    JSON.stringify({ 
      error: "Ett fel uppstod. Försök igen.",
      response: "Något gick fel. Kan du beskriva transaktionen igen?" 
    }),
    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

interface JournalLine {
  account: string;
  accountName: string;
  debit?: number;
  credit?: number;
  vatCode?: string;
}

interface BookkeepingResult {
  response: string;
  journalEntry?: {
    id: string;
    description: string;
    date: string;
    lines: JournalLine[];
    status: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate input with Zod
    const rawInput = await req.json();
    const { message, attachments, companyId, conversationHistory } = inputSchema.parse(rawInput);
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authorization header for user context
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader) {
      const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      userId = user?.id || null;
    }

    // SECURITY: Verify user has access to this company
    if (!userId) {
      return new Response(
        JSON.stringify({ 
          error: "Du måste vara inloggad för att bokföra.",
          response: "Du måste vara inloggad för att använda AI-bokföraren."
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: userRole, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (roleError || !userRole) {
      console.error("Access denied - user has no role for company:", { userId, companyId });
      return new Response(
        JSON.stringify({ 
          error: "Du har inte behörighet att bokföra på detta företag.",
          response: "Du saknar behörighet för detta företag. Kontakta företagets ägare för att få åtkomst."
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get company info separately
    const { data: companyData } = await supabase
      .from("companies")
      .select("name, org_number")
      .eq("id", companyId)
      .maybeSingle();

    const companyName = companyData?.name || "Okänt företag";
    const companyOrgNumber = companyData?.org_number || "";

    console.log(`User ${userId} (role: ${userRole.role}) booking for company: ${companyName} (${companyOrgNumber})`);

    // Fetch company's chart of accounts for context
    const { data: accounts } = await supabase
      .from("chart_of_accounts")
      .select("account_number, account_name, account_type, vat_code")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .limit(100);

    // Fetch recent journal entries for learning context
    const { data: recentEntries } = await supabase
      .from("journal_entries")
      .select(`
        description,
        journal_entry_lines (
          debit, credit,
          chart_of_accounts (account_number, account_name)
        )
      `)
      .eq("company_id", companyId)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(10);

    // Fetch AI learning data (corrections + patterns)
    let learningContext = "";
    try {
      const { data: learningData } = await supabase.rpc("get_ai_learning_data", {
        _company_id: companyId,
        _limit: 30,
      });
      if (learningData && learningData.length > 0) {
        learningContext = "\n\n## INLÄRD BOKFÖRINGSHISTORIK (använd dessa mönster!):\n" +
          learningData.map((item: any) => 
            `- "${item.pattern}" → konto ${item.suggested_account} ${item.suggested_account_name} (använt ${item.correction_count}x, säkerhet ${Math.round(item.avg_confidence * 100)}%)`
          ).join("\n");
      }
    } catch (learningErr) {
      console.warn("Learning data fetch failed:", learningErr);
    }

    const accountsList = accounts?.map(a => 
      `${a.account_number}: ${a.account_name} (${a.account_type}${a.vat_code ? `, moms: ${a.vat_code}` : ''})`
    ).join("\n") || "Inga konton hittades";

    const recentExamples = recentEntries?.slice(0, 5).map(e => {
      const lines = e.journal_entry_lines?.map((l: any) => 
        `  - ${l.chart_of_accounts?.account_number} ${l.chart_of_accounts?.account_name}: ${l.debit ? `D ${l.debit}` : ''} ${l.credit ? `K ${l.credit}` : ''}`
      ).join("\n") || "";
      return `${e.description}:\n${lines}`;
    }).join("\n\n") || "";

    // Check if we recently created an entry in the conversation
    const recentlyCreatedEntry = conversationHistory?.some((msg: any) => 
      msg.role === 'assistant' && 
      (msg.content?.includes('createJournalEntry') || msg.content?.includes('✅'))
    );

    const systemPrompt = `Du är en smart AI-bokförare för NorthLedger. Du bokför för företaget "${companyName}" (org.nr: ${companyOrgNumber}).

## VIKTIGASTE REGELN - STÄLL KONTROLLFRÅGOR FÖRST!
⚠️ SKAPA ALDRIG VERIFIKAT DIREKT! Du MÅSTE ställa kontrollfrågor innan du bokför:

1. **Datum**: "Vilket datum gjordes köpet/försäljningen?"
2. **Köp av utrustning/inventarier**: "Köpte du från ett företag (moms avdragsgill) eller privatperson (ingen moms)?" samt "Var det begagnat eller nytt?"
3. **Belopp**: "Är beloppet inklusive eller exklusive moms?"

ENDAST efter att användaren svarat på frågorna får du skapa verifikat med JSON.

## ARBETSFLÖDE:
Steg 1: Användaren beskriver transaktionen
Steg 2: DU STÄLLER KONTROLLFRÅGOR (obligatoriskt!)
Steg 3: Användaren svarar
Steg 4: Du skapar verifikatet med korrekt datum, moms, etc.

## EXEMPEL PÅ KORREKT DIALOG:
Användare: "Jag köpte en dator för 10000 kr"
DU: "Bokför 10 000 kr som bruttobelopp (inkl. moms) — netto 8 000 kr, moms 2 000 kr på 2640.
Några snabba frågor:
1. Vilket datum?
2. Från företag (med moms) eller privatperson?"

Användare: "Igår, från Elgiganten"
DU: [Skapa verifikatet med rätt datum och moms — brutto 10 000 = netto 8 000 + moms 2 000]

## VIKTIGT OM BELOPP:
- **STANDARDREGEL:** Belopp användaren anger ("för X kr", "kostade X", "betalade X") tolkas ALLTID som BRUTTOBELOPP (inkl. moms). Fråga aldrig "är det inkl eller exkl moms?" som första fråga — utgå från brutto och nämn det i din bekräftelse.
- Endast om användaren explicit skriver "exkl moms", "netto", "plus moms" eller "+ X % moms" → tolka som nettobelopp.
- I dubbel bokföring: debet SUMMA = kredit SUMMA = transaktionsbeloppet (brutto).
- Säg ALDRIG "totalt 16000 kr" för en 8000 kr-transaktion — det är FEL!

## UNDVIK DUBBLETTER:
${recentlyCreatedEntry ? '⚠️ DET FINNS REDAN ETT VERIFIKAT I DENNA KONVERSATION! Skapa INTE ett nytt om användaren inte beskriver en helt NY transaktion.' : ''}
- Om användaren frågar "är det bokfört?" → Svara kort: "Ja, det är redan bokfört!"
- Om användaren bekräftar/tackar → Svara kort, skapa inget nytt
- ENDAST skapa verifikat för NYA transaktioner EFTER att du ställt kontrollfrågor

## SVENSKA MOMSSATSER (du MÅSTE välja rätt baserat på typ):

### 25% — Standard
Kontorsmaterial, datorer, programvara, möbler, konsulttjänster, reparationer, drivmedel, parkering, hyrbil, reklam, SaaS-licenser.

### 12% — Reducerad  
Livsmedel/matvaror, restaurang/café (lunch, middag, fika), hotell/logi, catering.
OBS: Alkohol på restaurangnota = 25% separat!

### 6% — Låg
Böcker, e-böcker, tidningar, persontransport (tåg, buss, flyg inrikes, taxi), kultur (bio, teater, konsert).

### 0% — Momsfritt (INGEN momsrad!)
Bankavgifter, försäkringspremier, sjukvård, porto, utbildning, föreningsavgifter, bostadshyra.

## MOMSBERÄKNING (bruttobelopp inkl. moms är STANDARD):
moms = bruttobelopp × momssats / (100 + momssats)
Exempel: Lunch 300 kr → moms = 300 × 12 / 112 = 32 kr (INTE 300 × 12 / 100 = 36 kr!)
Exempel: Dator 10000 kr → moms = 10000 × 25 / 125 = 2000 kr (netto 8000 kr)
Endast om användaren explicit anger "exkl moms"/"netto" → moms = belopp × momssats / 100.

## FORMULERING I BEKRÄFTELSE:
Skriv ALDRIG "dragit av X% moms (Y kr)" från ett bruttobelopp — procentsatsen ser då felaktig ut.
Använd ALLTID **"varav moms Y kr (X%)"** eller "netto N + moms Y kr (X%)".
Exempel: ✅ "Brutto 450 kr, varav moms 90 kr (25%) → netto 360 kr"  ❌ "Dragit av 25% moms (90 kr)".

## BOKFÖRING:
- Köp från FÖRETAG: Bank kredit (brutto), Kostnad debet (netto), Ingående moms 2640 debet
- Köp från PRIVATPERSON: Bank kredit, Kostnad debet (samma belopp, ingen moms)
- Inventarier > 5000 kr (exkl moms): Överväg tillgång (konto 12xx) istället för kostnad
- OM 0% MOMS: INGEN momsrad — hela beloppet direkt på kostnadskontot!

## KONTOPLAN:
\${accountsList}
\${learningContext}

\${recentExamples ? \`## SENASTE GODKÄNDA BOKFÖRINGAR:\\n\${recentExamples}\` : ''}

## SVARSFORMAT (ENDAST efter kontrollfrågor besvarats):
Kort bekräftelse + JSON:

\`\`\`json
{
  "createJournalEntry": true,
  "description": "Lunch på Restaurang X",
  "date": "YYYY-MM-DD",
  "lines": [
    {"account": "1930", "accountName": "Bank", "debit": null, "credit": 300, "vatCode": null},
    {"account": "6071", "accountName": "Representation avdragsgill", "debit": 268, "credit": null, "vatCode": "12", "vatAmount": 32},
    {"account": "2640", "accountName": "Ingående moms", "debit": 32, "credit": null, "vatCode": null}
  ]
}
\`\`\`

✅ Bokfört!

Kom ihåg: STÄLL ALLTID KONTROLLFRÅGOR FÖRST!`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(conversationHistory || []),
      { 
        role: "user", 
        content: attachments?.length 
          ? `${message}\n\n[Användaren bifogade ${attachments.length} fil(er): ${attachments.map((a: any) => a.name).join(", ")}]`
          : message 
      },
    ];

    console.log("Sending to AI:", { messageCount: messages.length, hasAttachments: !!attachments?.length });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "För många förfrågningar, försök igen om en stund." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI-tjänsten är tillfälligt otillgänglig." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      throw new Error("No response from AI");
    }

    console.log("AI response received:", aiResponse.substring(0, 200));

    // Parse the response for journal entry creation
    const result: BookkeepingResult = { response: aiResponse };

    // Extract JSON from response
    const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        const journalData = JSON.parse(jsonMatch[1]);
        
        if (journalData.createJournalEntry && journalData.lines?.length > 0) {
          // Validate debit = credit
          const totalDebit = journalData.lines.reduce((sum: number, l: any) => sum + (l.debit || 0), 0);
          const totalCredit = journalData.lines.reduce((sum: number, l: any) => sum + (l.credit || 0), 0);
          
          if (Math.abs(totalDebit - totalCredit) < 0.01) {
            // Create journal entry
            const { data: journalEntry, error: entryError } = await supabase
              .from("journal_entries")
              .insert({
                company_id: companyId,
                description: journalData.description,
                entry_date: journalData.date || new Date().toISOString().split('T')[0],
                status: "pending_approval",
                created_by: userId || "00000000-0000-0000-0000-000000000000",
                ai_confidence: 0.85,
                ai_explanation: "Skapad via AI-bokförare baserat på användarens beskrivning",
              })
              .select()
              .maybeSingle();

            if (entryError) {
              console.error("Error creating journal entry:", entryError);
            } else if (journalEntry) {
              // Get or create accounts and insert lines
              for (const line of journalData.lines) {
                // Find or create account
                let { data: account } = await supabase
                  .from("chart_of_accounts")
                  .select("id")
                  .eq("company_id", companyId)
                  .eq("account_number", line.account)
                  .maybeSingle();

                if (!account) {
                  // Create the account
                  const accountType = line.account.startsWith("1") ? "asset" :
                                     line.account.startsWith("2") ? "liability" :
                                     line.account.startsWith("3") ? "revenue" :
                                     line.account.startsWith("4") || line.account.startsWith("5") || 
                                     line.account.startsWith("6") || line.account.startsWith("7") ? "expense" : "other";
                  
                  const { data: newAccount } = await supabase
                    .from("chart_of_accounts")
                    .insert({
                      company_id: companyId,
                      account_number: line.account,
                      account_name: line.accountName,
                      account_type: accountType,
                    })
                    .select()
                    .maybeSingle();
                  
                  account = newAccount;
                }

                if (account) {
                  await supabase.from("journal_entry_lines").insert({
                    journal_entry_id: journalEntry.id,
                    account_id: account.id,
                    debit: line.debit || null,
                    credit: line.credit || null,
                    vat_code: line.vatCode || null,
                    vat_amount: line.vatAmount || null,
                  });
                }
              }

              result.journalEntry = {
                id: journalEntry.id,
                description: journalData.description,
                date: journalData.date || new Date().toISOString().split('T')[0],
                lines: journalData.lines,
                status: "pending_approval",
              };
            }
          } else {
            console.warn("Debit/Credit mismatch:", { totalDebit, totalCredit });
          }
        }
      } catch (parseError) {
        console.error("Error parsing journal entry JSON:", parseError);
      }
    }

    // Clean the response (remove JSON block for display)
    result.response = aiResponse.replace(/```json[\s\S]*?```/g, "").trim();

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return safeErrorResponse(error);
  }
});
