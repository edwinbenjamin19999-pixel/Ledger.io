import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Kivra Payment Webhook
 * Receives payment notifications from Kivra.
 * 
 * Webhook setup: POST /v2/tenant/{tenantKey}/webhook (or legacy /v1)
 * See: https://developer.kivra.com/#tag/Tenant-API-Payment-Webhooks-(Current)
 * 
 * Note: Kivra webhooks don't carry a user JWT – they are server-to-server.
 * verify_jwt = false is required in config.toml for this function.
 */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.json();
    console.log("[Kivra Webhook] Received:", JSON.stringify(payload));

    // Kivra payment webhook payload fields
    const contentKey = payload?.content_key || payload?.content_id;
    const eventType = payload?.event_type || payload?.type;

    if (!contentKey) {
      return new Response(JSON.stringify({ error: "Missing content_key" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find delivery by Kivra content ID
    const { data: delivery } = await supabase
      .from("kivra_deliveries")
      .select("*")
      .eq("kivra_content_id", contentKey)
      .maybeSingle();

    if (!delivery) {
      console.warn(`[Kivra Webhook] No delivery found for content_key=${contentKey}`);
      return new Response(JSON.stringify({ ok: true, message: "No matching delivery" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    switch (eventType) {
      case "content.delivered":
      case "delivered":
        await supabase.from("kivra_deliveries").update({
          status: "delivered",
          delivered_at: new Date().toISOString(),
        }).eq("id", delivery.id);
        break;

      case "content.read":
      case "read":
        await supabase.from("kivra_deliveries").update({
          status: "read",
        }).eq("id", delivery.id);
        break;

      case "payment.completed":
      case "paid": {
        await supabase.from("kivra_deliveries").update({
          status: "paid",
          paid_at: new Date().toISOString(),
        }).eq("id", delivery.id);

        // Auto-mark invoice as paid if linked
        if (delivery.invoice_id) {
          await supabase.from("invoices").update({
            status: "paid",
            paid_date: new Date().toISOString().split("T")[0],
          }).eq("id", delivery.invoice_id);

          console.log(`[Kivra Webhook] Invoice ${delivery.invoice_id} marked as paid`);

          // Trigger automation orchestrator for bookkeeping
          try {
            await supabase.functions.invoke("automation-orchestrator", {
              body: {
                company_id: delivery.company_id,
                trigger: "journal_entry_created",
                payload: { source: "kivra_payment", invoice_id: delivery.invoice_id },
              },
            });
          } catch (e) {
            console.warn("[Kivra Webhook] Orchestrator trigger failed (non-critical):", e);
          }
        }
        break;
      }

      default:
        console.log(`[Kivra Webhook] Unhandled event type: ${eventType}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[Kivra Webhook] Error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
