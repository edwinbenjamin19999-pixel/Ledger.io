import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1'

import { corsHeaders, handleCors } from "../_shared/cors.ts";

// Parse Swedish personal number (YYYYMMDD-XXXX or YYMMDD-XXXX)
function parsePersonalNumber(personalNumber: string) {
  const cleaned = personalNumber.replace(/\D/g, '')
  
  let year, month, day
  if (cleaned.length === 12) {
    year = parseInt(cleaned.substring(0, 4))
    month = parseInt(cleaned.substring(4, 6))
    day = parseInt(cleaned.substring(6, 8))
  } else if (cleaned.length === 10) {
    const shortYear = parseInt(cleaned.substring(0, 2))
    const currentYear = new Date().getFullYear()
    const currentCentury = Math.floor(currentYear / 100) * 100
    year = currentCentury + shortYear
    if (year > currentYear) year -= 100
    month = parseInt(cleaned.substring(2, 4))
    day = parseInt(cleaned.substring(4, 6))
  } else {
    throw new Error('Invalid personal number format')
  }

  return { year, month, day }
}

// Calculate age from birth date
function calculateAge(year: number, month: number, day: number): number {
  const today = new Date()
  const birthDate = new Date(year, month - 1, day)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  
  return age
}

// Get current tax year
const getCurrentTaxYear = (): number => {
  return new Date().getFullYear();
};

// Fetch municipal tax rate from database
const getMunicipalTaxRate = async (supabase: any, municipality: string | null): Promise<number> => {
  if (!municipality) return 0.32; // National average

  const year = getCurrentTaxYear();
  const { data, error } = await supabase
    .from('tax_rules')
    .select('rate')
    .eq('year', year)
    .eq('rule_type', 'municipal_tax')
    .eq('municipality', municipality.toLowerCase())
    .lte('effective_from', new Date().toISOString().split('T')[0])
    .order('effective_from', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (error || !data) {
    console.log('Using default municipal tax rate for', municipality);
    return 0.32; // Default national average
  }
  
  return parseFloat(data.rate);
};

// Suggest tax table based on age, monthly salary, and municipality
async function suggestTaxTable(
  supabase: any,
  age: number, 
  monthlySalary: number, 
  municipality: string | null
): Promise<{ tax_table: string, tax_column: number }> {
  const annualSalary = monthlySalary * 12
  const year = getCurrentTaxYear();
  
  // Get municipal tax rate to determine column
  const municipalTaxRate = await getMunicipalTaxRate(supabase, municipality);
  
  // Column determination based on municipal tax rate
  // Column 1: Lower tax municipalities (< 31%)
  // Column 2: Medium tax municipalities (31-33%)
  // Column 3: Higher tax municipalities (> 33%)
  let tax_column = 1;
  if (municipalTaxRate >= 0.33) {
    tax_column = 3;
  } else if (municipalTaxRate >= 0.31) {
    tax_column = 2;
  }
  
  // Determine tax table based on age and income
  const isPensioner = age >= 65;
  const tablePrefix = isPensioner ? 'tax_table_' : 'tax_table_';
  
  // Fetch tax table thresholds from database
  const { data: taxTables, error } = await supabase
    .from('tax_rules')
    .select('*')
    .eq('year', year)
    .like('rule_type', 'tax_table_%')
    .lte('effective_from', new Date().toISOString().split('T')[0])
    .order('threshold_min', { ascending: true });
  
  if (error || !taxTables || taxTables.length === 0) {
    // Fallback to hardcoded values if database lookup fails
    console.log('Using fallback tax table calculation');
    if (age < 65) {
      if (annualSalary < 150000) return { tax_table: "30", tax_column }
      if (annualSalary < 250000) return { tax_table: "31", tax_column }
      if (annualSalary < 350000) return { tax_table: "32", tax_column }
      if (annualSalary < 450000) return { tax_table: "33", tax_column }
      if (annualSalary < 550000) return { tax_table: "34", tax_column }
      if (annualSalary < 650000) return { tax_table: "35", tax_column }
      return { tax_table: "36", tax_column }
    } else {
      if (annualSalary < 200000) return { tax_table: "37", tax_column }
      if (annualSalary < 400000) return { tax_table: "38", tax_column }
      if (annualSalary < 600000) return { tax_table: "39", tax_column }
      return { tax_table: "40", tax_column }
    }
  }
  
  // Filter tables based on age (pensioner vs regular)
  const relevantTables = taxTables.filter((t: any) => {
    const tableNum = parseInt(t.rule_type.replace('tax_table_', ''));
    return isPensioner ? (tableNum >= 37) : (tableNum <= 36);
  });
  
  // Find the appropriate table based on annual salary
  for (const table of relevantTables) {
    const minThreshold = table.threshold_min || 0;
    const maxThreshold = table.threshold_max || Infinity;
    
    if (annualSalary >= minThreshold && annualSalary < maxThreshold) {
      const tableNumber = table.rule_type.replace('tax_table_', '');
      return { tax_table: tableNumber, tax_column };
    }
  }
  
  // Default fallback
  return { tax_table: isPensioner ? "40" : "36", tax_column };
}

// Calculate vacation days based on age
function calculateVacationDays(age: number): number {
  return age >= 40 ? 30 : 25
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { personal_number, monthly_salary, municipality } = await req.json()

    if (!personal_number) {
      throw new Error('Personal number is required')
    }

    // Parse personal number
    const { year, month, day } = parsePersonalNumber(personal_number)
    const age = calculateAge(year, month, day)
    
    // Calculate vacation days based on age
    const vacation_days_per_year = calculateVacationDays(age)
    
    // Suggest tax table if salary is provided
    let tax_suggestion = null
    if (monthly_salary && monthly_salary > 0) {
      tax_suggestion = await suggestTaxTable(supabase, age, monthly_salary, municipality)
    }

    // Get municipal tax rate for response
    const municipalTaxRate = municipality && monthly_salary ? await getMunicipalTaxRate(supabase, municipality) : null;

    console.log('Person lookup:', {
      personal_number,
      age,
      municipality,
      vacation_days_per_year,
      tax_suggestion,
      municipal_tax_rate: municipalTaxRate
    })

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          age,
          birth_year: year,
          birth_month: month,
          birth_day: day,
          vacation_days_per_year,
          tax_table: tax_suggestion?.tax_table,
          tax_column: tax_suggestion?.tax_column,
          municipal_tax_rate: municipalTaxRate?.toString(),
          note: `Skattetabellen baseras på ${getCurrentTaxYear()} års skatteregler från databasen. Uppdateras automatiskt när nya regler läggs till.`
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in lookup-person:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
