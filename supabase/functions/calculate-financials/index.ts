import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, handleCors, corsJson, corsError } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return corsError("Missing authorization", 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate user
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return corsError("Unauthorized", 401);

    const body = await req.json();
    const { company_id, type, scenario = "base", year } = body;

    if (!company_id || !type || !year) {
      return corsError("Missing required fields: company_id, type, year", 400);
    }
    if (!["pnl", "bs", "cf"].includes(type)) {
      return corsError("type must be pnl, bs, or cf", 400);
    }
    if (!["base", "best", "worst"].includes(scenario)) {
      return corsError("scenario must be base, best, or worst", 400);
    }

    // Verify user has access to this company
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("company_id", company_id)
      .limit(1);

    if (!roleData || roleData.length === 0) {
      return corsError("Access denied to this company", 403);
    }

    // Check data_version for cache validity
    const { data: company } = await supabase
      .from("companies")
      .select("data_version")
      .eq("id", company_id)
      .maybeSingle();

    const currentVersion = company?.data_version ?? 1;

    // Check cache
    const { data: cached } = await supabase
      .from("financial_cache")
      .select("result_json, data_version, calculated_at")
      .eq("company_id", company_id)
      .eq("calculation_type", type)
      .eq("scenario", scenario)
      .eq("fiscal_year", year)
      .maybeSingle();

    if (cached && cached.data_version === currentVersion) {
      return corsJson({
        data: cached.result_json,
        cached: true,
        calculated_at: cached.calculated_at,
        data_version: currentVersion,
      });
    }

    // Fetch journal data for calculation
    const { data: entries } = await supabase
      .from("journal_entries")
      .select("id, entry_date, status, journal_entry_lines(debit, credit, account_id)")
      .eq("company_id", company_id)
      .in("status", ["approved", "posted"])
      .gte("entry_date", `${year}-01-01`)
      .lte("entry_date", `${year}-12-31`);

    const { data: accounts } = await supabase
      .from("chart_of_accounts")
      .select("id, account_number, account_name, account_type")
      .eq("company_id", company_id);

    const acctMap = new Map(
      (accounts || []).map((a: any) => [a.id, { number: a.account_number, name: a.account_name, type: a.account_type }])
    );

    // Build monthly aggregation per account
    const monthlyData: Record<string, number[]> = {};
    for (const entry of entries || []) {
      const month = new Date(entry.entry_date).getMonth(); // 0-11
      for (const line of (entry as any).journal_entry_lines || []) {
        const acct = acctMap.get(line.account_id);
        if (!acct) continue;
        const key = acct.number;
        if (!monthlyData[key]) monthlyData[key] = new Array(12).fill(0);
        // Net amount: debit - credit for expenses/assets, credit - debit for income/liabilities
        const net = (line.debit || 0) - (line.credit || 0);
        monthlyData[key][month] += net;
      }
    }

    let result: any;

    if (type === "pnl") {
      result = calculatePnL(monthlyData, scenario);
    } else if (type === "bs") {
      result = calculateBS(monthlyData, scenario);
    } else {
      result = calculateCF(monthlyData, scenario);
    }

    // Store in cache
    await supabase.from("financial_cache").upsert({
      company_id,
      calculation_type: type,
      scenario,
      fiscal_year: year,
      result_json: result,
      data_version: currentVersion,
      calculated_at: new Date().toISOString(),
    }, { onConflict: "company_id,calculation_type,scenario,fiscal_year" });

    return corsJson({
      data: result,
      cached: false,
      calculated_at: new Date().toISOString(),
      data_version: currentVersion,
    });
  } catch (err) {
    console.error("calculate-financials error:", err);
    return corsError(err instanceof Error ? err.message : "Internal error", 500);
  }
});

// ── Financial Calculation Functions ──

function applyScenarioMultiplier(value: number, scenario: string, type: "revenue" | "cost"): number {
  if (scenario === "base") return value;
  if (scenario === "best") return type === "revenue" ? value * 1.15 : value * 0.9;
  // worst
  return type === "revenue" ? value * 0.85 : value * 1.1;
}

