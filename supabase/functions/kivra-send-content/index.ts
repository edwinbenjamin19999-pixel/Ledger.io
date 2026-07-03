import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import {
  generateInvoicePDFBytes,
  bytesToBase64,
  stampForStatus,
  mapInvoiceRowToRenderer,
} from "../_shared/invoice-pdf.ts";

/**
 * Kivra Send Content – aligned with official Kivra API docs
 * https://developer.kivra.com/#tag/Tenant-API-Content/operation/Send%20content
 *
 * Auth: OAuth2 Client Credentials → POST /v1/auth
 * Match: POST /v2/tenant/{tenantKey}/usermatch/ssn
 * Send:  POST /v2/tenant/{tenantKey}/content
 */

const KIVRA_PROD_URL = "https://sender.api.kivra.com";
const KIVRA_SANDBOX_URL = "https://sender.sandbox-api.kivra.com";

interface SendRequest {
  company_id: string;
  invoice_id?: string;
  content_type: "invoice" | "invoice.reminder" | "letter" | "letter.salary" | "salaryslip" | "letter.creditnotice";
  recipient_ssn?: string;        // YYYYMMDDnnnn
  recipient_vat_number?: string;  // SE + 10 digits + 01
  pdf_base64?: string;
  pdf_name?: string;
  subject?: string;
  metadata?: Record<string, unknown>;
}

// --- OAuth2 token cache (per-isolate) ---
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getAccessToken(baseUrl: string): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const clientId = Deno.env.get("KIVRA_CLIENT_ID");
  const clientSecret = Deno.env.get("KIVRA_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error("KIVRA_CLIENT_ID och KIVRA_CLIENT_SECRET måste vara konfigurerade");
  }

  const basicAuth = btoa(`${clientId}:${clientSecret}`);

  const res = await fetch(`${baseUrl}/v1/auth`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Kivra OAuth misslyckades (${res.status}): ${text}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = now + (data.expires_in || 28800) * 1000;
  return cachedToken!;
}

// --- Recipient matching ---
async function matchRecipientSSN(
  baseUrl: string,
  tenantKey: string,
  token: string,
  ssn: string,
): Promise<boolean> {
  const res = await fetch(`${baseUrl}/v2/tenant/${tenantKey}/usermatch/ssn`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ list: [ssn] }),
  });

  if (!res.ok) {
    console.error("[Kivra] usermatch failed:", await res.text());
    return false;
  }

  const result = await res.json();
  return Array.isArray(result.list) && result.list.includes(ssn);
}

