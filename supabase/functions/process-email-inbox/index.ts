import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

import { corsHeaders } from "../_shared/cors.ts";

/**
 * Inbound email webhook.
 * Accepts THREE formats:
 *  1) SendGrid Inbound Parse (multipart/form-data) — primary production path
 *  2) Resend webhook (JSON, type=email.received) — legacy
 *  3) Direct JSON forward { to, from, subject, text, html, attachments[] } — for testing
 *
 * SendGrid attachments arrive as multipart files (attachment1, attachment2, ...)
 * and metadata in the "attachment-info" field as JSON.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const contentType = req.headers.get("content-type") || "";
    let recipientEmail = "";
    let fromEmail = "unknown";
    let fromName = "";
    let subject = "(Inget ämne)";
    let bodyText: string | null = null;
    let bodyHtml: string | null = null;
    const inboundAttachments: Array<{ filename: string; contentType: string; bytes: Uint8Array }> = [];

    // ===== 1) SendGrid Inbound Parse (multipart/form-data) =====
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const toRaw = (form.get("to") as string) || "";
      const envelopeRaw = form.get("envelope") as string | null;
      let envelopeTo: string[] = [];
      if (envelopeRaw) {
        try { envelopeTo = JSON.parse(envelopeRaw)?.to ?? []; } catch { /* ignore */ }
      }
      recipientEmail = (envelopeTo[0] || extractEmail(toRaw)).toLowerCase();

      const fromRaw = (form.get("from") as string) || "";
      fromEmail = extractEmail(fromRaw) || "unknown";
      fromName = extractName(fromRaw);
      subject = (form.get("subject") as string) || subject;
      bodyText = (form.get("text") as string) || null;
      bodyHtml = (form.get("html") as string) || null;

      const attachmentCount = parseInt((form.get("attachments") as string) || "0", 10);
      for (let i = 1; i <= attachmentCount; i++) {
        const file = form.get(`attachment${i}`);
        if (file && file instanceof File) {
          const buf = new Uint8Array(await file.arrayBuffer());
          inboundAttachments.push({
            filename: file.name || `attachment-${i}`,
            contentType: file.type || "application/octet-stream",
            bytes: buf,
          });
        }
      }
    } else {
      // ===== 2/3) JSON payload (Resend webhook or direct forward) =====
      const payload = await req.json();
      console.log("Received JSON email payload:", JSON.stringify(payload).substring(0, 500));

      if (payload.type && payload.type !== "email.received") {
        return new Response(JSON.stringify({ message: "Ignored event type" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = payload.type === "email.received" ? payload.data : payload;
      recipientEmail = (Array.isArray(data.to) ? data.to[0] : data.to || "").toLowerCase();
      fromEmail =
        typeof data.from === "string"
          ? extractEmail(data.from) || "unknown"
          : data.from?.address || data.from?.email || "unknown";
      fromName =
        typeof data.from === "object"
          ? data.from?.name || ""
          : extractName(typeof data.from === "string" ? data.from : "");
      subject = data.subject || subject;
      bodyText = data.text || null;
      bodyHtml = data.html || null;

      if (Array.isArray(data.attachments)) {
        for (const att of data.attachments) {
          try {
            const bytes = Uint8Array.from(atob(att.content), (c) => c.charCodeAt(0));
            inboundAttachments.push({
              filename: att.filename || "attachment",
              contentType: att.content_type || att.contentType || "application/octet-stream",
              bytes,
            });
          } catch (err) {
            console.error("Failed decoding attachment:", err);
          }
        }
      }
    }

    console.log(`Processing email TO=${recipientEmail} FROM=${fromEmail} attachments=${inboundAttachments.length}`);

    if (!recipientEmail) {
      return new Response(JSON.stringify({ error: "No recipient email found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find company by email address (case-insensitive)
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, name")
      .ilike("email_inbox_address", recipientEmail)
      .maybeSingle();

    if (companyError || !company) {
      console.error("Company not found for email:", recipientEmail, companyError);
      return new Response(
        JSON.stringify({ error: "Company not found for this email address", recipient: recipientEmail }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("Matched company:", company.name, company.id);

    // Find an owner/admin profile to use as uploaded_by (FK to profiles.id)
    let uploaderProfileId: string | null = null;
    const { data: ownerRole } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("company_id", company.id)
      .in("role", ["owner", "admin", "accountant"])
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (ownerRole?.user_id) {
      uploaderProfileId = ownerRole.user_id;
    } else {
      // Fallback: any profile linked to this company
      const { data: anyProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("company_id", company.id)
        .limit(1)
        .maybeSingle();
      if (anyProfile?.id) uploaderProfileId = anyProfile.id;
    }

    if (!uploaderProfileId) {
      console.error("No uploader profile found for company", company.id);
    }

    // Upload attachments + create document records
    const attachmentsMeta: any[] = [];
    const uploadedDocIds: string[] = [];

    for (let idx = 0; idx < inboundAttachments.length; idx++) {
      const att = inboundAttachments[idx];
      try {
        // Guess document type from mime/filename — default to receipt (most common for inbox)
        const lowerName = (att.filename || "").toLowerCase();
        const looksLikeInvoice = /faktur|invoice/i.test(lowerName) || /faktur|invoice/i.test(subject);
        const docType: string = looksLikeInvoice ? "invoice_incoming" : "receipt";

        const safeName = (att.filename || `attachment-${idx + 1}`).replace(/[^\w.\-]+/g, "_");
        const fileName = `${Date.now()}-${idx}-${safeName}`;
        const filePath = `${company.id}/inbox/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(filePath, att.bytes, { contentType: att.contentType, upsert: false });

        if (uploadError) {
          console.error("Upload error:", uploadError.message, "for", att.filename);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage.from("documents").getPublicUrl(filePath);

        const { data: document, error: docError } = await supabase
          .from("documents")
          .insert({
            company_id: company.id,
            document_type: docType,
            file_url: publicUrl,
            file_name: att.filename,
            file_size: att.bytes.length,
            mime_type: att.contentType,
            processing_status: "pending",
            uploaded_by: uploaderProfileId,
          })
          .select("id")
          .maybeSingle();

        if (docError) {
          console.error("Document insert error:", docError.message, docError.details);
          continue;
        }

        if (document) {
          uploadedDocIds.push(document.id);
          attachmentsMeta.push({
            filename: att.filename,
            content_type: att.contentType,
            size: att.bytes.length,
            file_url: publicUrl,
            document_id: document.id,
            document_type: docType,
          });
          console.log(`Attachment stored: ${att.filename} → doc ${document.id} (${docType})`);
        }
      } catch (err: any) {
        console.error("Attachment processing error:", err.message);
      }
    }

    // Store inbox row
    const { data: incomingEmail, error: insertError } = await supabase
      .from("incoming_emails")
      .insert({
        company_id: company.id,
        from_email: fromEmail,
        from_name: fromName,
        subject,
        body_text: bodyText,
        body_html: bodyHtml,
        attachments: attachmentsMeta,
        status: "new",
        document_ids: uploadedDocIds,
      })
      .select("id")
      .maybeSingle();

    if (insertError) {
      console.error("Failed to store incoming email:", insertError);
      throw new Error("Failed to store incoming email");
    }

    console.log("Stored incoming email:", incomingEmail?.id, "with", attachmentsMeta.length, "attachments");

    // Trigger AI bookkeeper for each uploaded document
    // Use EdgeRuntime.waitUntil so background fetches survive the response
    const triggerAi = async (docId: string) => {
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/ai-process-document`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            documentId: docId,
            companyId: company.id,
            source: "email_inbox",
          }),
        });
        const text = await res.text().catch(() => "");
        console.log(`AI processing for ${docId} → ${res.status}`, text.slice(0, 200));
      } catch (err: any) {
        console.error("AI trigger failed for", docId, err?.message);
        // Mark document as failed so we know to retry
        await supabase
          .from("documents")
          .update({ processing_status: "failed" })
          .eq("id", docId);
      }
    };

    for (const docId of uploadedDocIds) {
      const promise = triggerAi(docId);
      // @ts-ignore — EdgeRuntime exists in Supabase Deno runtime
      if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
        // @ts-ignore
        EdgeRuntime.waitUntil(promise);
      } else {
        promise.catch(() => {});
      }
      console.log("Triggered AI processing for doc:", docId);
    }

    return new Response(
      JSON.stringify({
        message: "Email processed successfully",
        company: company.name,
        emailId: incomingEmail?.id,
        attachmentCount: attachmentsMeta.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error: any) {
    console.error("Error in process-email-inbox:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function extractEmail(raw: string): string {
  if (!raw) return "";
  const match = raw.match(/<([^>]+)>/);
  if (match) return match[1].trim().toLowerCase();
  const m2 = raw.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  return (m2 ? m2[0] : raw).trim().toLowerCase();
}

function extractName(raw: string): string {
  if (!raw) return "";
  const m = raw.match(/^\s*"?([^"<]+?)"?\s*</);
  return m ? m[1].trim() : "";
}
