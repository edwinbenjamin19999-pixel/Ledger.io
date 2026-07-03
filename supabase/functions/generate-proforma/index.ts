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

    const { companyId, forecastHorizon = '6months', includeSeasonal = true } = await req.json();

    console.log('Generating proforma for company:', companyId);

    // Get historical data from approved journal entries
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 12);

    const { data: journalData, error: journalError } = await supabase
      .from('journal_entry_lines')
      .select(`
        debit,
        credit,
        account_id,
        journal_entry_id
      `);

    if (journalError) throw journalError;

    // Get the accounts for categorization
    const { data: accounts } = await supabase
      .from('chart_of_accounts')
      .select('id, account_number, account_type')
      .eq('company_id', companyId);

    const accountMap = new Map((accounts || []).map((a: any) => [a.id, a]));

    // Get journal entries for this company
    const { data: entries } = await supabase
      .from('journal_entries')
      .select('id, entry_date, status, company_id')
      .eq('company_id', companyId)
      .eq('status', 'approved')
      .gte('entry_date', sixMonthsAgo.toISOString().split('T')[0]);

    const entryMap = new Map((entries || []).map((e: any) => [e.id, e]));

    if (journalError) throw journalError;

    // Calculate monthly historical data
    const monthlyData: Record<string, { income: number; expenses: number }> = {};
    
    (journalData || []).forEach((line: any) => {
      // Check if this line belongs to a valid entry for this company
      const entry = entryMap.get(line.journal_entry_id);
      if (!entry) return;
      
      const account = accountMap.get(line.account_id);
      if (!account) return;
      
      const date = new Date(entry.entry_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { income: 0, expenses: 0 };
      }

      const accountNumber = account.account_number;
      const amount = (line.credit || 0) - (line.debit || 0);

      // Income accounts (3xxx, 8xxx)
      if (accountNumber.startsWith('3') || accountNumber.startsWith('8')) {
        monthlyData[monthKey].income += amount;
      }
      // Expense accounts (4xxx, 5xxx, 6xxx, 7xxx)
      else if (accountNumber.startsWith('4') || accountNumber.startsWith('5') || 
               accountNumber.startsWith('6') || accountNumber.startsWith('7')) {
        monthlyData[monthKey].expenses += Math.abs(amount);
      }
    });

    // Calculate averages and trends
    const historicalMonths = Object.keys(monthlyData).sort();
    const avgIncome = historicalMonths.length > 0
      ? historicalMonths.reduce((sum, key) => sum + monthlyData[key].income, 0) / historicalMonths.length
      : 0;
    const avgExpenses = historicalMonths.length > 0
      ? historicalMonths.reduce((sum, key) => sum + monthlyData[key].expenses, 0) / historicalMonths.length
      : 0;

    // Calculate growth trend (simple linear regression)
    let growthRate = 0;
    if (historicalMonths.length >= 3) {
      const recentMonths = historicalMonths.slice(-3);
      const recentIncome = recentMonths.map(key => monthlyData[key].income);
      const avgRecent = recentIncome.reduce((a, b) => a + b, 0) / recentIncome.length;
      const olderMonths = historicalMonths.slice(0, 3);
      const olderIncome = olderMonths.map(key => monthlyData[key].income);
      const avgOlder = olderIncome.reduce((a, b) => a + b, 0) / olderIncome.length;
      growthRate = avgOlder > 0 ? (avgRecent - avgOlder) / avgOlder : 0;
    }

    // Generate seasonal patterns
    const seasonalPatterns = [];
    if (includeSeasonal && historicalMonths.length > 0) {
      const monthNames = ['Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni', 
                          'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'];
      
      for (let m = 0; m < 12; m++) {
        const monthData = historicalMonths
          .filter(key => parseInt(key.split('-')[1]) === m + 1)
          .map(key => monthlyData[key]);
        
        if (monthData.length > 0) {
          const avgMonthIncome = monthData.reduce((sum, d) => sum + d.income, 0) / monthData.length;
          const avgMonthExpenses = monthData.reduce((sum, d) => sum + d.expenses, 0) / monthData.length;
          const patternStrength = monthData.length / (historicalMonths.length / 12);
          
          seasonalPatterns.push({
            month: monthNames[m],
            avg_income: Math.round(avgMonthIncome),
            avg_expenses: Math.round(avgMonthExpenses),
            pattern_strength: Math.min(patternStrength, 1)
          });
        }
      }
    }

    // Generate forecast
    const monthsToForecast = forecastHorizon === '3months' ? 3 : forecastHorizon === '6months' ? 6 : 12;
    const forecast = [];
    const today = new Date();

    for (let i = 1; i <= monthsToForecast; i++) {
      const forecastDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const monthIndex = forecastDate.getMonth();
      const monthName = new Intl.DateTimeFormat('sv-SE', { month: 'long', year: 'numeric' }).format(forecastDate);
      
      // Apply seasonal factor if available
      let seasonalFactor = 1;
      if (seasonalPatterns.length > monthIndex) {
        const pattern = seasonalPatterns[monthIndex];
        seasonalFactor = avgIncome > 0 ? pattern.avg_income / avgIncome : 1;
      }

      // Apply growth trend
      const trendFactor = 1 + (growthRate * i / 12);
      
      const predicted_income = Math.round(avgIncome * seasonalFactor * trendFactor);
      const predicted_expenses = Math.round(avgExpenses * seasonalFactor * trendFactor);
      const predicted_result = predicted_income - predicted_expenses;
      
      // Calculate confidence based on historical data availability
      const confidence = Math.min(0.95, 0.5 + (historicalMonths.length * 0.05));

      forecast.push({
        period: monthName,
        predicted_income,
        predicted_expenses,
        predicted_result,
        confidence,
        seasonal_factor: seasonalFactor
      });
    }

    console.log(`Generated ${forecast.length} months of forecast with ${seasonalPatterns.length} seasonal patterns`);

    return new Response(JSON.stringify({
      forecast,
      seasonalPatterns,
      metadata: {
        historical_months: historicalMonths.length,
        avg_income: Math.round(avgIncome),
        avg_expenses: Math.round(avgExpenses),
        growth_rate: growthRate
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-proforma:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      forecast: [],
      seasonalPatterns: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
