import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Generate AGI XML file according to Skatteverket format
function generateAGIXML(payrollRun: any): string {
  const company = payrollRun.company;
  const periodStart = new Date(payrollRun.period_start);
  const periodEnd = new Date(payrollRun.period_end);
  
  const year = periodStart.getFullYear();
  const month = String(periodStart.getMonth() + 1).padStart(2, '0');
  
  // Calculate totals
  const totalGross = payrollRun.payroll_lines.reduce((sum: number, line: any) => 
    sum + parseFloat(line.gross_salary || 0), 0);
  const totalTax = payrollRun.payroll_lines.reduce((sum: number, line: any) => 
    sum + parseFloat(line.tax_deduction || 0), 0);
  const totalSocialFees = payrollRun.payroll_lines.reduce((sum: number, line: any) => 
    sum + parseFloat(line.employer_social_fees || 0), 0);

  // Generate individual lines
  const individualLines = payrollRun.payroll_lines.map((line: any, index: number) => {
    const employee = line.employee;
    return `
    <Individuppgift>
      <LopNr>${index + 1}</LopNr>
      <Personnummer>${employee.personal_number.replace('-', '')}</Personnummer>
      <Efternamn>${employee.last_name}</Efternamn>
      <Fornamn>${employee.first_name}</Fornamn>
      <KontantBruttolonMm>${Math.round(parseFloat(line.gross_salary || 0))}</KontantBruttolonMm>
      <Skatteavdrag>${Math.round(parseFloat(line.tax_deduction || 0))}</Skatteavdrag>
      <Arbetsgivaravgift>${Math.round(parseFloat(line.employer_social_fees || 0))}</Arbetsgivaravgift>
      ${line.pension ? `<Tjanstepension>${Math.round(parseFloat(line.pension))}</Tjanstepension>` : ''}
      ${line.vacation_pay ? `<Semesterersattning>${Math.round(parseFloat(line.vacation_pay))}</Semesterersattning>` : ''}
    </Individuppgift>`;
  }).join('');

  // Generate XML according to Skatteverket AGI format
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Arbetsgivardeklaration xmlns="http://xmls.skatteverket.se/se/skatteverket/agi/instans/v8">
  <Avsandare>
    <Organisationsnummer>${company.org_number.replace('-', '')}</Organisationsnummer>
    <Namn>${company.name}</Namn>
  </Avsandare>
  <Redovisningsperiod>
    <ArManad>${year}${month}</ArManad>
  </Redovisningsperiod>
  <Uppgiftslamnare>
    <UppgiftslamnarId>${company.org_number.replace('-', '')}</UppgiftslamnarId>
  </Uppgiftslamnare>
  <Arbetsgivare>
    <Organisationsnummer>${company.org_number.replace('-', '')}</Organisationsnummer>
    <Namn>${company.name}</Namn>
  </Arbetsgivare>
  <Anstallda>
    <AntalAnstallda>${payrollRun.payroll_lines.length}</AntalAnstallda>
    ${individualLines}
  </Anstallda>
  <Summor>
    <SummaKontantBruttolonMm>${Math.round(totalGross)}</SummaKontantBruttolonMm>
    <SummaSkatteavdrag>${Math.round(totalTax)}</SummaSkatteavdrag>
    <SummaArbetsgivaravgift>${Math.round(totalSocialFees)}</SummaArbetsgivaravgift>
  </Summor>
</Arbetsgivardeklaration>`;

  return xml;
}

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

    const { payroll_run_id } = await req.json();

    // CRITICAL: Run database validation before proceeding
    const { data: validationResult, error: validationError } = await supabase
      .rpc('validate_agi_submission', { p_payroll_run_id: payroll_run_id });

    if (validationError) {
      console.error('Validation query failed:', validationError);
      throw new Error('Kunde inte validera AGI-data');
    }

    const validation = validationResult?.[0];
    if (!validation?.is_valid) {
      console.error('AGI validation failed:', validation?.validation_errors);
      throw new Error(`AGI-validering misslyckades: ${validation?.validation_errors?.join(', ') || 'Okänt fel'}`);
    }

    console.log('AGI validation passed:', {
      employee_count: validation.employee_count,
      total_gross: validation.total_gross,
      total_tax: validation.total_tax,
      total_social_fees: validation.total_social_fees
    });

    // Get payroll run with company info
    const { data: payrollRun, error: payrollError } = await supabase
      .from('payroll_runs')
      .select(`
        *,
        company:companies(*),
        payroll_lines(
          *,
          employee:employees(*)
        )
      `)
      .eq('id', payroll_run_id)
      .maybeSingle();

    if (payrollError) throw payrollError;
    if (!payrollRun) {
      throw new Error('Payroll run not found');
    }

    // Additional validation: verify totals match database validation
    const calcGross = payrollRun.payroll_lines.reduce((sum: number, line: any) => 
      sum + parseFloat(line.gross_salary || 0), 0);
    const calcTax = payrollRun.payroll_lines.reduce((sum: number, line: any) => 
      sum + parseFloat(line.tax_deduction || 0), 0);

    if (Math.abs(calcGross - validation.total_gross) > 0.01) {
      throw new Error(`Bruttolön stämmer inte: beräknat ${calcGross}, validerat ${validation.total_gross}`);
    }
    if (Math.abs(calcTax - validation.total_tax) > 0.01) {
      throw new Error(`Skatteavdrag stämmer inte: beräknat ${calcTax}, validerat ${validation.total_tax}`);
    }

    // Generate AGI XML file locally
    const agiXml = generateAGIXML(payrollRun);
    console.log('Generated AGI XML:', agiXml.substring(0, 500));

    const company_id = payrollRun.company_id;

    // Get OAuth token
    const { data: authData, error: authError } = await supabase.functions.invoke('skatteverket-oauth', {
      body: { company_id },
      headers: { Authorization: authHeader },
    });

    if (authError || !authData) {
      throw new Error('Failed to get OAuth token');
    }

    const { access_token, base_url } = authData;

    // Get or create AGI period
    const periodStart = new Date(payrollRun.period_start);
    const period_year = periodStart.getFullYear();
    const period_month = periodStart.getMonth() + 1;

    const { data: period } = await supabase
      .from('agi_periods')
      .select('*')
      .eq('company_id', company_id)
      .eq('period_year', period_year)
      .eq('period_month', period_month)
      .maybeSingle();

    if (!period) {
      throw new Error('AGI period not found. Create period first.');
    }

    // Submit AGI file with XML data
    const submitResponse = await fetch(
      `${base_url}/api/v1/agi/periods/${period.skatteverket_period_id}/submit`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/xml',
        },
        body: agiXml,
      }
    );

    if (!submitResponse.ok) {
      const error = await submitResponse.text();
      console.error('Skatteverket AGI submission error:', error);
      throw new Error(`Failed to submit AGI: ${submitResponse.status} - ${error}`);
    }

    const responseData = await submitResponse.json();

    // Update period status
    await supabase
      .from('agi_periods')
      .update({ 
        status: 'submitted',
        payroll_run_id: payroll_run_id 
      })
      .eq('id', period.id);

    // Store submission record
    const { data: submission, error: submissionError } = await supabase
      .from('agi_submissions')
      .insert({
        company_id,
        agi_period_id: period.id,
        payroll_run_id,
        submission_type: 'complete',
        status: 'submitted',
        skatteverket_reference: responseData.reference || responseData.submission_id,
        submission_data: { xml_length: agiXml.length },
        response_data: responseData,
        submitted_at: new Date().toISOString(),
        submitted_by: user.id
      })
      .select()
      .maybeSingle();

    if (submissionError) {
      throw new Error(`Database error: ${submissionError.message}`);
    }

    return new Response(JSON.stringify(submission), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in skatteverket-agi-submit:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});