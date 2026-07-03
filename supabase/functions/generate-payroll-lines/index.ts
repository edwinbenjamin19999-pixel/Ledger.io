import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders, handleCors } from "../_shared/cors.ts";

// Get current tax year
const getCurrentTaxYear = (): number => {
  return new Date().getFullYear();
};

// Fetch tax rules from database
const getTaxRules = async (supabase: any, year: number, ruleType: string, municipality: string | null = null) => {
  const query = supabase
    .from('tax_rules')
    .select('*')
    .eq('year', year)
    .eq('rule_type', ruleType)
    .lte('effective_from', new Date().toISOString().split('T')[0]);

  if (municipality) {
    query.eq('municipality', municipality.toLowerCase());
  } else {
    query.is('municipality', null);
  }

  const { data, error } = await query.order('effective_from', { ascending: false }).limit(1);
  
  if (error) {
    console.error('Error fetching tax rules:', error);
    return null;
  }
  
  return data?.[0] || null;
};

// Swedish tax calculation using database rules
const calculateTax = async (
  supabase: any,
  monthlySalary: number, 
  taxTable: string | null, 
  taxColumn: number | null, 
  municipality: string | null
): Promise<number> => {
  const year = getCurrentTaxYear();
  const annualSalary = monthlySalary * 12;
  
  // Hämta grundavdragsintervaller (schablon från Skatteverket, lagrade i tax_rules)
  const { data: brackets } = await supabase
    .from('tax_rules')
    .select('base_amount, percentage, threshold_min, threshold_max')
    .eq('year', year)
    .eq('rule_type', 'basic_allowance')
    .lte('effective_from', new Date().toISOString().split('T')[0])
    .order('threshold_min', { ascending: true });

  let basicAllowance = 0;
  if (brackets && brackets.length > 0) {
    // Hitta intervallet som inkomsten faller inom: base + percentage * (income - threshold_min)
    const seg = brackets.find((b: any) =>
      annualSalary >= Number(b.threshold_min ?? 0) &&
      annualSalary < Number(b.threshold_max ?? Number.MAX_SAFE_INTEGER)
    ) || brackets[brackets.length - 1];
    basicAllowance = Number(seg.base_amount || 0) + Number(seg.percentage || 0) * (annualSalary - Number(seg.threshold_min || 0));
  } else {
    // Fallback: schablon enligt PBB 58 800 (2025)
    const PA = 58800;
    if (annualSalary <= 0.99 * PA) basicAllowance = Math.min(annualSalary, 0.423 * PA);
    else if (annualSalary <= 2.72 * PA) basicAllowance = 0.423 * PA + 0.20 * (annualSalary - 0.99 * PA);
    else if (annualSalary <= 3.11 * PA) basicAllowance = 0.77 * PA;
    else if (annualSalary <= 7.88 * PA) basicAllowance = 0.77 * PA - 0.10 * (annualSalary - 3.11 * PA);
    else basicAllowance = 0.293 * PA;
  }
  
  const taxableIncome = Math.max(0, annualSalary - basicAllowance);
  
  // Fetch municipal tax rate
  let municipalTaxRate = 0.32; // Default national average
  if (municipality) {
    const municipalRule = await getTaxRules(supabase, year, 'municipal_tax', municipality);
    if (municipalRule?.rate) {
      municipalTaxRate = parseFloat(municipalRule.rate);
    }
  }
  
  const municipalTax = taxableIncome * municipalTaxRate;
  
  // Fetch state tax threshold and rate
  const stateTaxRule = await getTaxRules(supabase, year, 'state_tax');
  let stateTax = 0;
  
  if (stateTaxRule && taxableIncome > (stateTaxRule.threshold_min || 0)) {
    stateTax = (taxableIncome - (stateTaxRule.threshold_min || 0)) * (stateTaxRule.rate || 0.20);
  }
  
  const totalAnnualTax = municipalTax + stateTax;
  const monthlyTax = Math.round(totalAnnualTax / 12);
  
  console.log('Tax calculation (from database):', {
    year,
    annualSalary,
    basicAllowance,
    taxableIncome,
    municipalTaxRate,
    municipalTax,
    stateTax,
    totalAnnualTax,
    monthlyTax
  });
  
  return monthlyTax;
};

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
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rawInput = await req.json();
    const payroll_run_id = rawInput?.payroll_run_id;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!payroll_run_id || typeof payroll_run_id !== 'string' || !uuidRegex.test(payroll_run_id)) {
      return new Response(JSON.stringify({ error: 'Ogiltigt payroll_run_id format. UUID krävs.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch payroll run details
    const { data: payrollRun, error: payrollError } = await supabase
      .from('payroll_runs')
      .select('*, company_id')
      .eq('id', payroll_run_id)
      .maybeSingle();

    if (payrollError) throw payrollError;

    // Fetch active employees for this company
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('*')
      .eq('company_id', payrollRun.company_id)
      .eq('is_active', true);

    if (employeesError) throw employeesError;

    if (!employees || employees.length === 0) {
      throw new Error('No active employees found for this company');
    }

    // Fetch employer social fees rate from database
    const year = getCurrentTaxYear();
    const socialFeesRule = await getTaxRules(supabase, year, 'social_fees');
    const EMPLOYER_SOCIAL_FEES_RATE = socialFeesRule?.rate ? parseFloat(socialFeesRule.rate) : 0.3142;

    console.log(`Using employer social fees rate: ${EMPLOYER_SOCIAL_FEES_RATE} for year ${year}`);

    const payrollLines = [];
    let totalGross = 0;
    let totalTax = 0;
    let totalNet = 0;
    let totalEmployerCost = 0;

    for (const employee of employees) {
      // Calculate proration (proportional salary) based on employment dates
      const periodStart = new Date(payrollRun.period_start);
      const periodEnd = new Date(payrollRun.period_end);
      const employmentStart = employee.employment_start ? new Date(employee.employment_start) : null;
      const employmentEnd = employee.employment_end ? new Date(employee.employment_end) : null;
      
      // Calculate actual work period within payroll period
      const actualStartDate = employmentStart && employmentStart > periodStart ? employmentStart : periodStart;
      const actualEndDate = employmentEnd && employmentEnd < periodEnd ? employmentEnd : periodEnd;
      
      // Calculate worked days
      const totalDaysInPeriod = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const workedDays = Math.ceil((actualEndDate.getTime() - actualStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const prorationFactor = workedDays / totalDaysInPeriod;
      
      console.log(`Proration for ${employee.first_name} ${employee.last_name}:`, {
        periodStart: periodStart.toISOString().split('T')[0],
        periodEnd: periodEnd.toISOString().split('T')[0],
        employmentStart: employmentStart?.toISOString().split('T')[0],
        employmentEnd: employmentEnd?.toISOString().split('T')[0],
        actualStartDate: actualStartDate.toISOString().split('T')[0],
        actualEndDate: actualEndDate.toISOString().split('T')[0],
        totalDaysInPeriod,
        workedDays,
        prorationFactor: `${(prorationFactor * 100).toFixed(1)}%`
      });
      
      // Calculate base salary with proration
      const fullMonthlySalary = employee.monthly_salary || 0;
      const monthlySalary = Math.round(fullMonthlySalary * prorationFactor);
      
      // Calculate vacation pay for temporary/hourly employees
      let vacationPay = 0;
      if (employee.employment_type === 'temporary' || employee.employment_type === 'hourly') {
        const vacationPayPercentage = employee.vacation_pay_percentage || 12;
        vacationPay = Math.round(monthlySalary * (vacationPayPercentage / 100));
      }

      const grossSalary = monthlySalary + vacationPay;

      // Calculate employer social fees
      const employerSocialFees = Math.round(grossSalary * EMPLOYER_SOCIAL_FEES_RATE);

      // Calculate tax deduction based on employee's tax settings and income
      const taxDeduction = await calculateTax(
        supabase,
        monthlySalary, // Use base salary, not gross with vacation pay
        employee.tax_table,
        employee.tax_column,
        employee.municipality
      );

      console.log(`Employee ${employee.first_name} ${employee.last_name}:`, {
        monthly_salary: monthlySalary,
        municipality: employee.municipality,
        tax_table: employee.tax_table,
        tax_column: employee.tax_column,
        tax_deduction: taxDeduction,
        gross_salary: grossSalary
      });

      // Calculate net salary
      const netSalary = grossSalary - taxDeduction;

      payrollLines.push({
        payroll_run_id,
        employee_id: employee.id,
        gross_salary: grossSalary,
        tax_deduction: taxDeduction,
        net_salary: netSalary,
        employer_social_fees: employerSocialFees,
        vacation_pay: vacationPay,
        pension: 0,
        other_benefits: 0,
        other_deductions: 0,
        worked_hours: prorationFactor < 1 ? workedDays * 8 : null, // Store worked days info if prorated
      });

      totalGross += grossSalary;
      totalTax += taxDeduction;
      totalNet += netSalary;
      totalEmployerCost += grossSalary + employerSocialFees;
    }

    // Insert payroll lines
    const { error: insertError } = await supabase
      .from('payroll_lines')
      .insert(payrollLines);

    if (insertError) throw insertError;

    // Update payroll run with totals
    const { error: updateError } = await supabase
      .from('payroll_runs')
      .update({
        total_gross: totalGross,
        total_tax: totalTax,
        total_net: totalNet,
        total_employer_cost: totalEmployerCost,
      })
      .eq('id', payroll_run_id);

    if (updateError) throw updateError;

    console.log(`Generated ${payrollLines.length} payroll lines`);

    return new Response(
      JSON.stringify({
        success: true,
        payroll_lines: payrollLines.length,
        totals: {
          total_gross: totalGross,
          total_tax: totalTax,
          total_net: totalNet,
          total_employer_cost: totalEmployerCost,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error generating payroll lines:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
