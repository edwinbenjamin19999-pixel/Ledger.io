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
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { company_id, period_year, period_month, action } = await req.json();

    // Get OAuth token
    const { data: authData, error: authError } = await supabase.functions.invoke('skatteverket-oauth', {
      body: { company_id },
      headers: { Authorization: authHeader },
    });

    if (authError || !authData) {
      throw new Error('Failed to get OAuth token');
    }

    const { access_token, base_url } = authData;

    if (action === 'create') {
      // Create or open reporting period
      const periodResponse = await fetch(`${base_url}/api/v1/agi/periods`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          year: period_year,
          month: period_month,
          period_type: 'monthly'
        }),
      });

      if (!periodResponse.ok) {
        const error = await periodResponse.text();
        console.error('Skatteverket period creation error:', error);
        throw new Error(`Failed to create period: ${periodResponse.status}`);
      }

      const periodData = await periodResponse.json();

      // Store in database
      const { data: dbPeriod, error: dbError } = await supabase
        .from('agi_periods')
        .upsert({
          company_id,
          period_year,
          period_month,
          status: 'open',
          skatteverket_period_id: periodData.period_id
        }, {
          onConflict: 'company_id,period_year,period_month'
        })
        .select()
        .maybeSingle();

      if (dbError) {
        throw new Error(`Database error: ${dbError.message}`);
      }

      return new Response(JSON.stringify(dbPeriod), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'list') {
      // List periods
      const { data: periods, error: periodsError } = await supabase
        .from('agi_periods')
        .select('*')
        .eq('company_id', company_id)
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false });

      if (periodsError) {
        throw new Error(`Database error: ${periodsError.message}`);
      }

      return new Response(JSON.stringify(periods), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('Error in skatteverket-agi-period:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});