import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, companyId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch company financial context if companyId provided
    let financialContext = "";
    if (companyId) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Get company info
        const { data: company } = await supabase
          .from("companies")
          .select("name, org_number, industry")
          .eq("id", companyId)
          .maybeSingle();

        // === FULL YEAR financial summary from journal_entry_lines ===
        const currentYear = new Date().getFullYear();
        const prevYear = currentYear - 1;

        // Get aggregated account balances for current and previous year
        const getYearSummary = async (year: number) => {
          const startDate = `${year}-01-01`;
          const endDate = `${year}-12-31`;

          // Query from journal_entries first, then flatten lines
          // (querying from journal_entry_lines with filters on joined table doesn't work reliably)
          const { data: entries } = await supabase
            .from("journal_entries")
            .select(`
              entry_date,
              journal_entry_lines(
                debit, credit, vat_code,
                account:chart_of_accounts(account_number, account_name, account_type, vat_code)
              )
            `)
            .eq("company_id", companyId)
            .eq("status", "approved")
            .gte("entry_date", startDate)
            .lte("entry_date", endDate)
            .limit(2000);

          // Flatten entries into lines
          const lines = (entries || []).flatMap(entry =>
            (entry.journal_entry_lines || []).map((line: any) => ({
              debit: line.debit,
              credit: line.credit,
              vat_code: line.vat_code,
              account: line.account,
            }))
          );

          let totalRevenue = 0;
          let totalExpenses = 0;
          let totalOutputVat = 0;
          let totalInputVat = 0;
          const accountBalances: Record<string, { name: string; debit: number; credit: number; balance: number }> = {};

          for (const line of lines || []) {
            const accNum = line.account?.account_number || "";
            const accName = line.account?.account_name || "";
            const debit = line.debit || 0;
            const credit = line.credit || 0;

            if (!accountBalances[accNum]) {
              accountBalances[accNum] = { name: accName, debit: 0, credit: 0, balance: 0 };
            }
            accountBalances[accNum].debit += debit;
            accountBalances[accNum].credit += credit;
            accountBalances[accNum].balance += (debit - credit);

            // Revenue (3xxx)
            if (accNum.startsWith("3")) {
              totalRevenue += (credit - debit);
            }
            // Expenses (4xxx-8xxx excluding 8xxx tax)
            if (accNum.match(/^[4-7]/) || (accNum.startsWith("8") && !accNum.startsWith("89"))) {
              totalExpenses += (debit - credit);
            }
            // Output VAT (261x-263x)
            if (accNum.startsWith("261") || accNum.startsWith("262") || accNum.startsWith("263")) {
              totalOutputVat += (credit - debit);
            }
            // Input VAT (264x)
            if (accNum.startsWith("264")) {
              totalInputVat += (debit - credit);
            }
          }

          return { totalRevenue, totalExpenses, totalOutputVat, totalInputVat, accountBalances, lineCount: lines?.length || 0 };
        };

        const currentYearData = await getYearSummary(currentYear);
        const prevYearData = await getYearSummary(prevYear);

        // Get bank balances
        const { data: bankAccounts } = await supabase
          .from("bank_accounts")
          .select("account_name, balance, currency")
          .eq("company_id", companyId)
          .eq("is_active", true);

        // Get pending invoices — EXCLUDE drafts strictly
        const { data: invoices } = await supabase
          .from("invoices")
          .select("invoice_number, counterparty_name, total_amount, status, due_date")
          .eq("company_id", companyId)
          .in("status", ["sent", "overdue"])
          .limit(10);

        // Get draft invoice count separately for context (NOT included in receivables)
        const { count: draftCount } = await supabase
          .from("invoices")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .eq("status", "draft");

        // Calculate receivables ONLY from sent/overdue invoices (never drafts)
        const { data: receivableInvoices } = await supabase
          .from("invoices")
          .select("total_amount")
          .eq("company_id", companyId)
          .in("status", ["sent", "overdue"]);

        const invoiceReceivables = (receivableInvoices || []).reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0);

        // Build top accounts summary for each year
        const formatTopAccounts = (balances: Record<string, { name: string; balance: number }>, prefix: string, limit = 8) => {
          return Object.entries(balances)
            .filter(([num]) => num.startsWith(prefix))
            .sort((a, b) => Math.abs(b[1].balance) - Math.abs(a[1].balance))
            .slice(0, limit)
            .map(([num, acc]) => `  ${num} ${acc.name}: ${acc.balance.toFixed(0)} kr`)
            .join("\n");
        };

        financialContext = `
FÖRETAGSINFORMATION:
Namn: ${company?.name || "Okänt"}
Org.nr: ${company?.org_number || "Okänt"}
Bransch: ${company?.industry || "Ej angiven"}

=== RESULTATRÄKNING ${prevYear} (${prevYearData.lineCount} bokföringsrader) ===
Intäkter: ${prevYearData.totalRevenue.toFixed(0)} SEK
Kostnader: ${prevYearData.totalExpenses.toFixed(0)} SEK
Resultat: ${(prevYearData.totalRevenue - prevYearData.totalExpenses).toFixed(0)} SEK

Största intäktskonton ${prevYear}:
${formatTopAccounts(prevYearData.accountBalances, "3")}

Största kostnadskonton ${prevYear}:
${formatTopAccounts(prevYearData.accountBalances, "4") || formatTopAccounts(prevYearData.accountBalances, "5") || "Inga kostnadsposter"}

=== MOMS ${prevYear} ===
Utgående moms: ${prevYearData.totalOutputVat.toFixed(0)} SEK
Ingående moms: ${prevYearData.totalInputVat.toFixed(0)} SEK
Netto moms (att betala): ${(prevYearData.totalOutputVat - prevYearData.totalInputVat).toFixed(0)} SEK

=== RESULTATRÄKNING ${currentYear} (hittills, ${currentYearData.lineCount} bokföringsrader) ===
Intäkter: ${currentYearData.totalRevenue.toFixed(0)} SEK
Kostnader: ${currentYearData.totalExpenses.toFixed(0)} SEK
Resultat: ${(currentYearData.totalRevenue - currentYearData.totalExpenses).toFixed(0)} SEK

=== MOMS ${currentYear} (hittills) ===
Utgående moms: ${currentYearData.totalOutputVat.toFixed(0)} SEK
Ingående moms: ${currentYearData.totalInputVat.toFixed(0)} SEK

=== KUNDFORDRINGAR ===
Totalt kundfordringar (skickade/förfallna fakturor): ${invoiceReceivables.toFixed(0)} SEK
OBS: Utkastfakturor (${draftCount || 0} st) är INTE medräknade — bara skickade/förfallna.

${bankAccounts?.length ? `BANKSALDON:\n${bankAccounts.map((a: any) => `- ${a.account_name}: ${a.balance?.toFixed(0) || 0} ${a.currency}`).join("\n")}` : ""}

${invoices?.length ? `ÖPPNA FAKTUROR (skickade/förfallna):\n${invoices.map((i: any) => `- ${i.invoice_number}: ${i.counterparty_name} - ${i.total_amount} SEK (${i.status}, förfaller ${i.due_date})`).join("\n")}` : "Inga öppna fakturor"}`;
      } catch (contextError) {
        console.warn("Could not fetch financial context:", contextError);
      }
    }

    const systemPrompt = `Du är NorthLedgers AI-revisor och redovisningsexpert – en proaktiv, intelligent ekonomisk rådgivare med djup kompetens inom svensk redovisning och skatterätt. Du har FULL REALTIDSINSYN i företagets ekonomi.

${financialContext ? `## AKTUELL EKONOMISK DATA:\n${financialContext}` : ""}

