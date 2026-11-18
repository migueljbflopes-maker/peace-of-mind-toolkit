import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PAYMENT-INTENT] ${step}${detailsStr}`);
};

// Generate a secure claim code
function generateClaimCode(): string {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

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
    const { guestSessionId } = await req.json();
    if (!guestSessionId) {
      throw new Error("guestSessionId is required");
    }
    logStep("Input validated", { guestSessionId });

    // Generate claim code
    const claimCode = generateClaimCode();
    logStep("Claim code generated", { claimCodeLength: claimCode.length });

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Create PaymentIntent with automatic_payment_methods for Apple/Google Pay
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 4900,
      currency: "eur",
      automatic_payment_methods: { enabled: true },
      metadata: {
        purchase_type: "guest",
        claim_code: claimCode,
        guest_session_id: guestSessionId,
        source: "riskfunnel",
        product: "resilient_premium",
      },
    });
    logStep("PaymentIntent created", { piId: paymentIntent.id });

    // Initialize Supabase with service role
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Insert guest_purchases record
    const { error: insertError } = await supabase
      .from("guest_purchases")
      .insert({
        payment_intent_id: paymentIntent.id,
        claim_code: claimCode,
        guest_session_id: guestSessionId,
        status: "created",
        amount_cents: 4900,
        currency: "eur",
        source: "riskfunnel",
      });

    if (insertError) {
      logStep("ERROR inserting guest_purchases", { error: insertError.message });
      throw new Error(`Failed to record purchase: ${insertError.message}`);
    }
    logStep("Guest purchase recorded");

    return new Response(JSON.stringify({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
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
