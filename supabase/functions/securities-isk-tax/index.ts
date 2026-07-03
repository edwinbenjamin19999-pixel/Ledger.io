// Calculate ISK schablonskatt for a given account & year and store result
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SLR_30_NOV: Record<number, number> = {
  2020: -0.0010, 2021: 0.0023, 2022: 0.0194, 2023: 0.0262, 2024: 0.0262,
};
const FLOOR = 0.0125;
const TAX_RATE = 0.30;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { account_id, tax_year, q1, q2, q3, q4, deposits } = await req.json();
    if (!account_id || !tax_year) {
      return new Response(JSON.stringify({ error: 'account_id and tax_year required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: account } = await supabase
      .from('securities_accounts')
      .select('company_id, account_type')
      .eq('id', account_id)
      .single();

    if (!account || account.account_type !== 'isk') {
      return new Response(JSON.stringify({ error: 'Account is not an ISK' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const slr = SLR_30_NOV[tax_year - 1] ?? 0.0262;
    const schablonRate = Math.max(slr + 0.01, FLOOR);
    const quarterlySum = (q1 ?? 0) + (q2 ?? 0) + (q3 ?? 0) + (q4 ?? 0);
    const capitalBase = (quarterlySum + (deposits ?? 0)) / 4;
    const schablonIncome = capitalBase * schablonRate;
    const taxAmount = schablonIncome * TAX_RATE;

    const { data: result, error } = await supabase
      .from('securities_tax_calculations')
      .insert({
        company_id: account.company_id,
        securities_account_id: account_id,
        tax_year,
        calculation_type: 'isk_schablon',
        capital_base: Math.round(capitalBase),
        tax_rate: schablonRate,
        tax_amount: Math.round(taxAmount),
        calculation_data: { q1, q2, q3, q4, deposits, slr, schablonIncome },
        status: 'final',
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, calculation: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
