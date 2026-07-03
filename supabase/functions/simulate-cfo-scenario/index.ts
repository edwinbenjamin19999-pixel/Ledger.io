// AI CFO What-If Engine — BAS-aware double-entry simulation against live ledger.
// Returns: profitImpact, liquidityImpact (incl. runway days), balanceSheetDelta,
//          marginChange, risk, ledgerPreview (D=K balanced).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ScenarioKind =
  | "price_increase" | "hire" | "cost_cut"
  | "new_loan" | "capex" | "collect_ar";

interface LedgerLine { account: string; label: string; debit: number; credit: number; period: string; }

function fmt(n: number) { return Math.round(n); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const { company_id, scenario, params = {} } = body as {
      company_id: string;
      scenario: ScenarioKind;
      params: Record<string, number | string>;
    };
    if (!company_id || !scenario) {
      return new Response(JSON.stringify({ error: "company_id and scenario required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Load accounts + totals (same logic as orchestrator)
    const { data: accounts } = await supabase
      .from("chart_of_accounts").select("id, account_number")
      .eq("company_id", company_id);
    const accById = new Map<string, string>();
    (accounts || []).forEach((a: any) => accById.set(a.id, a.account_number));
    const ids = Array.from(accById.keys());

    let revenue = 0, costs = 0, cash = 0, assets = 0, liabilities = 0, equity = 0;
    if (ids.length > 0) {
      const { data: lines } = await supabase
        .from("journal_entry_lines").select("account_id, debit, credit").in("account_id", ids);
      for (const l of (lines || []) as any[]) {
        const num = accById.get(l.account_id) || "";
        const d = Number(l.debit || 0), c = Number(l.credit || 0);
        if (num.startsWith("3")) revenue += c - d;
        else if (/^[4-7]/.test(num)) costs += d - c;
        if (num.startsWith("1")) assets += d - c;
        if (num.startsWith("2")) {
          if (/^20[12389]/.test(num)) equity += c - d;
          else liabilities += c - d;
        }
        if (/^19/.test(num)) cash += d - c;
      }
    }
    const result = revenue - costs;
    const monthlyBurn = Math.max(1, costs / 12);
    const beforeMargin = revenue > 0 ? (result / revenue) * 100 : 0;
    const beforeRunway = Math.round((cash / monthlyBurn) * 30);

    // Build ledger preview based on scenario
    const ledger: LedgerLine[] = [];
    let dProfit = 0, dCash = 0, dAssets = 0, dLiabilities = 0, dEquity = 0;
    let risk: "low" | "medium" | "high" = "low";
    const period = "12m";

    switch (scenario) {
      case "price_increase": {
        const pct = Number(params.pct ?? 5);
        const annualUplift = revenue * (pct / 100);
        const vat = annualUplift * 0.25;
        ledger.push({ account: "1510", label: "Kundfordringar", debit: annualUplift + vat, credit: 0, period });
        ledger.push({ account: "3010", label: "Försäljning", debit: 0, credit: annualUplift, period });
        ledger.push({ account: "2611", label: "Utgående moms 25%", debit: 0, credit: vat, period });
        dProfit = annualUplift; dCash = annualUplift; dAssets = annualUplift; dEquity = annualUplift;
        risk = pct > 10 ? "medium" : "low";
        break;
      }
      case "hire": {
        const monthly = Number(params.monthlyAmount ?? 45000);
        const months = Number(params.durationMonths ?? 12);
        const grossYear = monthly * months;
        const employerTax = grossYear * 0.3142;
        const total = grossYear + employerTax;
        ledger.push({ account: "7010", label: "Löner", debit: grossYear, credit: 0, period });
        ledger.push({ account: "7510", label: "Arbetsgivaravgifter", debit: employerTax, credit: 0, period });
        ledger.push({ account: "1930", label: "Företagskonto", debit: 0, credit: total, period });
        dProfit = -total; dCash = -total; dAssets = -total; dEquity = -total;
        risk = total > cash * 0.5 ? "high" : total > cash * 0.2 ? "medium" : "low";
        break;
      }
      case "cost_cut": {
        const monthly = Number(params.monthly_amount ?? params.monthlyAmount ?? 10000);
        const annual = monthly * 12;
        ledger.push({ account: String(params.account_number || "6500"), label: "Kostnadssänkning", debit: 0, credit: annual, period });
        ledger.push({ account: "1930", label: "Företagskonto", debit: annual, credit: 0, period });
        dProfit = annual; dCash = annual; dAssets = annual; dEquity = annual;
        risk = "low";
        break;
      }
      case "new_loan": {
        const amount = Number(params.amount ?? 500000);
        const ratePct = Number(params.ratePct ?? 6);
        const annualInterest = amount * (ratePct / 100);
        ledger.push({ account: "1930", label: "Företagskonto", debit: amount, credit: 0, period: "now" });
        ledger.push({ account: "2310", label: "Banklån", debit: 0, credit: amount, period: "now" });
        ledger.push({ account: "8410", label: "Räntekostnader", debit: annualInterest, credit: 0, period });
        ledger.push({ account: "1930", label: "Företagskonto", debit: 0, credit: annualInterest, period });
        dProfit = -annualInterest; dCash = amount - annualInterest; dAssets = amount - annualInterest;
        dLiabilities = amount; dEquity = -annualInterest;
        risk = amount > revenue * 0.5 ? "high" : "medium";
        break;
      }
      case "capex": {
        const amount = Number(params.amount ?? 100000);
        const lifeYears = Number(params.lifeYears ?? 5);
        const annualDep = amount / lifeYears;
        ledger.push({ account: "1220", label: "Inventarier", debit: amount, credit: 0, period: "now" });
        ledger.push({ account: "1930", label: "Företagskonto", debit: 0, credit: amount, period: "now" });
        ledger.push({ account: "7832", label: "Avskrivningar inventarier", debit: annualDep, credit: 0, period });
        ledger.push({ account: "1229", label: "Ack avskrivning inventarier", debit: 0, credit: annualDep, period });
        dProfit = -annualDep; dCash = -amount; dAssets = -annualDep; dEquity = -annualDep;
        risk = amount > cash * 0.4 ? "high" : "medium";
        break;
      }
      case "collect_ar": {
        const days = Number(params.acceleration_days ?? params.accelerationDays ?? 14);
        const dailyRev = revenue / 365;
        const accelerated = dailyRev * days;
        ledger.push({ account: "1930", label: "Företagskonto", debit: accelerated, credit: 0, period });
        ledger.push({ account: "1510", label: "Kundfordringar", debit: 0, credit: accelerated, period });
        dProfit = 0; dCash = accelerated; dAssets = 0; dEquity = 0;
        risk = "low";
        break;
      }
    }

    // Validate D = K
    const totalD = ledger.reduce((s, l) => s + l.debit, 0);
    const totalC = ledger.reduce((s, l) => s + l.credit, 0);
    const balanced = Math.abs(totalD - totalC) < 0.5;

    const afterCash = cash + dCash;
    const afterRunway = Math.round((afterCash / monthlyBurn) * 30);
    const afterRevenue = revenue + (scenario === "price_increase" ? revenue * (Number(params.pct ?? 5) / 100) : 0);
    const afterResult = result + dProfit;
    const afterMargin = afterRevenue > 0 ? (afterResult / afterRevenue) * 100 : 0;

    return new Response(JSON.stringify({
      scenario, params, balanced,
      profitImpact: { kr: fmt(dProfit), pct: result !== 0 ? fmt((dProfit / Math.abs(result)) * 100) : 0 },
      liquidityImpact: { kr: fmt(dCash), runwayDaysBefore: beforeRunway, runwayDaysAfter: afterRunway, runwayDelta: afterRunway - beforeRunway },
      balanceSheetDelta: { assets: fmt(dAssets), liabilities: fmt(dLiabilities), equity: fmt(dEquity) },
      marginChange: { before: Number(beforeMargin.toFixed(2)), after: Number(afterMargin.toFixed(2)), deltaPp: Number((afterMargin - beforeMargin).toFixed(2)) },
      risk,
      ledgerPreview: ledger.map(l => ({ ...l, debit: fmt(l.debit), credit: fmt(l.credit) })),
      computed_at: new Date().toISOString(),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("simulate-cfo-scenario error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
