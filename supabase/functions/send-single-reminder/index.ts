import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import {
  generateInvoicePDFBytes,
  bytesToBase64,
  mapInvoiceRowToRenderer,
} from "../_shared/invoice-pdf.ts";

interface Payload {
  invoiceId: string;
  reminderNumber: number; // 1 or 2
}

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { invoiceId, reminderNumber }: Payload = await req.json();
    if (!invoiceId) {
      return new Response(JSON.stringify({ error: "invoiceId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const resend = resendKey ? new Resend(resendKey) : null;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: invoice, error: invErr } = await supabase
      .from("invoices")
      .select("id, invoice_number, counterparty_name, counterparty_org_number, counterparty_address, customer_email, customer_number, our_reference, your_reference, free_text, total_amount, vat_amount, currency, invoice_date, due_date, reminder_count, company_id, collection_reference, ocr_number, status, paid_at, companies(name, org_number, address, vat_number, email_inbox_address, billing_email, footer_email, bankgiro, plusgiro, iban, swift_bic, bank_name, bank_account_number, logo_url)")
      .eq("id", invoiceId)
      .maybeSingle();

    if (invErr || !invoice) {
      console.error("Invoice lookup failed", { invoiceId, invErr });
      return new Response(JSON.stringify({ error: "Invoice not found", message: invErr?.message ?? "Fakturan kunde inte hittas i databasen", invoiceId }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!invoice.customer_email) {
      return new Response(
        JSON.stringify({
          error: "no_customer_email",
          message: `Fakturan saknar kundens e-postadress. Lägg till en mottagaradress på fakturan ${invoice.invoice_number} och försök igen.`,
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!resend) {
      return new Response(
        JSON.stringify({
          error: "no_email_provider",
          message: "E-posttjänsten är inte konfigurerad. Kontakta administratör.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch invoice lines for PDF
    const { data: lines } = await supabase
      .from("invoice_lines")
      .select("description, quantity, unit_price, vat_rate, line_total")
      .eq("invoice_id", invoice.id)
      .order("line_number", { ascending: true });

    const num = reminderNumber === 2 ? 2 : 1;

    // Hämta påminnelseavgift från företagsinställningar (default 60 kr)
    const { data: settings } = await supabase
      .from("customer_invoice_settings")
      .select("reminder_fee")
      .eq("company_id", invoice.company_id)
      .maybeSingle();
    const reminderFee = Number(settings?.reminder_fee ?? 60);
    const newTotal = Number(invoice.total_amount ?? 0) + reminderFee;

    const subject = num === 1
      ? `Påminnelse: Faktura ${invoice.invoice_number} har förfallit`
      : `Andra påminnelse: Faktura ${invoice.invoice_number}`;
    const html = generateEmail(invoice, num, reminderFee, newTotal);

    // Generate PDF reminder using the SHARED invoice template (same as original invoice)
    const { inv: mappedInv, comp: mappedComp, ln: mappedLines } = mapInvoiceRowToRenderer(
      invoice,
      (invoice as any).companies,
      lines ?? [],
    );
    const pdfBytes = await generateInvoicePDFBytes(
      mappedInv,
      mappedComp,
      mappedLines,
      null,
      { reminderNumber: num, reminderFee },
    );
    const pdfBase64 = bytesToBase64(pdfBytes);
    const pdfFilename = `Paminnelse${num === 2 ? "-2" : ""}-${invoice.invoice_number}.pdf`;

    const sendResult = await resend.emails.send({
      from: `${(invoice as any).companies?.name ?? "NorthLedger"} <faktura@northledger.se>`,
      to: [invoice.customer_email],
      subject,
      html,
      attachments: [
        {
          filename: pdfFilename,
          content: pdfBase64,
        },
      ],
    });

    if ((sendResult as any).error) {
      console.error("Resend error", (sendResult as any).error);
      return new Response(
        JSON.stringify({ error: "send_failed", details: (sendResult as any).error }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Uppdatera fakturan: höj total med påminnelseavgift
    await supabase
      .from("invoices")
      .update({
        reminder_count: num,
        last_reminder_sent_at: new Date().toISOString(),
        collection_status: num === 1 ? "reminder_1" : "reminder_2",
        status: "overdue",
        total_amount: newTotal,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoice.id);

    await supabase.from("invoice_reminders").insert({
      invoice_id: invoice.id,
      reminder_number: num,
      sent_to_email: invoice.customer_email,
      email_subject: subject,
      email_body: html,
      delivery_status: "sent",
      reminder_fee: reminderFee,
    });

    // Bokför påminnelseavgift: D 1510 Kundfordringar / K 3950 Återvunna kundfordringar (momsfri enl. lag 1981:739)
    if (reminderFee > 0) {
      try {
        const { data: accounts } = await supabase
          .from("chart_of_accounts")
          .select("id, account_number")
          .eq("company_id", invoice.company_id)
          .in("account_number", ["1510", "3950"]);
        const acc1510 = accounts?.find((a: any) => a.account_number === "1510");
        const acc3950 = accounts?.find((a: any) => a.account_number === "3950");
        if (acc1510 && acc3950) {
          const { data: je, error: jeErr } = await supabase
            .from("journal_entries")
            .insert({
              company_id: invoice.company_id,
              entry_date: new Date().toISOString().slice(0, 10),
              description: `Påminnelseavgift faktura ${invoice.invoice_number} (påminnelse ${num})`,
              status: "approved",
              created_by: userData.user.id,
              approved_by: userData.user.id,
              ai_confidence: 1.0,
              ai_explanation: "Automatisk bokföring av lagstadgad påminnelseavgift (lag 1981:739).",
            })
            .select("id")
            .single();
          if (!jeErr && je) {
            await supabase.from("journal_entry_lines").insert([
              { journal_entry_id: je.id, account_id: acc1510.id, debit: reminderFee, credit: 0 },
              { journal_entry_id: je.id, account_id: acc3950.id, debit: 0, credit: reminderFee },
            ]);
          }
        } else {
          console.warn("Saknar konto 1510 eller 3950 - hoppar över bokföring av påminnelseavgift");
        }
      } catch (bookErr) {
        console.error("Kunde inte bokföra påminnelseavgift", bookErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent_to: invoice.customer_email,
        reminder_number: num,
        attachment: pdfFilename,
        reminder_fee: reminderFee,
        new_total: newTotal,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("send-single-reminder fatal", e);
    return new Response(
      JSON.stringify({ error: "internal_error", message: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

function generateEmail(inv: any, n: number, reminderFee: number, newTotal: number): string {
  const currency = inv.currency ?? "SEK";
  const urgency = n === 1
    ? "Vänligen betala snarast. En fakturakopia märkt PÅMINNELSE bifogas detta mejl."
    : "Detta är en andra och sista påminnelse innan ärendet kan komma att överlämnas till inkasso. Bifogad PDF visar fakturan märkt PÅMINNELSE 2.";
  const fmt = (v: number) => Number(v).toLocaleString("sv-SE");
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;color:#333">
    <div style="max-width:600px;margin:0 auto;padding:20px">
      <h2 style="color:#0F1F3D">Betalningspåminnelse${n === 2 ? " (andra)" : ""}</h2>
      <p>Hej ${inv.counterparty_name ?? ""},</p>
      <p>Vi vill påminna om att följande faktura har förfallit:</p>
      <div style="background:#f6f8fb;padding:14px;border-left:4px solid ${n === 1 ? "#f59e0b" : "#ef4444"}">
        <p style="margin:4px 0"><strong>Fakturanummer:</strong> ${inv.invoice_number}</p>
        <p style="margin:4px 0"><strong>Förfallodatum:</strong> ${new Date(inv.due_date).toLocaleDateString("sv-SE")}</p>
        <p style="margin:4px 0"><strong>Ursprungligt belopp:</strong> ${fmt(Number(inv.total_amount))} ${currency}</p>
        <p style="margin:4px 0"><strong>Påminnelseavgift:</strong> ${fmt(reminderFee)} ${currency}</p>
        <p style="margin:8px 0 4px;border-top:1px solid #d1d5db;padding-top:8px"><strong>Att betala totalt:</strong> <span style="font-size:16px;color:#0F1F3D"><strong>${fmt(newTotal)} ${currency}</strong></span></p>
      </div>
      <p style="color:${n === 1 ? "#b45309" : "#b91c1c"};font-weight:600">${urgency}</p>
      <p style="font-size:12px;color:#6b7280">Påminnelseavgift om ${fmt(reminderFee)} ${currency} har tillagts enligt lag (1981:739) om ersättning för inkassokostnader m.m.</p>
      <p>Om betalning redan är gjord, vänligen bortse från detta meddelande.</p>
      <p>Med vänliga hälsningar,<br/><strong>${inv.companies?.name ?? ""}</strong></p>
    </div></body></html>`;
}
