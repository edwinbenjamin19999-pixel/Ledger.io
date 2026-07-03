// Creates a `signing_envelopes` row with `payload` (XML + period) and a
// public_token, then optionally e-mails / SMSs the recipient a mobile signing
// link of the form `${SITE_ORIGIN}/sign-skv/{envelopeId}?token=...`.
//
// The recipient opens the link on their phone, completes BankID, and the
// signing page itself triggers `skv-vat-submit` / `skv-agi-submit`.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  companyId: string;
  documentType: "vat_filing" | "agi_filing" | "income_tax_filing";
  documentTitle: string;
  periodLabel: string;
  xmlPayload: string;
  recipient: { name: string; email: string; phone?: string };
  /** Where the public signing page is hosted. Defaults to request origin. */
  siteOrigin?: string;
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Auth: caller must be signed in.
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Ej autentiserad" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as RequestBody;
    if (!body.companyId || !body.xmlPayload || !body.recipient?.email) {
      return new Response(
        JSON.stringify({ error: "companyId, xmlPayload, recipient.email krävs" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const publicToken = generateToken();

    const signatories = [
      {
        name: body.recipient.name,
        email: body.recipient.email,
        phone: body.recipient.phone ?? null,
        role: "signatory",
        use_bankid: true,
        sign_order: 1,
      },
    ];

    const { data: envelope, error: insertErr } = await supabase
      .from("signing_envelopes")
      .insert({
        company_id: body.companyId,
        document_type: body.documentType,
        document_title: body.documentTitle,
        status: "pending",
        signatories,
        payload: { xml: body.xmlPayload, periodLabel: body.periodLabel },
        public_token: publicToken,
        sent_at: new Date().toISOString(),
        created_by: user.id,
      })
      .select()
      .maybeSingle();

    if (insertErr || !envelope) {
      return new Response(
        JSON.stringify({ error: insertErr?.message ?? "Kunde inte skapa envelope" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const origin =
      body.siteOrigin ??
      req.headers.get("origin") ??
      "https://northledger.se";
    const signingUrl = `${origin}/sign-skv/${envelope.id}?token=${publicToken}`;

    // Best-effort e-mail delivery via Resend (optional — link still works without it)
    let emailSent = false;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY) {
      try {
        const html = `
          <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #0f1f35; font-size: 20px; margin: 0 0 12px;">Signera ${body.documentTitle}</h2>
            <p style="color: #4b5563; font-size: 15px; line-height: 1.5;">
              Hej ${body.recipient.name},<br/><br/>
              ${body.documentTitle} (period ${body.periodLabel}) är klar för signering.
              Klicka på knappen nedan för att öppna signeringen i din mobil och signera med BankID.
              Inlämningen till Skatteverket sker automatiskt direkt efter signering.
            </p>
            <a href="${signingUrl}" style="display: inline-block; margin: 20px 0; padding: 12px 24px; background: #0891b2; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
              Öppna signering →
            </a>
            <p style="color: #9ca3af; font-size: 12px;">
              Länken är personlig och giltig tills signering är klar eller avbruten.
            </p>
          </div>`;
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "NorthLedger <notify@notify.northledger.se>",
            to: [body.recipient.email],
            subject: `Signera ${body.documentTitle}`,
            html,
          }),
        });
        emailSent = r.ok;
      } catch (e) {
        console.warn("Resend e-mail failed:", e);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        envelope_id: envelope.id,
        signing_url: signingUrl,
        email_sent: emailSent,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Okänt fel" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
