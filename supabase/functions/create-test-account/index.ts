// Create a ready-to-use test account: auth user (auto-confirmed), profile,
// demo company + owner role, then trigger a welcome email with credentials.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function genPassword(): string {
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const nums = "23456789";
  const sym = "!@#$%&*";
  const all = lower + upper + nums + sym;
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  let pw = pick(upper) + pick(lower) + pick(nums) + pick(sym);
  for (let i = 0; i < 12; i++) pw += pick(all);
  return pw.split("").sort(() => Math.random() - 0.5).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Require authenticated caller AND platform admin role
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = claims.claims.sub as string;

    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: isAdmin, error: adminErr } = await admin.rpc("is_platform_admin", { _user_id: callerId });
    if (adminErr || !isAdmin) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, recipientName, companyName } = await req.json().catch(() => ({}));
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "email required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const displayName = recipientName || email.split("@")[0];
    const coName = companyName || "Demo AB";
    const password = genPassword();

    // 1) Find or create the auth user
    let userId: string | null = null;
    let created = false;

    // Look up by listing users filtered by email (admin API)
    const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const found = existing?.users?.find((u: any) => (u.email || "").toLowerCase() === email.toLowerCase());

    if (found) {
      userId = found.id;
      // Reset password so the credentials in the email work even if the account already existed
      await admin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
        user_metadata: { ...(found.user_metadata ?? {}), full_name: displayName, test_account: true, is_test_account: true },
      });
    } else {
      const { data: createRes, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: displayName, test_account: true, is_test_account: true },
      });
      if (createErr || !createRes?.user) {
        return new Response(JSON.stringify({ error: "create_user_failed", detail: createErr?.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = createRes.user.id;
      created = true;
    }

    // 2) Ensure profile row
    await admin.from("profiles").upsert({
      id: userId, email, first_name: displayName, last_name: "",
    }, { onConflict: "id" });

    // 3) Ensure a demo company owned by this user
    let companyId: string | null = null;
    const { data: existingRole } = await admin
      .from("user_roles")
      .select("company_id")
      .eq("user_id", userId)
      .eq("role", "owner")
      .limit(1)
      .maybeSingle();

    if (existingRole?.company_id) {
      companyId = existingRole.company_id;
    } else {
      const orgSuffix = Math.floor(100000 + Math.random() * 899999);
      const nowIso = new Date().toISOString();
      const { data: newCo, error: coErr } = await admin
        .from("companies")
        .insert({
          name: coName,
          org_number: `556${orgSuffix}-0000`,
          country: "SE",
          currency: "SEK",
          created_by: userId,
          industry: "general",
          subscription_tier: "premium",
          subscription_status: "active",
          kyc_status: "approved",
          metadata: {
            is_test_account: true,
            onboarding_completed_at: nowIso,
            onboarding_bank_skipped: true,
            agreement_signed_at: nowIso,
            activation: { completed_at: nowIso },
          },
        })
        .select("id")
        .single();
      if (coErr || !newCo) {
        return new Response(JSON.stringify({ error: "create_company_failed", detail: coErr?.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      companyId = newCo.id;

      await admin.from("user_roles").insert({
        user_id: userId, role: "owner", company_id: companyId,
      });
    }

    // Ensure the company is flagged as a test account (covers pre-existing companies too)
    if (companyId) {
      const nowIso = new Date().toISOString();
      const { data: coRow } = await admin
        .from("companies")
        .select("metadata")
        .eq("id", companyId)
        .maybeSingle();
      const existingMeta = (coRow?.metadata as Record<string, unknown> | null) ?? {};
      const existingActivation = (existingMeta.activation as Record<string, unknown> | undefined) ?? {};
      await admin
        .from("companies")
        .update({
          kyc_status: "approved",
          metadata: {
            ...existingMeta,
            is_test_account: true,
            onboarding_completed_at: existingMeta.onboarding_completed_at ?? nowIso,
            onboarding_bank_skipped: true,
            agreement_signed_at: existingMeta.agreement_signed_at ?? nowIso,
            activation: { ...existingActivation, completed_at: existingActivation.completed_at ?? nowIso },
          },
        })
        .eq("id", companyId);
    }

    // 4) Send welcome email with credentials via existing transactional sender
    const loginUrl = "https://northledger.se/auth";
    const { error: emailErr } = await admin.functions.invoke("send-transactional-email", {
      body: {
        templateName: "test-account-credentials",
        recipientEmail: email,
        idempotencyKey: `test-account-${userId}-${Date.now()}`,
        templateData: {
          recipientName: displayName,
          loginEmail: email,
          password,
          loginUrl,
          companyName: coName,
        },
      },
    });

    return new Response(JSON.stringify({
      ok: true, userId, companyId, created, emailQueued: !emailErr,
      emailError: emailErr?.message ?? null,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: "unexpected", detail: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
