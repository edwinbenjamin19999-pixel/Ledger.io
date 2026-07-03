import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VISMA_AUTH_URL = "https://identity.vismaonline.com/connect/authorize";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const VISMA_CLIENT_ID = Deno.env.get("VISMA_CLIENT_ID");
    if (!VISMA_CLIENT_ID) {
      return new Response(
        JSON.stringify({
          error:
            "Visma-integrationen är inte konfigurerad ännu. Plattformsadministratören behöver lägga till VISMA_CLIENT_ID och VISMA_CLIENT_SECRET.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { companyId, redirectUri, scopes } = await req.json();
    if (!companyId || !redirectUri || !Array.isArray(scopes)) {
      return new Response(JSON.stringify({ error: "Bad request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stateBytes = new Uint8Array(24);
    crypto.getRandomValues(stateBytes);
    const state = Array.from(stateBytes, (b) => b.toString(16).padStart(2, "0")).join("");

    const { error: insertErr } = await supabase.from("visma_oauth_states").insert({
      state,
      user_id: userData.user.id,
      company_id: companyId,
    });
    if (insertErr) throw insertErr;

    const params = new URLSearchParams({
      client_id: VISMA_CLIENT_ID,
      redirect_uri: redirectUri,
      scope: scopes.join(" "),
      state,
      response_type: "code",
      acr_values: "service:eaccounting",
    });

    return new Response(
      JSON.stringify({ authUrl: `${VISMA_AUTH_URL}?${params.toString()}`, state }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("visma-oauth-start error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
