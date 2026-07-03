// AP Ledger v5 — verify and create supplier from invoice payload
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders, handleCors, corsError, corsJson } from "../_shared/cors.ts";

interface Payload {
  invoice_id: string;
  name: string;
  org_number?: string | null;
  bg_pg?: string | null;
  iban?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
}

serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return corsError("Missing Authorization header", 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return corsError("Unauthorized", 401);
    const userId = userData.user.id;

    const body = (await req.json()) as Payload;
    if (!body.invoice_id || !body.name) {
      return corsError("invoice_id and name are required", 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: invoice, error: invErr } = await admin
      .from("invoices")
      .select("id, company_id, counterparty_org_number, bg_pg")
      .eq("id", body.invoice_id)
      .single();
    if (invErr || !invoice) return corsError("Invoice not found", 404);

    // Membership check via RPC
    const { data: hasAccess } = await admin.rpc("has_company_access", {
      _user_id: userId,
      _company_id: invoice.company_id,
    });
    if (!hasAccess) return corsError("Forbidden", 403);

    const orgNumber = body.org_number ?? invoice.counterparty_org_number ?? null;
    const bgPg = body.bg_pg ?? invoice.bg_pg ?? null;

    // Dedupe on (company_id, org_number) when org_number is present
    let supplierId: string | null = null;
    if (orgNumber) {
      const { data: existing } = await admin
        .from("suppliers")
        .select("id")
        .eq("company_id", invoice.company_id)
        .eq("org_number", orgNumber)
        .maybeSingle();
      if (existing) supplierId = (existing as { id: string }).id;
    }

    if (!supplierId) {
      const { data: created, error: createErr } = await admin
        .from("suppliers")
        .insert({
          company_id: invoice.company_id,
          name: body.name,
          org_number: orgNumber,
          bankgiro: bgPg,
          iban: body.iban ?? null,
          address: body.address ?? null,
          email: body.email ?? null,
          phone: body.phone ?? null,
        } as never)
        .select("id")
        .single();
      if (createErr) return corsError(`Supplier insert failed: ${createErr.message}`, 500);
      supplierId = (created as { id: string }).id;
    }

    // Update invoice — link supplier and advance state
    const { error: updErr } = await admin
      .from("invoices")
      .update({
        supplier_id: supplierId,
        workflow_state: "PRE_ACCOUNTED",
      } as never)
      .eq("id", body.invoice_id);
    if (updErr) return corsError(`Invoice update failed: ${updErr.message}`, 500);

    // Seed/update supplier_profiles fraud baseline
    await admin
      .from("supplier_profiles")
      .upsert(
        {
          company_id: invoice.company_id,
          supplier_id: supplierId,
          last_bg: bgPg,
          last_iban: body.iban ?? null,
        } as never,
        { onConflict: "supplier_id" } as never,
      );

    return corsJson({ ok: true, supplier_id: supplierId });
  } catch (e) {
    console.error("ap-create-supplier error:", e);
    return corsError(e instanceof Error ? e.message : "Unknown error", 500);
  }
});
