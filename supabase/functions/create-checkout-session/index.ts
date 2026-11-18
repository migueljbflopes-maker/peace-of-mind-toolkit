import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT-SESSION] ${step}${detailsStr}`);
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

  // Guard JSON parsing - check Content-Type and handle empty/invalid body
  const contentType = req.headers.get("Content-Type") || "";
  if (contentType.includes("application/json")) {
    try {
      const bodyText = await req.text();
      if (bodyText && bodyText.trim()) {
        // Attempt to parse JSON to validate it, but we don't use the body currently
        JSON.parse(bodyText);
      }
    } catch {
      logStep("Invalid JSON body");
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
  }

  try {
    logStep("Function started");

    // Validate required environment variables
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const priceId = Deno.env.get("STRIPE_PRICE_ID_PREMIUM");
    const appUrl = Deno.env.get("APP_URL");

    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not configured");
    if (!priceId) throw new Error("STRIPE_PRICE_ID_PREMIUM is not configured");
    if (!appUrl) throw new Error("APP_URL is not configured");

    logStep("Environment variables verified", { appUrl });

    // Create Supabase client with anon key for user authentication
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Authenticate user - REQUIRED
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided - login required");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");
    if (!user?.email) throw new Error("User email not available");

    logStep("User authenticated", { userId: user.id, email: user.email });

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if customer already exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing Stripe customer found", { customerId });
    } else {
      logStep("No existing Stripe customer, will create on checkout");
    }

    // Build success and cancel URLs from APP_URL (must be deployed app origin)
    // Include session_id for instant verification on return
    const successUrl = `${appUrl}/dashboard?purchase=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${appUrl}/pricing?purchase=cancel`;

    // Create Stripe Checkout Session for one-time payment
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      client_reference_id: user.id, // Store user_id for webhook
      metadata: {
        user_id: user.id, // Also store in metadata for redundancy
      },
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment", // One-time payment, not subscription
      allow_promotion_codes: true, // Enable promo/coupon codes at checkout
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

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
