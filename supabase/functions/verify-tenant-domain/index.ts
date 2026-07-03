import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth client (validates the user JWT)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const tenantId = body?.tenant_id;
    if (!tenantId || typeof tenantId !== "string") {
      return new Response(JSON.stringify({ error: "tenant_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service-role client for DB ops + admin check
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: isAdmin } = await admin.rpc("is_tenant_admin", {
      _user_id: userData.user.id, _tenant_id: tenantId,
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: tenant, error: tErr } = await admin
      .from("tenants")
      .select("id, domain, domain_verification_token")
      .eq("id", tenantId).maybeSingle();

    if (tErr || !tenant) {
      return new Response(JSON.stringify({ error: "Tenant not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!tenant.domain || !tenant.domain_verification_token) {
      return new Response(JSON.stringify({ verified: false, message: "Ingen domän eller token konfigurerad" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expected = `northledger-verify=${tenant.domain_verification_token}`;
    const lookupName = `_northledger-verify.${tenant.domain}`;

    let verified = false;
    let message = "";
    try {
      // Deno.resolveDns returns string[][] for TXT records
      const records = await Deno.resolveDns(lookupName, "TXT");
      const flat = records.flat().map((r) => r.trim());
      verified = flat.some((r) => r === expected);
      if (!verified) message = `TXT-post hittades men matchade inte. Hittat: ${flat.join(", ") || "(inga)"}`;
    } catch (e) {
      message = `DNS-uppslag misslyckades: ${(e as Error).message}. Kontrollera att TXT-posten har publicerats.`;
    }

    const newStatus = verified ? "verified" : "failed";
    await admin.from("tenants").update({
      domain_status: newStatus,
      domain_verified_at: verified ? new Date().toISOString() : null,
    }).eq("id", tenantId);

    return new Response(JSON.stringify({ verified, status: newStatus, message }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
