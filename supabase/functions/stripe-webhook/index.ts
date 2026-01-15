/**
 * Stripe Webhook Handler
 * 
 * Processes Stripe events and sends transactional emails via Resend.
 * 
 * Events handled:
 * - payment_intent.succeeded → Purchase receipt + Onboarding reminder + Welcome (for guests)
 * - checkout.session.completed → Grant premium entitlement + Welcome email
 * - invoice.payment_succeeded → Purchase receipt
 * - setup_intent.succeeded → Welcome email + Onboarding reminder
 * - customer.subscription.* → Update guest purchase status
 * - charge.refunded / charge.dispute.created → Revoke premium
 * 
 * Welcome emails are deduplicated via the emails_sent table.
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// Import email templates
import { getWelcomeEmailHtml } from "./_templates/welcome.ts";
import { getPurchaseReceiptHtml } from "./_templates/purchase-receipt.ts";
// Note: onboarding-reminder is now queued via scheduled_emails table, not sent immediately

// Import email utilities
import {
  sendEmail,
  sendWelcomeWithDedup,
  extractEmail,
  extractInvoiceEmail,
  extractSetupEmail,
  extractCheckoutEmail,
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
            // Send purchase receipt
            await sendEmail(
              email, 
              `Your Am I Ready? purchase receipt – ${formatAmount(pi.amount, pi.currency)}`,
              getPurchaseReceiptHtml(formatAmount(pi.amount, pi.currency), formatDate(pi.created), method, pi.id, gp?.claim_code)
            );
            
            // Send welcome email with deduplication
            await sendWelcomeWithDedup(
              supabase,
              email,
              () => getWelcomeEmailHtml(gp?.claim_code),
              'payment_intent_guest',
              event.id
            );
            
            // Queue onboarding reminder for 24h later
            await supabase.from("scheduled_emails").insert({
              email,
              template_type: "onboarding_reminder",
              template_data: { claimCode: gp?.claim_code },
              send_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              stripe_event_id: event.id
            });
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
            // Send purchase receipt
            await sendEmail(
              email, 
              `Your Am I Ready? purchase receipt – ${formatAmount(pi.amount, pi.currency)}`,
              getPurchaseReceiptHtml(formatAmount(pi.amount, pi.currency), formatDate(pi.created), method, pi.id)
            );
            
            // Send welcome email with deduplication
            await sendWelcomeWithDedup(
              supabase,
              email,
              () => getWelcomeEmailHtml(),
              'payment_intent_user',
              event.id
            );
            
            // Queue onboarding reminder for 24h later
            await supabase.from("scheduled_emails").insert({
              email,
              template_type: "onboarding_reminder",
              template_data: {},
              send_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              stripe_event_id: event.id
            });
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
        
        // Handle both paid, 100% coupon (no payment required), and subscriptions with trial
        const isPaidOrFree = session.payment_status === "paid" || 
                            session.payment_status === "no_payment_required";
        const isSubscriptionStarted = session.mode === "subscription" && !!session.subscription;
        
        if (!isPaidOrFree && !isSubscriptionStarted) {
          logStep("Checkout not completed", { status: session.payment_status, mode: session.mode });
          break;
        }
        
        logStep("Checkout valid", { isPaidOrFree, isSubscriptionStarted });
        
        // Update guest_purchases with payer email if this is a subscription checkout
        const claimCode = session.metadata?.claim_code;
        const checkoutEmail = session.customer_details?.email;
        
        if (claimCode && checkoutEmail) {
          const { error: updateError } = await supabase
            .from("guest_purchases")
            .update({ 
              payer_email: checkoutEmail.toLowerCase().trim(),
              status: isSubscriptionStarted ? "subscription_active" : "paid",
              paid_at: new Date().toISOString()
            })
            .eq("claim_code", claimCode);
          
          if (updateError) {
            logStep("Warning: Failed to update guest_purchases", { error: updateError.message });
          } else {
            logStep("Updated guest_purchases with email", { claimCode, email: checkoutEmail });
          }
        }
        
        const userId = session.metadata?.user_id || session.client_reference_id;
        const email = await extractCheckoutEmail(stripe, session);
        const isFreeCheckout = session.payment_status === "no_payment_required";
        
        logStep("Checkout completed", { 
          userId, 
          email, 
          paymentStatus: session.payment_status,
          isFreeCheckout 
        });
        
        // Grant premium entitlement if we have a user ID
        if (userId) {
          await supabase
            .from("premium_entitlements")
            .upsert({ 
              user_id: userId, 
              is_premium: true, 
              granted_at: new Date().toISOString(), 
              revoked_at: null, 
              plan_name: PRODUCT_NAME, 
              price_eur: isFreeCheckout ? 0 : 49 
            }, { onConflict: "user_id" });
          
          // Map Stripe customer to user
          if (session.customer) {
            await supabase
              .from("stripe_customer_map")
              .upsert({ 
                user_id: userId, 
                stripe_customer_id: session.customer as string, 
                stripe_checkout_session_id: session.id, 
                stripe_payment_intent_id: session.payment_intent as string, 
                updated_at: new Date().toISOString() 
              }, { onConflict: "user_id" });
          }
          
          logStep("Premium granted via checkout", { userId });
        }
        
        // Send welcome email with deduplication (for all checkout completions)
        if (email) {
          await sendWelcomeWithDedup(
            supabase,
            email,
            () => getWelcomeEmailHtml(undefined, isFreeCheckout),
            isFreeCheckout ? 'checkout_free_coupon' : 'checkout_paid',
            event.id
          );
          
          // Queue onboarding reminder for 24h later
          await supabase.from("scheduled_emails").insert({
            email,
            template_type: "onboarding_reminder",
            template_data: {},
            send_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            stripe_event_id: event.id
          });
        }
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
        
        // Send welcome + onboarding emails with deduplication
        if (email) {
          await sendWelcomeWithDedup(
            supabase,
            email,
            () => getWelcomeEmailHtml(claimCode),
            'setup_intent',
            event.id
          );
          
          // Queue onboarding reminder for 24h later
          await supabase.from("scheduled_emails").insert({
            email,
            template_type: "onboarding_reminder",
            template_data: { claimCode },
            send_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            stripe_event_id: event.id
          });
        }
        break;
      }

      // ----- Subscription Created -----
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        const subClaimCode = sub.metadata?.claim_code;
        
        if (subClaimCode) {
          // Get customer email from Stripe customer
          let subEmail: string | null = null;
          if (sub.customer) {
            try {
              const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
              const customer = await stripe.customers.retrieve(customerId);
              if (customer && !customer.deleted && 'email' in customer) {
                subEmail = customer.email;
              }
            } catch (e) {
              logStep("Warning: Could not retrieve customer for subscription", { error: String(e) });
            }
          }
          
          // Update with email if available (use upsert-style update to preserve existing data)
          const updateData: Record<string, unknown> = { status: "subscription_active" };
          if (subEmail) {
            updateData.payer_email = subEmail.toLowerCase().trim();
            updateData.paid_at = new Date().toISOString();
          }
          
          await supabase
            .from("guest_purchases")
            .update(updateData)
            .eq("claim_code", subClaimCode);
            
          logStep("Subscription created - guest_purchases updated", { 
            claimCode: subClaimCode, 
            email: subEmail 
          });
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
