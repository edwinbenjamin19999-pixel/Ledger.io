import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Unauthorized');

    const { company_id, fiscal_year } = await req.json();
    if (!company_id || !fiscal_year) throw new Error('company_id and fiscal_year required');

    // 1. Get company info
    const { data: company, error: companyErr } = await supabase
      .from('companies')
      .select('*, company_settings(*)')
      .eq('id', company_id)
      .maybeSingle();
    if (companyErr || !company) throw new Error('Company not found');

    const settings = company.company_settings?.[0] || { fiscal_year_start: 1, fiscal_year_end: 12 };
    const fyStart = `${fiscal_year}-${String(settings.fiscal_year_start).padStart(2, '0')}-01`;
    const fyEnd = settings.fiscal_year_end === 12
      ? `${fiscal_year}-12-31`
      : `${fiscal_year + 1}-${String(settings.fiscal_year_end).padStart(2, '0')}-${new Date(fiscal_year + 1, settings.fiscal_year_end, 0).getDate()}`;

    // 2. Get journal entry lines for the fiscal year
    const { data: entries, error: entriesErr } = await supabase
      .from('journal_entry_lines')
      .select(`
        debit, credit,
        account:chart_of_accounts(account_number, account_name, account_type),
        journal_entry:journal_entries!inner(entry_date, company_id, status)
      `)
      .eq('journal_entry.company_id', company_id)
      .eq('journal_entry.status', 'approved')
      .gte('journal_entry.entry_date', fyStart)
      .lte('journal_entry.entry_date', fyEnd);
    if (entriesErr) throw entriesErr;

    // 3. Aggregate account balances
    const accountBalances: Record<string, { number: string; name: string; debit: number; credit: number; balance: number }> = {};
    for (const e of (entries || []) as any[]) {
      const num = e.account?.account_number || '0000';
      if (!accountBalances[num]) {
        accountBalances[num] = { number: num, name: e.account?.account_name || '', debit: 0, credit: 0, balance: 0 };
      }
      accountBalances[num].debit += e.debit || 0;
      accountBalances[num].credit += e.credit || 0;
      accountBalances[num].balance = accountBalances[num].debit - accountBalances[num].credit;
    }

    // 4. Get employees count
    const { count: employeeCount } = await supabase
      .from('employees')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', company_id)
      .eq('is_active', true);

    // 5. Get fixed assets
    const { data: fixedAssets } = await supabase
      .from('fixed_assets')
      .select('*')
      .eq('company_id', company_id)
      .eq('is_active', true);

    // 6. Get invoices summary
    const { data: invoices } = await supabase
      .from('invoices')
      .select('total_amount, vat_amount, status, invoice_direction')
      .eq('company_id', company_id)
      .gte('invoice_date', fyStart)
      .lte('invoice_date', fyEnd);

    // Build financial summary for AI
    const totalRevenue = Object.values(accountBalances)
      .filter(a => a.number.startsWith('3'))
      .reduce((sum, a) => sum + Math.abs(a.balance), 0);

    const totalPersonnel = Object.values(accountBalances)
      .filter(a => a.number.startsWith('7'))
      .reduce((sum, a) => sum + a.balance, 0);

    const totalAssets = Object.values(accountBalances)
      .filter(a => a.number.startsWith('1'))
      .reduce((sum, a) => sum + a.balance, 0);

    const totalEquity = Object.values(accountBalances)
      .filter(a => a.number >= '2000' && a.number < '2100')
      .reduce((sum, a) => sum + Math.abs(a.balance), 0);

    const totalLiabilities = Object.values(accountBalances)
      .filter(a => a.number >= '2100' && a.number < '3000')
      .reduce((sum, a) => sum + Math.abs(a.balance), 0);

    const unpaidReceivables = invoices?.filter(i => i.invoice_direction === 'outgoing' && i.status !== 'paid')
      .reduce((sum, i) => sum + (i.total_amount || 0), 0) || 0;

    const financialContext = {
      company_name: company.name,
      org_number: company.org_number,
      industry: company.industry || 'general',
      fiscal_year,
      fiscal_year_start: fyStart,
      fiscal_year_end: fyEnd,
      total_revenue: totalRevenue,
      total_personnel_costs: totalPersonnel,
      total_assets: totalAssets,
      total_equity: totalEquity,
      total_liabilities: totalLiabilities,
      employee_count: employeeCount || 0,
      fixed_assets_count: fixedAssets?.length || 0,
      fixed_assets_total: fixedAssets?.reduce((s, a) => s + (a.acquisition_cost || 0), 0) || 0,
      unpaid_receivables: unpaidReceivables,
      has_vat: Object.keys(accountBalances).some(k => k.startsWith('26')),
      account_summary: Object.values(accountBalances)
        .filter(a => Math.abs(a.balance) > 0)
        .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
        .slice(0, 30)
        .map(a => `${a.number} ${a.name}: ${a.balance.toLocaleString('sv-SE')} kr`),
    };

    // 7. Call Lovable AI to generate notes
    let aiNotes: any = null;

    if (LOVABLE_API_KEY) {
      const systemPrompt = `Du är en svensk redovisningsexpert som genererar noter till årsredovisningar enligt K2 (BFNAR 2016:10) och årsredovisningslagen (ÅRL).

Generera kompletta, relevanta noter baserat på företagets finansiella data. Noterna ska vara anpassade efter företagets verksamhet och bransch.

Svara med tool_call.`;

      const userPrompt = `Generera noter och tilläggsupplysningar för ${financialContext.company_name} (${financialContext.org_number}), räkenskapsår ${fiscal_year}.

Bransch: ${financialContext.industry}
Omsättning: ${financialContext.total_revenue.toLocaleString('sv-SE')} kr
Personalkostnader: ${financialContext.total_personnel_costs.toLocaleString('sv-SE')} kr
Tillgångar: ${financialContext.total_assets.toLocaleString('sv-SE')} kr
Eget kapital: ${financialContext.total_equity.toLocaleString('sv-SE')} kr
Skulder: ${financialContext.total_liabilities.toLocaleString('sv-SE')} kr
Antal anställda: ${financialContext.employee_count}
Anläggningstillgångar: ${financialContext.fixed_assets_count} st, totalt ${financialContext.fixed_assets_total.toLocaleString('sv-SE')} kr
Obetalda kundfordringar: ${financialContext.unpaid_receivables.toLocaleString('sv-SE')} kr
Moms registrerad: ${financialContext.has_vat ? 'Ja' : 'Nej'}

Kontosaldon (topp 30):
${financialContext.account_summary.join('\n')}

Generera relevanta noter anpassade efter denna verksamhet.`;

      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            tools: [{
              type: "function",
              function: {
                name: "generate_notes",
                description: "Generate structured annual report notes",
                parameters: {
                  type: "object",
                  properties: {
                    notes: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          note_number: { type: "integer", description: "Note number (1-based)" },
                          title: { type: "string", description: "Note title in Swedish" },
                          category: { type: "string", enum: ["accounting_principles", "balance_sheet", "income_statement", "other", "personnel", "tax", "events_after_fy"] },
                          content: { type: "string", description: "Full note text in Swedish, professional K2-level language" },
                          legal_reference: { type: "string", description: "Reference to ÅRL chapter/paragraph or K2 chapter" },
                          is_mandatory: { type: "boolean", description: "Whether this note is legally required" },
                        },
                        required: ["note_number", "title", "category", "content", "legal_reference", "is_mandatory"],
                        additionalProperties: false,
                      },
                    },
                    summary: { type: "string", description: "Brief summary of notes generated and why they are relevant" },
                  },
                  required: ["notes", "summary"],
                  additionalProperties: false,
                },
              },
            }],
            tool_choice: { type: "function", function: { name: "generate_notes" } },
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall?.function?.arguments) {
            aiNotes = JSON.parse(toolCall.function.arguments);
          }
        } else if (aiResponse.status === 429) {
          console.warn("AI rate limited, using fallback notes");
        } else if (aiResponse.status === 402) {
          console.warn("AI payment required, using fallback notes");
        }
      } catch (aiErr) {
        console.error("AI error:", aiErr);
      }
    }

    // 8. Fallback notes if AI fails
    if (!aiNotes) {
      aiNotes = {
        summary: "Standardnoter genererade baserat på företagets data (AI ej tillgänglig).",
        notes: [
          {
            note_number: 1,
            title: "Redovisningsprinciper",
            category: "accounting_principles",
            content: `Årsredovisningen är upprättad enligt årsredovisningslagen och BFNAR 2016:10 Årsredovisning i mindre företag (K2). Alla belopp anges i svenska kronor (SEK).`,
            legal_reference: "ÅRL 2 kap 2§, BFNAR 2016:10 kap 2",
            is_mandatory: true,
          },
          {
            note_number: 2,
            title: "Medelantal anställda",
            category: "personnel",
            content: `Medelantal anställda under räkenskapsåret uppgick till ${financialContext.employee_count} personer.`,
            legal_reference: "ÅRL 5 kap 20§",
            is_mandatory: financialContext.employee_count > 0,
          },
          {
            note_number: 3,
            title: "Anläggningstillgångar",
            category: "balance_sheet",
            content: `Materiella anläggningstillgångar värderas till anskaffningsvärde med avdrag för ackumulerade avskrivningar enligt plan. Avskrivning sker linjärt över den beräknade nyttjandeperioden.${financialContext.fixed_assets_count > 0 ? ` Antal anläggningstillgångar: ${financialContext.fixed_assets_count} st, anskaffningsvärde ${financialContext.fixed_assets_total.toLocaleString('sv-SE')} kr.` : ''}`,
            legal_reference: "ÅRL 4 kap 4§, BFNAR 2016:10 kap 10",
            is_mandatory: financialContext.fixed_assets_count > 0,
          },
          {
            note_number: 4,
            title: "Kundfordringar",
            category: "balance_sheet",
            content: `Kundfordringar värderas individuellt till det belopp som beräknas inflyta. Obetalda kundfordringar per balansdagen uppgick till ${financialContext.unpaid_receivables.toLocaleString('sv-SE')} kr.`,
            legal_reference: "ÅRL 4 kap 9§",
            is_mandatory: financialContext.unpaid_receivables > 0,
          },
          {
            note_number: 5,
            title: "Väsentliga händelser efter räkenskapsårets slut",
            category: "events_after_fy",
            content: "Inga väsentliga händelser har inträffat efter räkenskapsårets slut som påverkar bedömningen av företagets ställning.",
            legal_reference: "ÅRL 5 kap 22§",
            is_mandatory: true,
          },
        ],
      };
    }

    // 9. Optionally update the annual_reports table with notes
    const { data: existingReport } = await supabase
      .from('annual_reports')
      .select('id')
      .eq('company_id', company_id)
      .eq('fiscal_year', fiscal_year)
      .maybeSingle();

    if (existingReport) {
      await supabase
        .from('annual_reports')
        .update({ notes: aiNotes })
        .eq('id', existingReport.id);
    }

    return new Response(JSON.stringify({
      success: true,
      notes: aiNotes.notes,
      summary: aiNotes.summary,
      company_name: company.name,
      fiscal_year,
      financial_context: {
        total_revenue: financialContext.total_revenue,
        employee_count: financialContext.employee_count,
        fixed_assets_count: financialContext.fixed_assets_count,
        industry: financialContext.industry,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-ai-notes:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
