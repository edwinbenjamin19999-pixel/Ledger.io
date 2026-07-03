// supabase/functions/verify-cosigner-token/index.ts
//
// Public (no JWT). Looks up an invite by token and returns the minimum data
// needed to render the /co-sign page: company name, initiator name, document
// version, signatory rule, and whether the token has already been used or expired.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey);

    const { token } = await req.json();
    if (!token || typeof token !== "string") {
      return new Response(JSON.stringify({ error: "Missing token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: signer } = await admin
      .from("co_signature_signers")
      .select(
        "id, name, email, role, signed_at, co_signature_id"
      )
      .eq("token", token)
      .maybeSingle();

    if (!signer) {
      return new Response(JSON.stringify({ valid: false, reason: "not_found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: cs } = await admin
      .from("co_signatures")
      .select(
        "id, status, expires_at, document_type, document_version, signatory_rule_text, company_id"
      )
      .eq("id", signer.co_signature_id)
      .maybeSingle();

    if (!cs) {
      return new Response(JSON.stringify({ valid: false, reason: "not_found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (cs.status === "complete") {
      return new Response(
        JSON.stringify({ valid: false, reason: "already_complete" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (signer.signed_at) {
      return new Response(
        JSON.stringify({ valid: false, reason: "already_signed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (cs.expires_at && new Date(cs.expires_at).getTime() < Date.now()) {
      return new Response(
        JSON.stringify({ valid: false, reason: "expired" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: company } = await admin
      .from("companies")
      .select("name, org_number")
      .eq("id", cs.company_id)
      .maybeSingle();

    const { data: initiator } = await admin
      .from("co_signature_signers")
      .select("name, email")
      .eq("co_signature_id", cs.id)
      .eq("role", "initiator")
      .maybeSingle();

    return new Response(
      JSON.stringify({
        valid: true,
        signerName: signer.name,
        signerEmail: signer.email,
        company: company ?? null,
        initiator: initiator ?? null,
        documentType: cs.document_type,
        documentVersion: cs.document_version,
        signatoryRule: cs.signatory_rule_text,
        expiresAt: cs.expires_at,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[verify-cosigner-token]", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
