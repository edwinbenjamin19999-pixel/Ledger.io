// Phase 3 — Bank payment initiation (PIS) — sandbox stub
// Returns a mocked redirect URL and persists a payment_initiations row.
// Real Enable Banking PIS plugs in here once the scope is granted.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Body {
  companyId: string;
  paymentBatchId?: string | null;
  amount: number;
  currency?: string;
  debtorIban?: string | null;
  creditorName: string;
  creditorIban?: string | null;
  reference?: string | null;
  returnUrl: string;
}

function bad(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return bad(405, "Method not allowed");

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) return bad(500, "Server misconfigured");

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return bad(401, "Missing bearer token");

  // Supabase client scoped to caller's JWT (RLS enforced)
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return bad(401, "Invalid session");

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return bad(400, "Invalid JSON");
  }

  if (!body.companyId || !body.creditorName || !body.amount || !body.returnUrl) {
    return bad(400, "Missing required fields");
  }
  if (!Number.isFinite(body.amount) || body.amount <= 0) {
    return bad(400, "Amount must be positive");
  }

  const provider = "enable_banking_sandbox";
  const providerPaymentId = `sbx_${crypto.randomUUID()}`;
  // Mock redirect — in real flow this would be Enable Banking's hosted BankID URL
  const redirectUrl =
    `https://sandbox.enablebanking.com/auth?payment=${providerPaymentId}` +
    `&return=${encodeURIComponent(body.returnUrl)}`;

  const { data: row, error: insertErr } = await supabase
    .from("payment_initiations")
    .insert({
      company_id: body.companyId,
      payment_batch_id: body.paymentBatchId ?? null,
      provider,
      provider_payment_id: providerPaymentId,
      redirect_url: redirectUrl,
      status: "redirected",
      amount: body.amount,
      currency: body.currency ?? "SEK",
      debtor_iban: body.debtorIban ?? null,
      creditor_name: body.creditorName,
      creditor_iban: body.creditorIban ?? null,
      reference: body.reference ?? null,
      initiated_by: user.id,
      metadata: { sandbox: true, return_url: body.returnUrl },
    })
    .select("id")
    .single();

  if (insertErr || !row) {
    return bad(500, insertErr?.message ?? "Failed to persist initiation");
  }

  return new Response(
    JSON.stringify({
      initiationId: row.id,
      providerPaymentId,
      redirectUrl,
      status: "redirected",
      provider,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
