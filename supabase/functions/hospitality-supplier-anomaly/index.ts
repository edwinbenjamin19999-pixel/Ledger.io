// Hospitality: supplier price-anomaly detection
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const categoryFor = (acc: string): string => {
  if (acc.startsWith("4010") || acc.startsWith("4011") || acc.startsWith("4012")) return "food";
  if (acc.startsWith("4020") || acc.startsWith("4021")) return "beverage";
  if (acc.startsWith("5410") || acc.startsWith("6110")) return "supplies";
  if (acc.startsWith("65") || acc.startsWith("64")) return "services";
  return "other";
};

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

    const since = new Date();
    since.setDate(since.getDate() - 90);
    const sinceStr = since.toISOString().slice(0, 10);

    // Pull supplier invoices in the relevant cost accounts
    const { data: invoices } = await supabase
      .from("invoices")
      .select("id, supplier_name, total_amount, invoice_date, account_number")
      .eq("company_id", company_id)
      .eq("invoice_type", "supplier")
      .gte("invoice_date", sinceStr)
      .order("invoice_date", { ascending: false });

    const grouped = new Map<string, Array<{ amount: number; date: string; account: string }>>();
    (invoices ?? []).forEach((inv: any) => {
      const name = (inv.supplier_name ?? "").trim();
      if (!name) return;
      const cat = categoryFor(String(inv.account_number ?? ""));
      const key = `${name}::${cat}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push({
        amount: Number(inv.total_amount ?? 0),
        date: inv.invoice_date,
        account: inv.account_number ?? "",
      });
    });

    let analyzed = 0;
    let alerts = 0;

    for (const [key, list] of grouped.entries()) {
      const [name, category] = key.split("::");
      list.sort((a, b) => (a.date < b.date ? 1 : -1));
      const last = list[0];
      const prev = list[1];
      const total30 = list
        .filter((x) => new Date(x.date).getTime() > Date.now() - 30 * 86_400_000)
        .reduce((s, x) => s + x.amount, 0);
      const total90 = list.reduce((s, x) => s + x.amount, 0);
      const avg = total90 / Math.max(1, list.length);
      const deltaPct = prev && prev.amount > 0 ? ((last.amount - prev.amount) / prev.amount) * 100 : 0;
      const alertActive = Math.abs(deltaPct) > 10 && list.length >= 2;
      if (alertActive) alerts++;
      analyzed++;

      await supabase.from("hospitality_supplier_intelligence").upsert(
        {
          company_id,
          supplier_name: name,
          category,
          account_number: last.account,
          invoice_count: list.length,
          avg_invoice_amount: avg,
          last_invoice_amount: last.amount,
          prev_invoice_amount: prev?.amount ?? null,
          last_invoice_date: last.date,
          prev_invoice_date: prev?.date ?? null,
          price_change_pct: deltaPct,
          rolling_30d_total: total30,
          rolling_90d_total: total90,
          alert_active: alertActive,
          alert_reason: alertActive
            ? `Pris ${deltaPct > 0 ? "höjt" : "sänkt"} ${Math.abs(deltaPct).toFixed(1)}% sedan föregående faktura`
            : null,
          computed_at: new Date().toISOString(),
        },
        { onConflict: "company_id,supplier_name,category" },
      );
    }

    return new Response(JSON.stringify({ analyzed, alerts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("hospitality-supplier-anomaly error", e);
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
