import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[COMPLETE-SUBSCRIPTION-SETUP] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Validate environment
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
    if (!supabaseUrl) throw new Error("SUPABASE_URL not configured");
    if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");

    // Parse input
    const { setupIntentId, payerEmail, payerName } = await req.json();
    if (!setupIntentId) {
      throw new Error("setupIntentId is required");
    }
    logStep("Input validated", { setupIntentId, payerEmail });

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Retrieve the SetupIntent
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
    logStep("SetupIntent retrieved", { 
      status: setupIntent.status,
      paymentMethod: setupIntent.payment_method,
    });

    if (setupIntent.status !== 'succeeded') {
      throw new Error(`SetupIntent not successful: ${setupIntent.status}`);
    }

    if (!setupIntent.payment_method) {
      throw new Error("No payment method attached to SetupIntent");
    }

    const claimCode = setupIntent.metadata?.claim_code;
    const guestSessionId = setupIntent.metadata?.guest_session_id;
    const priceId = setupIntent.metadata?.price_id || "price_1Sp2vlGudTqpziaHp7oKKuyY";

    if (!claimCode) {
      throw new Error("Missing claim_code in SetupIntent metadata");
    }

    // Get email from params or try to get from payment method
    let customerEmail = payerEmail;
    if (!customerEmail) {
      const pm = await stripe.paymentMethods.retrieve(setupIntent.payment_method as string);
      customerEmail = pm.billing_details?.email;
    }
    
    if (!customerEmail) {
      throw new Error("Email is required to create subscription");
    }
    logStep("Customer email resolved", { email: customerEmail });

    // Check if customer exists, otherwise create
    let customerId: string;
    const customers = await stripe.customers.list({ email: customerEmail, limit: 1 });
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
      
      // Attach payment method to existing customer if not already
      try {
        await stripe.paymentMethods.attach(setupIntent.payment_method as string, {
          customer: customerId,
        });
      } catch (e) {
        // Might already be attached, ignore
        logStep("Payment method attach (may already exist)", { error: String(e) });
      }
    } else {
      // Create new customer
      const customer = await stripe.customers.create({
        email: customerEmail,
        name: payerName || undefined,
        payment_method: setupIntent.payment_method as string,
        invoice_settings: {
          default_payment_method: setupIntent.payment_method as string,
        },
        metadata: {
          source: "riskfunnel1_subscription",
          guest_session_id: guestSessionId || "",
          claim_code: claimCode,
        },
      });
      customerId = customer.id;
      logStep("New customer created", { customerId });
    }

    // Set as default payment method
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: setupIntent.payment_method as string,
      },
    });

    // Create subscription with 1-day trial and auto-cancel at period end
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      trial_period_days: 1,
      cancel_at_period_end: true, // Auto-cancel at the end of the period
      payment_behavior: 'default_incomplete', // Require successful payment
      payment_settings: {
        payment_method_types: ['card'],
        save_default_payment_method: 'on_subscription',
      },
      metadata: {
        source: "riskfunnel1_subscription",
        guest_session_id: guestSessionId || "",
        claim_code: claimCode,
        purchase_type: "subscription_guest",
      },
      expand: ['latest_invoice'],
    });

    logStep("Subscription created", { 
      subscriptionId: subscription.id,
      status: subscription.status,
      trialEnd: subscription.trial_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });

    // Initialize Supabase with service role
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Update guest_purchases record
    const { error: updateError } = await supabase
      .from("guest_purchases")
      .update({ 
        status: "subscription_created",
        paid_at: new Date().toISOString(),
        payer_email: customerEmail.toLowerCase(),
      })
      .eq("payment_intent_id", setupIntentId);

    if (updateError) {
      logStep("ERROR updating guest_purchases", { error: updateError.message });
      // Don't throw - subscription is created, this is secondary
    } else {
      logStep("Guest purchase updated to subscription_created");
    }

    return new Response(JSON.stringify({
      success: true,
      subscriptionId: subscription.id,
      customerId,
      status: subscription.status,
      trialEnd: subscription.trial_end,
      claimCode,
    }), {
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
