import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    // Validate environment variables
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET not configured");
    if (!supabaseUrl) throw new Error("SUPABASE_URL not configured");
    if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");

    // Get raw body and signature BEFORE any processing
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    
    logStep("Received request", { 
      hasBody: !!body, 
      bodyLength: body.length,
      hasSignature: !!signature,
      signaturePrefix: signature ? signature.substring(0, 20) + "..." : "none"
    });

    if (!signature) {
      logStep("ERROR: Missing stripe-signature header");
      return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // Verify webhook signature using raw body
    let event: Stripe.Event;
    try {
      // Use async version for Deno compatibility with SubtleCrypto
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret,
        undefined,
        Stripe.createSubtleCryptoProvider()
      );
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : String(err);
      logStep("Signature verification FAILED", { 
        error: errMessage,
        webhookSecretPrefix: webhookSecret.substring(0, 10) + "...",
        signatureHeader: signature.substring(0, 50) + "..."
      });
      return new Response(JSON.stringify({ error: "Webhook signature verification failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Event verified", { eventId: event.id, type: event.type });

    // Initialize Supabase with service role (bypasses RLS)
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Idempotency check: has this event been processed?
    const { data: existingEvent } = await supabase
      .from("stripe_events")
      .select("event_id")
      .eq("event_id", event.id)
      .maybeSingle();

    if (existingEvent) {
      logStep("Event already processed, skipping", { eventId: event.id });
      return new Response(JSON.stringify({ received: true, skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Record event for idempotency
    const { error: insertEventError } = await supabase
      .from("stripe_events")
      .insert({ event_id: event.id });

    if (insertEventError) {
      logStep("Failed to record event", { error: insertEventError.message });
      // Continue anyway - better to process than miss
    }

    // Handle specific event types
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        logStep("Processing payment_intent.succeeded", { piId: pi.id });

        const purchaseType = pi.metadata?.purchase_type;
        const userId = pi.metadata?.user_id;

        if (purchaseType === "guest") {
          // Guest purchase - extract email from charge and mark as paid
          let email: string | null = null;
          
          // Try to get email from the charge billing details
          if (pi.latest_charge && typeof pi.latest_charge === 'string') {
            try {
              const charge = await stripe.charges.retrieve(pi.latest_charge);
              email = charge.billing_details?.email || null;
              logStep("Got email from charge", { email });
            } catch (chargeErr) {
              logStep("Could not retrieve charge", { error: String(chargeErr) });
            }
          }

          // Update guest_purchases - only update payer_email if not already set
          const { error: updateError } = await supabase
            .from("guest_purchases")
            .update({ 
              status: "paid", 
              paid_at: new Date().toISOString(),
              // Only set payer_email if we got one and it's not already set
              ...(email ? { payer_email: email.toLowerCase() } : {})
            })
            .eq("payment_intent_id", pi.id);

          if (updateError) {
            logStep("ERROR updating guest purchase", { error: updateError.message });
          } else {
            logStep("Guest purchase marked as paid", { piId: pi.id, email });
          }
          // Do NOT create users or grant premium for guests
        } else if (userId) {
          // Logged-in user flow - grant premium directly
          const { error: upsertError } = await supabase
            .from("premium_entitlements")
            .upsert({
              user_id: userId,
              is_premium: true,
              granted_at: new Date().toISOString(),
              revoked_at: null,
              plan_name: "Personalized Resiliency Plan",
              price_eur: 49,
            }, {
              onConflict: "user_id",
            });

          if (upsertError) {
            logStep("ERROR upserting entitlement", { error: upsertError.message });
          } else {
            logStep("Premium granted to logged-in user", { userId });
          }
        }
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Processing checkout.session.completed", { 
          sessionId: session.id,
          paymentStatus: session.payment_status,
        });

        // Verify payment was successful
        if (session.payment_status !== "paid") {
          logStep("Payment not completed, skipping", { status: session.payment_status });
          break;
        }

        // Extract user_id from metadata or client_reference_id
        const sessionUserId = session.metadata?.user_id || session.client_reference_id;
        if (!sessionUserId) {
          logStep("ERROR: No user_id found in session", { sessionId: session.id });
          throw new Error("No user_id in session metadata or client_reference_id");
        }

        logStep("Granting premium to user", { userId: sessionUserId });

        // Upsert premium entitlement (public-facing, no Stripe IDs)
        const { error: upsertError } = await supabase
          .from("premium_entitlements")
          .upsert({
            user_id: sessionUserId,
            is_premium: true,
            granted_at: new Date().toISOString(),
            revoked_at: null,
            plan_name: "Personalized Resiliency Plan",
            price_eur: 49,
          }, {
            onConflict: "user_id",
          });

        if (upsertError) {
          logStep("ERROR upserting entitlement", { error: upsertError.message });
          throw new Error(`Failed to grant premium: ${upsertError.message}`);
        }

        // Store Stripe IDs in private table (service role only)
        const { error: mapError } = await supabase
          .from("stripe_customer_map")
          .upsert({
            user_id: sessionUserId,
            stripe_customer_id: session.customer as string,
            stripe_checkout_session_id: session.id,
            stripe_payment_intent_id: session.payment_intent as string,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: "user_id",
          });

        if (mapError) {
          logStep("WARNING: Failed to store Stripe IDs", { error: mapError.message });
          // Don't throw - premium was granted, this is secondary
        }

        logStep("Premium granted successfully", { userId: sessionUserId });
        break;
      }

      // Handle subscription events for riskfunnel1 subscription flow
      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Processing customer.subscription.created", { 
          subscriptionId: subscription.id,
          status: subscription.status,
          customerId: subscription.customer,
        });

        const claimCode = subscription.metadata?.claim_code;
        const guestSessionId = subscription.metadata?.guest_session_id;

        if (claimCode) {
          // Update guest_purchases with subscription info
          const { error: updateError } = await supabase
            .from("guest_purchases")
            .update({ 
              status: "subscription_active",
            })
            .eq("claim_code", claimCode);

          if (updateError) {
            logStep("ERROR updating guest purchase for subscription", { error: updateError.message });
          } else {
            logStep("Guest purchase marked as subscription_active", { claimCode });
          }
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Processing invoice.payment_succeeded", { 
          invoiceId: invoice.id,
          subscriptionId: invoice.subscription,
          customerId: invoice.customer,
          amountPaid: invoice.amount_paid,
        });

        // Only process subscription invoices
        if (!invoice.subscription) {
          logStep("Not a subscription invoice, skipping");
          break;
        }

        // Retrieve subscription to get metadata
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
        const claimCode = subscription.metadata?.claim_code;
        const purchaseType = subscription.metadata?.purchase_type;

        logStep("Subscription details", { 
          subscriptionId: subscription.id,
          claimCode,
          purchaseType,
          status: subscription.status,
        });

        if (claimCode && purchaseType === "subscription_guest") {
          // Update guest_purchases - subscription payment successful
          const { error: updateError } = await supabase
            .from("guest_purchases")
            .update({ 
              status: "subscription_paid",
              paid_at: new Date().toISOString(),
            })
            .eq("claim_code", claimCode);

          if (updateError) {
            logStep("ERROR updating guest purchase for invoice", { error: updateError.message });
          } else {
            logStep("Guest purchase updated for successful invoice payment", { claimCode });
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Processing invoice.payment_failed", { 
          invoiceId: invoice.id,
          subscriptionId: invoice.subscription,
        });

        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          const claimCode = subscription.metadata?.claim_code;

          if (claimCode) {
            const { error: updateError } = await supabase
              .from("guest_purchases")
              .update({ status: "payment_failed" })
              .eq("claim_code", claimCode);

            if (updateError) {
              logStep("ERROR updating guest purchase for failed payment", { error: updateError.message });
            }
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Processing customer.subscription.updated", { 
          subscriptionId: subscription.id,
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        });

        const claimCode = subscription.metadata?.claim_code;
        if (claimCode) {
          let status = "subscription_active";
          if (subscription.status === "canceled") {
            status = "subscription_canceled";
          } else if (subscription.status === "past_due") {
            status = "subscription_past_due";
          } else if (subscription.cancel_at_period_end) {
            status = "subscription_ending";
          }

          const { error: updateError } = await supabase
            .from("guest_purchases")
            .update({ status })
            .eq("claim_code", claimCode);

          if (updateError) {
            logStep("ERROR updating guest purchase for subscription update", { error: updateError.message });
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Processing customer.subscription.deleted", { 
          subscriptionId: subscription.id,
        });

        const claimCode = subscription.metadata?.claim_code;
        if (claimCode) {
          const { error: updateError } = await supabase
            .from("guest_purchases")
            .update({ status: "subscription_canceled" })
            .eq("claim_code", claimCode);

          if (updateError) {
            logStep("ERROR updating guest purchase for subscription deletion", { error: updateError.message });
          } else {
            logStep("Guest purchase marked as subscription_canceled", { claimCode });
          }
        }
        break;
      }

      case "setup_intent.succeeded": {
        const setupIntent = event.data.object as Stripe.SetupIntent;
        logStep("Processing setup_intent.succeeded", { 
          siId: setupIntent.id,
          paymentMethod: setupIntent.payment_method,
        });

        const claimCode = setupIntent.metadata?.claim_code;
        if (claimCode) {
          const { error: updateError } = await supabase
            .from("guest_purchases")
            .update({ status: "setup_succeeded" })
            .eq("payment_intent_id", setupIntent.id);

          if (updateError) {
            logStep("ERROR updating guest purchase for setup intent", { error: updateError.message });
          } else {
            logStep("Guest purchase marked as setup_succeeded", { claimCode });
          }
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        logStep("Processing charge.refunded", { chargeId: charge.id });

        // Find user by stripe_customer_id in private map
        const { data: customerMap } = await supabase
          .from("stripe_customer_map")
          .select("user_id")
          .or(`stripe_customer_id.eq.${charge.customer},stripe_payment_intent_id.eq.${charge.payment_intent}`)
          .maybeSingle();

        if (customerMap) {
          const { error: revokeError } = await supabase
            .from("premium_entitlements")
            .update({
              is_premium: false,
              revoked_at: new Date().toISOString(),
            })
            .eq("user_id", customerMap.user_id);

          if (revokeError) {
            logStep("ERROR revoking premium", { error: revokeError.message });
          } else {
            logStep("Premium revoked due to refund", { userId: customerMap.user_id });
          }
        } else {
          logStep("No matching customer found for refund", { customerId: charge.customer });
        }
        break;
      }

      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        logStep("Processing charge.dispute.created", { disputeId: dispute.id });

        // Get charge details to find customer
        const charge = await stripe.charges.retrieve(dispute.charge as string);
        
        // Find user by stripe_customer_id in private map
        const { data: customerMap } = await supabase
          .from("stripe_customer_map")
          .select("user_id")
          .eq("stripe_customer_id", charge.customer)
          .maybeSingle();

        if (customerMap) {
          const { error: revokeError } = await supabase
            .from("premium_entitlements")
            .update({
              is_premium: false,
              revoked_at: new Date().toISOString(),
            })
            .eq("user_id", customerMap.user_id);

          if (revokeError) {
            logStep("ERROR revoking premium", { error: revokeError.message });
          } else {
            logStep("Premium revoked due to dispute", { userId: customerMap.user_id });
          }
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
