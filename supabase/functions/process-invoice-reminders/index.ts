import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

import { corsHeaders, handleCors } from "../_shared/cors.ts";

interface OverdueInvoice {
  id: string;
  invoice_number: string;
  counterparty_name: string;
  customer_email: string;
  total_amount: number;
  currency: string;
  due_date: string;
  reminder_count: number;
  last_reminder_sent_at: string | null;
  collection_status: string;
  company_id: string;
  companies: {
    name: string;
    org_number: string;
  };
}

interface ReminderSettings {
  days_until_first_reminder: number;
  days_until_second_reminder: number;
  days_until_collection: number;
  reminder_email_subject_1: string;
  reminder_email_subject_2: string;
  collection_provider: string;
  collection_api_key_encrypted: string | null;
  is_automatic_reminders_enabled: boolean;
  is_automatic_collection_enabled: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    const today = new Date();
    const results = {
      reminders_sent: 0,
      sent_to_collection: 0,
      errors: [] as string[]
    };

    // Get all companies with reminder settings
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name, org_number');

    if (companiesError) {
      throw new Error(`Failed to fetch companies: ${companiesError.message}`);
    }

    for (const company of companies || []) {
      // Get or create reminder settings for this company
      const { data: settings } = await supabase
        .from('invoice_reminder_settings')
        .select('*')
        .eq('company_id', company.id)
        .maybeSingle();

      // Use defaults if no settings exist
      const reminderSettings: ReminderSettings = settings || {
        days_until_first_reminder: 7,
        days_until_second_reminder: 14,
        days_until_collection: 10,
        reminder_email_subject_1: 'Påminnelse: Förfallen faktura',
        reminder_email_subject_2: 'Andra påminnelse: Förfallen faktura',
        collection_provider: 'billecta',
        collection_api_key_encrypted: null,
        is_automatic_reminders_enabled: true,
        is_automatic_collection_enabled: false
      };

      if (!reminderSettings.is_automatic_reminders_enabled) {
        console.log(`Skipping company ${company.name}: automatic reminders disabled`);
        continue;
      }

      // Get overdue outgoing invoices (customer invoices)
      const { data: overdueInvoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('*, companies(name, org_number)')
        .eq('company_id', company.id)
        .eq('invoice_direction', 'outgoing')
        .eq('invoice_type', 'customer')
        .not('status', 'in', '("paid","cancelled")')
        .lt('due_date', today.toISOString().split('T')[0])
        .not('collection_status', 'eq', 'sent_to_collection');

      if (invoicesError) {
        results.errors.push(`Company ${company.id}: ${invoicesError.message}`);
        continue;
      }

      for (const invoice of (overdueInvoices as OverdueInvoice[]) || []) {
        if (!invoice.customer_email) {
          console.log(`Invoice ${invoice.invoice_number}: No customer email, skipping`);
          continue;
        }

        const dueDate = new Date(invoice.due_date);
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        console.log(`Invoice ${invoice.invoice_number}: ${daysOverdue} days overdue, reminder_count: ${invoice.reminder_count}`);

        // Check if we need to send first reminder
        if (invoice.reminder_count === 0 && daysOverdue >= reminderSettings.days_until_first_reminder) {
          const sent = await sendReminder(
            resend,
            invoice,
            company.name,
            1,
            reminderSettings.reminder_email_subject_1,
            supabase
          );
          if (sent) results.reminders_sent++;
        }
        // Check if we need to send second reminder
        else if (invoice.reminder_count === 1 && daysOverdue >= reminderSettings.days_until_second_reminder) {
          const sent = await sendReminder(
            resend,
            invoice,
            company.name,
            2,
            reminderSettings.reminder_email_subject_2,
            supabase
          );
          if (sent) results.reminders_sent++;
        }
        // Check if we need to send to collection
        else if (invoice.reminder_count >= 2 && invoice.collection_status === 'reminder_2') {
          const lastReminderDate = invoice.last_reminder_sent_at ? new Date(invoice.last_reminder_sent_at) : null;
          if (lastReminderDate) {
            const daysSinceLastReminder = Math.floor((today.getTime() - lastReminderDate.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysSinceLastReminder >= reminderSettings.days_until_collection) {
              if (reminderSettings.is_automatic_collection_enabled && reminderSettings.collection_api_key_encrypted) {
                const sent = await sendToCollection(invoice, reminderSettings, supabase);
                if (sent) results.sent_to_collection++;
              } else {
                // Mark as pending collection for manual handling
                await supabase
                  .from('invoices')
                  .update({ 
                    collection_status: 'pending_collection',
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', invoice.id);
                console.log(`Invoice ${invoice.invoice_number}: Marked as pending collection`);
              }
            }
          }
        }
      }
    }

    console.log('Invoice reminder processing complete:', results);

    return new Response(
      JSON.stringify({ success: true, ...results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error processing invoice reminders:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function sendReminder(
  resend: Resend | null,
  invoice: OverdueInvoice,
  companyName: string,
  reminderNumber: number,
  subject: string,
  supabase: any
): Promise<boolean> {
  try {
    const emailBody = generateReminderEmail(invoice, companyName, reminderNumber);

    if (resend) {
      await resend.emails.send({
        from: `${companyName} <faktura@northledger.se>`,
        to: [invoice.customer_email],
        subject: `${subject} - Faktura ${invoice.invoice_number}`,
        html: emailBody
      });
    } else {
      console.log(`[DRY RUN] Would send reminder ${reminderNumber} to ${invoice.customer_email}`);
    }

    // Update invoice
    const newStatus = reminderNumber === 1 ? 'reminder_1' : 'reminder_2';
    await supabase
      .from('invoices')
      .update({
        reminder_count: reminderNumber,
        last_reminder_sent_at: new Date().toISOString(),
        collection_status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoice.id);

    // Log reminder
    await supabase
      .from('invoice_reminders')
      .insert({
        invoice_id: invoice.id,
        reminder_number: reminderNumber,
        sent_to_email: invoice.customer_email,
        email_subject: subject,
        email_body: emailBody,
        delivery_status: resend ? 'sent' : 'dry_run'
      });

    console.log(`Reminder ${reminderNumber} sent for invoice ${invoice.invoice_number} to ${invoice.customer_email}`);
    return true;

  } catch (error) {
    console.error(`Failed to send reminder for invoice ${invoice.invoice_number}:`, error);
    return false;
  }
}

function generateReminderEmail(invoice: OverdueInvoice, companyName: string, reminderNumber: number): string {
  const urgency = reminderNumber === 1 
    ? 'Vänligen betala snarast.' 
    : 'Detta är en andra och sista påminnelse innan ärendet överlämnas till inkasso.';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1a365d; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .invoice-details { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid ${reminderNumber === 1 ? '#f59e0b' : '#ef4444'}; }
        .amount { font-size: 24px; font-weight: bold; color: #1a365d; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        .warning { color: ${reminderNumber === 1 ? '#f59e0b' : '#ef4444'}; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Betalningspåminnelse ${reminderNumber === 2 ? '(Andra påminnelsen)' : ''}</h1>
        </div>
        <div class="content">
          <p>Hej ${invoice.counterparty_name},</p>
          
          <p>Vi vill påminna om att följande faktura har förfallit till betalning:</p>
          
          <div class="invoice-details">
            <p><strong>Fakturanummer:</strong> ${invoice.invoice_number}</p>
            <p><strong>Förfallodatum:</strong> ${new Date(invoice.due_date).toLocaleDateString('sv-SE')}</p>
            <p><strong>Belopp:</strong> <span class="amount">${invoice.total_amount.toLocaleString('sv-SE')} ${invoice.currency}</span></p>
          </div>
          
          <p class="warning">${urgency}</p>
          
          <p>Om betalning redan är gjord, vänligen bortse från detta meddelande.</p>
          
          <p>Vid frågor, vänligen kontakta oss.</p>
          
          <p>Med vänliga hälsningar,<br><strong>${companyName}</strong></p>
        </div>
        <div class="footer">
          <p>Detta är ett automatiskt genererat meddelande från ${companyName}.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

async function sendToCollection(
  invoice: OverdueInvoice,
  settings: ReminderSettings,
  supabase: any
): Promise<boolean> {
  try {
    // TODO: Implement actual collection provider API integration
    // For now, we'll just mark it as sent to collection
    
    console.log(`Sending invoice ${invoice.invoice_number} to collection provider: ${settings.collection_provider}`);
    
    // Here you would integrate with Billecta, Intrum, or other collection provider
    // const response = await fetch(`https://api.${settings.collection_provider}.se/...`, {...});
    
    const collectionReference = `COLL-${Date.now()}-${invoice.invoice_number}`;
    
    await supabase
      .from('invoices')
      .update({
        collection_status: 'sent_to_collection',
        sent_to_collection_at: new Date().toISOString(),
        collection_reference: collectionReference,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoice.id);

    console.log(`Invoice ${invoice.invoice_number} sent to collection with reference: ${collectionReference}`);
    return true;

  } catch (error) {
    console.error(`Failed to send invoice ${invoice.invoice_number} to collection:`, error);
    return false;
  }
}
