// Submit VAT declaration XML (eSKDUpload v6.0) to Skatteverket via mTLS proxy.
// Also supports `mode: "archive_only"` for the XML-download path (no SKV submit).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface Body {
  companyId: string;
  periodLabel: string;
  xmlPayload: string;
  bankidOrderRef?: string;
  personalNumber?: string;
  mode?: "submit" | "archive_only";
}

function maskPersonalNumber(pn?: string): string | null {
  if (!pn) return null;
  const digits = pn.replace(/\D/g, "");
  if (digits.length < 4) return "****";
  return `${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

function periodToYearMonth(label: string): { year: number; month: number } {
  const ym = label.match(/^(\d{4})-(\d{2})$/);
  if (ym) return { year: +ym[1], month: +ym[2] };
  const q = label.match(/^Q([1-4])\s*(\d{4})$/i);
  if (q) return { year: +q[2], month: +q[1] * 3 };
  return { year: new Date().getFullYear(), month: new Date().getMonth() + 1 };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: "Ej autentiserad" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Body;
    if (!body?.companyId || !body?.periodLabel || !body?.xmlPayload) {
      return new Response(JSON.stringify({ ok: false, error: "companyId, periodLabel och xmlPayload krävs" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mode = body.mode ?? "submit";
    const { year, month } = periodToYearMonth(body.periodLabel);
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const storagePath = `${body.companyId}/vat/${body.periodLabel}/eskd_${ts}.xml`;

    // 1) Archive XML in storage (best-effort)
    try {
      // Encode to ISO-8859-1 byte payload server-side (mirror client logic — assume already ISO compatible chars)
      const bytes = new TextEncoder().encode(body.xmlPayload);
      await admin.storage.from("documents").upload(storagePath, bytes, {
        contentType: "application/xml; charset=ISO-8859-1",
        upsert: true,
      });
    } catch (e) {
      console.warn("[skv-vat-submit] storage archive failed:", e);
    }

    // 2) Audit
    try {
      await admin.from("system_action_log").insert({
        company_id: body.companyId,
        user_id: user.id,
        action: mode === "archive_only" ? "vat_xml_generated" : "vat_xml_submitted",
        entity_type: "vat_declaration",
        entity_id: null,
        metadata: {
          period: body.periodLabel,
          storage_path: storagePath,
          bankid_order_ref: body.bankidOrderRef ?? null,
          personal_number_masked: maskPersonalNumber(body.personalNumber),
          mode,
        },
      });
    } catch (e) {
      console.warn("[skv-vat-submit] audit log failed:", e);
    }

    // Archive-only path returns here.
    if (mode === "archive_only") {
      return new Response(JSON.stringify({ ok: true, storagePath, mode }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3) Locate or create vat_declarations row
    const { data: existing } = await admin
      .from("vat_declarations")
      .select("id, status")
      .eq("company_id", body.companyId)
      .eq("year", year)
      .eq("month", month)
      .maybeSingle();

    const declarationId = existing?.id ?? null;

    // 4) Submit via mTLS proxy → Skatteverket eSKD endpoint
    const proxyUrl = Deno.env.get("MTLS_PROXY_URL");
    const proxySecret = Deno.env.get("MTLS_PROXY_SECRET");
    let skvReceipt: Record<string, unknown> | null = null;
    let skvOk = false;
    let skvError: string | null = null;

    if (!proxyUrl || !proxySecret) {
      skvError = "Skatteverket-anslutningen är inte konfigurerad. Använd XML-nedladdning under tiden.";
    } else {
      try {
        const resp = await fetch(`${proxyUrl.replace(/\/$/, "")}/skv/eskd-upload`, {
          method: "POST",
          headers: {
            "Content-Type": "application/xml; charset=ISO-8859-1",
            "x-proxy-secret": proxySecret,
            "x-skv-environment": "production",
          },
          body: body.xmlPayload,
        });
        const text = await resp.text();
        let parsed: unknown = text;
        try { parsed = JSON.parse(text); } catch { /* keep raw text */ }
        skvOk = resp.ok;
        skvReceipt = { httpStatus: resp.status, body: parsed, receivedAt: new Date().toISOString() };
        if (!resp.ok) skvError = `Skatteverket svarade ${resp.status}`;
      } catch (e) {
        skvError = e instanceof Error ? e.message : "Nätverksfel mot mTLS-proxyn";
      }
    }

    // 5) Persist outcome on vat_declarations (only if a row exists — caller creates draft)
    if (declarationId) {
      const updates: Record<string, unknown> = {
        eskd_xml_path: storagePath,
        skv_receipt: skvReceipt,
        bankid_signature: body.bankidOrderRef ?? null,
        bankid_personal_number_masked: maskPersonalNumber(body.personalNumber),
      };
      if (skvOk) {
        updates.status = "filed";
        updates.filed_at = new Date().toISOString();
      }
      await admin.from("vat_declarations").update(updates).eq("id", declarationId);
    }

    if (!skvOk) {
      return new Response(
        JSON.stringify({ ok: false, error: skvError, storagePath, receipt: skvReceipt }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        storagePath,
        receiptId: (skvReceipt as { body?: { id?: string } } | null)?.body?.id ?? null,
        receipt: skvReceipt,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internt fel";
    console.error("[skv-vat-submit] error:", msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
