import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FORTNOX_TOKEN_URL = "https://apps.fortnox.se/oauth-v1/token";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const CLIENT_ID = Deno.env.get("FORTNOX_CLIENT_ID");
    const CLIENT_SECRET = Deno.env.get("FORTNOX_CLIENT_SECRET");
    if (!CLIENT_ID || !CLIENT_SECRET) {
      return new Response(
        JSON.stringify({ error: "Fortnox-integrationen är inte konfigurerad." }),
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { code, state, redirectUri } = await req.json();
    if (!code || !state || !redirectUri) {
      return new Response(JSON.stringify({ error: "Bad request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate state
    const { data: stateRow, error: stateErr } = await supabase
      .from("fortnox_oauth_states")
      .select("user_id, company_id, expires_at")
      .eq("state", state)
      .maybeSingle();
    if (stateErr || !stateRow) {
      return new Response(JSON.stringify({ error: "Ogiltig state-token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (stateRow.user_id !== userData.user.id) {
      return new Response(JSON.stringify({ error: "State-användare matchar inte" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (new Date(stateRow.expires_at).getTime() < Date.now()) {
      await supabase.from("fortnox_oauth_states").delete().eq("state", state);
      return new Response(JSON.stringify({ error: "State-token har upphört" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Exchange code -> tokens
    const basic = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
    const tokenResp = await fetch(FORTNOX_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basic}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenJson = await tokenResp.json();
    if (!tokenResp.ok) {
      console.error("Fortnox token exchange failed:", tokenJson);
      return new Response(
        JSON.stringify({
          error: tokenJson.error_description || tokenJson.error || "Token exchange failed",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const accessToken = tokenJson.access_token as string;
    const refreshToken = tokenJson.refresh_token as string;
    const expiresIn = Number(tokenJson.expires_in ?? 3600);
    const expiresAt = new Date(Date.now() + (expiresIn - 60) * 1000).toISOString();

    // Best-effort: get fortnox company id
    let fortnoxCompanyId: string | null = null;
    try {
      const ci = await fetch("https://api.fortnox.se/3/companyinformation", {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
      });
      if (ci.ok) {
        const j = await ci.json();
        fortnoxCompanyId =
          j?.CompanyInformation?.OrganizationNumber ??
          j?.CompanyInformation?.CompanyName ??
          null;
      }
    } catch (_) {
      /* ignore */
    }

    // Upsert connection
    const { error: upsertErr } = await supabase
      .from("fortnox_connections")
      .upsert(
        {
          company_id: stateRow.company_id,
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: expiresAt,
          fortnox_company_id: fortnoxCompanyId,
          scopes: tokenJson.scope ?? null,
        },
        { onConflict: "company_id" },
      );
    if (upsertErr) throw upsertErr;

    // Cleanup state
    await supabase.from("fortnox_oauth_states").delete().eq("state", state);

    return new Response(
      JSON.stringify({ companyId: stateRow.company_id, fortnoxCompanyId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("fortnox-oauth-callback error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
