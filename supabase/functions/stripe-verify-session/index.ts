import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-VERIFY-SESSION] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Use POST." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 405 }
    );
  }

  try {
    logStep("Function started");

    // Validate environment
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not configured");

    // Parse body
    const contentType = req.headers.get("Content-Type") || "";
    if (!contentType.includes("application/json")) {
      return new Response(
        JSON.stringify({ error: "Content-Type must be application/json" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    let body: { session_id?: string };
    try {
      const text = await req.text();
      body = text ? JSON.parse(text) : {};
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const { session_id } = body;
    if (!session_id || typeof session_id !== "string") {
      return new Response(
        JSON.stringify({ error: "session_id is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    logStep("Session ID received", { session_id });

    // Authenticate user with anon key
    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAnon.auth.getUser(token);

    if (userError || !userData.user?.id) {
      return new Response(
        JSON.stringify({ error: "User not authenticated" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const userId = userData.user.id;
    const userEmail = userData.user.email;
    logStep("User authenticated", { userId, email: userEmail });

    // Retrieve Stripe session
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const session = await stripe.checkout.sessions.retrieve(session_id);
    logStep("Stripe session retrieved", { 
      status: session.status, 
      payment_status: session.payment_status,
      metadata_user_id: session.metadata?.user_id 
    });

    // Validate that session belongs to this user
    if (session.metadata?.user_id !== userId && session.client_reference_id !== userId) {
      logStep("User ID mismatch", { 
        session_user_id: session.metadata?.user_id,
        client_reference_id: session.client_reference_id,
        auth_user_id: userId 
      });
      return new Response(
        JSON.stringify({ is_premium: false, error: "Session does not belong to this user" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    // Check if payment is complete
    const isPaid = session.payment_status === "paid" || session.status === "complete";
    
    if (!isPaid) {
      logStep("Payment not complete", { payment_status: session.payment_status, status: session.status });
      return new Response(
        JSON.stringify({ is_premium: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    logStep("Payment confirmed, granting premium");

    // Use service role to write entitlements
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Upsert premium entitlement
    const { error: entitlementError } = await supabaseService
      .from("premium_entitlements")
      .upsert({
        user_id: userId,
        is_premium: true,
        plan_name: "Premium Resiliency Plan",
        price_eur: 49,
        granted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (entitlementError) {
      logStep("Error upserting entitlement", { error: entitlementError.message });
      throw new Error(`Failed to grant premium: ${entitlementError.message}`);
    }

    logStep("Premium entitlement granted");

    // Upsert Stripe customer mapping
    const stripeCustomerId = typeof session.customer === "string" 
      ? session.customer 
      : session.customer?.id;
    
    const paymentIntentId = typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

    if (stripeCustomerId) {
      const { error: mapError } = await supabaseService
        .from("stripe_customer_map")
        .upsert({
          user_id: userId,
          stripe_customer_id: stripeCustomerId,
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: paymentIntentId,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      if (mapError) {
        logStep("Warning: Failed to update stripe_customer_map", { error: mapError.message });
        // Don't throw - premium was still granted
      } else {
        logStep("Stripe customer map updated");
      }
    }

    return new Response(
      JSON.stringify({ is_premium: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(
      JSON.stringify({ error: errorMessage, is_premium: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
