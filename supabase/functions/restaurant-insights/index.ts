// Restaurant / Hospitality AI Insights
// Analyzes bookkeeping data + POS sales + staff costs and returns actionable insights.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Insight {
  id: string;
  title: string;
  detail: string;
  severity: "info" | "warn" | "good";
  category: string;
}

// Industry benchmarks (SCB + Visita 2024)
const BENCH = {
  restaurant: {
    food_cost: { low: 28, high: 32 },
    staff_cost: { low: 28, high: 32 },
    rent: { low: 8, high: 12 },
    margin: { low: 5, high: 8 },
  },
  hotel: {
    staff_cost: { low: 30, high: 38 },
    margin: { low: 10, high: 20 },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { company_id, industry = "restaurant" } = await req.json();
    if (!company_id) {
      return new Response(JSON.stringify({ error: "company_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10);

    // 1) POS revenue this month
    const { data: sales } = await supabase
      .from("pos_daily_sales")
      .select("total_sales, transaction_count, sale_date")
      .eq("company_id", company_id)
      .gte("sale_date", monthStart);
    const revenue = (sales ?? []).reduce(
      (s: number, r: any) => s + Number(r.total_sales ?? 0),
      0,
    );
    const txns = (sales ?? []).reduce(
      (s: number, r: any) => s + Number(r.transaction_count ?? 0),
      0,
    );
    const avgTicket = txns > 0 ? revenue / txns : 0;

    // 2) Food cost from journal lines (4010-series)
    const { data: lines } = await supabase
      .from("journal_entry_lines")
      .select("account_number, debit_amount, journal_entries!inner(entry_date, company_id)")
      .eq("journal_entries.company_id", company_id)
      .gte("journal_entries.entry_date", monthStart);
    let food = 0, drinks = 0;
    (lines ?? []).forEach((l: any) => {
      const a = String(l.account_number ?? "");
      const v = Number(l.debit_amount ?? 0);
      if (a.startsWith("4010") || a.startsWith("4011")) food += v;
      if (a.startsWith("4020") || a.startsWith("4021")) drinks += v;
    });
    const foodCostPct = revenue > 0 ? ((food + drinks) / revenue) * 100 : 0;

    // 3) Staff cost
    const { data: staff } = await supabase
      .from("staff_cost_imports")
      .select("total_cost, actual_cost")
      .eq("company_id", company_id)
      .eq("period_month", monthStart);
    const staffCost = (staff ?? []).reduce(
      (s: number, r: any) => s + Number(r.actual_cost ?? r.total_cost ?? 0),
      0,
    );
    const staffPct = revenue > 0 ? (staffCost / revenue) * 100 : 0;

    const insights: Insight[] = [];
    const bench = (BENCH as any)[industry] ?? BENCH.restaurant;

    // Food cost insight
    if (revenue > 0 && foodCostPct > 0) {
      if (foodCostPct > bench.food_cost.high) {
        insights.push({
          id: "food-cost-high",
          title: `Food cost ${foodCostPct.toFixed(1)}% — över branschsnitt`,
          detail: `Branschsnitt ${bench.food_cost.low}-${bench.food_cost.high}%. Se över inköpspriser, spill och portionsstorlekar.`,
          severity: "warn",
          category: "food-cost",
        });
      } else if (foodCostPct < bench.food_cost.low) {
        insights.push({
          id: "food-cost-good",
          title: `Food cost ${foodCostPct.toFixed(1)}% — starkt`,
          detail: `Under branschsnittet (${bench.food_cost.low}-${bench.food_cost.high}%). Behåll rutinerna.`,
          severity: "good",
          category: "food-cost",
        });
      }
    }

    // Staff cost insight
    if (revenue > 0 && staffCost > 0) {
      if (staffPct > bench.staff_cost.high) {
        insights.push({
          id: "staff-cost-high",
          title: `Personalkostnad ${staffPct.toFixed(1)}% — hög`,
          detail: `Mål ${bench.staff_cost.low}-${bench.staff_cost.high}%. Se över bemanningen vid låg-traffik och optimera schemat.`,
          severity: "warn",
          category: "staff",
        });
      } else {
        insights.push({
          id: "staff-cost-ok",
          title: `Personalkostnad ${staffPct.toFixed(1)}% — inom mål`,
          detail: `Bra balans mellan bemanning och omsättning.`,
          severity: "good",
          category: "staff",
        });
      }
    } else if (revenue > 0 && staffCost === 0) {
      insights.push({
        id: "staff-missing",
        title: "Koppla in Personalkollen",
        detail: "Vi kan inte räkna personalkostnad % utan timdata. Personalkollen ger bästa kvalitet.",
        severity: "info",
        category: "setup",
      });
    }

    // Average ticket
    if (avgTicket > 0) {
      insights.push({
        id: "avg-ticket",
        title: `Snittnota ${avgTicket.toFixed(0)} kr`,
        detail: `${txns} notor denna månad. Överväg mersälj (förrätt/dessert/dryck) — 10% höjning = ${(revenue * 0.1).toFixed(0)} kr/månad.`,
        severity: "info",
        category: "revenue",
      });
    }

    // Setup tips if we have no data
    if (revenue === 0) {
      insights.push({
        id: "no-sales",
        title: "Inga dagskassor registrerade i månaden",
        detail: "Anslut kassaregistret (Caspeco/Zettle) eller registrera dagskassor manuellt under /kassaregister.",
        severity: "info",
        category: "setup",
      });
    }

    return new Response(JSON.stringify({ insights, kpis: { revenue, foodCostPct, staffPct, avgTicket } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("restaurant-insights error:", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
