import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, companyId, budgetId, action } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build context from company data
    let contextParts: string[] = [];

    if (companyId) {
      // Get company info
      const { data: company } = await supabase.from("companies").select("name, org_number").eq("id", companyId).maybeSingle();
      if (company) contextParts.push(`Företag: ${company.name} (${company.org_number})`);

      // Get recent actuals summary
      const currentYear = new Date().getFullYear();
      const { data: journalData } = await supabase
        .from("journal_entries")
        .select("entry_date, journal_entry_lines(debit, credit, account_id)")
        .eq("company_id", companyId).eq("status", "approved")
        .gte("entry_date", `${currentYear - 1}-01-01`)
        .lte("entry_date", `${currentYear}-12-31`)
        .limit(500);

      const { data: accounts } = await supabase
        .from("chart_of_accounts")
        .select("id, account_number, account_name")
        .eq("company_id", companyId);

      if (accounts && journalData) {
        const acctMap = new Map(accounts.map((a: any) => [a.id, a.account_number]));
        let totalRevenue = 0, totalCosts = 0;
        (journalData || []).forEach((entry: any) => {
          (entry.journal_entry_lines || []).forEach((line: any) => {
            const num = acctMap.get(line.account_id);
            if (!num) return;
            if (num >= "3000" && num <= "3999") totalRevenue += (line.credit || 0) - (line.debit || 0);
            if (num >= "4000" && num <= "7999") totalCosts += (line.debit || 0) - (line.credit || 0);
          });
        });
        contextParts.push(`Senaste bokföringsdata: Intäkter ${Math.round(totalRevenue).toLocaleString('sv-SE')} kr, Kostnader ${Math.round(totalCosts).toLocaleString('sv-SE')} kr, Resultat ${Math.round(totalRevenue - totalCosts).toLocaleString('sv-SE')} kr`);
      }

      // Get budget data if available
      if (budgetId) {
        const { data: budgetRows } = await supabase.from("budget_rows").select("account_number, account_name, jan, feb, mar, apr, maj, jun, jul, aug, sep, okt, nov, dec").eq("budget_id", budgetId);
        if (budgetRows && budgetRows.length > 0) {
          const months = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
          let budgetRev = 0, budgetCost = 0;
          budgetRows.forEach((r: any) => {
            const total = months.reduce((s: number, m: string) => s + (r[m] || 0), 0);
            if (r.account_number >= "3000" && r.account_number <= "3999") budgetRev += total;
            if (r.account_number >= "4000" && r.account_number <= "7999") budgetCost += total;
          });
          contextParts.push(`Nuvarande budget: Intäkter ${Math.round(budgetRev).toLocaleString('sv-SE')} kr, Kostnader ${Math.round(budgetCost).toLocaleString('sv-SE')} kr, Resultat ${Math.round(budgetRev - budgetCost).toLocaleString('sv-SE')} kr`);
        }
      }
    }

    const systemPrompt = `Du är en AI-driven CFO-rådgivare för svenska företag. Du hjälper användaren att planera, övervaka och optimera sin budget.

KONTEXT:
${contextParts.join('\n')}

DITT BETEENDE:
- Agera som en erfaren finansiell rådgivare, inte en teknisk assistent
- Förklara siffror enkelt och tydligt
- Detektera orealistiska budgetar och föreslå justeringar
- Simulera utfall av förändringar ("Om du höjer priserna 5% ökar marginalen med X kr")
- Flagga risker proaktivt ("Din runway minskar från 12 till 6 månader med den anställningsplanen")
- Ge konkreta, handlingsbara rekommendationer
- Använd svenska kronor och svenska termer (BAS-kontoplan)
- Var kortfattad men grundlig — max 3-4 meningar per punkt
- Använd bullet points och siffror för tydlighet

FUNKTIONER:
- Budgetplanering och tillväxtmål
- Kostnadsoptimering och sparåtgärder
- Kassaflödesprognos och likviditetsanalys
- Scenarioanalys (best/worst/base case)
- Break-even beräkning
- Jämförelse mot branschbenchmarks
- Personalplanering och kostnadseffekter

Svara alltid på svenska.`;

    const { callAIStreamWithFallback, MODEL_CHAINS } = await import("../_shared/ai-gateway.ts");
    let streamBody: ReadableStream<Uint8Array>;
    try {
      const r = await callAIStreamWithFallback({
        ...MODEL_CHAINS.complexReasoning,
        messages: [
          { role: "system", content: systemPrompt },
          ...(messages || []),
        ],
      });
      streamBody = r.body;
      console.log(`[budget-ai-cfo] modelUsed=${r.modelUsed}`);
    } catch (e: any) {
      const msg = e?.message || "";
      if (msg.includes("krediter slut")) return new Response(JSON.stringify({ error: msg }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (msg.includes("autentiseras")) return new Response(JSON.stringify({ error: msg }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      console.error("[budget-ai-cfo] all models failed", e);
      return new Response(JSON.stringify({ error: "AI-tjänsten är överbelastad. Försök igen om en stund." }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(streamBody, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("budget-ai-cfo error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
