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

    const rawInput = await req.json();
    const { company_id, period_year, period_month } = rawInput || {};

    // Validate inputs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!company_id || typeof company_id !== 'string' || !uuidRegex.test(company_id)) {
      return new Response(JSON.stringify({ error: 'Ogiltigt company_id format. UUID krävs.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!period_year || typeof period_year !== 'number' || period_year < 2000 || period_year > 2100) {
      return new Response(JSON.stringify({ error: 'Ogiltigt period_year. Måste vara ett år mellan 2000-2100.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!period_month || typeof period_month !== 'number' || period_month < 1 || period_month > 12) {
      return new Response(JSON.stringify({ error: 'Ogiltigt period_month. Måste vara 1-12.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find approved payroll run for the period
    const periodStart = `${period_year}-${String(period_month).padStart(2, '0')}-01`;
    const lastDay = new Date(period_year, period_month, 0).getDate();
    const periodEnd = `${period_year}-${String(period_month).padStart(2, '0')}-${lastDay}`;

    const { data: payrollRun, error: payrollError } = await supabase
      .from('payroll_runs')
      .select(`
        *,
        payroll_lines(
          *,
          employee:employees(first_name, last_name, personal_number)
        )
      `)
      .eq('company_id', company_id)
      .eq('status', 'approved')
      .gte('period_start', periodStart)
      .lte('period_end', periodEnd)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (payrollError) throw payrollError;

    if (!payrollRun) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Ingen godkänd lönekörning hittades för perioden',
        has_payroll: false,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate summary
    const employees = payrollRun.payroll_lines?.length || 0;
    const totalGross = payrollRun.total_gross || 0;
    const totalTax = payrollRun.total_tax || 0;
    const totalSocialFees = payrollRun.total_employer_cost - totalGross;

    // Create automation task for one-click approval
    const { data: task, error: taskError } = await supabase
      .from('automation_tasks')
      .upsert({
        company_id,
        task_type: 'agi_submission',
        related_entity_type: 'payroll_run',
        related_entity_id: payrollRun.id,
        status: 'ready_for_approval',
        prepared_data: {
          payroll_run_id: payrollRun.id,
          period: `${period_year}-${String(period_month).padStart(2, '0')}`,
          employees,
          total_gross: totalGross,
          total_tax: totalTax,
          total_social_fees: totalSocialFees,
          employee_details: payrollRun.payroll_lines?.map((line: any) => ({
            name: `${line.employee?.first_name} ${line.employee?.last_name}`,
            gross: line.gross_salary,
            tax: line.tax_deduction,
          })),
        },
        approval_summary: `AGI ${period_year}-${String(period_month).padStart(2, '0')}: ${employees} anställda, Bruttolön ${totalGross.toLocaleString('sv-SE')} kr, Skatt ${totalTax.toLocaleString('sv-SE')} kr, Arbetsgivaravgifter ${totalSocialFees.toLocaleString('sv-SE')} kr`,
        requires_approval: true,
      }, {
        onConflict: 'company_id,task_type,related_entity_id'
      })
      .select()
      .maybeSingle();

    if (taskError) throw taskError;

    return new Response(JSON.stringify({
      success: true,
      task,
      summary: {
        period: `${period_year}-${String(period_month).padStart(2, '0')}`,
        employees,
        total_gross: totalGross,
        total_tax: totalTax,
        total_social_fees: totalSocialFees,
        payroll_run_id: payrollRun.id,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in prepare-agi-submission:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
