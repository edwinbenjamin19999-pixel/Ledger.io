import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
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

    const { group_id, year } = await req.json();

    if (!group_id || !year) {
      throw new Error("Missing required parameters: group_id and year");
    }

    console.log(`Starting consolidation for group ${group_id}, year ${year}, user ${user.id}`);

    // Get group details
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("*, companies:companies(*)")
      .eq("id", group_id)
      .maybeSingle();

    if (groupError) throw groupError;
    if (!group) throw new Error('Group not found');
    if (!group.companies || group.companies.length === 0) {
      throw new Error("No companies found in this group");
    }

    console.log(`Found ${group.companies.length} companies in group`);

    // Calculate period based on fiscal year
    const fiscalYearStart = group.fiscal_year_start || 1;
    const periodStart = new Date(year, fiscalYearStart - 1, 1);
    const periodEnd = new Date(fiscalYearStart === 1 ? year : year + 1, fiscalYearStart === 1 ? 12 : fiscalYearStart - 1, 0);

    const periodStartStr = periodStart.toISOString().split("T")[0];
    const periodEndStr = periodEnd.toISOString().split("T")[0];

    console.log(`Period: ${periodStartStr} to ${periodEndStr}`);

    // Initialize consolidation data
    // Income statement: only transactions within the period (result accounts 3-8)
    const incomeStatement = new Map<string, number>();
    // Balance sheet: ALL cumulative transactions up to period end (accounts 1-2)
    const assets = new Map<string, number>();
    const equity = new Map<string, number>();
    const liabilities = new Map<string, number>();

    // Currency conversion helper
    const convertAmount = (amount: number, fromCurrency: string, toCurrency: string): number => {
      if (fromCurrency === toCurrency) return amount;
      const conversionRates: Record<string, Record<string, number>> = {
        SEK: { EUR: 0.09, NOK: 0.95, DKK: 0.67 },
        EUR: { SEK: 11.11, NOK: 10.56, DKK: 7.44 },
        NOK: { SEK: 1.05, EUR: 0.095, DKK: 0.70 },
        DKK: { SEK: 1.49, EUR: 0.13, NOK: 1.43 },
      };
      const rate = conversionRates[fromCurrency]?.[toCurrency] || 1;
      return amount * rate;
    };

    const addToMap = (map: Map<string, number>, key: string, amount: number) => {
      map.set(key, (map.get(key) || 0) + amount);
    };

    // Consolidate all companies
    for (const company of group.companies) {
      console.log(`Processing company: ${company.name}`);

      // --- BALANCE SHEET: Cumulative data up to period end ---
      const { data: balanceLines, error: balanceError } = await supabase
        .from("journal_entry_lines")
        .select(`
          debit, credit,
          journal_entry:journal_entries!inner(company_id, entry_date, status),
          chart_of_accounts:account_id(account_number, account_name)
        `)
        .eq("journal_entry.company_id", company.id)
        .eq("journal_entry.status", "approved")
        .lte("journal_entry.entry_date", periodEndStr);

      if (balanceError) {
        console.error(`Error loading balance lines for ${company.name}:`, balanceError);
        continue;
      }

      // --- INCOME STATEMENT: Only period transactions ---
      const { data: incomeLines, error: incomeError } = await supabase
        .from("journal_entry_lines")
        .select(`
          debit, credit,
          journal_entry:journal_entries!inner(company_id, entry_date, status),
          chart_of_accounts:account_id(account_number, account_name)
        `)
        .eq("journal_entry.company_id", company.id)
        .eq("journal_entry.status", "approved")
        .gte("journal_entry.entry_date", periodStartStr)
        .lte("journal_entry.entry_date", periodEndStr);

      if (incomeError) {
        console.error(`Error loading income lines for ${company.name}:`, incomeError);
        continue;
      }

      // Process balance sheet lines (accounts 1xxx and 2xxx only)
      for (const line of (balanceLines || []) as any[]) {
        const accountNumber = line.chart_of_accounts?.account_number || "";
        const accountName = line.chart_of_accounts?.account_name || "";
        if (!accountNumber.startsWith("1") && !accountNumber.startsWith("2")) continue;

        const key = `${accountNumber} - ${accountName}`;
        // Assets: debit increases, credit decreases
        // Liabilities/Equity: credit increases, debit decreases
        const debit = line.debit || 0;
        const credit = line.credit || 0;
        const amount = convertAmount(debit - credit, company.currency, group.currency);

        if (accountNumber.startsWith("1")) {
          addToMap(assets, key, amount);
        } else if (accountNumber >= "2000" && accountNumber <= "2099") {
          // Equity accounts (20xx)
          addToMap(equity, key, -amount); // Credit-positive for equity
        } else {
          // Liabilities (21xx-29xx)
          addToMap(liabilities, key, -amount); // Credit-positive for liabilities
        }
      }

      // Process income statement lines (accounts 3xxx-8xxx only)
      for (const line of (incomeLines || []) as any[]) {
        const accountNumber = line.chart_of_accounts?.account_number || "";
        const accountName = line.chart_of_accounts?.account_name || "";
        if (!accountNumber.match(/^[3-8]/)) continue;

        const key = `${accountNumber} - ${accountName}`;
        const debit = line.debit || 0;
        const credit = line.credit || 0;

        // Revenue (3xxx): credit-positive
        // Expenses (4xxx-8xxx): debit-positive, stored as negative for net calculation
        let amount: number;
        if (accountNumber.startsWith("3")) {
          amount = convertAmount(credit - debit, company.currency, group.currency);
        } else {
          amount = convertAmount(-(debit - credit), company.currency, group.currency);
        }

        addToMap(incomeStatement, key, amount);
      }
    }

    // Calculate net income from income statement and add as "Årets resultat" in equity
    let netIncome = 0;
    for (const [_, amount] of incomeStatement) {
      netIncome += amount;
    }
    addToMap(equity, "2099 - Årets resultat", netIncome);

    // Apply eliminations
    const { data: eliminations, error: eliminationsError } = await supabase
      .from("eliminations")
      .select("*")
      .eq("group_id", group_id)
      .lte("period_start", periodEndStr)
      .gte("period_end", periodStartStr);

    if (!eliminationsError && eliminations) {
      console.log(`Applying ${eliminations.length} eliminations`);

      for (const elimination of eliminations) {
        const amount = convertAmount(
          elimination.amount,
          elimination.currency || group.currency,
          group.currency
        );

        switch (elimination.elimination_type) {
          case "intercompany_revenue":
            // Remove revenue from income statement
            addToMap(incomeStatement, `Eliminering: Koncernintern intäkt`, -amount);
            break;
          case "intercompany_expense":
            // Remove expense from income statement
            addToMap(incomeStatement, `Eliminering: Koncernintern kostnad`, amount);
            break;
          case "intercompany_receivable":
            // Remove receivable from assets
            addToMap(assets, `Eliminering: Koncernintern fordran`, -amount);
            break;
          case "intercompany_payable":
            // Remove payable from liabilities
            addToMap(liabilities, `Eliminering: Koncernintern skuld`, -amount);
            break;
          case "investment":
            // Eliminate shares in subsidiaries (asset) against subsidiary equity
            addToMap(assets, `Eliminering: Aktier i dotterbolag`, -amount);
            addToMap(equity, `Eliminering: Eliminerat eget kapital`, -amount);
            break;
          case "dividend":
            // Eliminate intra-group dividends
            addToMap(incomeStatement, `Eliminering: Koncernintern utdelning`, -amount);
            break;
        }
      }
    }

    // Recalculate net income after eliminations
    netIncome = 0;
    for (const [_, amount] of incomeStatement) {
      netIncome += amount;
    }

    // Calculate totals
    let totalIncome = 0;
    let totalExpenses = 0;
    for (const [key, amount] of incomeStatement) {
      const accNum = key.split(" ")[0];
      if (accNum.startsWith("3") || key.startsWith("Eliminering: Koncernintern kostnad")) {
        totalIncome += amount;
      } else {
        totalExpenses += Math.abs(amount);
      }
    }

    let totalAssets = 0;
    for (const [_, amount] of assets) {
      totalAssets += amount;
    }

    // Combine equity and liabilities for balance sheet presentation
    const equityAndLiabilities = new Map<string, number>();
    for (const [key, amount] of equity) {
      equityAndLiabilities.set(key, amount);
    }
    for (const [key, amount] of liabilities) {
      equityAndLiabilities.set(key, amount);
    }

    let totalEquityAndLiabilities = 0;
    for (const [_, amount] of equityAndLiabilities) {
      totalEquityAndLiabilities += amount;
    }

    // Format response
    const response = {
      company_count: group.companies.length,
      income_statement: Array.from(incomeStatement.entries())
        .map(([account, amount]) => ({ account, amount }))
        .filter((item) => Math.abs(item.amount) > 0.01)
        .sort((a, b) => {
          // Sort: revenue first (3xxx), then expenses (4-8xxx), then eliminations
          const aNum = a.account.split(" ")[0];
          const bNum = b.account.split(" ")[0];
          return aNum.localeCompare(bNum);
        }),
      balance_sheet: {
        assets: Array.from(assets.entries())
          .map(([account, amount]) => ({ account, amount }))
          .filter((item) => Math.abs(item.amount) > 0.01)
          .sort((a, b) => a.account.localeCompare(b.account)),
        liabilities: Array.from(equityAndLiabilities.entries())
          .map(([account, amount]) => ({ account, amount }))
          .filter((item) => Math.abs(item.amount) > 0.01)
          .sort((a, b) => a.account.localeCompare(b.account)),
      },
      total_income: totalIncome,
      total_expenses: totalExpenses,
      net_income: netIncome,
      total_assets: totalAssets,
      total_liabilities: totalEquityAndLiabilities,
    };

    console.log("Consolidation completed successfully");

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Consolidation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
