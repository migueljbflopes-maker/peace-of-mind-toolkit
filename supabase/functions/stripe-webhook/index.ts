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

    // Get raw body and signature
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    
    if (!signature) {
      throw new Error("No Stripe signature header");
    }

    // Initialize Stripe and verify webhook signature
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : String(err);
      logStep("Signature verification failed", { error: errMessage });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
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
        const userId = session.metadata?.user_id || session.client_reference_id;
        if (!userId) {
          logStep("ERROR: No user_id found in session", { sessionId: session.id });
          throw new Error("No user_id in session metadata or client_reference_id");
        }

        logStep("Granting premium to user", { userId });

        // Upsert premium entitlement
        const { error: upsertError } = await supabase
          .from("premium_entitlements")
          .upsert({
            user_id: userId,
            is_premium: true,
            stripe_customer_id: session.customer as string,
            stripe_checkout_session_id: session.id,
            stripe_payment_intent_id: session.payment_intent as string,
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

        logStep("Premium granted successfully", { userId });
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        logStep("Processing charge.refunded", { chargeId: charge.id });

        // Find user by stripe_customer_id or payment_intent
        const { data: entitlement } = await supabase
          .from("premium_entitlements")
          .select("user_id")
          .or(`stripe_customer_id.eq.${charge.customer},stripe_payment_intent_id.eq.${charge.payment_intent}`)
          .maybeSingle();

        if (entitlement) {
          const { error: revokeError } = await supabase
            .from("premium_entitlements")
            .update({
              is_premium: false,
              revoked_at: new Date().toISOString(),
            })
            .eq("user_id", entitlement.user_id);

          if (revokeError) {
            logStep("ERROR revoking premium", { error: revokeError.message });
          } else {
            logStep("Premium revoked due to refund", { userId: entitlement.user_id });
          }
        } else {
          logStep("No matching entitlement found for refund", { customerId: charge.customer });
        }
        break;
      }

      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        logStep("Processing charge.dispute.created", { disputeId: dispute.id });

        // Get charge details to find customer
        const charge = await stripe.charges.retrieve(dispute.charge as string);
        
        const { data: entitlement } = await supabase
          .from("premium_entitlements")
          .select("user_id")
          .eq("stripe_customer_id", charge.customer)
          .maybeSingle();

        if (entitlement) {
          const { error: revokeError } = await supabase
            .from("premium_entitlements")
            .update({
              is_premium: false,
              revoked_at: new Date().toISOString(),
            })
            .eq("user_id", entitlement.user_id);

          if (revokeError) {
            logStep("ERROR revoking premium", { error: revokeError.message });
          } else {
            logStep("Premium revoked due to dispute", { userId: entitlement.user_id });
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