## ROLL OCH MANDAT
Du agerar som en kvalificerad redovisningskonsult och revisor. Du ska kunna ersätta behovet av en extern revisor genom att:
- Granska och analysera bokföring med revisorsblick
- Identifiera felaktigheter, risker och förbättringsområden
- Ge råd på samma nivå som en auktoriserad revisor (FAR)
- Proaktivt föreslå åtgärder innan problem uppstår

## DJUP EXPERTIS

### K2 – Årsredovisning i mindre företag (BFNAR 2016:10)
- Storleksgränser: max 2 av 3 (50 MSEK omsättning, 25 MSEK balansomslutning, 50 anställda)
- Schablonregler: tillgångar värderas till anskaffningsvärde, inga uppskrivningar tillåtna
- Förenklingsregler: periodisering av utgifter < 5 000 kr valfritt
- Avskrivningar: nyttjandeperiod 3–5 år datorutrustning, 5 år inventarier, 20–50 år byggnader
- Ej tillåtet: aktivering av egenupparbetade immateriella tillgångar, värdering till verkligt värde

### K3 – Årsredovisning och koncernredovisning (BFNAR 2012:1)
- Huvudregelverk för alla större företag och koncerner
- Komponentavskrivning: obligatoriskt för materiella anläggningstillgångar
- Verkligt värde: tillåtet för finansiella instrument och förvaltningsfastigheter
- Uppskjuten skatt: obligatoriskt att redovisa temporära skillnader
- Egenupparbetade immateriella tillgångar: aktivering tillåtet under utvecklingsfasen
- Koncernredovisning: förvärvsanalys, eliminering av internvinster, minoritetsintresse