function calculatePnL(monthly: Record<string, number[]>, scenario: string) {
  const months = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];
  const revenue: number[] = new Array(12).fill(0);
  const cogs: number[] = new Array(12).fill(0);
  const opex: number[] = new Array(12).fill(0);
  const personnel: number[] = new Array(12).fill(0);
  const depreciation: number[] = new Array(12).fill(0);
  const financial: number[] = new Array(12).fill(0);

  for (const [acct, values] of Object.entries(monthly)) {
    for (let m = 0; m < 12; m++) {
      const val = values[m];
      if (acct >= "3000" && acct <= "3999") {
        revenue[m] += applyScenarioMultiplier(-val, scenario, "revenue"); // credit = positive revenue
      } else if (acct >= "4000" && acct <= "4999") {
        cogs[m] += applyScenarioMultiplier(val, scenario, "cost");
      } else if (acct >= "5000" && acct <= "6999") {
        opex[m] += applyScenarioMultiplier(val, scenario, "cost");
      } else if (acct >= "7000" && acct <= "7699") {
        personnel[m] += applyScenarioMultiplier(val, scenario, "cost");
      } else if (acct >= "7700" && acct <= "7899") {
        depreciation[m] += val;
      } else if (acct >= "8000" && acct <= "8999") {
        financial[m] += -val; // net financial income
      }
    }
  }

  const grossProfit = revenue.map((r, i) => r - cogs[i]);
  const ebitda = grossProfit.map((gp, i) => gp - opex[i] - personnel[i]);
  const ebit = ebitda.map((e, i) => e - depreciation[i]);
  const netProfit = ebit.map((e, i) => e + financial[i]);

  return {
    months,
    revenue,
    cogs,
    grossProfit,
    opex,
    personnel,
    ebitda,
    depreciation,
    ebit,
    financial,
    netProfit,
    totals: {
      revenue: revenue.reduce((a, b) => a + b, 0),
      cogs: cogs.reduce((a, b) => a + b, 0),
      grossProfit: grossProfit.reduce((a, b) => a + b, 0),
      opex: opex.reduce((a, b) => a + b, 0),
      personnel: personnel.reduce((a, b) => a + b, 0),
      ebitda: ebitda.reduce((a, b) => a + b, 0),
      depreciation: depreciation.reduce((a, b) => a + b, 0),
      ebit: ebit.reduce((a, b) => a + b, 0),
      financial: financial.reduce((a, b) => a + b, 0),
      netProfit: netProfit.reduce((a, b) => a + b, 0),
    },
  };
}

function calculateBS(monthly: Record<string, number[]>, scenario: string) {
  // Balance sheet = cumulative balances at month-end
  const assets: number[] = new Array(12).fill(0);
  const liabilities: number[] = new Array(12).fill(0);
  const equity: number[] = new Array(12).fill(0);

  for (const [acct, values] of Object.entries(monthly)) {
    let cumulative = 0;
    for (let m = 0; m < 12; m++) {
      cumulative += values[m];
      if (acct >= "1000" && acct <= "1999") {
        assets[m] += cumulative;
      } else if (acct >= "2000" && acct <= "2099") {
        equity[m] += -cumulative; // credit balance
      } else if (acct >= "2100" && acct <= "2999") {
        liabilities[m] += -cumulative; // credit balance
      }
    }
  }

  // Include P&L result in equity
  const pnl = calculatePnL(monthly, scenario);
  let cumulativeProfit = 0;
  for (let m = 0; m < 12; m++) {
    cumulativeProfit += pnl.netProfit[m];
    equity[m] += cumulativeProfit;
  }

  return {
    assets,
    liabilities,
    equity,
    totalEquityAndLiabilities: equity.map((e, i) => e + liabilities[i]),
    isBalanced: assets.every((a, i) => Math.abs(a - equity[i] - liabilities[i]) < 1),
  };
}

function calculateCF(monthly: Record<string, number[]>, scenario: string) {
  const pnl = calculatePnL(monthly, scenario);
  const operating: number[] = new Array(12).fill(0);
  const investing: number[] = new Array(12).fill(0);
  const financing: number[] = new Array(12).fill(0);

  // Operating = net profit + depreciation + working capital changes
  for (let m = 0; m < 12; m++) {
    operating[m] = pnl.netProfit[m] + (pnl.depreciation[m] || 0);
  }

  // Working capital approximation from current assets/liabilities changes
  for (const [acct, values] of Object.entries(monthly)) {
    for (let m = 0; m < 12; m++) {
      if (acct >= "1400" && acct <= "1899") {
        operating[m] -= values[m]; // increase in current assets = cash outflow
      } else if (acct >= "2400" && acct <= "2999") {
        operating[m] -= values[m]; // increase in current liabilities = cash inflow (credit is negative here)
      } else if (acct >= "1000" && acct <= "1399") {
        investing[m] -= values[m]; // fixed asset purchases
      } else if (acct >= "2000" && acct <= "2399") {
        financing[m] -= values[m]; // equity/long-term debt changes
      }
    }
  }

  const totalCF = operating.map((o, i) => o + investing[i] + financing[i]);
  let cumulative = 0;
  const closingCash = totalCF.map((cf) => {
    cumulative += cf;
    return cumulative;
  });

  return {
    operating,
    investing,
    financing,
    totalCashFlow: totalCF,
    closingCash,
    totals: {
      operating: operating.reduce((a, b) => a + b, 0),
      investing: investing.reduce((a, b) => a + b, 0),
      financing: financing.reduce((a, b) => a + b, 0),
      net: totalCF.reduce((a, b) => a + b, 0),
    },
  };
}
