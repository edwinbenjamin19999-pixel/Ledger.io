import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");

    const { to, appUrl } = await req.json();

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #1a1a2e; font-size: 28px;">Välkommen till NorthLedger! 🎉</h1>
        <p style="color: #444; font-size: 16px; line-height: 1.6;">
          Hej Edwin!
        </p>
        <p style="color: #444; font-size: 16px; line-height: 1.6;">
          Du har fått tillgång till NorthLedger — nästa generations bokföring för tillväxtföretag.
        </p>
        <p style="color: #444; font-size: 16px; line-height: 1.6;">
          Skapa ditt konto genom att klicka på knappen nedan och registrera dig med denna e-postadress.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${appUrl}/auth" 
             style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600;">
            Kom igång med NorthLedger
          </a>
        </div>
        <p style="color: #888; font-size: 14px; line-height: 1.6;">
          Du kan logga in direkt efter registrering — ingen e-postverifiering krävs.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
        <p style="color: #aaa; font-size: 12px;">
          NorthLedger — AI-driven bokföring för svenska företag
        </p>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "NorthLedger <info@northledger.se>",
        to: [to],
        subject: "Välkommen till NorthLedger – Ditt testkonto väntar!",
        html,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(JSON.stringify(result));
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
