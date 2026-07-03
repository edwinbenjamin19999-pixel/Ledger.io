// AP Overbilling Detector — emits 'overbilling' and 'duplicate_period' signals.
// Designed to be invoked by ap-risk-engine BEFORE the engine aggregates the score.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

interface ReqBody {
  invoice_id: string;
}

type Severity = "low" | "medium" | "high" | "critical";
interface Signal {
  kind: "overbilling" | "duplicate_period" | "unit_price_drift";
  severity: Severity;
  score_contribution: number;
  details: Record<string, unknown>;
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

    const { data: inv, error: ie } = await supabase
      .from("invoices")
      .select("id, company_id, supplier_id, counterparty_name, total_amount, invoice_date")
      .eq("id", invoice_id)
      .single();
    if (ie || !inv) throw new Error(ie?.message ?? "Invoice not found");

    if (!inv.supplier_id) {
      return new Response(JSON.stringify({ signals: [], skipped: "no_supplier_id" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load supplier baseline
    const { data: profile } = await supabase
      .from("supplier_profiles")
      .select("id, avg_amount_12m, stddev_amount_12m, last_amount, last_invoice_date, typical_interval_days, invoice_count, flagged")
      .eq("id", inv.supplier_id)
      .maybeSingle();

    const signals: Signal[] = [];

    // Skip if not enough history (< 3 paid invoices)
    if (!profile || (profile.invoice_count ?? 0) < 3) {
      // Still check duplicate period via recent invoices
      await checkDuplicatePeriod(supabase, inv, profile, signals);
      await persistSignals(supabase, invoice_id, inv.company_id, signals);
      return new Response(
        JSON.stringify({ signals, skipped: "insufficient_history" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const avg = Number(profile.avg_amount_12m ?? 0);
    const amt = Number(inv.total_amount ?? 0);

    // 1. Look up active contract (highest precedence)
    const today = inv.invoice_date ?? new Date().toISOString().slice(0, 10);
    const { data: contract } = await supabase
      .from("supplier_contracts")
      .select("monthly_amount")
      .eq("company_id", inv.company_id)
      .eq("supplier_id", inv.supplier_id)
      .lte("valid_from", today)
      .or(`valid_to.is.null,valid_to.gte.${today}`)
      .order("valid_from", { ascending: false })
      .limit(1)
      .maybeSingle();

    // 2. Price spike detection
    if (contract && contract.monthly_amount > 0) {
      const ratio = amt / Number(contract.monthly_amount);
      if (ratio > 1.10) {
        const devPct = Math.round((ratio - 1) * 100);
        const sev: Severity = devPct > 35 ? "high" : "medium";
        signals.push({
          kind: "overbilling",
          severity: sev,
          score_contribution: sev === "high" ? 30 : 15,
          details: {
            baseline: Number(contract.monthly_amount),
            deviation_pct: devPct,
            source: "contract",
            message: `${devPct}% över avtalspris (${Number(contract.monthly_amount).toLocaleString("sv-SE")} kr/mån).`,
          },
        });
      }
    } else if (avg > 0 && amt > avg * 1.20) {
      const devPct = Math.round(((amt - avg) / avg) * 100);
      const sev: Severity = devPct > 35 ? "high" : "medium";
      signals.push({
        kind: "overbilling",
        severity: sev,
        score_contribution: sev === "high" ? 30 : 15,
        details: {
          baseline: Math.round(avg),
          deviation_pct: devPct,
          source: "history",
          message: `${devPct}% över snittet (${Math.round(avg).toLocaleString("sv-SE")} kr senaste 12 mån).`,
        },
      });
    }

    // 3. Duplicate period
    await checkDuplicatePeriod(supabase, inv, profile, signals);

    await persistSignals(supabase, invoice_id, inv.company_id, signals);

    return new Response(JSON.stringify({ signals }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function checkDuplicatePeriod(
  supabase: ReturnType<typeof createClient>,
  inv: { id: string; company_id: string; supplier_id: string | null; invoice_date: string | null },
  profile: { typical_interval_days: number | null } | null,
  signals: Signal[],
) {
  if (!profile?.typical_interval_days || !inv.invoice_date || !inv.supplier_id) return;
  const windowDays = Math.max(5, Math.round(profile.typical_interval_days * 0.6));
  const from = new Date(new Date(inv.invoice_date).getTime() - windowDays * 86400000)
    .toISOString()
    .slice(0, 10);
  const { data: nearby } = await supabase
    .from("invoices")
    .select("id, invoice_date")
    .eq("company_id", inv.company_id)
    .eq("supplier_id", inv.supplier_id)
    .neq("id", inv.id)
    .gte("invoice_date", from)
    .lte("invoice_date", inv.invoice_date)
    .limit(1);
  if (nearby && nearby.length > 0) {
    signals.push({
      kind: "duplicate_period",
      severity: "high",
      score_contribution: 25,
      details: {
        message: `Annan faktura från samma leverantör inom ${windowDays} dagar (${nearby[0].invoice_date}).`,
        related_invoice_id: nearby[0].id,
      },
    });
  }
}

async function persistSignals(
  supabase: ReturnType<typeof createClient>,
  invoiceId: string,
  companyId: string,
  signals: Signal[],
) {
  // Remove previous unresolved signals of these kinds (we are the source of truth)
  await supabase
    .from("invoice_risk_signals")
    .delete()
    .eq("invoice_id", invoiceId)
    .in("kind", ["overbilling", "duplicate_period", "unit_price_drift"])
    .is("resolved_at", null);

  if (signals.length === 0) return;
  await supabase.from("invoice_risk_signals").insert(
    signals.map((s) => ({
      invoice_id: invoiceId,
      company_id: companyId,
      kind: s.kind,
      severity: s.severity,
      score_contribution: s.score_contribution,
      details: s.details,
    })),
  );
}
