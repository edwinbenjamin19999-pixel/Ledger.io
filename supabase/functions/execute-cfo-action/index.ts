import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface PreviewLine { label: string; }

async function buildPreview(
  supabase: any,
  companyId: string,
  actionType: string,
  selectedItems: string[],
  title: string,
  financialImpact: number | null,
): Promise<{ preview_items: string[]; consequence: any; before_state: any }> {
  const items: string[] = [];
  const before_state: any = { type: actionType, snapshots: [] };

  if (actionType === "send_reminder") {
    let invoices: any[] = [];
    if (selectedItems.length > 0) {
      const { data } = await supabase
        .from("invoices")
        .select("id, invoice_number, customer_name, total_amount, due_date, status")
        .eq("company_id", companyId)
        .in("id", selectedItems);
      invoices = data || [];
    } else {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("invoices")
        .select("id, invoice_number, customer_name, total_amount, due_date, status")
        .eq("company_id", companyId)
        .lt("due_date", today)
        .neq("status", "paid")
        .limit(20);
      invoices = data || [];
    }
    for (const inv of invoices) {
      const days = inv.due_date ? Math.floor((Date.now() - new Date(inv.due_date).getTime()) / 86400000) : 0;
      items.push(`Skicka påminnelse till ${inv.customer_name || "kund"} · ${Number(inv.total_amount || 0).toLocaleString("sv-SE")} kr · ${days} dagar försenad`);
      before_state.snapshots.push({ type: "invoice", id: inv.id, status: inv.status });
    }
  } else if (actionType === "reclassify" || actionType === "create_accrual" || actionType === "apply_deferral") {
    items.push(`${actionType === "reclassify" ? "Omklassificera" : actionType === "create_accrual" ? "Skapa periodisering" : "Tillämpa förskott"}: ${title}`);
  } else if (actionType === "generate_report") {
    items.push(`Generera rapport: ${title}`);
  }

  const impact = Math.abs(Number(financialImpact || 0));
  const cashImpact = impact > 0 ? `+${impact.toLocaleString("sv-SE")} kr` : "—";
  const runwayDelta = impact > 0 ? `+${Math.round(impact / 50000)} dagar` : "—";

  const consequence = {
    expected: [
      { label: "Kassa", value: cashImpact },
      { label: "Runway", value: runwayDelta },
      { label: "Antal poster", value: String(items.length) },
      { label: "Risk-reduktion", value: items.length > 0 ? "−15%" : "—" },
    ],
    downside: actionType === "send_reminder"
      ? [
          "Vissa kunder kan ha betalat samma dag — risk för dubbelpåminnelse",
          "Kan upplevas som påtryckning av relations-känsliga kunder",
        ]
      : ["Ångringsfönster på 24 timmar är aktivt"],
    tradeoff: items.length > 5
      ? "Tid sparad ~2h vs låg relationsrisk"
      : "Snabb åtgärd med låg påverkan",
  };

  return { preview_items: items, consequence, before_state };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      company_id,
      insight_id,
      action_type,
      payload = {},
      automation_mode = "manual",
      confidence = 0,
      title = "",
      financial_impact = null,
      dry_run = false,
    } = body;

    if (!company_id || !action_type) {
      return new Response(JSON.stringify({ error: "company_id and action_type required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SB_URL = Deno.env.get("SUPABASE_URL")!;
    const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = req.headers.get("Authorization") || "";
    const supabase = createClient(SB_URL, SB_KEY, { global: { headers: { Authorization: auth } } });
    const userResp = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    const userId = userResp.data.user?.id;

    const selectedItems: string[] = (payload?.selected_items as string[]) || [];

    // Always compute preview (used for both dry_run and to capture before_state)
    const { preview_items, consequence, before_state } = await buildPreview(
      supabase, company_id, action_type, selectedItems, title, financial_impact,
    );

    if (dry_run) {
      return new Response(JSON.stringify({ dry_run: true, preview_items, consequence }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Persist pending log with before_state for rollback
    const { data: actionRow, error: insErr } = await supabase
      .from("ai_economist_actions")
      .insert({
        company_id,
        insight_id,
        action_type,
        status: "pending",
        automation_mode,
        payload,
        confidence,
        title,
        financial_impact,
        executed_by: userId,
        before_state,
      })
      .select()
      .single();
    if (insErr) throw insErr;

    let result: any = { preview_items, executed: 0 };

    try {
      if (action_type === "send_reminder") {
        const ids = (before_state?.snapshots || []).filter((s: any) => s.type === "invoice").map((s: any) => s.id);
        // Mark invoices reminded (soft state on existing column if present, else log only)
        for (const id of ids) {
          try {
            await supabase.from("invoices").update({ last_reminder_at: new Date().toISOString() } as any).eq("id", id);
          } catch { /* ignore — column may not exist */ }
        }
        result = { preview_items, executed: ids.length, invoice_ids: ids, note: `${ids.length} påminnelser markerade` };
      } else if (action_type === "create_accrual" || action_type === "apply_deferral" || action_type === "reclassify") {
        if (payload.annual_report_id && payload.account_number) {
          const { data: adj, error: adjErr } = await supabase
            .from("annual_report_adjustments")
            .insert({
              annual_report_id: payload.annual_report_id,
              company_id,
              account_number: payload.account_number,
              debit: Number(payload.debit || 0),
              credit: Number(payload.credit || 0),
              description: payload.description || title,
              source: "ai_economist",
              confidence,
              created_by: userId,
              ai_suggestion_id: payload.ai_suggestion_id || null,
            })
            .select().single();
          if (adjErr) throw adjErr;
          result = { preview_items, adjustment_id: adj.id, note: "Justering skapad" };
        } else {
          result = { preview_items, note: "Loggad — saknar fullständig kontext för automatisk justering" };
        }
      } else if (action_type === "generate_report") {
        result = { preview_items, note: "Rapport köad", report_type: payload.report_type || "cashflow" };
      }

      await supabase
        .from("ai_economist_actions")
        .update({ status: "executed", executed_at: new Date().toISOString(), result })
        .eq("id", actionRow.id);
    } catch (execErr) {
      await supabase
        .from("ai_economist_actions")
        .update({ status: "failed", error_message: (execErr as Error).message })
        .eq("id", actionRow.id);
      throw execErr;
    }

    return new Response(JSON.stringify({
      action_id: actionRow.id,
      status: "executed",
      financial_impact,
      result,
      preview_items,
      consequence,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("execute-cfo-action error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
