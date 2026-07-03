import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INKASSOGRAM_API_BASE = "https://api.inkassogram.se/api/v3";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { action } = body;

    // Webhook callback from Inkassogram — no auth needed
    if (action === "webhook") {
      const { event_type, case_reference, status, amount_paid, payment_date } = body;
      
      if (!case_reference) throw new Error("Saknar ärendenummer");

      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

      switch (event_type) {
        case "payment_received":
          updates.status = "paid";
          updates.paid_at = payment_date || new Date().toISOString();
          updates.remaining_amount = 0;
          break;
        case "partial_payment":
          updates.status = "partial_payment";
          if (amount_paid) {
            const { data: existing } = await supabase
              .from("collection_cases")
              .select("remaining_amount")
              .eq("inkassogram_reference", case_reference)
              .maybeSingle();
            updates.remaining_amount = Math.max(0, (existing?.remaining_amount || 0) - amount_paid);
          }
          break;
        case "case_closed":
          updates.status = "closed";
          updates.closed_at = new Date().toISOString();
          updates.close_reason = status || "closed_by_provider";
          break;
        case "legal_action":
          updates.status = "legal";
          break;
        case "debtor_dispute":
          updates.status = "disputed";
          break;
        default:
          console.log("Unknown webhook event:", event_type);
      }

      const { error } = await supabase
        .from("collection_cases")
        .update(updates)
        .eq("inkassogram_reference", case_reference);

      if (error) throw error;

      // If paid, update original invoice too
      if (event_type === "payment_received") {
        const { data: caseData } = await supabase
          .from("collection_cases")
          .select("invoice_id")
          .eq("inkassogram_reference", case_reference)
          .maybeSingle();
        if (caseData?.invoice_id) {
          await supabase
            .from("invoices")
            .update({ status: "paid", updated_at: new Date().toISOString() })
            .eq("id", caseData.invoice_id);
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // All other actions require auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Ej autentiserad");
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Ej autentiserad");

    const { company_id, invoice_id, case_id } = body;

    // Get Inkassogram credentials
    const { data: creds } = await supabase
      .from("integration_credentials")
      .select("*")
      .eq("company_id", company_id)
      .eq("provider", "inkassogram")
      .eq("is_active", true)
      .maybeSingle();

    const api_key = creds?.config?.api_key || Deno.env.get("INKASSOGRAM_API_KEY");
    const client_id = creds?.config?.client_id || Deno.env.get("INKASSOGRAM_CLIENT_ID");

    switch (action) {
      case "submit_collection": {
        const { data: invoice } = await supabase
          .from("invoices")
          .select("*, customers(name, org_number, address, postal_code, city, email, phone)")
          .eq("id", invoice_id)
          .eq("company_id", company_id)
          .maybeSingle();

        if (!invoice) throw new Error("Faktura hittades inte");

        // Check existing active case
        const { data: existing } = await supabase
          .from("collection_cases")
          .select("id")
          .eq("invoice_id", invoice_id)
          .not("status", "in", '("closed","cancelled","paid")')
          .maybeSingle();

        if (existing) throw new Error("Ett inkassoärende finns redan for denna faktura");

        // Calculate interest (Rantelagen: referensranta + 8%)
        const daysPastDue = Math.floor((Date.now() - new Date(invoice.due_date).getTime()) / 86400000);
        const annualRate = 10.75;
        const interestAmount = Math.round(invoice.total_amount * (annualRate / 100) * (daysPastDue / 365));
        const collectionFee = 180;

        let inkassogram_ref = null;

        if (api_key && client_id) {
          try {
            // Get company details for the creditor block
            const { data: company } = await supabase
              .from("companies")
              .select("name, org_number, address, bankgiro, plusgiro")
              .eq("id", company_id)
              .maybeSingle();

            const webhookUrl = `${supabaseUrl}/functions/v1/inkassogram-collection`;

            const res = await fetch(`${INKASSOGRAM_API_BASE}/collection/create`, {
              method: "POST",
              headers: {
                "Authorization": `Basic ${btoa(`${client_id}:${api_key}`)}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                creditor: {
                  name: company?.name,
                  org_number: company?.org_number,
                  address: company?.address,
                  bankgiro: company?.bankgiro,
                  plusgiro: company?.plusgiro,
                },
                debtor: {
                  name: invoice.customers?.name,
                  org_number: invoice.customers?.org_number,
                  address: invoice.customers?.address,
                  postal_code: invoice.customers?.postal_code,
                  city: invoice.customers?.city,
                  email: invoice.customers?.email,
                  phone: invoice.customers?.phone,
                },
                invoice_number: invoice.invoice_number,
                invoice_date: invoice.invoice_date,
                due_date: invoice.due_date,
                amount: invoice.total_amount,
                interest: interestAmount,
                interest_rate: annualRate,
                collection_fee: collectionFee,
                currency: "SEK",
                reminder_count: invoice.reminder_count || 0,
                webhook_url: webhookUrl,
                webhook_events: ["payment_received", "partial_payment", "case_closed", "legal_action", "debtor_dispute"],
              }),
            });

            if (res.ok) {
              const result = await res.json();
              inkassogram_ref = result.case_id || result.reference;
            } else {
              const errText = await res.text();
              console.warn("Inkassogram API error:", res.status, errText);
            }
          } catch (apiErr) {
            console.warn("Inkassogram API call failed:", apiErr);
          }
        }

        const { data: newCase, error: insertErr } = await supabase
          .from("collection_cases")
          .insert({
            company_id,
            invoice_id,
            status: inkassogram_ref ? "submitted" : "pending",
            debtor_name: invoice.customers?.name || invoice.counterparty_name,
            debtor_org_number: invoice.customers?.org_number,
            original_amount: invoice.total_amount,
            remaining_amount: invoice.total_amount + interestAmount + collectionFee,
            interest_amount: interestAmount,
            collection_fee: collectionFee,
            inkassogram_reference: inkassogram_ref,
            submitted_at: inkassogram_ref ? new Date().toISOString() : null,
            reminder_count: invoice.reminder_count || 0,
            created_by: user.id,
          })
          .select()
          .maybeSingle();

        if (insertErr) throw insertErr;

        // Update invoice status
        await supabase
          .from("invoices")
          .update({ status: "collection", updated_at: new Date().toISOString() })
          .eq("id", invoice_id);

        return new Response(JSON.stringify({
          success: true,
          case: newCase,
          message: inkassogram_ref
            ? `Inkassoarende skapat. Ref: ${inkassogram_ref}`
            : "Inkassoarende registrerat (manuellt lage — koppla API-nyckel under Installningar)."
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "list_cases": {
        const { data: cases } = await supabase
          .from("collection_cases")
          .select("*, invoices(invoice_number, counterparty_name)")
          .eq("company_id", company_id)
          .order("created_at", { ascending: false });

        return new Response(JSON.stringify({ cases: cases || [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "sync_status": {
        // Sync status from Inkassogram for all active cases
        if (!api_key || !client_id) {
          return new Response(JSON.stringify({ error: "Inkassogram ej konfigurerat" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: activeCases } = await supabase
          .from("collection_cases")
          .select("id, inkassogram_reference")
          .eq("company_id", company_id)
          .not("status", "in", '("closed","cancelled","paid")')
          .not("inkassogram_reference", "is", null);

        let synced = 0;
        for (const c of activeCases || []) {
          try {
            const res = await fetch(`${INKASSOGRAM_API_BASE}/collection/${c.inkassogram_reference}/status`, {
              headers: { "Authorization": `Basic ${btoa(`${client_id}:${api_key}`)}` },
            });
            if (res.ok) {
              const data = await res.json();
              const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
              if (data.status) updates.status = data.status;
              if (data.remaining_amount !== undefined) updates.remaining_amount = data.remaining_amount;
              if (data.paid_at) { updates.paid_at = data.paid_at; updates.status = "paid"; }
              await supabase.from("collection_cases").update(updates).eq("id", c.id);
              synced++;
            }
          } catch { /* skip individual failures */ }
        }

        return new Response(JSON.stringify({ success: true, synced }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "close_case": {
        const { reason } = body;
        const { error } = await supabase
          .from("collection_cases")
          .update({
            status: "closed",
            closed_at: new Date().toISOString(),
            close_reason: reason || "manual_close",
            updated_at: new Date().toISOString(),
          })
          .eq("id", case_id)
          .eq("company_id", company_id);

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        throw new Error(`Okand atgard: ${action}`);
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
