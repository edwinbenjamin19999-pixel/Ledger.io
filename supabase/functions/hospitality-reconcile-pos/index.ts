// Hospitality: nightly POS↔bank reconciliation
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const dayDiff = (a: string, b: string) =>
  Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86_400_000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { company_id, lookback_days = 30 } = await req.json();
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

    const since = new Date();
    since.setDate(since.getDate() - lookback_days);
    const sinceStr = since.toISOString().slice(0, 10);

    const [posRes, bankRes] = await Promise.all([
      supabase
        .from("pos_daily_sales")
        .select("sale_date, total_sales, card_amount, swish_amount, cash_amount")
        .eq("company_id", company_id)
        .gte("sale_date", sinceStr),
      supabase
        .from("bank_transactions")
        .select("id, booking_date, amount, description, counterparty_name")
        .eq("company_id", company_id)
        .gte("booking_date", sinceStr)
        .gt("amount", 0),
    ]);

    const posDays = posRes.data ?? [];
    const bankTxs = (bankRes.data ?? []) as Array<{ id: string; booking_date: string; amount: number }>;
    const used = new Set<string>();
    let matchedCount = 0;
    let flaggedCount = 0;

    for (const day of posDays) {
      const expectedNonCash =
        Number(day.card_amount ?? 0) +
        Number(day.swish_amount ?? 0) ||
        Number(day.total_sales ?? 0) - Number(day.cash_amount ?? 0);

      const candidates = bankTxs
        .filter((t) => !used.has(t.id) && dayDiff(t.booking_date, day.sale_date) <= 2)
        .sort(
          (a, b) => dayDiff(a.booking_date, day.sale_date) - dayDiff(b.booking_date, day.sale_date),
        );

      let running = 0;
      const matched: string[] = [];
      const targetMin = expectedNonCash * 0.99;
      const targetMax = expectedNonCash * 1.01;
      for (const c of candidates) {
        if (running >= targetMin) break;
        running += Number(c.amount);
        matched.push(c.id);
        if (running >= targetMin && running <= targetMax) break;
      }
      const diff = running - expectedNonCash;
      let status = "unmatched";
      if (matched.length === 0) status = "unmatched";
      else if (Math.abs(diff) <= Math.max(1, expectedNonCash * 0.01)) {
        status = "matched";
        matched.forEach((id) => used.add(id));
        matchedCount++;
      } else if (running > 0 && Math.abs(diff) / Math.max(1, expectedNonCash) < 0.05) {
        status = "partial";
      } else {
        status = "flagged";
        flaggedCount++;
      }

      await supabase.from("hospitality_reconciliation").upsert(
        {
          company_id,
          sale_date: day.sale_date,
          pos_total: day.total_sales,
          pos_card: day.card_amount ?? 0,
          pos_swish: day.swish_amount ?? 0,
          pos_cash: day.cash_amount ?? 0,
          bank_matched_total: running,
          diff_amount: diff,
          status,
          matched_transaction_ids: matched,
        },
        { onConflict: "company_id,sale_date" },
      );
    }

    return new Response(
      JSON.stringify({
        analyzed: posDays.length,
        matched: matchedCount,
        flagged: flaggedCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("hospitality-reconcile-pos error", e);
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
