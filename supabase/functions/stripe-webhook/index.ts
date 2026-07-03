import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

import { corsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    
    // Verify webhook signature for security
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    let event: Stripe.Event;
    
    if (webhookSecret && signature) {
      try {
        event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
        console.log("[STRIPE-WEBHOOK] Signature verified successfully");
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error("[STRIPE-WEBHOOK] Signature verification failed:", errorMessage);
        return new Response(JSON.stringify({ error: "Webhook signature verification failed" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      console.warn("[STRIPE-WEBHOOK] No webhook secret configured, skipping signature verification");
      event = JSON.parse(body) as Stripe.Event;
    }
    
    console.log("[STRIPE-WEBHOOK] Event type:", event.type);

    switch (event.type) {
      // ========== PAYMENT EVENTS ==========
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        console.log("[STRIPE-WEBHOOK] Payment failed for customer:", invoice.customer);
        
        const customer = await stripe.customers.retrieve(invoice.customer as string);
        const customerEmail = (customer as Stripe.Customer).email;
        
        await supabase.from("admin_notifications").insert({
          notification_type: "payment_failed",
          severity: "error",
          title: "Betalning misslyckades",
          message: `Betalning misslyckades för kund ${customerEmail}. Belopp: ${invoice.amount_due / 100} ${invoice.currency.toUpperCase()}`,
          metadata: {
            customer_id: invoice.customer,
            customer_email: customerEmail,
            invoice_id: invoice.id,
            amount: invoice.amount_due,
            currency: invoice.currency,
            attempt_count: invoice.attempt_count,
          },
        });
        
        const resendKey = Deno.env.get("RESEND_API_KEY");
        if (resendKey && customerEmail) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "NorthLedger <no-reply@northledger.se>",
              to: [customerEmail],
              subject: "Betalningsproblem - NorthLedger",
              html: `
                <h2>Din betalning kunde inte genomföras</h2>
                <p>Vi kunde tyvärr inte dra din prenumerationsavgift.</p>
                <p>Vänligen uppdatera din betalningsmetod för att fortsätta använda NorthLedger.</p>
                <p><a href="https://northledger.se/settings">Uppdatera betalningsuppgifter</a></p>
              `,
            }),
          });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        console.log("[STRIPE-WEBHOOK] Payment succeeded:", invoice.id);
        
        const customer = await stripe.customers.retrieve(invoice.customer as string);
        const customerEmail = (customer as Stripe.Customer).email;
        
        // Update subscription status to active
        if (invoice.subscription) {
          const { data: companies } = await supabase
            .from("companies")
            .select("id")
            .eq("stripe_subscription_id", invoice.subscription);
          
          if (companies && companies.length > 0) {
            await supabase
              .from("companies")
              .update({ subscription_status: "active" })
              .eq("stripe_subscription_id", invoice.subscription);
          }
        }
        
        // Log successful payment
        await supabase.from("admin_notifications").insert({
          notification_type: "payment_succeeded",
          severity: "info",
          title: "Betalning genomförd",
          message: `Betalning på ${invoice.amount_paid / 100} ${invoice.currency.toUpperCase()} från ${customerEmail}`,
          metadata: {
            customer_id: invoice.customer,
            customer_email: customerEmail,
            invoice_id: invoice.id,
            amount: invoice.amount_paid,
          },
        });
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object;
        console.log("[STRIPE-WEBHOOK] Invoice paid:", invoice.id);
        // Similar to payment_succeeded but confirms the full invoice is paid
        break;
      }

      // ========== SUBSCRIPTION EVENTS ==========
      case "customer.subscription.created": {
        const subscription = event.data.object;
        console.log("[STRIPE-WEBHOOK] New subscription created:", subscription.id);
        
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        const customerEmail = (customer as Stripe.Customer).email;
        
        await supabase.from("admin_notifications").insert({
          notification_type: "subscription_created",
          severity: "info",
          title: "Ny prenumeration",
          message: `Ny prenumeration skapad för ${customerEmail}`,
          metadata: {
            subscription_id: subscription.id,
            customer_id: subscription.customer,
            customer_email: customerEmail,
            status: subscription.status,
          },
        });
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        console.log("[STRIPE-WEBHOOK] Subscription updated:", subscription.id);
        
        // Update company subscription status
        const { data: companies } = await supabase
          .from("companies")
          .select("id")
          .eq("stripe_subscription_id", subscription.id);
        
        if (companies && companies.length > 0) {
          const statusMap: Record<string, string> = {
            active: "active",
            past_due: "past_due",
            canceled: "cancelled",
            unpaid: "past_due",
            trialing: "trialing",
          };
          
          await supabase
            .from("companies")
            .update({
              subscription_status: statusMap[subscription.status] || subscription.status,
            })
            .eq("stripe_subscription_id", subscription.id);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        console.log("[STRIPE-WEBHOOK] Subscription deleted:", subscription.id);
        
        // Update company to cancelled status
        await supabase
          .from("companies")
          .update({
            subscription_status: "cancelled",
            subscription_end_date: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);
        
        await supabase.from("admin_notifications").insert({
          notification_type: "subscription_cancelled",
          severity: "warning",
          title: "Prenumeration avslutad",
          message: `Prenumeration ${subscription.id} har avslutats.`,
          metadata: {
            subscription_id: subscription.id,
            customer_id: subscription.customer,
            cancel_reason: subscription.cancellation_details?.reason,
          },
        });
        break;
      }

      case "customer.subscription.trial_will_end": {
        const subscription = event.data.object;
        console.log("[STRIPE-WEBHOOK] Trial ending soon:", subscription.id);
        
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        const customerEmail = (customer as Stripe.Customer).email;
        
        // Send reminder email
        const resendKey = Deno.env.get("RESEND_API_KEY");
        if (resendKey && customerEmail) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "NorthLedger <no-reply@northledger.se>",
              to: [customerEmail],
              subject: "Din provperiod avslutas snart - NorthLedger",
              html: `
                <h2>Din provperiod avslutas snart</h2>
                <p>Hej! Din kostnadsfria provperiod på NorthLedger avslutas om 3 dagar.</p>
                <p>För att fortsätta använda alla funktioner, se till att du har en aktiv betalningsmetod.</p>
                <p><a href="https://northledger.se/settings">Hantera prenumeration</a></p>
              `,
            }),
          });
        }
        
        await supabase.from("admin_notifications").insert({
          notification_type: "trial_ending",
          severity: "info",
          title: "Provperiod avslutas snart",
          message: `Provperiod för ${customerEmail} avslutas snart.`,
          metadata: {
            subscription_id: subscription.id,
            customer_email: customerEmail,
            trial_end: subscription.trial_end,
          },
        });
        break;
      }

      // ========== CHECKOUT EVENTS ==========
      case "checkout.session.completed": {
        const session = event.data.object;
        console.log("[STRIPE-WEBHOOK] Checkout completed:", session.id);
        
        if (session.metadata?.user_id) {
          const { data: role } = await supabase
            .from("user_roles")
            .select("company_id")
            .eq("user_id", session.metadata.user_id)
            .eq("role", "owner")
            .maybeSingle();

          if (role?.company_id) {
            await supabase
              .from("companies")
              .update({
                subscription_status: "active",
                subscription_tier: session.metadata.tier || "starter",
                stripe_subscription_id: session.subscription,
                stripe_customer_id: session.customer,
                subscription_start_date: new Date().toISOString(),
              })
              .eq("id", role.company_id);
          }
        }
        
        await supabase.from("admin_notifications").insert({
          notification_type: "checkout_completed",
          severity: "info",
          title: "Ny checkout genomförd",
          message: `Checkout session ${session.id} genomförd.`,
          metadata: {
            session_id: session.id,
            customer_id: session.customer,
            subscription_id: session.subscription,
            tier: session.metadata?.tier,
          },
        });
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object;
        console.log("[STRIPE-WEBHOOK] Checkout expired:", session.id);
        
        await supabase.from("admin_notifications").insert({
          notification_type: "checkout_expired",
          severity: "warning",
          title: "Checkout avbruten",
          message: `En kund avbröt checkout-processen.`,
          metadata: {
            session_id: session.id,
            customer_email: session.customer_email,
          },
        });
        break;
      }

      // ========== DISPUTE & REFUND EVENTS ==========
      case "charge.dispute.created": {
        const dispute = event.data.object;
        console.log("[STRIPE-WEBHOOK] Dispute created:", dispute.id);
        
        // CRITICAL: Dispute = potential chargeback
        await supabase.from("admin_notifications").insert({
          notification_type: "dispute_created",
          severity: "error",
          title: "⚠️ TVIST SKAPAD - Kräver omedelbar åtgärd",
          message: `En tvist har skapats för ${dispute.amount / 100} ${dispute.currency.toUpperCase()}. Svara inom 7 dagar!`,
          metadata: {
            dispute_id: dispute.id,
            charge_id: dispute.charge,
            amount: dispute.amount,
            currency: dispute.currency,
            reason: dispute.reason,
            due_by: dispute.evidence_details?.due_by,
          },
        });
        
        // Send urgent email to admin
        const resendKey = Deno.env.get("RESEND_API_KEY");
        if (resendKey) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "NorthLedger System <no-reply@northledger.se>",
              to: ["admin@northledger.se"],
              subject: "⚠️ URGENT: Ny tvist/chargeback",
              html: `
                <h2 style="color: red;">En tvist har skapats!</h2>
                <p><strong>Belopp:</strong> ${dispute.amount / 100} ${dispute.currency.toUpperCase()}</p>
                <p><strong>Anledning:</strong> ${dispute.reason}</p>
                <p><strong>Tvist-ID:</strong> ${dispute.id}</p>
                <p>Logga in på Stripe Dashboard och svara på tvisten omedelbart.</p>
              `,
            }),
          });
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object;
        console.log("[STRIPE-WEBHOOK] Charge refunded:", charge.id);
        
        await supabase.from("admin_notifications").insert({
          notification_type: "refund_processed",
          severity: "info",
          title: "Återbetalning genomförd",
          message: `Återbetalning på ${charge.amount_refunded / 100} ${charge.currency.toUpperCase()} har genomförts.`,
          metadata: {
            charge_id: charge.id,
            amount_refunded: charge.amount_refunded,
            customer_id: charge.customer,
          },
        });
        break;
      }

      default:
        console.log("[STRIPE-WEBHOOK] Unhandled event type:", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[STRIPE-WEBHOOK] Error:", errorMessage);
    
    // Still return 200 to prevent Stripe retries for processing errors
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