async function matchRecipientVAT(
  baseUrl: string,
  tenantKey: string,
  token: string,
  vatNumber: string,
): Promise<boolean> {
  const res = await fetch(
    `${baseUrl}/v1/tenant/${tenantKey}/company?vat_number=${encodeURIComponent(vatNumber)}`,
    {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!res.ok) return false;
  const result = await res.json();
  return Array.isArray(result) && result.length > 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userToken = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(userToken);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: SendRequest = await req.json();
    const { company_id, invoice_id, content_type, recipient_ssn, recipient_vat_number, pdf_base64, pdf_name, subject, metadata } = body;

    if (!company_id) {
      return new Response(JSON.stringify({ error: "company_id krävs" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get Kivra settings for company
    const { data: kivraSettings } = await supabase
      .from("kivra_settings")
      .select("*")
      .eq("company_id", company_id)
      .maybeSingle();

    if (!kivraSettings?.is_active || !kivraSettings?.tenant_key) {
      return new Response(JSON.stringify({ error: "Kivra är inte aktiverat för detta företag. Konfigurera Kivra under Inställningar → Integrationer." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const environment = Deno.env.get("KIVRA_ENVIRONMENT") || "sandbox";
    const baseUrl = environment === "production" ? KIVRA_PROD_URL : KIVRA_SANDBOX_URL;
    const tenantKey = kivraSettings.tenant_key;

    // Get OAuth2 access token
    let accessToken: string;
    try {
      accessToken = await getAccessToken(baseUrl);
    } catch (e) {
      return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Kivra-autentisering misslyckades" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If sending an invoice, fetch full invoice + company + lines for PDF rendering
    let invoiceData: Record<string, unknown> | null = null;
    let invoiceCompany: Record<string, unknown> | null = null;
    let invoiceLines: any[] = [];
    if (content_type === "invoice" && invoice_id) {
      const { data: invoice } = await supabase
        .from("invoices")
        .select(`
          *,
          customers(*),
          companies!inner(
            name, org_number, vat_number, address, logo_url,
            email_inbox_address, billing_email,
            bankgiro, plusgiro, iban, swift_bic, bank_name, bank_account_number
          ),
          invoice_lines(description, quantity, unit_price, vat_rate, vat_amount, total_amount)
        `)
        .eq("id", invoice_id)
        .maybeSingle();

      if (!invoice) {
        return new Response(JSON.stringify({ error: "Faktura hittades inte" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      invoiceData = invoice;
      invoiceCompany = (invoice as any).companies;
      invoiceLines = (invoice as any).invoice_lines || [];

      const { data: invSettings } = await supabase
        .from("customer_invoice_settings")
        .select("footer_email")
        .eq("company_id", company_id)
        .maybeSingle();
      if (invSettings?.footer_email && invoiceCompany) {
        (invoiceCompany as any).footer_email = invSettings.footer_email;
      }
    }

    // Determine recipient identifier
    const ssn = recipient_ssn || (invoiceData?.customers as Record<string, unknown>)?.ssn as string | undefined;
    const vatNumber = recipient_vat_number || (invoiceData?.customers as Record<string, unknown>)?.vat_number as string | undefined;

    if (!ssn && !vatNumber) {
      return new Response(JSON.stringify({ error: "Mottagarens personnummer (SSN) eller momsregistreringsnummer (VAT) krävs" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Match recipient
    let matched = false;
    if (ssn) {
      matched = await matchRecipientSSN(baseUrl, tenantKey, accessToken, ssn);
    } else if (vatNumber) {
      matched = await matchRecipientVAT(baseUrl, tenantKey, accessToken, vatNumber);
    }

    if (!matched) {
      // Record delivery attempt
      await supabase.from("kivra_deliveries").insert({
        company_id,
        invoice_id: invoice_id || null,
        recipient_ssn: ssn || null,
        recipient_org_number: vatNumber || null,
        content_type,
        status: "recipient_not_found",
        error_message: "Mottagaren har inte Kivra eller har valt bort avsändaren (opt-out)",
      });

      return new Response(JSON.stringify({
        error: "Mottagaren har inte Kivra eller har valt bort avsändaren",
        status: "recipient_not_found",
        fallback: "email",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Build content payload per Kivra API spec
    const contentSubject = subject
      || (content_type === "invoice" ? `Faktura ${(invoiceData as Record<string, unknown>)?.invoice_number || ""}` : null)
      || (content_type === "letter.salary" || content_type === "salaryslip" ? "Lönespecifikation" : null)
      || metadata?.subject as string
      || "Dokument";

    const kivraType = content_type === "letter.salary" ? "salaryslip" : content_type;

    const contentPayload: Record<string, unknown> = {
      type: kivraType,
      subject: contentSubject.substring(0, 35), // Kivra recommends max 35 chars
    };

    // Set recipient
    if (ssn) {
      contentPayload.ssn = ssn;
    } else if (vatNumber) {
      contentPayload.vat_number = vatNumber;
    }

    // Auto-generate PDF for invoice if caller did not supply one
    let attachmentBase64 = pdf_base64;
    let attachmentName = pdf_name;
    if (!attachmentBase64 && content_type === "invoice" && invoiceData && invoiceCompany) {
      try {
        const { inv, comp, ln } = mapInvoiceRowToRenderer(invoiceData, invoiceCompany, invoiceLines);
        const pdfBytes = await generateInvoicePDFBytes(inv, comp, ln, stampForStatus(inv.status));
        attachmentBase64 = bytesToBase64(pdfBytes);
        attachmentName = `Faktura-${inv.invoice_number}.pdf`;
        console.log("[Kivra] Auto-generated invoice PDF, bytes:", pdfBytes.length);
      } catch (e) {
        console.error("[Kivra] Failed to auto-generate invoice PDF:", e);
      }
    }

    // Add PDF as parts (base64-encoded)
    if (attachmentBase64) {
      contentPayload.parts = [{
        name: attachmentName || "document.pdf",
        data: attachmentBase64,
        content_type: "application/pdf",
      }];
    }

    // Add payment info for invoices
    if ((content_type === "invoice" || content_type === "invoice.reminder") && invoiceData) {
      const inv = invoiceData as Record<string, unknown>;

      // Get company payment details
      const { data: company } = await supabase
        .from("companies")
        .select("bankgiro, plusgiro, bank_account_number")
        .eq("id", company_id)
        .maybeSingle();

      const options: Record<string, unknown>[] = [];

      // Build payment options per Kivra spec
      const ocrRef = (inv.ocr_number || inv.invoice_number) as string;
      const dueDate = inv.due_date as string;
      const amount = String(inv.total_amount || 0);

      if (company?.bankgiro) {
        options.push({
          due_date: dueDate,
          amount,
          type: "SE_OCR",
          reference: ocrRef,
        });
      }

      // Determine payment method — BG=1, PG=2
      const method = company?.bankgiro ? "1" : company?.plusgiro ? "2" : "1";
      const account = company?.bankgiro || company?.plusgiro || "";

      contentPayload.payment_multiple_options = {
        payable: true,
        currency: "SEK",
        method,
        account,
        options: options.length > 0 ? options : [{
          due_date: dueDate,
          amount,
          type: "SE_OCR",
          reference: ocrRef,
        }],
      };
    }

    // Send to Kivra
    const sendResponse = await fetch(`${baseUrl}/v2/tenant/${tenantKey}/content`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(contentPayload),
    });

    if (!sendResponse.ok) {
      const errorText = await sendResponse.text();
      console.error("[Kivra] Send failed:", sendResponse.status, errorText);

      await supabase.from("kivra_deliveries").insert({
        company_id,
        invoice_id: invoice_id || null,
        recipient_ssn: ssn || null,
        recipient_org_number: vatNumber || null,
        content_type,
        status: "failed",
        error_message: `Kivra API-fel: ${sendResponse.status} - ${errorText}`,
        sent_at: new Date().toISOString(),
      });

      return new Response(JSON.stringify({ error: `Kivra-leverans misslyckades: ${errorText}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sendResult = await sendResponse.json();
    const contentKey = sendResult?.key || sendResult?.content_key;

    // Record successful delivery
    const { data: delivery } = await supabase.from("kivra_deliveries").insert({
      company_id,
      invoice_id: invoice_id || null,
      recipient_ssn: ssn || null,
      recipient_org_number: vatNumber || null,
      content_type,
      kivra_content_id: contentKey,
      status: "sent",
      sent_at: new Date().toISOString(),
    }).select().maybeSingle();

    // Update invoice delivery status
    if (invoice_id) {
      await supabase.from("invoices").update({
        delivery_method: "kivra",
        delivered_at: new Date().toISOString(),
      }).eq("id", invoice_id);
    }

    console.log(`[Kivra] Content sent: type=${kivraType} key=${contentKey || "ok"}`);

    return new Response(JSON.stringify({
      success: true,
      delivery_id: delivery?.id,
      kivra_content_id: contentKey,
      status: "sent",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[Kivra] Error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Okänt fel",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
