import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Skatteverket Inkomstdeklaration 2-4 API 1.0 (Partner-API)
 * Digitalt inlämning av bolagsdeklaration (INK2) och andra deklarationstyper.
 * 
 * INK2 = Aktiebolag
 * INK3 = Handelsbolag/kommanditbolag  
 * INK4 = Ekonomisk förening
 */

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

    const { company_id, action = 'prepare', fiscal_year } = await req.json();

    // Get company details
    const { data: company } = await supabase
      .from('companies')
      .select('*')
      .eq('id', company_id)
      .maybeSingle();

    if (!company) throw new Error('Company not found');

    if (action === 'prepare') {
      // Gather all financial data for the declaration
      const year = fiscal_year || new Date().getFullYear() - 1;
      
      // Get income statement data
      const { data: entries } = await supabase
        .from('journal_entry_lines')
        .select(`
          debit, credit,
          account:chart_of_accounts(account_number, account_name, account_type),
          journal_entry:journal_entries!inner(entry_date, company_id, status)
        `)
        .eq('journal_entry.company_id', company_id)
        .eq('journal_entry.status', 'approved')
        .gte('journal_entry.entry_date', `${year}-01-01`)
        .lte('journal_entry.entry_date', `${year}-12-31`);

      // Calculate INK2 fields
      const accounts: Record<string, { debit: number; credit: number }> = {};
      for (const entry of (entries || []) as any[]) {
        const accNum = entry.account?.account_number || '';
        if (!accounts[accNum]) accounts[accNum] = { debit: 0, credit: 0 };
        accounts[accNum].debit += entry.debit || 0;
        accounts[accNum].credit += entry.credit || 0;
      }

      // Revenue (3xxx accounts)
      let totalRevenue = 0;
      let totalExpenses = 0;
      let totalAssets = 0;
      let totalLiabilities = 0;
      let totalEquity = 0;

      for (const [accNum, bal] of Object.entries(accounts)) {
        const net = bal.credit - bal.debit;
        if (accNum.startsWith('3')) totalRevenue += net;
        else if (accNum.startsWith('4') || accNum.startsWith('5') || accNum.startsWith('6') || accNum.startsWith('7')) totalExpenses += Math.abs(net);
        else if (accNum.startsWith('1')) totalAssets += bal.debit - bal.credit;
        else if (accNum.startsWith('2') && !accNum.startsWith('20') && !accNum.startsWith('21')) totalLiabilities += net;
        else if (accNum.startsWith('20') || accNum.startsWith('21')) totalEquity += net;
      }

      // Financial items (8xxx)
      let financialIncome = 0;
      let financialExpenses = 0;
      for (const [accNum, bal] of Object.entries(accounts)) {
        if (accNum >= '8000' && accNum <= '8499') financialIncome += bal.credit - bal.debit;
        if (accNum >= '8500' && accNum <= '8899') financialExpenses += bal.debit - bal.credit;
      }

      const resultBeforeTax = totalRevenue - totalExpenses + financialIncome - financialExpenses;
      const corporateTax = Math.max(0, resultBeforeTax * 0.206);
      const resultAfterTax = resultBeforeTax - corporateTax;

      // Prepare INK2 declaration data
      const declarationData = {
        company_id,
        org_number: company.org_number,
        fiscal_year: year,
        declaration_type: 'INK2',
        // Income statement
        field_3_1: Math.round(totalRevenue), // Nettoomsättning
        field_3_5: Math.round(totalExpenses), // Rörelsens kostnader
        field_3_6: Math.round(totalRevenue - totalExpenses), // Rörelseresultat
        field_3_7: Math.round(financialIncome), // Finansiella intäkter
        field_3_8: Math.round(financialExpenses), // Finansiella kostnader
        field_3_9: Math.round(resultBeforeTax), // Resultat efter finansiella poster
        field_3_10: Math.round(corporateTax), // Skatt på årets resultat (20.6%)
        field_3_11: Math.round(resultAfterTax), // Årets resultat
        // Balance sheet
        field_4_1: Math.round(totalAssets), // Summa tillgångar
        field_4_7: Math.round(totalEquity), // Eget kapital
        field_4_12: Math.round(totalLiabilities), // Summa skulder
        // Tax calculation
        field_5_1: Math.round(resultBeforeTax), // Bokfört resultat
        field_5_final: Math.round(corporateTax), // Beräknad skatt (20.6%)
        status: 'prepared',
        prepared_at: new Date().toISOString(),
        prepared_by: user.id,
      };

      // Create automation task
      await supabase
        .from('automation_tasks')
        .upsert({
          company_id,
          task_type: 'income_declaration',
          related_entity_type: 'income_declaration',
          related_entity_id: company_id,
          status: 'ready_for_approval',
          prepared_data: declarationData,
          approval_summary: `INK2 ${year}: Resultat ${resultAfterTax >= 0 ? '+' : ''}${Math.round(resultAfterTax).toLocaleString('sv-SE')} kr, Skatt ${Math.round(corporateTax).toLocaleString('sv-SE')} kr`,
          requires_approval: true,
        }, {
          onConflict: 'company_id,task_type,related_entity_id'
        });

      return new Response(JSON.stringify({
        success: true,
        action: 'prepare',
        declaration: declarationData,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'submit') {
      // Submit to Skatteverket (requires Partner API agreement)
      const { data: authData } = await supabase.functions.invoke('skatteverket-oauth', {
        body: { company_id },
        headers: { Authorization: authHeader },
      });

      if (!authData?.access_token) {
        throw new Error('Skatteverket Partner-API krävs för att skicka in deklaration. Kontakta support för aktivering.');
      }

      // Build XML for INK2
      // This would follow Skatteverket's XML schema for Inkomstdeklaration 2
      return new Response(JSON.stringify({
        success: false,
        error: 'Digital inlämning av INK2 kräver aktivt Partner-avtal med Skatteverket. Deklarationen kan förberedas och exporteras som PDF.',
        prepared: true,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('Error in skatteverket-income-declaration:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
