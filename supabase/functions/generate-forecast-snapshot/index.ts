// generate-forecast-snapshot
// Core engine: builds a deterministic forecast, persists snapshot + daily points,
// logs to calculation_audit_log. Idempotent via input_hash (5-min cache).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CashEvent {
  date: string;
  amount: number;
  source_type: string;
  source_ref_id?: string;
  confidence?: number;
  label?: string;
}

const MODEL_VERSION = "cashflow_engine_v1";
const CACHE_TTL_MS = 5 * 60 * 1000;

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function classifyRisk(closing: number, opening: number): string {
  if (closing < 0) return "critical";
  if (closing < Math.abs(opening) * 0.1 && closing < 50_000) return "warning";
  return "normal";
}

function hashInput(obj: unknown): string {
  const str = JSON.stringify(obj);
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return `h${Math.abs(h).toString(36)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const t0 = Date.now();

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  try {
    const { company_id, horizon_days = 90, scenario_id, force = false } = await req.json();
    if (!company_id) throw new Error("company_id required");

    const today = new Date().toISOString().slice(0, 10);
    const horizonEnd = addDays(today, horizon_days);

    // 1. Load all input data in parallel
    const [accountsRes, arRes, apRes, recurringRes, scenarioAdjRes, burnRes] = await Promise.all([
      supabase.from("bank_accounts").select("id, balance, last_synced_at").eq("company_id", company_id).eq("is_active", true),
      supabase.from("invoices").select("id, total_amount, due_date, status, customer_name, invoice_direction").eq("company_id", company_id).eq("invoice_direction", "outgoing").in("status", ["sent", "overdue"]).lte("due_date", horizonEnd),
      supabase.from("invoices").select("id, total_amount, due_date, status, customer_name, invoice_direction").eq("company_id", company_id).eq("invoice_direction", "incoming").in("status", ["sent", "overdue", "attested"]).lte("due_date", horizonEnd),
      supabase.from("recurring_cash_events").select("id, label, expected_amount, direction, next_expected_date, frequency, confidence_score").eq("company_id", company_id).eq("active", true).lte("next_expected_date", horizonEnd),
      scenario_id ? supabase.from("scenario_adjustments").select("*").eq("scenario_id", scenario_id) : Promise.resolve({ data: [] }),
      supabase.from("bank_transactions").select("amount").eq("company_id", company_id).lt("amount", 0).gte("booking_date", addDays(today, -90)),
    ]);

    const start_balance = (accountsRes.data ?? []).reduce((s, a) => s + (Number(a.balance) || 0), 0);
    const burn_total = (burnRes.data ?? []).reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);
    const burn_rate_daily = burn_total / 90;

    // 2. Build event list
    const events: CashEvent[] = [];

    for (const inv of arRes.data ?? []) {
      events.push({
        date: inv.due_date,
        amount: Number(inv.total_amount) || 0,
        source_type: "invoice_ar",
        source_ref_id: inv.id,
        confidence: 0.75,
        label: inv.customer_name ?? "Kundfaktura",
      });
    }
    for (const inv of apRes.data ?? []) {
      events.push({
        date: inv.due_date,
        amount: -(Number(inv.total_amount) || 0),
        source_type: "invoice_ap",
        source_ref_id: inv.id,
        confidence: 0.95,
        label: inv.customer_name ?? "Leverantörsfaktura",
      });
    }
    for (const ev of recurringRes.data ?? []) {
      // Project recurring events across horizon
      let date = ev.next_expected_date;
      while (date <= horizonEnd) {
        const sign = ev.direction === "inflow" ? 1 : -1;
        events.push({
          date,
          amount: sign * Number(ev.expected_amount),
          source_type: "recurring",
          source_ref_id: ev.id,
          confidence: Number(ev.confidence_score) || 0.7,
          label: ev.label,
        });
        // Advance per frequency
        const step = ev.frequency === "weekly" ? 7 : ev.frequency === "quarterly" ? 90 : ev.frequency === "yearly" ? 365 : 30;
        date = addDays(date, step);
      }
    }

    // 3. Apply scenario adjustments
    for (const adj of (scenarioAdjRes.data ?? []) as any[]) {
      if (adj.adjustment_type === "delay_payment" && adj.reference_entity_id) {
        const ev = events.find((e) => e.source_ref_id === adj.reference_entity_id);
        if (ev) ev.date = addDays(ev.date, adj.delta_days || 0);
      } else if (adj.adjustment_type === "accelerate_invoice" && adj.reference_entity_id) {
        const ev = events.find((e) => e.source_ref_id === adj.reference_entity_id);
        if (ev) ev.date = addDays(ev.date, adj.delta_days || 0);
      } else if (adj.adjustment_type === "add_cost") {
        events.push({ date: adj.payload_json?.date ?? today, amount: -Math.abs(adj.delta_amount || 0), source_type: "scenario", confidence: 1, label: adj.payload_json?.label ?? "Scenario-kostnad" });
      } else if (adj.adjustment_type === "remove_cost" && adj.reference_entity_id) {
        const idx = events.findIndex((e) => e.source_ref_id === adj.reference_entity_id);
        if (idx >= 0) events.splice(idx, 1);
      }
    }

    // 4. Idempotency check via input_hash
    const input_hash = hashInput({ start_balance: Math.round(start_balance), today, horizon_days, scenario_id: scenario_id ?? null, events: events.map((e) => `${e.date}:${Math.round(e.amount)}:${e.source_type}`).sort() });

    if (!force) {
      const { data: cached } = await supabase
        .from("forecast_snapshots")
        .select("*")
        .eq("company_id", company_id)
        .eq("input_hash", input_hash)
        .gte("generated_at", new Date(Date.now() - CACHE_TTL_MS).toISOString())
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cached) {
        return new Response(JSON.stringify({ snapshot: cached, cached: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // 5. Project day-by-day
    const byDate = new Map<string, CashEvent[]>();
    for (const e of events) {
      if (!byDate.has(e.date)) byDate.set(e.date, []);
      byDate.get(e.date)!.push(e);
    }

    const daily_points: any[] = [];
    let balance = start_balance;
    let lowest = start_balance;
    let lowestDate = today;
    let runway: number | null = null;

    for (let i = 0; i < horizon_days; i++) {
      const date = addDays(today, i);
      const dayEvents = byDate.get(date) ?? [];
      const inflows = dayEvents.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0);
      const outflows = dayEvents.filter((e) => e.amount < 0).reduce((s, e) => s + Math.abs(e.amount), 0);
      const net = inflows - outflows;
      const opening = balance;
      balance = balance + net;

      const confs = dayEvents.map((e) => e.confidence ?? 0.85);
      const dayConf = confs.length ? confs.reduce((s, c) => s + c, 0) / confs.length : 0.85;

      daily_points.push({
        date,
        opening_balance: opening,
        expected_inflows: inflows,
        expected_outflows: outflows,
        net_change: net,
        closing_balance: balance,
        confidence_score: dayConf,
        risk_level: classifyRisk(balance, opening),
      });

      if (balance < lowest) { lowest = balance; lowestDate = date; }
      if (runway === null && balance <= 0) runway = i;
    }

    if (runway === null && burn_rate_daily > 0) runway = horizon_days + Math.max(0, Math.round(balance / burn_rate_daily));

    // 6. Persist snapshot + points
    const { data: snapshot, error: snapErr } = await supabase
      .from("forecast_snapshots")
      .insert({
        company_id,
        scenario_id: scenario_id ?? null,
        horizon_days,
        baseline_balance: start_balance,
        lowest_cash_point: lowest,
        lowest_cash_date: lowestDate,
        runway_days: runway,
        burn_rate_monthly: burn_rate_daily * 30,
        model_version: MODEL_VERSION,
        input_hash,
        output_json: { event_count: events.length, ar_count: arRes.data?.length ?? 0, ap_count: apRes.data?.length ?? 0, recurring_count: recurringRes.data?.length ?? 0 },
      })
      .select()
      .single();
    if (snapErr) throw snapErr;

    // Insert daily points (chunked)
    const chunks = [];
    for (let i = 0; i < daily_points.length; i += 100) chunks.push(daily_points.slice(i, i + 100).map((p) => ({ ...p, snapshot_id: snapshot.id })));
    for (const chunk of chunks) {
      await supabase.from("forecast_daily_points").insert(chunk);
    }

    // 7. Audit log
    await supabase.from("calculation_audit_log").insert({
      company_id,
      calculation_type: "forecast_snapshot",
      trigger_source: scenario_id ? "scenario" : "manual",
      input_refs: { start_balance, horizon_days, scenario_id, event_count: events.length },
      output_refs: { snapshot_id: snapshot.id, runway_days: runway, lowest_cash_point: lowest },
      model_version: MODEL_VERSION,
      duration_ms: Date.now() - t0,
      status: "success",
    });

    return new Response(JSON.stringify({ snapshot, daily_points, cached: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
