import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { callAIWithFallback, MODEL_CHAINS } from "../_shared/ai-gateway.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { company_id } = await req.json();

    if (!company_id) {
      throw new Error("company_id is required");
    }

    console.log("Getting insights for company:", company_id);

    // Get company info
    const { data: company, error: companyError } = await supabaseClient
      .from("companies")
      .select("*")
      .eq("id", company_id)
      .maybeSingle();

    if (companyError) throw companyError;
    if (!company) throw new Error("Company not found");

    const industry = company.industry || "general";

    // Get financial data for the last 3 months
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { data: journalEntries, error: entriesError } = await supabaseClient
      .from("journal_entries")
      .select(`
        *,
        journal_entry_lines(
          *,
          chart_of_accounts(account_number, account_name, account_type)
        )
      `)
      .eq("company_id", company_id)
      .gte("entry_date", threeMonthsAgo.toISOString().split("T")[0])
      .order("entry_date", { ascending: false });

    if (entriesError) throw entriesError;

    // Calculate key metrics
    const expenses = journalEntries?.flatMap((entry) =>
      entry.journal_entry_lines
        .filter((line: any) => {
          const accType = line.chart_of_accounts?.account_type;
          return (accType === "expense" || accType === "cost") && line.debit > 0;
        })
        .map((line: any) => ({
          account: line.chart_of_accounts.account_number,
          account_name: line.chart_of_accounts.account_name,
          amount: line.debit,
          date: entry.entry_date,
        }))
    ) || [];

    const income = journalEntries?.flatMap((entry) =>
      entry.journal_entry_lines
        .filter((line: any) => {
          const accType = line.chart_of_accounts?.account_type;
          return (accType === "revenue" || accType === "income") && line.credit > 0;
        })
        .map((line: any) => ({
          account: line.chart_of_accounts.account_number,
          amount: line.credit,
        }))
    ) || [];

    // Calculate totals by expense category
    const expensesByCategory = expenses.reduce((acc: any, exp) => {
      const category = exp.account.charAt(0);
      if (!acc[category]) {
        acc[category] = { total: 0, items: [] };
      }
      acc[category].total += exp.amount;
      acc[category].items.push(exp);
      return acc;
    }, {});

    const totalIncome = income.reduce((sum, i) => sum + i.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Get bank account balances
    const { data: bankAccounts } = await supabaseClient
      .from("bank_accounts")
      .select("account_name, balance, currency")
      .eq("company_id", company_id)
      .eq("is_active", true);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      console.log("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI insights not available" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Prepare industry-specific context
    const industryContext: Record<string, string> = {
      real_estate: "Fastighetsbolag bör fokusera på underhållskostnader, vakansgrad och avkastning på fastighetskapital. Hyresintäkter bör vara stabila och förutsägbara. Avskrivningar är viktiga för skatteplanering.",
      construction: "Byggföretag måste kontrollera materialkostnader, underentreprenader och personalkostnader noga. Projekttäckningsgrad är kritisk - varje projekt bör ha minst 15-20% täckningsgrad. Kassaflöde är ofta pressat.",
      restaurant: "Restauranger ska hålla råvarukostnad under 30% av omsättning, personalkostnad under 35%. Dagskassan måste stämmas av varje dag. Svinn och förstörda varor bör minimeras.",
      retail: "Detaljhandel behöver fokusera på lageromsättning, bruttomarginal (bör vara minst 40%), och shrinkage (svinn/stöld). Lager som inte säljs binder kapital.",
      consulting: "Konsultföretag ska maximera debiteringsgrad (minst 70%), minimera ej debiterbara timmar, och ha korta betalningstider från kunder. Konsulatarvoden är ofta största kostnaden.",
      manufacturing: "Tillverkande företag måste kontrollera råvarukostnader, produktionseffektivitet och lagerbalans. Products-in-progress ska minimeras. Direkta kostnader bör vara väl dokumenterade per produkt.",
      general: "Fokusera på lönsamhet, kassaflöde och kostnadsstruktur. Håll koll på kundfordringar och leverantörsskulder.",
    };

    const prompt = `Du är en erfaren svensk ekonomirådgivare och revisor. Analysera detta ${industry === "general" ? "företags" : industryContext[industry] ? industry : "företags"} ekonomi och ge KONKRETA, GENOMFÖRBARA råd.

FÖRETAGSINFORMATION:
Bransch: ${industry}
Period: Senaste 3 månaderna

EKONOMISK DATA:
Totala intäkter: ${totalIncome.toFixed(2)} SEK
Totala kostnader: ${totalExpenses.toFixed(2)} SEK
Nettoresultat: ${(totalIncome - totalExpenses).toFixed(2)} SEK
Marginal: ${totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100).toFixed(1) : "N/A"}%

KOSTNADER PER KATEGORI:
${Object.entries(expensesByCategory)
  .map(([cat, data]: [string, any]) => {
    const percentage = totalIncome > 0 ? (data.total / totalIncome * 100).toFixed(1) : "N/A";
    return `- Kategori ${cat}: ${data.total.toFixed(2)} SEK (${percentage}% av omsättning)`;
  })
  .join("\n")}

BANKSALDON:
${bankAccounts?.map((acc: any) => `- ${acc.account_name}: ${acc.balance?.toFixed(2) || "0.00"} ${acc.currency}`).join("\n") || "Inga bankkonton registrerade"}

BRANSCHKONTEXT:
${industryContext[industry] || industryContext.general}

DIN UPPGIFT:
Ge 5-7 KONKRETA råd i följande format:

1. **AKUTA ÅTGÄRDER** (om några): Saker som företaget MÅSTE åtgärda NU (t.ex. för höga kostnader, dåligt kassaflöde, osv.)

2. **KOSTNADSBESPARINGAR**: Identifiera specifika kostnadsposter som kan sänkas och HUR

3. **INTÄKTSFÖRBÄTTRINGAR**: Sätt att öka omsättningen baserat på branschen

4. **BRANSCHSPECIFIKA TIPS**: Råd som är särskilt relevanta för ${industry}

5. **LÅNGSIKTIG STRATEGI**: Vad bör företaget planera för framåt

Var MYCKET SPECIFIK. Ange exakta siffror, procentsatser och åtgärder. Om något ser bra ut, säg det också!`;

    const { data: aiData, modelUsed } = await callAIWithFallback({
      ...MODEL_CHAINS.balancedInsights,
      messages: [
        {
          role: "system",
          content:
            "Du är en erfaren svensk ekonomirådgivare med 20 års erfarenhet. Ge alltid konkreta, genomförbara råd med specifika siffror och åtgärder. Var direkt och tydlig.",
        },
        { role: "user", content: prompt },
      ],
    });

    const insights = aiData.choices?.[0]?.message?.content;
    console.log(`[business-insights] modelUsed=${modelUsed}`);

    return new Response(
      JSON.stringify({
        success: true,
        insights,
        metrics: {
          totalIncome,
          totalExpenses,
          netResult: totalIncome - totalExpenses,
          margin: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100) : 0,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in business-insights:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
