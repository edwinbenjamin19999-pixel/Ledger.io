import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const url = new URL(req.url);
  const env = (url.searchParams.get('env') || 'sandbox') as StripeEnv;

  try {
    const event = await verifyWebhook(req, env);
    console.log("[PAYMENTS-WEBHOOK] Event:", event.type, "env:", env);

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpsert(event.data.object, env);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object, env);
        break;
      case "invoice.payment_failed":
        console.log("[PAYMENTS-WEBHOOK] Payment failed:", event.data.object.id);
        break;
      default:
        console.log("[PAYMENTS-WEBHOOK] Unhandled:", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[PAYMENTS-WEBHOOK] Error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});

async function handleSubscriptionUpsert(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("[PAYMENTS-WEBHOOK] No userId in metadata");
    return;
  }

  const item = subscription.items?.data?.[0];
  const priceId = item?.price?.metadata?.lovable_external_id || item?.price?.id;
  const productId = item?.price?.product;
  const periodStart = subscription.current_period_start;
  const periodEnd = subscription.current_period_end;

  const { error } = await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
      product_id: productId,
      stripe_price_id: priceId,
      status: subscription.status,
      start_date: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      end_date: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      environment: env,
      tier: "standard",
      monthly_price: 399,
      billing_cycle: "monthly",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" }
  );

  if (error) console.error("[PAYMENTS-WEBHOOK] Upsert error:", error);
  else console.log("[PAYMENTS-WEBHOOK] Subscription upserted:", subscription.id);
}

async function handleSubscriptionDeleted(subscription: any, env: StripeEnv) {
  const { error } = await supabase
    .from("subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);

  if (error) console.error("[PAYMENTS-WEBHOOK] Delete error:", error);
  else console.log("[PAYMENTS-WEBHOOK] Subscription canceled:", subscription.id);
}