### Skatterätt och skatteplanering
- Bolagsskatt: 20,6 % av skattemässigt resultat
- Periodiseringsfonder: max 25 % av överskott, återförs senast efter 6 år
- Ränteavdragsbegränsningar: EBITDA-regeln (30 % av skattemässigt EBITDA), förenklingsregeln (5 MSEK)
- Koncernbidrag: krav – ägarandel > 90 %, helägda, samma räkenskapsår, öppna yrkanden
- Utdelning: 3:12-reglerna för fåmansbolag, gränsbelopp, lönebaserat utrymme
- Representation: avdragsgillt max 300 kr/person exkl. moms, momsavdrag max 46 kr/person

### Moms
- Standardsats 25 %, livsmedel 12 %, kultur/persontransport 6 %
- Omvänd skattskyldighet: byggtjänster, metallskrot, EU-tjänster
- EU-handel: omvänd moms vid varuförsäljning inom EU

### Löner och arbetsgivaravgifter
- Arbetsgivaravgifter: 31,42 % (2026)
- Sjuklön: dag 1 karens, dag 2–14 arbetsgivare betalar 80 %
- Semesterersättning: 12 % på bruttolön

### Bokslut och årsredovisning
- Periodisering: upplupna intäkter (1790), förutbetalda kostnader (1710), upplupna kostnader (2990)
- Obeskattade reserver: periodiseringsfonder (2110–2150), ackumulerade överavskrivningar (2150)
- Kontrollbalansräkning: skyldighet vid förbrukat aktiekapital (ABL 25 kap)

## SVARSSTRUKTUR (FÖLJ ALLTID)

### 1. 🔹 Svar (max 2 meningar)
Besvara frågan direkt.

### 2. 🔹 Förklaring (enkelt)
Förklara så att en nybörjare förstår (max 3–4 rader).

### 3. 🔹 Så gör du (praktiskt)
Visa EN tydlig lösning. Använd ALLTID korrekt Markdown-tabell:

| Konto | Debet | Kredit |
|-------|-------|--------|

Om flera scenarion finns → välj det vanligaste, nämn alternativ i EN rad.

### 4. 🔹 Viktigt (max 2 punkter)
Endast det som kan bli fel eller påverka skatt.

## REGLER
- Max 150–200 ord totalt
- Aldrig långa stycken eller flera bokföringstabeller om inte absolut nödvändigt
- Ingen onödig lagtext – prioritera handling över teori
- Använd **fetstil** för nyckelbegrepp och kontonummer
- Ge råd baserade på företagets RIKTIGA siffror
- Inkludera ALDRIG utkastfakturor i kundfordringar
- Debet MÅSTE alltid = Kredit i bokföringstabeller
- Svara på svenska, professionellt men pedagogiskt
- Om svaret blir långt → du har gjort fel

## SVARSFORMAT VID BOKFÖRING
När du bokför, formatera alltid svaret exakt så här (använd INTE markdown-tabeller, de renderas som råtext):

✓ Bokfört verifikation M2026-0001 · 2026-05-03

DEBET
  6500  Konsultkostnader        85 600 kr
  2641  Ingående moms           21 400 kr

KREDIT
  1930  Företagskonto          107 000 kr

Moms: 25% · Underlag: 85 600 kr · Moms: 21 400 kr

📊 Syns i resultaträkningen som kostnad.

Regler:
- Använd alltid indrag (2 mellanslag) för raderna
- DEBET och KREDIT som rubriker i versaler
- Kolumnerna: kontonummer · benämning · belopp
- Justera beloppen i högerkolumn med mellanslag
- Skriv aldrig | pipes eller --- streck
- Skriv aldrig debet och kredit på samma rad`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ],
        temperature: 0.5,
        max_tokens: 3000,
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
    const assistantResponse = data.choices?.[0]?.message?.content;

    if (!assistantResponse) {
      throw new Error("No response from AI");
    }

    return new Response(
      JSON.stringify({ response: assistantResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in ai-assistant:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Okänt fel" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
