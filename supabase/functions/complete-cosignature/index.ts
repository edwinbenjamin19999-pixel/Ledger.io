// supabase/functions/complete-cosignature/index.ts
//
// Public (no JWT). Marks a co-signer's BankID signature as complete, increments
// the parent co_signature counter, and unlocks the company's full mode when all
// required signatures are collected.
//
// Body: { token: string }

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
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      null;
    const ua = req.headers.get("user-agent") || null;

    const { data: signer } = await admin
      .from("co_signature_signers")
      .select("id, co_signature_id, signed_at, role, name, email")
      .eq("token", token)
      .maybeSingle();

    if (!signer) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (signer.signed_at) {
      return new Response(JSON.stringify({ ok: true, alreadySigned: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nowIso = new Date().toISOString();
    await admin
      .from("co_signature_signers")
      .update({
        signed_at: nowIso,
        signed_with_bankid: true,
        ip,
        user_agent: ua,
      })
      .eq("id", signer.id);

    // Recompute completed_count for the session
    const { count } = await admin
      .from("co_signature_signers")
      .select("id", { count: "exact", head: true })
      .eq("co_signature_id", signer.co_signature_id)
      .not("signed_at", "is", null);

    const { data: cs } = await admin
      .from("co_signatures")
      .select("id, company_id, required_count")
      .eq("id", signer.co_signature_id)
      .maybeSingle();

    if (!cs) {
      return new Response(JSON.stringify({ error: "Session missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const completed = count ?? 0;
    const isComplete = completed >= cs.required_count;

    await admin
      .from("co_signatures")
      .update({
        completed_count: completed,
        status: isComplete ? "complete" : "partial",
        completed_at: isComplete ? nowIso : null,
      })
      .eq("id", cs.id);

    if (isComplete) {
      // Unlock full mode on the company
      const { data: companyRow } = await admin
        .from("companies")
        .select("metadata")
        .eq("id", cs.company_id)
        .maybeSingle();
      const meta =
        ((companyRow?.metadata as Record<string, unknown>) ?? {}) as Record<
          string,
          unknown
        >;
      delete meta.cosigning_pending;
      delete meta.pending_cosigner;
      delete meta.pending_cosignature_id;
      meta.agreement_fully_signed_at = nowIso;
      await admin
        .from("companies")
        .update({ metadata: meta as never })
        .eq("id", cs.company_id);
    }

    try {
      await admin.from("audit_log").insert({
        company_id: cs.company_id,
        user_id: null,
        action: isComplete
          ? "cosignature_complete"
          : "cosigner_signature_received",
        description:
          `Medsignerare ${signer.name} <${signer.email}> signerade med BankID. ` +
          `Status: ${completed}/${cs.required_count}.`,
      });
    } catch {
      /* silent */
    }

    return new Response(
      JSON.stringify({ ok: true, complete: isComplete, completed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[complete-cosignature]", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
