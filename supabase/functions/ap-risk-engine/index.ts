// AP Risk Engine — single source of truth for invoice risk scoring
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

interface ReqBody {
  invoice_id: string;
}

Deno.serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;

  try {
    const { invoice_id } = (await req.json()) as ReqBody;
    if (!invoice_id) {
      return new Response(JSON.stringify({ error: "invoice_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Load invoice
    const { data: inv, error: ie } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoice_id)
      .single();
    if (ie || !inv) throw new Error(ie?.message ?? "Invoice not found");

    // Load supplier profile (if exists)
    const { data: profile } = await supabase
      .from("supplier_profiles")
      .select("*")
      .eq("company_id", inv.company_id)
      .eq("supplier_name", inv.counterparty_name)
      .maybeSingle();

    // Recent invoices for duplicate / anomaly detection
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const { data: recent } = await supabase
      .from("invoices")
      .select("id,total_amount,invoice_date,bg_pg")
      .eq("company_id", inv.company_id)
      .eq("counterparty_name", inv.counterparty_name)
      .gte("invoice_date", sixtyDaysAgo)
      .neq("id", invoice_id);

    type Sig = {
      kind: string;
      severity: "low" | "medium" | "high" | "critical";
      score: number;
      message: string;
    };
    const signals: Sig[] = [];

    // 1. New supplier
    if (!profile || !profile.is_confirmed) {
      signals.push({
        kind: "new_supplier",
        severity: "high",
        score: 30,
        message: "Leverantören saknar bekräftad historik.",
      });
    }

    // 2. BG/PG changed
    if (profile && inv.bg_pg && profile.known_bg_pg?.length) {
      if (!profile.known_bg_pg.includes(inv.bg_pg)) {
        signals.push({
          kind: "bg_changed",
          severity: "critical",
          score: 45,
          message: `Nytt BG/PG (${inv.bg_pg}) — historiskt: ${profile.known_bg_pg.join(", ")}`,
        });
      }
    }

    // 3. Amount anomaly (>20% over average)
    if (profile?.avg_amount && profile.avg_amount > 0) {
      const dev = (inv.total_amount - profile.avg_amount) / profile.avg_amount;
      if (Math.abs(dev) > 0.2) {
        signals.push({
          kind: "amount_anomaly",
          severity: Math.abs(dev) > 0.5 ? "high" : "medium",
          score: Math.min(25, Math.round(Math.abs(dev) * 25)),
          message: `Avvikelse ${(dev * 100).toFixed(0)}% från snitt (${profile.avg_amount} kr).`,
        });
      }
    }

    // 4. Duplicate detection
    const dup = (recent ?? []).find(
      (r) => Math.abs(r.total_amount - inv.total_amount) < 1,
    );
    if (dup) {
      signals.push({
        kind: "duplicate",
        severity: "high",
        score: 35,
        message: `Möjlig dubblett av faktura från ${dup.invoice_date}.`,
      });
    }

    // 5. Missing data
    if (!inv.bg_pg && !inv.counterparty_org_number) {
      signals.push({
        kind: "missing_data",
        severity: "medium",
        score: 10,
        message: "Saknar både BG/PG och org.nr.",
      });
    }

    // Replace existing unresolved signals OWNED by this engine (keep overbilling/duplicate_period from sub-detector)
    await supabase
      .from("invoice_risk_signals")
      .delete()
      .eq("invoice_id", invoice_id)
      .in("kind", ["new_supplier", "bg_changed", "amount_anomaly", "duplicate", "missing_data"])
      .is("resolved_at", null);

    if (signals.length > 0) {
      await supabase.from("invoice_risk_signals").insert(
        signals.map((s) => ({
          invoice_id,
          company_id: inv.company_id,
          kind: s.kind,
          severity: s.severity,
          score_contribution: s.score,
          details: { message: s.message },
        })),
      );
    }

    // Invoke overbilling sub-detector (writes its own signals)
    try {
      await supabase.functions.invoke("ap-overbilling-detect", {
        body: { invoice_id },
      });
    } catch (e) {
      console.warn("[ap-risk-engine] overbilling detector failed:", e);
    }

    // Re-aggregate score from ALL unresolved signals (ours + sub-detector's)
    const { data: allSignals } = await supabase
      .from("invoice_risk_signals")
      .select("score_contribution")
      .eq("invoice_id", invoice_id)
      .is("resolved_at", null);
    const score = Math.min(
      100,
      (allSignals ?? []).reduce((s, x) => s + Number(x.score_contribution ?? 0), 0),
    );
    const level: "safe" | "warning" | "high" =
      score >= 71 ? "high" : score >= 41 ? "warning" : "safe";

    // Flagged suppliers get a stricter auto-block threshold (60 vs 75)
    const blockThreshold = profile?.flagged ? 60 : 75;
    const isBlocked = score >= blockThreshold;

    await supabase
      .from("invoices")
      .update({
        risk_score: score,
        risk_level: level,
        is_blocked: isBlocked,
        risk_last_evaluated_at: new Date().toISOString(),
      })
      .eq("id", invoice_id);

    return new Response(
      JSON.stringify({ invoice_id, risk_score: score, risk_level: level, is_blocked: isBlocked, signals }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
