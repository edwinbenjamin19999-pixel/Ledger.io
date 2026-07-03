import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { callAIWithFallback, MODEL_CHAINS } from "../_shared/ai-gateway.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Unauthorized');

    const { company_id, fiscal_year } = await req.json();

    // Fetch company info
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*, company_settings(*)')
      .eq('id', company_id)
      .maybeSingle();

    if (companyError || !company) throw new Error('Company not found');

    const settings = company.company_settings?.[0] || { fiscal_year_start: 1, fiscal_year_end: 12 };
    const fiscalYearStart = `${fiscal_year}-${String(settings.fiscal_year_start).padStart(2, '0')}-01`;
    const fiscalYearEnd = settings.fiscal_year_end === 12
      ? `${fiscal_year}-12-31`
      : `${fiscal_year + 1}-${String(settings.fiscal_year_end).padStart(2, '0')}-${new Date(fiscal_year + 1, settings.fiscal_year_end, 0).getDate()}`;

    // Fetch all approved journal entries for the fiscal year
    const { data: entries, error: entriesError } = await supabase
      .from('journal_entry_lines')
      .select(`
        debit, credit,
        account:chart_of_accounts(account_number, account_name, account_type),
        journal_entry:journal_entries!inner(entry_date, company_id, status)
      `)
      .eq('journal_entry.company_id', company_id)
      .eq('journal_entry.status', 'approved')
      .gte('journal_entry.entry_date', fiscalYearStart)
      .lte('journal_entry.entry_date', fiscalYearEnd);

    if (entriesError) throw entriesError;

    // Calculate P&L
    let totalRevenue = 0;
    let totalCogs = 0;
    let totalOpex = 0;
    let totalFinancial = 0;
    let totalDepreciation = 0;
    const accountBreakdown: Record<string, { name: string; balance: number }> = {};

    for (const entry of entries || []) {
      const num = entry.account?.account_number || '0';
      const balance = (entry.debit || 0) - (entry.credit || 0);
      const first = num.charAt(0);

      if (!accountBreakdown[num]) {
        accountBreakdown[num] = { name: entry.account?.account_name || '', balance: 0 };
      }
      accountBreakdown[num].balance += balance;

      switch (first) {
        case '3': totalRevenue += -balance; break;
        case '4': totalCogs += balance; break;
        case '5': case '6': totalOpex += balance; break;
        case '7':
          totalOpex += balance;
          if (num.startsWith('78')) totalDepreciation += balance;
          break;
        case '8': totalFinancial += balance; break;
      }
    }

    const grossProfit = totalRevenue - totalCogs;
    const operatingProfit = grossProfit - totalOpex;
    const profitBeforeTax = operatingProfit - totalFinancial;

    // --- Swedish Corporate Tax Calculation ---
    const CORPORATE_TAX_RATE = 0.206;
    const MAX_PERIODIZATION_RATE = 0.25; // 25% of profit before tax
    const PERIODIZATION_TAX_DISCOUNT = 0.794; // Effective 79.4% of SLR on periodized amount

    // Calculate standard tax
    const standardTax = Math.max(0, profitBeforeTax * CORPORATE_TAX_RATE);
    const netProfitStandard = profitBeforeTax - standardTax;

    // --- AI-based optimization ---
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    let aiOptimizations: any[] = [];
    let aiSummary = '';

    if (LOVABLE_API_KEY && profitBeforeTax > 0) {
      try {
        const aiPrompt = `Du är en svensk skatteexpert. Analysera följande resultat för ett aktiebolag och ge konkreta optimeringsförslag.

EKONOMISK DATA (${fiscal_year}):
- Nettoomsättning: ${totalRevenue.toLocaleString('sv-SE')} kr
- Bruttovinst: ${grossProfit.toLocaleString('sv-SE')} kr
- Rörelseresultat: ${operatingProfit.toLocaleString('sv-SE')} kr  
- Avskrivningar: ${totalDepreciation.toLocaleString('sv-SE')} kr
- Resultat före skatt: ${profitBeforeTax.toLocaleString('sv-SE')} kr
- Bolagsskatt (20.6%): ${standardTax.toLocaleString('sv-SE')} kr
- Bransch: ${company.industry || 'ej angiven'}
- Land: Sverige

Ge optimeringsförslag med fokus på:
1. Periodiseringsfonder (max 25% av vinst, 6 års återföring)
2. Koncernbidrag (om tillämpligt)
3. Avsättning för framtida utgifter
4. Överavskrivningar på inventarier (30-regeln / 20-regeln)
5. Räntefördelning för enskild firma (om tillämpligt)
6. Forskningsavdrag om R&D-kostnader finns

Svara BARA med giltig JSON (ingen markdown) i detta format:
{
  "optimizations": [
    {
      "type": "periodiseringsfond|overavskrivning|koncernbidrag|avsattning|forskningsavdrag|annat",
      "title": "Kort titel",
      "description": "Beskrivning av åtgärden",
      "estimated_tax_savings": 12345,
      "amount_to_allocate": 50000,
      "risk_level": "low|medium|high",
      "legal_reference": "IL kap:paragraf",
      "auto_applicable": true,
      "debit_account": "8811",
      "debit_account_name": "Avsättning till periodiseringsfond",
      "credit_account": "2128",
      "credit_account_name": "Periodiseringsfond"
    }
  ],
  "summary": "Kort sammanfattning av optimeringsmöjligheter",
  "total_potential_savings": 12345,
  "recommended_taxable_income": 100000
}

VIKTIGT: Sätt auto_applicable=true BARA för åtgärder som kan bokföras direkt med en enkel verifikation (t.ex. periodiseringsfond, överavskrivning). Inkludera alltid debit_account/credit_account med korrekta BAS-kontonummer för auto_applicable-förslag. För manuella åtgärder (koncernbidrag, forskningsavdrag etc.) sätt auto_applicable=false.`;

        try {
          const { data: aiData, modelUsed } = await callAIWithFallback({
            ...MODEL_CHAINS.precisionReasoning,
            messages: [
              { role: 'system', content: 'Du är en svensk skatteexpert specialiserad på bolagsskatt och skatteoptimering. Svara alltid med giltig JSON utan markdown-formatering.' },
              { role: 'user', content: aiPrompt },
            ],
          });
          console.log(`[calculate-corporate-tax] modelUsed=${modelUsed}`);
          const content = aiData.choices?.[0]?.message?.content || '';
          const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          try {
            const parsed = JSON.parse(cleaned);
            aiOptimizations = parsed.optimizations || [];
            aiSummary = parsed.summary || '';
          } catch (parseErr) {
            console.error('Failed to parse AI response:', parseErr, content);
          }
        } catch (aiErr) {
          console.warn('[calculate-corporate-tax] AI fallback chain exhausted, using rule-based only:', aiErr);
        }
      } catch (aiErr) {
        console.error('AI optimization error:', aiErr);
      }
    }

    // --- Rule-based fallback optimization (always runs) ---
    const ruleBasedOptimizations: any[] = [];

    // 1. Periodiseringsfond
    if (profitBeforeTax > 0) {
      const maxPeriodization = Math.floor(profitBeforeTax * MAX_PERIODIZATION_RATE);
      const periodizationSavings = Math.floor(maxPeriodization * CORPORATE_TAX_RATE);
      ruleBasedOptimizations.push({
        type: 'periodiseringsfond',
        title: 'Avsättning till periodiseringsfond',
        description: `Sätt av upp till 25% av vinsten (${maxPeriodization.toLocaleString('sv-SE')} kr) till periodiseringsfond. Återföring inom 6 år. Effektiv skattekrediteffekt.`,
        estimated_tax_savings: periodizationSavings,
        amount_to_allocate: maxPeriodization,
        risk_level: 'low',
        legal_reference: 'IL 30 kap',
        auto_applicable: true,
      });
    }

    // 2. Överavskrivningar (30-regeln)
    if (totalDepreciation > 0) {
      const extraDepreciation = Math.floor(totalDepreciation * 0.1); // rough estimate
      const depSavings = Math.floor(extraDepreciation * CORPORATE_TAX_RATE);
      if (depSavings > 100) {
        ruleBasedOptimizations.push({
          type: 'overavskrivning',
          title: 'Överavskrivning inventarier (30-regeln)',
          description: `Kontrollera om ytterligare avskrivning kan göras enligt 30-regeln (räkenskapsenlig avskrivning). Maximal avskrivning: 30% av bokfört värde vid årets början.`,
          estimated_tax_savings: depSavings,
          amount_to_allocate: extraDepreciation,
          risk_level: 'low',
          legal_reference: 'IL 18 kap 13§',
          auto_applicable: false,
        });
      }
    }

    // Merge: AI optimizations take precedence, add rule-based ones that aren't duplicated
    const finalOptimizations = aiOptimizations.length > 0 ? aiOptimizations : [];
    const existingTypes = new Set(finalOptimizations.map((o: any) => o.type));
    for (const rb of ruleBasedOptimizations) {
      if (!existingTypes.has(rb.type)) {
        finalOptimizations.push(rb);
      }
    }

    // Calculate optimized tax
    const totalPotentialSavings = finalOptimizations.reduce(
      (sum: number, o: any) => sum + (o.estimated_tax_savings || 0), 0
    );
    const optimizedTax = Math.max(0, standardTax - totalPotentialSavings);
    const optimizedNetProfit = profitBeforeTax - optimizedTax;

    return new Response(JSON.stringify({
      success: true,
      fiscal_year,
      financials: {
        total_revenue: totalRevenue,
        gross_profit: grossProfit,
        operating_profit: operatingProfit,
        depreciation: totalDepreciation,
        profit_before_tax: profitBeforeTax,
      },
      tax_calculation: {
        corporate_tax_rate: CORPORATE_TAX_RATE,
        standard_tax: standardTax,
        net_profit_standard: netProfitStandard,
        optimized_tax: optimizedTax,
        optimized_net_profit: optimizedNetProfit,
        total_potential_savings: totalPotentialSavings,
      },
      optimizations: finalOptimizations,
      ai_summary: aiSummary,
      ai_powered: aiOptimizations.length > 0,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in calculate-corporate-tax:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
