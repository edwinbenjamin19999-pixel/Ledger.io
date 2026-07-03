// Public-facing submit wrapper used by /sign-skv/:envelopeId after BankID
// completes. Verifies the envelope's public_token against the database
// (no JWT required — the recipient is unauthenticated by design), then
// delegates the actual XML submission to the existing internal pipeline
// by calling skv-vat-submit / skv-agi-submit with the service role.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Body {
  envelopeId: string;
  publicToken: string;
  documentType: "vat_filing" | "agi_filing";
  bankidOrderRef: string;
  personalNumber?: string;
}

const INTERNAL_FN: Record<string, string> = {
  vat_filing: "skv-vat-submit",
  agi_filing: "skatteverket-agi-submit",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = (await req.json()) as Body;
    if (!body.envelopeId || !body.publicToken || !body.bankidOrderRef) {
      return new Response(
        JSON.stringify({ ok: false, error: "envelopeId, publicToken och bankidOrderRef krävs" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the token matches the envelope and it's still actionable.
    const { data: env, error: lookupErr } = await supabase
      .from("signing_envelopes")
      .select("id, company_id, document_type, document_title, payload, status, public_token")
      .eq("id", body.envelopeId)
      .maybeSingle();

    if (lookupErr || !env) {
      return new Response(
        JSON.stringify({ ok: false, error: "Envelope hittades inte" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (env.public_token !== body.publicToken) {
      return new Response(
        JSON.stringify({ ok: false, error: "Ogiltig token" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (env.status !== "pending" && env.status !== "draft") {
      return new Response(
        JSON.stringify({ ok: false, error: `Envelope har redan status: ${env.status}` }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const internalFn = INTERNAL_FN[env.document_type] ?? INTERNAL_FN[body.documentType];
    if (!internalFn) {
      return new Response(
        JSON.stringify({ ok: false, error: `Okänd document_type: ${env.document_type}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = (env.payload ?? {}) as { xml?: string; periodLabel?: string };
    if (!payload.xml || !payload.periodLabel) {
      return new Response(
        JSON.stringify({ ok: false, error: "Envelope saknar XML-payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delegate to the internal SKV submit function via service role.
    const invokeUrl = `${supabaseUrl}/functions/v1/${internalFn}`;
    const upstream = await fetch(invokeUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        companyId: env.company_id,
        periodLabel: payload.periodLabel,
        xmlPayload: payload.xml,
        bankidOrderRef: body.bankidOrderRef,
        personalNumber: body.personalNumber,
        sourceEnvelopeId: env.id,
      }),
    });

    const upstreamData = await upstream.json().catch(() => ({}));

    if (!upstream.ok || upstreamData?.ok === false) {
      // Don't mark envelope completed on failure — recipient can retry.
      return new Response(
        JSON.stringify({
          ok: false,
          error: upstreamData?.error || `Skatteverket avvisade inlämningen (HTTP ${upstream.status})`,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark envelope completed and stamp signatory.
    const signatories = ((env as { signatories?: Array<Record<string, unknown>> }).signatories ?? []).map(
      (s) => ({ ...s, signed_at: new Date().toISOString() })
    );
    await supabase
      .from("signing_envelopes")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        signatories,
        public_token: null, // burn the token
      })
      .eq("id", env.id);

    return new Response(
      JSON.stringify({ ok: true, receiptId: upstreamData?.receiptId, receipt: upstreamData?.receipt }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "Okänt fel" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
