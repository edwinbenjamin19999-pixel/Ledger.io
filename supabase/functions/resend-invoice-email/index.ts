import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import {
  generateInvoicePDFBytes,
  bytesToBase64,
  stampForStatus,
  mapInvoiceRowToRenderer,
} from "../_shared/invoice-pdf.ts";
import { pickInvoiceSender } from "../_shared/invoice-sender.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(url, key);

    const auth = req.headers.get("Authorization");
    if (!auth) throw new Error("Ej inloggad");
    const { data: { user }, error: ue } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (ue || !user) throw new Error("Unauthorized");

    const { invoice_id, override_email } = await req.json();
    if (!invoice_id) throw new Error("invoice_id krävs");

    const { data: invoice, error: ie } = await supabase
      .from("invoices")
      .select(`
        *,
        companies!inner(
          name, org_number, vat_number, address, logo_url,
          email_inbox_address, billing_email,
          bankgiro, plusgiro, iban, swift_bic, bank_name, bank_account_number
        ),
        invoice_lines(description, quantity, unit_price, vat_rate, vat_amount, total_amount)
      `)
      .eq("id", invoice_id)
      .maybeSingle();

    if (ie || !invoice) throw new Error("Faktura hittades inte");

    // footer_email from settings
    const { data: invSettings } = await supabase
      .from("customer_invoice_settings")
      .select("footer_email")
      .eq("company_id", invoice.company_id)
      .maybeSingle();
    if (invSettings?.footer_email) {
      (invoice.companies as any).footer_email = invSettings.footer_email;
    }

    let toEmail: string | null = override_email || invoice.customer_email || null;
    if (!toEmail && invoice.counterparty_name) {
      const { data: c } = await supabase
        .from("customers")
        .select("email")
        .eq("company_id", invoice.company_id)
        .eq("name", invoice.counterparty_name)
        .maybeSingle();
      if (c?.email) toEmail = c.email;
    }

    if (!toEmail) {
      return new Response(JSON.stringify({ ok: false, error: "Saknar e-postadress för mottagaren. Lägg till e-post på kunden först." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY saknas i miljön");

    const { inv, comp, ln } = mapInvoiceRowToRenderer(invoice, invoice.companies, invoice.invoice_lines);
    const pdfBytes = await generateInvoicePDFBytes(inv, comp, ln, stampForStatus(invoice.status));
    const pdfBase64 = bytesToBase64(pdfBytes);

    const { from: fromEmail, replyTo } = pickInvoiceSender(
      invoice.companies,
      { footer_email: (invoice.companies as any).footer_email },
    );

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        reply_to: replyTo,
        subject: `Faktura ${invoice.invoice_number} från ${invoice.companies.name}`,
        html: `
          <h2>Faktura ${invoice.invoice_number}</h2>
          <p>Hej ${invoice.counterparty_name},</p>
          <p>Bifogat finner du fakturan som PDF.</p>
          <p><strong>Förfallodatum:</strong> ${new Date(invoice.due_date).toLocaleDateString("sv-SE")}<br/>
          <strong>Att betala:</strong> ${(invoice.total_amount ?? 0).toFixed(2)} kr</p>
          <p>Med vänliga hälsningar,<br/>${invoice.companies.name}</p>
        `,
        attachments: [{ filename: `Faktura-${invoice.invoice_number}.pdf`, content: pdfBase64 }],
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("Resend error", res.status, txt);
      const detail = txt ? ` — ${txt.slice(0, 200)}` : "";
      return new Response(JSON.stringify({ ok: false, error: `E-post misslyckades: ${res.status}${detail}` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const updates: Record<string, unknown> = {};
    if (invoice.status === "draft") updates.status = "sent";
    if (!invoice.sent_at) updates.sent_at = new Date().toISOString();
    if (Object.keys(updates).length) {
      await supabase.from("invoices").update(updates).eq("id", invoice_id);
    }

    return new Response(JSON.stringify({ ok: true, sent_to: toEmail }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("resend-invoice-email error:", err);
    return new Response(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "Okänt fel" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
