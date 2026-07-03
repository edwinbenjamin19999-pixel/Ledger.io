import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  company_id: string;
  budget_id: string;
  fiscal_year: number;
}

const MONTH_KEYS = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { company_id, budget_id, fiscal_year }: Body = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Existing cache freshness gate (6h)
    const { data: existing } = await supabase
      .from("budget_rolling_forecasts")
      .select("computed_at,payload")
      .eq("budget_id", budget_id)
      .maybeSingle();

    if (existing) {
      const ageH = (Date.now() - new Date(existing.computed_at).getTime()) / 3_600_000;
      if (ageH < 6) {
        return new Response(JSON.stringify({ cached: true, ...existing }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Load budget rows
    const { data: rows } = await supabase
      .from("budget_rows")
      .select("account_number,account_name,jan,feb,mar,apr,maj,jun,jul,aug,sep,okt,nov,dec")
      .eq("budget_id", budget_id);

    // Load YTD actuals
    const { data: journal } = await supabase
      .from("journal_entries")
      .select("entry_date,journal_entry_lines(debit,credit,account_id)")
      .eq("company_id", company_id)
      .eq("status", "approved")
      .gte("entry_date", `${fiscal_year}-01-01`)
      .lte("entry_date", `${fiscal_year}-12-31`);

    const { data: accounts } = await supabase
      .from("chart_of_accounts")
      .select("id,account_number")
      .eq("company_id", company_id);

    const acctMap = new Map((accounts ?? []).map((a: any) => [a.id, a.account_number]));

    // Aggregate actuals per account per month
    const actuals: Record<string, number[]> = {};
    let latestMonth = -1;
    (journal ?? []).forEach((entry: any) => {
      const monthIdx = new Date(entry.entry_date).getMonth();
      latestMonth = Math.max(latestMonth, monthIdx);
      (entry.journal_entry_lines ?? []).forEach((l: any) => {
        const acct = acctMap.get(l.account_id);
        if (!acct) return;
        if (!actuals[acct]) actuals[acct] = new Array(12).fill(0);
        // Use net per BAS sign: revenue (3000–3999) credit positive, cost debit positive
        if (acct >= "3000" && acct <= "3999") {
          actuals[acct][monthIdx] += (l.credit ?? 0) - (l.debit ?? 0);
        } else {
          actuals[acct][monthIdx] += (l.debit ?? 0) - (l.credit ?? 0);
        }
      });
    });

    // Build rolling forecast: actuals up to latestMonth, then 60% budget + 40% recent trend
    const forecast: Record<string, number[]> = {};
    (rows ?? []).forEach((r: any) => {
      const budgetMonths = MONTH_KEYS.map(k => Number(r[k]) || 0);
      const actMonths = actuals[r.account_number] ?? new Array(12).fill(0);
      const out = new Array(12).fill(0);

      // 3-mo trend across last available actuals
      const lastFew = [];
      for (let i = Math.max(0, latestMonth - 2); i <= latestMonth; i++) {
        if (actMonths[i] !== 0) lastFew.push(actMonths[i]);
      }
      const trend = lastFew.length ? lastFew.reduce((s, v) => s + v, 0) / lastFew.length : 0;

      for (let i = 0; i < 12; i++) {
        if (i <= latestMonth) {
          out[i] = actMonths[i] || budgetMonths[i];
        } else {
          out[i] = Math.round(budgetMonths[i] * 0.6 + trend * 0.4);
        }
      }
      forecast[r.account_number] = out;
    });

    const payload = {
      forecast,
      latest_month: latestMonth,
      generated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("budget_rolling_forecasts")
      .upsert({
        company_id,
        budget_id,
        fiscal_year,
        latest_actual_date: latestMonth >= 0 ? `${fiscal_year}-${String(latestMonth + 1).padStart(2, "0")}-28` : null,
        payload,
        computed_at: new Date().toISOString(),
      }, { onConflict: "budget_id" });

    if (error) console.error("upsert error", error);

    return new Response(JSON.stringify({ cached: false, payload }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("budget-rolling-forecast error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
