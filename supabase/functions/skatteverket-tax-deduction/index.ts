import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Skatteverket "Fråga om skatteavdrag" API 2.0 (Partner-API)
 * Beräknar korrekt preliminärskatt per anställd baserat på:
 * - Bruttolön
 * - Skattetabell (baserat på kommun)
 * - Kolumn (1-6 beroende på ålder/pension etc.)
 * 
 * Fallback: Använder öppna data-skattetabeller om Partner-API inte är tillgängligt
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

    const { 
      company_id,
      gross_salary,
      table_number,
      column = 1,
      municipality,
      year = new Date().getFullYear(),
    } = await req.json();

    if (!gross_salary) throw new Error('gross_salary is required');

    let taxDeduction = 0;
    let method = 'open_data_fallback';

    // Try Partner API first (requires agreement with Skatteverket)
    try {
      const { data: authData } = await supabase.functions.invoke('skatteverket-oauth', {
        body: { company_id },
        headers: { Authorization: authHeader },
      });

      if (authData?.access_token) {
        const { access_token, base_url } = authData;
        
        const response = await fetch(`${base_url}/api/skatteavdrag/v2/berakna`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            bruttolon: gross_salary,
            tabellnummer: table_number,
            kolumn: column,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          taxDeduction = result.skatteavdrag || result.preliminar_skatt || 0;
          method = 'partner_api';
        }
      }
    } catch (e) {
      console.log('Partner API not available, using open data fallback');
    }

    // Fallback: Use open data tax tables
    if (method === 'open_data_fallback') {
      let effectiveTableNumber = table_number;

      // If no table number, look up from municipality
      if (!effectiveTableNumber && municipality) {
        const taxRatesUrl = `https://skatteverket.entryscape.net/rowstore/dataset/c67b320b-ffee-4876-b073-dd9236cd2a99?kommun=${encodeURIComponent(municipality.toUpperCase())}&år=${year}&_limit=1`;
        const taxRatesResponse = await fetch(taxRatesUrl, {
          headers: { 'Accept': 'application/json' },
        });
        
        if (taxRatesResponse.ok) {
          const taxRatesData = await taxRatesResponse.json();
          if (taxRatesData.results?.length > 0) {
            const totalTax = parseFloat(taxRatesData.results[0]['summa, exkl. kyrkoavgift'] || '0');
            // Map total tax rate to approximate table number
            effectiveTableNumber = Math.round(totalTax).toString();
          }
        }
      }

      if (!effectiveTableNumber) {
        effectiveTableNumber = '33'; // Default to table 33 (national average ~33%)
      }

      // Fetch the tax table for the specific salary bracket
      const taxTableUrl = `https://skatteverket.entryscape.net/rowstore/dataset/805f5a46-dbca-4a72-aeea-dbdda1bf791b?tabellnr=${effectiveTableNumber}&år=${year}&_limit=500`;
      const taxTableResponse = await fetch(taxTableUrl, {
        headers: { 'Accept': 'application/json' },
      });

      if (taxTableResponse.ok) {
        const taxTableData = await taxTableResponse.json();
        const rows = taxTableData.results || [];
        
        // Filter to monthly (30B) and find the salary bracket
        const monthlyRows = rows.filter((r: any) => r['antal dgr'] === '30B');
        
        for (const row of monthlyRows) {
          const from = parseInt(row['inkomst fr.o.m.'] || '0');
          const to = parseInt(row['inkomst t.o.m.'] || '999999');
          
          if (gross_salary >= from && gross_salary <= to) {
            const colKey = `kolumn ${column}`;
            taxDeduction = parseInt(row[colKey] || '0');
            break;
          }
        }
      }

      // If still no result, use simple percentage calculation as last resort
      if (taxDeduction === 0 && gross_salary > 2000) {
        // Approximate: ~30% for average income
        const approxRate = gross_salary > 50000 ? 0.52 : gross_salary > 35000 ? 0.35 : 0.30;
        taxDeduction = Math.round(gross_salary * approxRate);
        method = 'approximation';
      }
    }

    const netSalary = gross_salary - taxDeduction;
    const effectiveRate = gross_salary > 0 ? (taxDeduction / gross_salary * 100).toFixed(1) : '0';

    return new Response(JSON.stringify({
      success: true,
      method,
      gross_salary,
      tax_deduction: taxDeduction,
      net_salary: netSalary,
      effective_rate: parseFloat(effectiveRate),
      table_number: table_number || 'auto',
      column,
      year,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in skatteverket-tax-deduction:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
