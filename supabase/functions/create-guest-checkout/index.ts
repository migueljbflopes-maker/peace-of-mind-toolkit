import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "stripe";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-GUEST-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    logStep("Method not allowed", { method: req.method });
    return new Response(
      JSON.stringify({ error: "Method not allowed. Use POST." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 405 }
    );
  }

  try {
    logStep("Function started");

    // Parse optional source from body
    const { source = "pricing" } = await req.json().catch(() => ({}));

    // Validate required environment variables
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const priceId = Deno.env.get("STRIPE_PRICE_ID_PREMIUM");
    const appUrl = Deno.env.get("APP_URL");

    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not configured");
    if (!priceId) throw new Error("STRIPE_PRICE_ID_PREMIUM is not configured");
    if (!appUrl) throw new Error("APP_URL is not configured");

    logStep("Environment variables verified", { appUrl, source });

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Build success and cancel URLs
    // Success URL includes session_id for post-payment processing
    const successUrl = `${appUrl}/purchase-success?session_id={CHECKOUT_SESSION_ID}`;
    
    // Dynamic cancel URL based on source
    const cancelUrl = source === "riskfunnel" 
      ? `${appUrl}/riskfunnel?purchase=cancel`
      : `${appUrl}/pricing?purchase=cancel`;

    // Create Stripe Checkout Session for one-time payment (guest mode)
    // No customer_email - Stripe will collect it during checkout
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      allow_promotion_codes: true,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        source: source,
        is_guest: "true",
      },
    });

    logStep("Guest checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
