import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SCRIVE_API_BASE = "https://scrive.com/api/v2";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Ej autentiserad");
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Ej autentiserad");

    const body = await req.json();
    const { action, company_id } = body;

    // Get Scrive credentials
    const { data: creds } = await supabase
      .from("integration_credentials")
      .select("*")
      .eq("company_id", company_id)
      .eq("provider", "scrive")
      .eq("is_active", true)
      .maybeSingle();

    const apiToken = creds?.config?.api_token || Deno.env.get("SCRIVE_API_TOKEN");
    const accessToken = creds?.config?.access_token || Deno.env.get("SCRIVE_ACCESS_TOKEN");
    const apiSecret = creds?.config?.api_secret || Deno.env.get("SCRIVE_API_SECRET");
    const accessSecret = creds?.config?.access_secret || Deno.env.get("SCRIVE_ACCESS_SECRET");

    const scriveAuth = `oauth_signature_method="PLAINTEXT",oauth_consumer_key="${apiToken}",oauth_token="${accessToken}",oauth_signature="${apiSecret}&${accessSecret}"`;

    switch (action) {
      case "create_envelope": {
        const { document_title, document_type, signatories, file_url, related_entity_type, related_entity_id } = body;

        let scrive_doc_id = null;

        if (apiToken && accessToken) {
          try {
            // Create new document in Scrive
            const createRes = await fetch(`${SCRIVE_API_BASE}/documents/new`, {
              method: "POST",
              headers: { "Authorization": scriveAuth },
            });

            if (createRes.ok) {
              const doc = await createRes.json();
              scrive_doc_id = doc.id;

              // Set title and signatories
              await fetch(`${SCRIVE_API_BASE}/documents/${scrive_doc_id}/update`, {
                method: "POST",
                headers: {
                  "Authorization": scriveAuth,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  title: document_title,
                  parties: signatories.map((s: any, i: number) => ({
                    is_author: i === 0,
                    fields: [
                      { type: "name", value: s.name, order: 1 },
                      { type: "email", value: s.email, order: 2 },
                      ...(s.personal_number ? [{ type: "personal_number", value: s.personal_number, order: 3 }] : []),
                    ],
                    sign_order: s.sign_order || i + 1,
                    delivery_method: "email",
                    authentication_method_to_sign: s.use_bankid ? "se_bankid" : "standard",
                  })),
                }),
              });
            }
          } catch (apiErr) {
            console.warn("Scrive API call failed:", apiErr);
          }
        }

        // Store envelope
        const { data: envelope, error: insertErr } = await supabase
          .from("signing_envelopes")
          .insert({
            company_id,
            document_type,
            document_title,
            scrive_document_id: scrive_doc_id,
            status: scrive_doc_id ? "pending" : "draft",
            signatories,
            file_url,
            related_entity_type,
            related_entity_id,
            sent_at: scrive_doc_id ? new Date().toISOString() : null,
            created_by: user.id,
          })
          .select()
          .maybeSingle();

        if (insertErr) throw insertErr;

        return new Response(JSON.stringify({
          success: true,
          envelope,
          message: scrive_doc_id 
            ? "Dokument skapat i Scrive och skickat för signering." 
            : "Signeringsärende sparat (Scrive ej konfigurerat)."
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "list_envelopes": {
        const { data: envelopes } = await supabase
          .from("signing_envelopes")
          .select("*")
          .eq("company_id", company_id)
          .order("created_at", { ascending: false });

        return new Response(JSON.stringify({ envelopes: envelopes || [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "check_status": {
        const { envelope_id } = body;
        const { data: envelope } = await supabase
          .from("signing_envelopes")
          .select("*")
          .eq("id", envelope_id)
          .eq("company_id", company_id)
          .maybeSingle();

        if (!envelope) throw new Error("Ärende hittades inte");

        // If Scrive is configured, check status
        if (envelope.scrive_document_id && apiToken) {
          try {
            const res = await fetch(`${SCRIVE_API_BASE}/documents/${envelope.scrive_document_id}/get`, {
              headers: { "Authorization": scriveAuth },
            });
            if (res.ok) {
              const doc = await res.json();
              const newStatus = doc.status === "closed" ? "completed" 
                : doc.status === "canceled" ? "cancelled" 
                : "pending";
              
              if (newStatus !== envelope.status) {
                await supabase
                  .from("signing_envelopes")
                  .update({ 
                    status: newStatus, 
                    completed_at: newStatus === "completed" ? new Date().toISOString() : null,
                    updated_at: new Date().toISOString() 
                  })
                  .eq("id", envelope_id);
              }
              
              return new Response(JSON.stringify({ envelope: { ...envelope, status: newStatus } }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
          } catch (e) { console.warn("Scrive status check failed:", e); }
        }

        return new Response(JSON.stringify({ envelope }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "cancel": {
        const { envelope_id } = body;
        await supabase
          .from("signing_envelopes")
          .update({ status: "cancelled", cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("id", envelope_id)
          .eq("company_id", company_id);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        throw new Error(`Okänd åtgärd: ${action}`);
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
