/**
 * Stripe Webhook Handler
 * 
 * Processes Stripe events and sends transactional emails via Resend.
 * 
 * Events handled:
 * - payment_intent.succeeded → Purchase receipt + Onboarding reminder
 * - checkout.session.completed → Grant premium entitlement
 * - invoice.payment_succeeded → Purchase receipt
 * - setup_intent.succeeded → Welcome email + Onboarding reminder
 * - customer.subscription.* → Update guest purchase status
 * - charge.refunded / charge.dispute.created → Revoke premium
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// Import email templates
import { getWelcomeEmailHtml } from "./_templates/welcome.ts";
import { getPurchaseReceiptHtml } from "./_templates/purchase-receipt.ts";
import { getOnboardingReminderHtml } from "./_templates/onboarding-reminder.ts";

// Import email utilities
import {
  sendEmail,
  extractEmail,
  extractInvoiceEmail,
  extractSetupEmail,
  getPaymentMethod,
  formatAmount,
  formatDate,
  logStep,
  PRODUCT_NAME
} from "./_utils/email.ts";

// ============= CORS Headers =============

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============= Main Handler =============

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Load environment variables
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeKey || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing required environment variables");
    }

    // Verify webhook signature
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    
    if (!signature) {
      return new Response(
        JSON.stringify({ error: "Missing Stripe signature" }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const event = await stripe.webhooks.constructEventAsync(
      body, 
      signature, 
      webhookSecret, 
      undefined, 
      Stripe.createSubtleCryptoProvider()
    );
    
    logStep("Event verified", { type: event.type, id: event.id });

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, serviceRoleKey, { 
      auth: { persistSession: false } 
    });

    // ============= Idempotency Check =============
    const { data: existing } = await supabase
      .from("stripe_events")
      .select("event_id")
      .eq("event_id", event.id)
      .maybeSingle();
    
    if (existing) {
      logStep("Event already processed, skipping", { id: event.id });
      return new Response(
        JSON.stringify({ received: true, skipped: true }), 
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    await supabase.from("stripe_events").insert({ event_id: event.id });

    // ============= Event Handlers =============
    
    switch (event.type) {
      // ----- Payment Intent Succeeded -----
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const email = await extractEmail(stripe, pi);
        const chargeId = pi.latest_charge 
          ? (typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge.id)
          : null;
        const method = chargeId ? await getPaymentMethod(stripe, chargeId) : undefined;

        // Guest purchase flow
        if (pi.metadata?.purchase_type === "guest") {
          const { data: gp } = await supabase
            .from("guest_purchases")
            .update({ 
              status: "paid", 
              paid_at: new Date().toISOString(), 
              ...(email ? { payer_email: email } : {}) 
            })
            .eq("payment_intent_id", pi.id)
            .select('claim_code')
            .maybeSingle();
          
          if (email) {
            await sendEmail(
              email, 
              `Your Am I Ready? purchase receipt – ${formatAmount(pi.amount, pi.currency)}`,
              getPurchaseReceiptHtml(formatAmount(pi.amount, pi.currency), formatDate(pi.created), method, pi.id, gp?.claim_code)
            );
            await sendEmail(
              email, 
              'Complete your emergency preparedness setup',
              getOnboardingReminderHtml(gp?.claim_code)
            );
          }
        } 
        // Logged-in user purchase flow
        else if (pi.metadata?.user_id) {
          await supabase
            .from("premium_entitlements")
            .upsert({ 
              user_id: pi.metadata.user_id, 
              is_premium: true, 
              granted_at: new Date().toISOString(), 
              revoked_at: null, 
              plan_name: PRODUCT_NAME, 
              price_eur: 49 
            }, { onConflict: "user_id" });
          
          if (email) {
            await sendEmail(
              email, 
              `Your Am I Ready? purchase receipt – ${formatAmount(pi.amount, pi.currency)}`,
              getPurchaseReceiptHtml(formatAmount(pi.amount, pi.currency), formatDate(pi.created), method, pi.id)
            );
            await sendEmail(
              email, 
              'Complete your emergency preparedness setup',
              getOnboardingReminderHtml()
            );
          }
        } 
        // Generic payment (just send receipt)
        else if (email) {
          await sendEmail(
            email, 
            `Your Am I Ready? purchase receipt – ${formatAmount(pi.amount, pi.currency)}`,
            getPurchaseReceiptHtml(formatAmount(pi.amount, pi.currency), formatDate(pi.created), method, pi.id)
          );
        }
        break;
      }

      // ----- Checkout Session Completed -----
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.payment_status !== "paid") {
          logStep("Checkout not paid, skipping", { status: session.payment_status });
          break;
        }
        
        const userId = session.metadata?.user_id || session.client_reference_id;
        if (!userId) {
          throw new Error("No user_id found in checkout session");
        }
        
        // Grant premium entitlement
        await supabase
          .from("premium_entitlements")
          .upsert({ 
            user_id: userId, 
            is_premium: true, 
            granted_at: new Date().toISOString(), 
            revoked_at: null, 
            plan_name: PRODUCT_NAME, 
            price_eur: 49 
          }, { onConflict: "user_id" });
        
        // Map Stripe customer to user
        await supabase
          .from("stripe_customer_map")
          .upsert({ 
            user_id: userId, 
            stripe_customer_id: session.customer as string, 
            stripe_checkout_session_id: session.id, 
            stripe_payment_intent_id: session.payment_intent as string, 
            updated_at: new Date().toISOString() 
          }, { onConflict: "user_id" });
        
        logStep("Premium granted via checkout", { userId });
        break;
      }

      // ----- Invoice Payment Succeeded -----
      case "invoice.payment_succeeded": {
        const inv = event.data.object as Stripe.Invoice;
        const email = await extractInvoiceEmail(stripe, inv);
        
        // Send receipt if there's an amount paid
        if (email && inv.amount_paid > 0) {
          await sendEmail(
            email, 
            `Your Am I Ready? purchase receipt – ${formatAmount(inv.amount_paid, inv.currency)}`,
            getPurchaseReceiptHtml(formatAmount(inv.amount_paid, inv.currency), formatDate(inv.created), undefined, inv.id)
          );
        }
        
        // Update guest subscription status
        if (inv.subscription) {
          const sub = await stripe.subscriptions.retrieve(inv.subscription as string);
          if (sub.metadata?.claim_code && sub.metadata?.purchase_type === "subscription_guest") {
            await supabase
              .from("guest_purchases")
              .update({ status: "subscription_paid", paid_at: new Date().toISOString() })
              .eq("claim_code", sub.metadata.claim_code);
          }
        }
        break;
      }

      // ----- Setup Intent Succeeded -----
      case "setup_intent.succeeded": {
        const si = event.data.object as Stripe.SetupIntent;
        const email = await extractSetupEmail(stripe, si);
        const claimCode = si.metadata?.claim_code;
        
        // Update guest purchase status
        if (claimCode) {
          await supabase
            .from("guest_purchases")
            .update({ status: "setup_succeeded" })
            .eq("payment_intent_id", si.id);
        }
        
        // Send welcome + onboarding emails
        if (email) {
          await sendEmail(
            email, 
            'Welcome to Am I Ready? – Your journey starts now',
            getWelcomeEmailHtml(claimCode)
          );
          await sendEmail(
            email, 
            'Complete your emergency preparedness setup',
            getOnboardingReminderHtml(claimCode)
          );
        }
        break;
      }

      // ----- Subscription Created -----
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        if (sub.metadata?.claim_code) {
          await supabase
            .from("guest_purchases")
            .update({ status: "subscription_active" })
            .eq("claim_code", sub.metadata.claim_code);
        }
        break;
      }

      // ----- Invoice Payment Failed -----
      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        if (inv.subscription) {
          const sub = await stripe.subscriptions.retrieve(inv.subscription as string);
          if (sub.metadata?.claim_code) {
            await supabase
              .from("guest_purchases")
              .update({ status: "payment_failed" })
              .eq("claim_code", sub.metadata.claim_code);
          }
        }
        break;
      }

      // ----- Subscription Updated -----
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        if (sub.metadata?.claim_code) {
          let status: string;
          if (sub.status === "canceled") {
            status = "subscription_canceled";
          } else if (sub.status === "past_due") {
            status = "subscription_past_due";
          } else if (sub.cancel_at_period_end) {
            status = "subscription_ending";
          } else {
            status = "subscription_active";
          }
          
          await supabase
            .from("guest_purchases")
            .update({ status })
            .eq("claim_code", sub.metadata.claim_code);
        }
        break;
      }

      // ----- Subscription Deleted -----
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        if (sub.metadata?.claim_code) {
          await supabase
            .from("guest_purchases")
            .update({ status: "subscription_canceled" })
            .eq("claim_code", sub.metadata.claim_code);
        }
        break;
      }

      // ----- Charge Refunded -----
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const { data: map } = await supabase
          .from("stripe_customer_map")
          .select("user_id")
          .or(`stripe_customer_id.eq.${charge.customer},stripe_payment_intent_id.eq.${charge.payment_intent}`)
          .maybeSingle();
        
        if (map) {
          await supabase
            .from("premium_entitlements")
            .update({ is_premium: false, revoked_at: new Date().toISOString() })
            .eq("user_id", map.user_id);
          logStep("Premium revoked due to refund", { userId: map.user_id });
        }
        break;
      }

      // ----- Charge Dispute Created -----
      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        const charge = await stripe.charges.retrieve(dispute.charge as string);
        const { data: map } = await supabase
          .from("stripe_customer_map")
          .select("user_id")
          .eq("stripe_customer_id", charge.customer)
          .maybeSingle();
        
        if (map) {
          await supabase
            .from("premium_entitlements")
            .update({ is_premium: false, revoked_at: new Date().toISOString() })
            .eq("user_id", map.user_id);
          logStep("Premium revoked due to dispute", { userId: map.user_id });
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(
      JSON.stringify({ received: true }), 
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    logStep("Webhook error", { error: String(error) });
    return new Response(
      JSON.stringify({ error: String(error) }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
