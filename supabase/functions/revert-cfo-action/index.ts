import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action_id } = await req.json();
    if (!action_id) {
      return new Response(JSON.stringify({ error: "action_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SB_URL = Deno.env.get("SUPABASE_URL")!;
    const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = req.headers.get("Authorization") || "";
    const supabase = createClient(SB_URL, SB_KEY, { global: { headers: { Authorization: auth } } });
    const userResp = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    const userId = userResp.data.user?.id;

    const { data: action, error: getErr } = await supabase
      .from("ai_economist_actions")
      .select("*")
      .eq("id", action_id)
      .single();
    if (getErr || !action) throw getErr || new Error("Action not found");
    if (action.status === "reverted") {
      return new Response(JSON.stringify({ note: "Already reverted" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const before = action.before_state || {};
    const reversed: string[] = [];

    // Restore invoice statuses
    if (before.type === "send_reminder" && Array.isArray(before.snapshots)) {
      for (const snap of before.snapshots) {
        if (snap.type === "invoice" && snap.id) {
          try {
            await supabase.from("invoices").update({ last_reminder_at: null } as any).eq("id", snap.id);
            reversed.push(`invoice:${snap.id}`);
          } catch { /* ignore */ }
        }
      }
    }

    // Reverse adjustments
    if ((action.action_type === "create_accrual" || action.action_type === "apply_deferral" || action.action_type === "reclassify") && action.result?.adjustment_id) {
      await supabase
        .from("annual_report_adjustments")
        .update({ is_reversed: true })
        .eq("id", action.result.adjustment_id);
      reversed.push(`adjustment:${action.result.adjustment_id}`);
    }

    // Mark original action reverted
    await supabase
      .from("ai_economist_actions")
      .update({
        status: "reverted",
        reverted_at: new Date().toISOString(),
        reverted_by: userId,
      })
      .eq("id", action_id);

    // Insert audit counter-row
    await supabase.from("ai_economist_actions").insert({
      company_id: action.company_id,
      insight_id: action.insight_id,
      action_type: action.action_type,
      status: "executed",
      automation_mode: action.automation_mode,
      payload: { reversal_of: action_id },
      confidence: action.confidence,
      title: `Ångring: ${action.title || ""}`,
      financial_impact: action.financial_impact != null ? -Number(action.financial_impact) : null,
      executed_by: userId,
      executed_at: new Date().toISOString(),
      reverted_from: action_id,
      result: { reversed },
    });

    return new Response(JSON.stringify({ ok: true, reversed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("revert-cfo-action error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
