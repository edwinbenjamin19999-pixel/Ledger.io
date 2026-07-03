// supabase/functions/send-cosigner-invite/index.ts
//
// Creates (or refreshes) a co-signer invite for an in-progress onboarding
// agreement and sends them a BankID-link email.
//
// Body: { coSignatureId: string, name: string, email: string, message?: string }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReqBody {
  coSignatureId: string;
  name: string;
  email: string;
  message?: string;
  isReminder?: boolean;
}

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: auth } },
    });
    const admin = createClient(url, serviceKey);

    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as ReqBody;
    if (!body?.coSignatureId || !body?.name?.trim() || !isEmail(body?.email ?? "")) {
      return new Response(
        JSON.stringify({ error: "Invalid input" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verify the user is allowed to act on this co-signature
    const { data: cs } = await admin
      .from("co_signatures")
      .select("id, company_id, status, created_by, document_type, signatory_rule_text, expires_at")
      .eq("id", body.coSignatureId)
      .maybeSingle();

    if (!cs) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("company_id", cs.company_id)
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up company name + initiator name for the email
    const [{ data: company }, { data: initiatorProfile }] = await Promise.all([
      admin.from("companies").select("name").eq("id", cs.company_id).maybeSingle(),
      admin.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle(),
    ]);
    const companyName = company?.name || "ert bolag";
    const initiatorName =
      initiatorProfile?.full_name || initiatorProfile?.email || user.email || "En kollega";

    // Reuse existing co_signer row (one per session) or insert new
    const { data: existing } = await admin
      .from("co_signature_signers")
      .select("id, token")
      .eq("co_signature_id", body.coSignatureId)
      .eq("role", "co_signer")
      .maybeSingle();

    let token = existing?.token as string | undefined;
    let signerId = existing?.id as string | undefined;
    if (existing) {
      await admin
        .from("co_signature_signers")
        .update({
          name: body.name.trim(),
          email: body.email.trim().toLowerCase(),
          reminded_at: body.isReminder ? new Date().toISOString() : null,
        })
        .eq("id", existing.id);
    } else {
      token = `cs_${crypto.randomUUID().replaceAll("-", "")}${Math.random()
        .toString(36)
        .slice(2, 10)}`;
      const { data: inserted } = await admin
        .from("co_signature_signers")
        .insert({
          co_signature_id: body.coSignatureId,
          name: body.name.trim(),
          email: body.email.trim().toLowerCase(),
          role: "co_signer",
          token,
        })
        .select("id")
        .single();
      signerId = inserted?.id;
    }

    // Build invite link — prefer APP_URL secret, then origin header, then prod fallback
    const appUrl = Deno.env.get("APP_URL");
    const origin = appUrl || req.headers.get("origin") || "https://northledger.se";
    const signUrl = `${origin}/co-sign?token=${token}`;

    // Format expiry date for human display
    let expiresAtDisplay: string | undefined;
    if (cs.expires_at) {
      try {
        expiresAtDisplay = new Date(cs.expires_at).toLocaleDateString("sv-SE", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      } catch { /* ignore */ }
    }

    // Idempotency: stable for first invite, time-bucketed for reminders
    const idempotencyKey = body.isReminder
      ? `cosigner-reminder-${signerId ?? body.coSignatureId}-${Date.now()}`
      : `cosigner-invite-${signerId ?? body.coSignatureId}`;

    // Best-effort: trigger email via existing transactional sender
    try {
      await admin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "co-signer-invite",
          recipientEmail: body.email.trim().toLowerCase(),
          idempotencyKey,
          templateData: {
            initiatorName,
            coSignerName: body.name.trim(),
            companyName,
            signUrl,
            personalMessage: body.message?.trim() || null,
            expiresAt: expiresAtDisplay,
            isReminder: !!body.isReminder,
          },
        },
      });
    } catch (e) {
      console.warn("[send-cosigner-invite] mail dispatch failed", e);
    }

    // Audit log
    try {
      await admin.from("audit_log").insert({
        company_id: cs.company_id,
        user_id: user.id,
        action: body.isReminder ? "cosigner_reminder_sent" : "cosigner_invited",
        description:
          `Inbjudan till medsignerare ${body.name.trim()} <${body.email.trim()}> ` +
          `(co_signature ${body.coSignatureId}).`,
      });
    } catch { /* silent */ }

    return new Response(
      JSON.stringify({ ok: true, inviteUrl, token }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[send-cosigner-invite]", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
