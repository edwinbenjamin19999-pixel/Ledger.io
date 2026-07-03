import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { pickInvoiceSender } from "../_shared/invoice-sender.ts";
import {
  generateInvoicePDFBytes,
  bytesToBase64,
  stampForStatus,
  mapInvoiceRowToRenderer,
} from "../_shared/invoice-pdf.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Unauthorized');

    const rawInput = await req.json();
    const invoice_id = rawInput?.invoice_id;

    if (!invoice_id || typeof invoice_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(invoice_id)) {
      throw new Error('Ogiltigt faktura-ID format');
    }

    console.log('Sending invoice:', invoice_id);

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        companies!inner (
          name,
          org_number,
          vat_number,
          address,
          logo_url,
          email_inbox_address,
          billing_email,
          bankgiro,
          plusgiro,
          iban,
          swift_bic,
          bank_name,
          bank_account_number
        ),
        invoice_lines (
          description,
          quantity,
          unit_price,
          vat_rate,
          vat_amount,
          total_amount
        )
      `)
      .eq('id', invoice_id)
      .maybeSingle();

    if (invoiceError || !invoice) {
      console.error('Invoice error:', invoiceError);
      throw new Error('Invoice not found');
    }

    // Lookup customer email if missing
    if (!invoice.customer_email && invoice.counterparty_name) {
      const { data: customer } = await supabase
        .from('customers')
        .select('email')
        .eq('company_id', invoice.company_id)
        .eq('name', invoice.counterparty_name)
        .maybeSingle();
      if (customer?.email) {
        invoice.customer_email = customer.email;
        await supabase.from('invoices').update({ customer_email: customer.email }).eq('id', invoice_id);
      }
    }

    // Fetch footer_email from customer_invoice_settings
    const { data: invSettings } = await supabase
      .from('customer_invoice_settings')
      .select('footer_email')
      .eq('company_id', invoice.company_id)
      .maybeSingle();
    if (invSettings?.footer_email) {
      invoice.companies.footer_email = invSettings.footer_email;
    }

    let emailSent = false;

    if (invoice.status !== 'draft') {
      throw new Error('Only draft invoices can be sent');
    }

    let journalEntry: { id: string } | null = invoice.journal_entry_id
      ? { id: invoice.journal_entry_id }
      : null;

    if (!journalEntry) {
      const { data: createdJE, error: jeError } = await supabase
        .from('journal_entries')
        .insert({
          company_id: invoice.company_id,
          entry_date: invoice.invoice_date,
          description: `Faktura ${invoice.invoice_number} - ${invoice.counterparty_name}`,
          status: 'draft',
          created_by: user.id,
        })
        .select()
        .maybeSingle();

      if (jeError || !createdJE) {
        console.error('Journal entry error:', JSON.stringify(jeError));
        throw new Error(`Failed to create journal entry: ${jeError?.message || 'unknown'}`);
      }
      journalEntry = createdJE;
    }

    if (!invoice.journal_entry_id) {
      const accounts = [
        { number: '1510', name: 'Kundfordringar', type: 'asset' },
        { number: '3000', name: 'Försäljning', type: 'revenue' },
        { number: '2610', name: 'Utgående moms', type: 'liability' },
      ];
      const accountIds: Record<string, string> = {};
      for (const acc of accounts) {
        const { data: existing } = await supabase
          .from('chart_of_accounts')
          .select('id')
          .eq('company_id', invoice.company_id)
          .eq('account_number', acc.number)
          .maybeSingle();
        if (existing) {
          accountIds[acc.number] = existing.id;
        } else {
          const { data: created } = await supabase
            .from('chart_of_accounts')
            .insert({
              company_id: invoice.company_id,
              account_number: acc.number,
              account_name: acc.name,
              account_type: acc.type,
              created_at: new Date().toISOString(),
            })
            .select('id')
            .maybeSingle();
          if (created) accountIds[acc.number] = created.id;
        }
      }
      if (!accountIds['1510'] || !accountIds['3000'] || !accountIds['2610']) {
        throw new Error('Failed to create accounts');
      }

      const amountExclVat = invoice.total_amount - (invoice.vat_amount || 0);
      const jeLines = [
        { account_id: accountIds['1510'], debit: invoice.total_amount, credit: 0 },
        { account_id: accountIds['3000'], debit: 0, credit: amountExclVat },
      ];
      if (invoice.vat_amount && invoice.vat_amount > 0) {
        jeLines.push({ account_id: accountIds['2610'], debit: 0, credit: invoice.vat_amount });
      }
      await supabase.from('journal_entry_lines').insert(
        jeLines.map(line => ({ ...line, journal_entry_id: journalEntry!.id })),
      );
      const { error: approveError } = await supabase
        .from('journal_entries')
        .update({ status: 'approved', approved_by: user.id })
        .eq('id', journalEntry!.id);
      if (approveError) console.error('Approve error:', JSON.stringify(approveError));
    }

    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        journal_entry_id: journalEntry!.id,
      })
      .eq('id', invoice_id);
    if (updateError) throw new Error('Failed to update invoice status');

    if (invoice.customer_email) {
      console.log('Generating PDF (shared renderer)…');
      const { inv, comp, ln } = mapInvoiceRowToRenderer(invoice, invoice.companies, invoice.invoice_lines);
      const pdfBytes = await generateInvoicePDFBytes(inv, comp, ln, stampForStatus(invoice.status));
      const pdfBase64 = bytesToBase64(pdfBytes);

      try {
        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        if (!resendApiKey) {
          console.warn('RESEND_API_KEY not configured - skipping email');
        } else {
          const { from: fromEmail, replyTo } = pickInvoiceSender(
            invoice.companies,
            { footer_email: (invoice.companies as any).footer_email },
          );

          const emailRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: fromEmail,
              reply_to: replyTo,
              to: [invoice.customer_email],
              subject: `Faktura ${invoice.invoice_number} från ${invoice.companies.name}`,
              html: `
                <h2>Faktura ${invoice.invoice_number}</h2>
                <p>Hej ${invoice.counterparty_name},</p>
                <p>Tack för din beställning. Bifogat finner du fakturan som PDF.</p>
                <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
                  <h3 style="margin-top: 0;">Fakturauppgifter</h3>
                  <p><strong>Fakturanummer:</strong> ${invoice.invoice_number}</p>
                  <p><strong>Fakturadatum:</strong> ${new Date(invoice.invoice_date).toLocaleDateString('sv-SE')}</p>
                  <p><strong>Förfallodatum:</strong> ${new Date(invoice.due_date).toLocaleDateString('sv-SE')}</p>
                  <p><strong>Totalt belopp:</strong> ${invoice.total_amount.toFixed(2)} SEK</p>
                </div>
                <p>Med vänliga hälsningar,<br>${invoice.companies.name}</p>
              `,
              attachments: [
                {
                  filename: `Faktura-${invoice.invoice_number}.pdf`,
                  content: pdfBase64,
                },
              ],
            }),
          });

          if (!emailRes.ok) {
            const errorText = await emailRes.text();
            console.error('Resend failed:', emailRes.status, errorText);
          } else {
            const emailResult = await emailRes.json();
            console.log('Email sent:', emailResult);
            emailSent = true;
          }
        }
      } catch (emailError) {
        console.error('Email sending failed (non-fatal):', emailError);
      }
    } else {
      console.log('No customer email - invoice marked sent and booked, no email sent');
    }

    const message = emailSent
      ? 'Faktura skickad via e-post och bokförd automatiskt'
      : invoice.customer_email
        ? 'Faktura bokförd. E-post kunde inte skickas.'
        : 'Faktura bokförd. Ingen e-postadress angiven — skicka manuellt.';

    return new Response(JSON.stringify({
      success: true,
      invoice_id,
      journal_entry_id: journalEntry?.id ?? null,
      email_sent: emailSent,
      message,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in send-invoice:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
