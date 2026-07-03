import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

import { corsHeaders, handleCors } from "../_shared/cors.ts";

/**
 * This function checks for subscriptions with trials ending in ~7 days
 * and sends reminder emails. Should be run daily via cron.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[TRIAL-REMINDER-7D] Starting 7-day trial reminder check");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    // Calculate the target date range (trials ending in 6-8 days to account for timing)
    const now = Math.floor(Date.now() / 1000);
    const sixDaysFromNow = now + (6 * 24 * 60 * 60);
    const eightDaysFromNow = now + (8 * 24 * 60 * 60);

    // Find subscriptions with trials ending in about 7 days
    const subscriptions = await stripe.subscriptions.list({
      status: "trialing",
      limit: 100,
    });

    let emailsSent = 0;
    const errors: string[] = [];

    for (const subscription of subscriptions.data) {
      const trialEnd = subscription.trial_end;
      
      if (!trialEnd) continue;
      
      // Check if trial ends in approximately 7 days
      if (trialEnd >= sixDaysFromNow && trialEnd <= eightDaysFromNow) {
        try {
          const customer = await stripe.customers.retrieve(subscription.customer as string);
          const customerEmail = (customer as Stripe.Customer).email;
          
          if (!customerEmail) {
            console.log(`[TRIAL-REMINDER-7D] No email for customer ${subscription.customer}`);
            continue;
          }

          const daysLeft = Math.ceil((trialEnd - now) / (24 * 60 * 60));
          const trialEndDate = new Date(trialEnd * 1000).toLocaleDateString("sv-SE");

          console.log(`[TRIAL-REMINDER-7D] Sending 7-day reminder to ${customerEmail}`);

          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "NorthLedger <no-reply@northledger.se>",
              to: [customerEmail],
              subject: "En vecka kvar av din provperiod - NorthLedger",
              html: `
                <!DOCTYPE html>
                <html>
                <head>
                  <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; border-radius: 12px 12px 0 0; }
                    .header h1 { color: white; margin: 0; font-size: 24px; }
                    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
                    .highlight { background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0; }
                    .cta { display: inline-block; background: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
                    .features { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
                    .feature { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
                    .feature:last-child { border-bottom: none; }
                    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1>⏰ En vecka kvar av din provperiod</h1>
                    </div>
                    <div class="content">
                      <p>Hej!</p>
                      <p>Din kostnadsfria provperiod på NorthLedger avslutas om <strong>${daysLeft} dagar</strong> (${trialEndDate}).</p>
                      
                      <div class="highlight">
                        <strong>💡 Tips:</strong> Lägg till en betalningsmetod nu så fortsätter din prenumeration automatiskt utan avbrott.
                      </div>

                      <div class="features">
                        <h3 style="margin-top: 0;">Vad du har tillgång till:</h3>
                        <div class="feature">✅ AI-driven bokföring som sparar timmar</div>
                        <div class="feature">✅ Automatisk bankintegration</div>
                        <div class="feature">✅ Kvittoscanning och kategorisering</div>
                        <div class="feature">✅ Rapporter och insikter</div>
                      </div>

                      <a href="https://northledger.se/settings" class="cta">Aktivera prenumeration →</a>

                      <p style="color: #6b7280; font-size: 14px;">
                        Har du frågor? Svara på detta mail eller kontakta oss på support@northledger.se.
                      </p>
                    </div>
                    <div class="footer">
                      <p>NorthLedger - Smart bokföring för svenska företag</p>
                    </div>
                  </div>
                </body>
                </html>
              `,
            }),
          });

          emailsSent++;
          console.log(`[TRIAL-REMINDER-7D] Successfully sent email to ${customerEmail}`);
        } catch (emailError) {
          const errorMsg = emailError instanceof Error ? emailError.message : String(emailError);
          errors.push(`Failed to email ${subscription.customer}: ${errorMsg}`);
          console.error(`[TRIAL-REMINDER-7D] Error:`, errorMsg);
        }
      }
    }

    console.log(`[TRIAL-REMINDER-7D] Complete. Sent ${emailsSent} emails.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[TRIAL-REMINDER-7D] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
