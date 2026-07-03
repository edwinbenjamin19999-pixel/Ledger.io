// Hospitality: AI insights generator with metric receipts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Insight {
  insight_type: string;
  severity: "info" | "good" | "warn" | "critical";
  title: string;
  body: string;
  metric_label?: string;
  metric_value?: number;
  metric_change_pct?: number;
  action_suggestion?: string;
  source_receipt: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { company_id } = await req.json();
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
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10);

    const [posMonth, posPrev, pos90, ledgerMonth, ledgerPrev, staff, suppliers] =
      await Promise.all([
        supabase
          .from("pos_daily_sales")
          .select("sale_date, total_sales, transaction_count")
          .eq("company_id", company_id)
          .gte("sale_date", monthStart),
        supabase
          .from("pos_daily_sales")
          .select("sale_date, total_sales")
          .eq("company_id", company_id)
          .gte("sale_date", prevMonthStart)
          .lte("sale_date", prevMonthEnd),
        supabase
          .from("pos_daily_sales")
          .select("sale_date, total_sales")
          .eq("company_id", company_id)
          .gte("sale_date", ninetyDaysAgo),
        supabase
          .from("journal_entry_lines")
          .select("account_number, debit_amount, journal_entries!inner(entry_date, company_id)")
          .eq("journal_entries.company_id", company_id)
          .gte("journal_entries.entry_date", monthStart),
        supabase
          .from("journal_entry_lines")
          .select("account_number, debit_amount, journal_entries!inner(entry_date, company_id)")
          .eq("journal_entries.company_id", company_id)
          .gte("journal_entries.entry_date", prevMonthStart)
          .lte("journal_entries.entry_date", prevMonthEnd),
        supabase
          .from("staff_cost_imports")
          .select("total_cost, actual_cost")
          .eq("company_id", company_id)
          .eq("period_month", monthStart),
        supabase
          .from("hospitality_supplier_intelligence")
          .select("supplier_name, price_change_pct, last_invoice_amount, alert_active")
          .eq("company_id", company_id)
          .eq("alert_active", true)
          .order("price_change_pct", { ascending: false })
          .limit(3),
      ]);

    const sumDebit = (rows: any[], prefixes: string[]) =>
      (rows ?? []).reduce((s, l) => {
        const a = String(l.account_number ?? "");
        if (prefixes.some((p) => a.startsWith(p))) return s + Number(l.debit_amount ?? 0);
        return s;
      }, 0);

    const revM = (posMonth.data ?? []).reduce((s: number, r: any) => s + Number(r.total_sales || 0), 0);
    const revP = (posPrev.data ?? []).reduce((s: number, r: any) => s + Number(r.total_sales || 0), 0);
    const txns = (posMonth.data ?? []).reduce((s: number, r: any) => s + Number(r.transaction_count || 0), 0);
    const foodM = sumDebit(ledgerMonth.data ?? [], ["4010", "4011"]);
    const foodP = sumDebit(ledgerPrev.data ?? [], ["4010", "4011"]);
    const staffCost = (staff.data ?? []).reduce(
      (s: number, r: any) => s + Number(r.actual_cost ?? r.total_cost ?? 0),
      0,
    );
    const foodPctM = revM > 0 ? (foodM / revM) * 100 : 0;
    const foodPctP = revP > 0 ? (foodP / revP) * 100 : 0;
    const staffPctM = revM > 0 ? (staffCost / revM) * 100 : 0;
    const avgTicket = txns > 0 ? revM / txns : 0;

    // Weekday concentration
    let weekendRev = 0;
    let totalRev90 = 0;
    (pos90.data ?? []).forEach((r: any) => {
      const dow = new Date(r.sale_date).getDay();
      const v = Number(r.total_sales || 0);
      totalRev90 += v;
      if (dow === 5 || dow === 6 || dow === 0) weekendRev += v;
    });
    const weekendPct = totalRev90 > 0 ? (weekendRev / totalRev90) * 100 : 0;

    const insights: Insight[] = [];

    if (revM > 0 && foodPctM > 32) {
      insights.push({
        insight_type: "food_cost",
        severity: "warn",
        title: `Food cost ${foodPctM.toFixed(1)}% — över branschsnitt`,
        body: `Råvarukonton (4010+4011) ligger på ${foodPctM.toFixed(1)}% av omsättningen mot ${foodPctP.toFixed(1)}% förra månaden. Branschsnitt: 28–32%.`,
        metric_label: "Food cost %",
        metric_value: foodPctM,
        metric_change_pct: foodPctM - foodPctP,
        action_suggestion: "Granska inköpspriser, spill och portionsstorlekar",
        source_receipt: `Konto 4010+4011 (${foodM.toFixed(0)} kr) / POS-omsättning (${revM.toFixed(0)} kr), denna månad`,
      });
    } else if (revM > 0 && foodPctM > 0 && foodPctM < 28) {
      insights.push({
        insight_type: "food_cost",
        severity: "good",
        title: `Food cost ${foodPctM.toFixed(1)}% — starkt`,
        body: `Under branschsnittet (28–32%). Behåll rutinerna.`,
        metric_label: "Food cost %",
        metric_value: foodPctM,
        source_receipt: `Konto 4010+4011 / POS-omsättning, denna månad`,
      });
    }

    if (revM > 0 && staffCost > 0 && staffPctM > 32) {
      insights.push({
        insight_type: "staff_cost",
        severity: "warn",
        title: `Personalkostnad ${staffPctM.toFixed(1)}% av omsättning`,
        body: `Mål för restaurang: 28–32%. Du ligger ${(staffPctM - 32).toFixed(1)}% över målet.`,
        metric_label: "Staff cost %",
        metric_value: staffPctM,
        action_suggestion: "Justera bemanningen vid låg-traffik och optimera schemat",
        source_receipt: `staff_cost_imports (${staffCost.toFixed(0)} kr) / POS (${revM.toFixed(0)} kr)`,
      });
    }

    if (totalRev90 > 0 && weekendPct > 55) {
      insights.push({
        insight_type: "revenue_pattern",
        severity: "info",
        title: `Helger genererar ${weekendPct.toFixed(0)}% av omsättning`,
        body: `Tydlig koncentration till fre–sön. Överväg vardagskampanjer för att jämna ut beläggningen.`,
        metric_label: "Helgandel",
        metric_value: weekendPct,
        action_suggestion: "Lansera lunch- eller vardagserbjudande",
        source_receipt: `pos_daily_sales: ${weekendRev.toFixed(0)} kr helg / ${totalRev90.toFixed(0)} kr totalt, senaste 90 dagar`,
      });
    }

    if (avgTicket > 0) {
      insights.push({
        insight_type: "avg_ticket",
        severity: "info",
        title: `Snittnota ${avgTicket.toFixed(0)} kr`,
        body: `${txns} notor denna månad. 10% mersälj = +${(revM * 0.1).toFixed(0)} kr.`,
        metric_label: "Snittnota",
        metric_value: avgTicket,
        action_suggestion: "Träna personal i mersälj (förrätt/dessert/dryck)",
        source_receipt: `${txns} transaktioner / ${revM.toFixed(0)} kr omsättning denna månad`,
      });
    }

    (suppliers.data ?? []).forEach((s: any) => {
      insights.push({
        insight_type: "supplier_anomaly",
        severity: Math.abs(Number(s.price_change_pct ?? 0)) > 15 ? "warn" : "info",
        title: `${s.supplier_name} ${s.price_change_pct > 0 ? "höjt" : "sänkt"} priser ${Math.abs(s.price_change_pct).toFixed(1)}%`,
        body: `Senaste fakturan ${Number(s.last_invoice_amount).toLocaleString("sv-SE")} kr. Kontrollera prisavtal.`,
        metric_label: "Prisförändring",
        metric_value: s.last_invoice_amount,
        metric_change_pct: s.price_change_pct,
        action_suggestion: "Kontakta leverantören, jämför med alternativ",
        source_receipt: `Senaste 2 fakturor från ${s.supplier_name} mot 90-dagars rullande snitt`,
      });
    });

    if (revM === 0) {
      insights.push({
        insight_type: "setup",
        severity: "info",
        title: "Inga dagskassor registrerade",
        body: "Anslut kassaregistret eller registrera dagskassor manuellt för att aktivera insikter.",
        action_suggestion: "Gå till /workspace/hospitality/onboarding",
        source_receipt: "pos_daily_sales tom för innevarande månad",
      });
    }

    // Replace this month's insights
    await supabase
      .from("hospitality_insights")
      .delete()
      .eq("company_id", company_id)
      .eq("period_month", monthStart);

    if (insights.length > 0) {
      await supabase.from("hospitality_insights").insert(
        insights.map((i) => ({
          company_id,
          period_month: monthStart,
          ...i,
          source_data: { revenue: revM, foodCost: foodM, staffCost, txns },
        })),
      );
    }

    return new Response(
      JSON.stringify({
        created: insights.length,
        kpis: { revenue: revM, foodCostPct: foodPctM, staffCostPct: staffPctM, avgTicket },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("hospitality-ai-insights error", e);
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
