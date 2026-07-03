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

    const { company_id, fiscal_year } = await req.json();

    // Get company settings for fiscal year dates
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*, company_settings(*)')
      .eq('id', company_id)
      .maybeSingle();

    if (companyError || !company) {
      throw new Error('Company not found');
    }

    const settings = company.company_settings?.[0] || { fiscal_year_start: 1, fiscal_year_end: 12 };
    const fiscalYearStart = `${fiscal_year}-${String(settings.fiscal_year_start).padStart(2, '0')}-01`;
    const fiscalYearEnd = settings.fiscal_year_end === 12 
      ? `${fiscal_year}-12-31`
      : `${fiscal_year + 1}-${String(settings.fiscal_year_end).padStart(2, '0')}-${new Date(fiscal_year + 1, settings.fiscal_year_end, 0).getDate()}`;

    // Fetch all approved journal entries for the fiscal year
    const { data: entries, error: entriesError } = await supabase
      .from('journal_entry_lines')
      .select(`
        debit,
        credit,
        account:chart_of_accounts(
          account_number,
          account_name,
          account_type
        ),
        journal_entry:journal_entries!inner(
          entry_date,
          company_id,
          status
        )
      `)
      .eq('journal_entry.company_id', company_id)
      .eq('journal_entry.status', 'approved')
      .gte('journal_entry.entry_date', fiscalYearStart)
      .lte('journal_entry.entry_date', fiscalYearEnd);

    if (entriesError) throw entriesError;

    // Validate completeness — check for missing months
    const monthCounts: Record<number, number> = {};
    for (const entry of entries || []) {
      const entryDate = (entry.journal_entry as any)?.entry_date;
      if (entryDate) {
        const m = new Date(entryDate).getMonth() + 1;
        monthCounts[m] = (monthCounts[m] || 0) + 1;
      }
    }
    const missingMonths: number[] = [];
    for (let m = 1; m <= 12; m++) {
      if (!monthCounts[m]) missingMonths.push(m);
    }
    if (missingMonths.length > 0) {
      const monthNames = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
      const missingNames = missingMonths.map(m => monthNames[m - 1]);
      throw new Error(
        `Bokföring saknas för ${missingNames.join(', ')} ${fiscal_year}. ` +
        `Enligt bokföringslagen ska alla affärshändelser bokföras löpande. ` +
        `Komplettera bokföringen innan årsredovisning kan genereras.`
      );
    }

    // Build trial balance
    const accountBalances: Record<string, { 
      account_number: string;
      account_name: string;
      account_type: string;
      debit: number;
      credit: number;
      balance: number;
    }> = {};

    for (const entry of (entries || []) as any[]) {
      const accountNum = entry.account?.account_number || 'unknown';
      if (!accountBalances[accountNum]) {
        accountBalances[accountNum] = {
          account_number: accountNum,
          account_name: entry.account?.account_name || '',
          account_type: entry.account?.account_type || '',
          debit: 0,
          credit: 0,
          balance: 0,
        };
      }
      accountBalances[accountNum].debit += entry.debit || 0;
      accountBalances[accountNum].credit += entry.credit || 0;
      accountBalances[accountNum].balance = accountBalances[accountNum].debit - accountBalances[accountNum].credit;
    }

    // Build balance sheet
    const balanceSheet = {
      assets: {
        fixed_assets: {} as Record<string, number>,
        current_assets: {} as Record<string, number>,
        total_fixed_assets: 0,
        total_current_assets: 0,
        total_assets: 0,
      },
      equity_liabilities: {
        equity: {} as Record<string, number>,
        liabilities: {} as Record<string, number>,
        total_equity: 0,
        total_liabilities: 0,
        total_equity_liabilities: 0,
      }
    };

    // Build income statement
    const incomeStatement = {
      revenue: {} as Record<string, number>,
      cost_of_goods: {} as Record<string, number>,
      operating_expenses: {} as Record<string, number>,
      financial_items: {} as Record<string, number>,
      total_revenue: 0,
      gross_profit: 0,
      operating_profit: 0,
      profit_before_tax: 0,
      net_profit: 0,
    };

    for (const [accountNum, data] of Object.entries(accountBalances)) {
      const firstDigit = accountNum.charAt(0);
      const balance = data.balance;

      switch (firstDigit) {
        case '1': // Assets
          if (parseInt(accountNum) < 1400) {
            balanceSheet.assets.fixed_assets[data.account_name] = balance;
            balanceSheet.assets.total_fixed_assets += balance;
          } else {
            balanceSheet.assets.current_assets[data.account_name] = balance;
            balanceSheet.assets.total_current_assets += balance;
          }
          break;
        case '2': // Equity and Liabilities
          if (parseInt(accountNum) < 2100) {
            balanceSheet.equity_liabilities.equity[data.account_name] = -balance;
            balanceSheet.equity_liabilities.total_equity += -balance;
          } else {
            balanceSheet.equity_liabilities.liabilities[data.account_name] = -balance;
            balanceSheet.equity_liabilities.total_liabilities += -balance;
          }
          break;
        case '3': // Revenue
          incomeStatement.revenue[data.account_name] = -balance;
          incomeStatement.total_revenue += -balance;
          break;
        case '4': // Cost of goods sold
          incomeStatement.cost_of_goods[data.account_name] = balance;
          break;
        case '5': // Operating expenses (staff, rent, etc.)
        case '6': // Operating expenses (other)
        case '7': // Personnel costs
          incomeStatement.operating_expenses[data.account_name] = balance;
          break;
        case '8': // Financial items
          incomeStatement.financial_items[data.account_name] = balance;
          break;
      }
    }

    // Calculate totals
    balanceSheet.assets.total_assets = balanceSheet.assets.total_fixed_assets + balanceSheet.assets.total_current_assets;
    balanceSheet.equity_liabilities.total_equity_liabilities = balanceSheet.equity_liabilities.total_equity + balanceSheet.equity_liabilities.total_liabilities;

    const totalCogs = Object.values(incomeStatement.cost_of_goods).reduce((a, b) => a + b, 0);
    const totalOpex = Object.values(incomeStatement.operating_expenses).reduce((a, b) => a + b, 0);
    const totalFinancial = Object.values(incomeStatement.financial_items).reduce((a, b) => a + b, 0);

    incomeStatement.gross_profit = incomeStatement.total_revenue - totalCogs;
    incomeStatement.operating_profit = incomeStatement.gross_profit - totalOpex;
    incomeStatement.profit_before_tax = incomeStatement.operating_profit - totalFinancial;
    incomeStatement.net_profit = incomeStatement.profit_before_tax; // TODO: Calculate tax

    // Generate notes
    const notes = {
      accounting_principles: 'Årsredovisningen är upprättad enligt årsredovisningslagen och BFNAR 2016:10 (K2).',
      fixed_assets: 'Anläggningstillgångar värderas till anskaffningsvärde med avdrag för ackumulerade avskrivningar.',
      revenue_recognition: 'Intäkter redovisas när tjänsten utförts eller varan levererats.',
    };

    // Create or update annual report
    const reportData = {
      company_id,
      fiscal_year,
      fiscal_year_start: fiscalYearStart,
      fiscal_year_end: fiscalYearEnd,
      report_type: 'k2',
      balance_sheet: balanceSheet,
      income_statement: incomeStatement,
      notes,
      total_assets: balanceSheet.assets.total_assets,
      total_equity: balanceSheet.equity_liabilities.total_equity,
      total_liabilities: balanceSheet.equity_liabilities.total_liabilities,
      revenue: incomeStatement.total_revenue,
      net_profit: incomeStatement.net_profit,
      status: 'pending_approval',
      prepared_by: user.id,
      prepared_at: new Date().toISOString(),
    };

    const { data: report, error: upsertError } = await supabase
      .from('annual_reports')
      .upsert(reportData, {
        onConflict: 'company_id,fiscal_year'
      })
      .select()
      .maybeSingle();

    if (upsertError) throw upsertError;

    // Create automation task
    await supabase
      .from('automation_tasks')
      .upsert({
        company_id,
        task_type: 'annual_report',
        related_entity_type: 'annual_report',
        related_entity_id: report.id,
        status: 'ready_for_approval',
        prepared_data: report,
        approval_summary: `Årsredovisning ${fiscal_year}: Omsättning ${incomeStatement.total_revenue.toLocaleString('sv-SE')} kr, Resultat ${incomeStatement.net_profit.toLocaleString('sv-SE')} kr`,
        requires_approval: true,
      });

    return new Response(JSON.stringify({
      success: true,
      report,
      summary: {
        fiscal_year,
        total_revenue: incomeStatement.total_revenue,
        net_profit: incomeStatement.net_profit,
        total_assets: balanceSheet.assets.total_assets,
        total_equity: balanceSheet.equity_liabilities.total_equity,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-annual-report:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
