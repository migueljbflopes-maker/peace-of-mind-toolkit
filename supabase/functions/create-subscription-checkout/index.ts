import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-SUBSCRIPTION-CHECKOUT] ${step}${detailsStr}`);
};

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

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const appUrl = Deno.env.get("APP_URL");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
    if (!appUrl) throw new Error("APP_URL not configured");
    if (!supabaseUrl) throw new Error("SUPABASE_URL not configured");
    if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");

    const { guestSessionId, priceId, source } = await req.json();
    if (!guestSessionId) throw new Error("guestSessionId is required");
    if (!priceId) throw new Error("priceId is required");

    logStep("Input validated", { guestSessionId, priceId, source });

    const claimCode = generateClaimCode();
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Create Stripe Checkout Session for subscription with 1-day trial
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 1,
        metadata: {
          claim_code: claimCode,
          guest_session_id: guestSessionId,
          source: source || "riskfunnel1",
          purchase_type: "subscription_guest",
        },
      },
      metadata: {
        claim_code: claimCode,
        guest_session_id: guestSessionId,
        source: source || "riskfunnel1",
      },
      success_url: `${appUrl}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/riskfunnel1?canceled=true`,
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    // Record in guest_purchases
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { error: insertError } = await supabase
      .from("guest_purchases")
      .insert({
        payment_intent_id: session.id,
        claim_code: claimCode,
        guest_session_id: guestSessionId,
        status: "checkout_pending",
        amount_cents: 4900,
        currency: "eur",
        source: source || "riskfunnel1_subscription",
      });

    if (insertError) {
      logStep("ERROR inserting guest_purchases", { error: insertError.message });
    }

    return new Response(JSON.stringify({ url: session.url, claimCode }), {
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
