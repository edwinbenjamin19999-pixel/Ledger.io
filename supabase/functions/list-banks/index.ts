import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { ebFetch } from "../_shared/enable-banking.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resp = await ebFetch("/aspsps?country=SE&service=AIS&psu_type=business");
    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`Enable Banking API error [${resp.status}]: ${body}`);
    }

    const data = await resp.json();
    const aspsps = (data.aspsps || data || []);

    // Filter out sandbox/mock ASPSPs only by clear name/environment markers.
    // Note: most live ASPSPs in Enable Banking expose a `sandbox` metadata
    // object with sandbox PSU credentials — its presence does NOT mean the
    // ASPSP itself is a sandbox bank. Filtering on it removed real banks like
    // Handelsbanken, SEB and Swedbank.
    const isSandbox = (b: any) => {
      const n = String(b?.name || "").toLowerCase();
      const displayName = String(b?.display_name || "").toLowerCase();
      const env = String(b?.environment || "").toLowerCase();

      return (
        env === "sandbox" ||
        env === "test" ||
        n === "mock aspsp" ||
        n === "test aspsp" ||
        n.includes("enable banking sandbox") ||
        displayName.includes("enable banking sandbox")
      );
    };

    const businessBanks = aspsps.filter((b: any) => {
      if (isSandbox(b)) return false;
      const psuTypes = Array.isArray(b?.psu_types) ? b.psu_types : [];
      if (!psuTypes.includes("business")) return false;

      const authMethods = Array.isArray(b?.auth_methods) ? b.auth_methods : [];
      return authMethods.some((method: any) => method?.psu_type === "business" && !method?.hidden_method);
    });

    const banks = businessBanks
      .map((b: any) => {
        const authMethods = Array.isArray(b?.auth_methods) ? b.auth_methods : [];
        const businessMethod = authMethods.find((method: any) => method?.psu_type === "business" && !method?.hidden_method);

        return ({
        // POST /auth expects the exact ASPSP name, not our own derived id.
        id: b.name,
        name: b.display_name || b.name,
        bic: b.bic || null,
        logo: b.logo || null,
        countries: b.countries || ["SE"],
        provider_id: b.id || b.uuid || null,
        auth_method: businessMethod?.name || null,
      })})
      .sort((a: any, b: any) => a.name.localeCompare(b.name, "sv"));

    console.log(
      `[list-banks] Returning ${banks.length} live SE business AIS banks (filtered ${aspsps.length - banks.length} unsupported/sandbox entries)`
    );

    return new Response(JSON.stringify({ banks, count: banks.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error listing banks:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
