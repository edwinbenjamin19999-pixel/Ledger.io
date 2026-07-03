import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user?.email) throw new Error("Not authenticated");

    const user = userData.user;
    console.log("[CHECK-SUBSCRIPTION] User:", user.email);

    // Check local subscriptions table first
    const { data: localSub } = await supabaseClient
      .from("subscriptions")
      .select("status, tier, end_date, stripe_subscription_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (localSub && ["active", "trialing"].includes(localSub.status)) {
      return new Response(JSON.stringify({
        subscribed: true,
        tier: localSub.tier || "standard",
        status: localSub.status,
        subscription_end: localSub.end_date,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // No local sub found, return unsubscribed
    return new Response(JSON.stringify({ subscribed: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[CHECK-SUBSCRIPTION] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
