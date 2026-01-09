import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[COMPLETE-GUEST-PURCHASE] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 405 }
    );
  }

  try {
    logStep("Function started");

    // Parse request body
    const { session_id } = await req.json();
    if (!session_id) {
      throw new Error("session_id is required");
    }

    logStep("Session ID received", { session_id });

    // Validate environment variables
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const appUrl = Deno.env.get("APP_URL");

    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not configured");
    if (!supabaseUrl) throw new Error("SUPABASE_URL is not configured");
    if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
    if (!appUrl) throw new Error("APP_URL is not configured");

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Initialize Supabase with service role for admin operations
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);
    logStep("Stripe session retrieved", { 
      paymentStatus: session.payment_status,
      customerEmail: session.customer_details?.email 
    });

    // Verify payment was successful
    if (session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }

    // Get customer email from the session
    const customerEmail = session.customer_details?.email;
    if (!customerEmail) {
      throw new Error("Customer email not available");
    }

    logStep("Processing for email", { email: customerEmail });

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === customerEmail);

    let userId: string;

    if (existingUser) {
      // User already exists
      userId = existingUser.id;
      logStep("Existing user found", { userId });
    } else {
      // Create new user account
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: customerEmail,
        email_confirm: true, // Auto-confirm the email
      });

      if (createError) {
        throw new Error(`Failed to create user: ${createError.message}`);
      }

      userId = newUser.user.id;
      logStep("New user created", { userId });
    }

    // Generate magic link for the user to access their account
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: customerEmail,
      options: {
        redirectTo: `${appUrl}/dashboard?welcome=true`
      }
    });

    if (linkError) {
      logStep("Warning: Failed to generate magic link", { error: linkError.message });
      // Continue anyway - user can use forgot password flow
    } else {
      logStep("Magic link generated", { hasLink: !!linkData });
    }

    // Grant premium entitlement
    const { error: entitlementError } = await supabaseAdmin
      .from("premium_entitlements")
      .upsert({
        user_id: userId,
        is_premium: true,
        plan_name: "Premium Resiliency Plan",
        price_eur: 49,
        granted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (entitlementError) {
      throw new Error(`Failed to grant premium: ${entitlementError.message}`);
    }

    logStep("Premium entitlement granted", { userId });

    // Store Stripe customer mapping
    const stripeCustomerId = typeof session.customer === 'string' 
      ? session.customer 
      : session.customer?.id;

    if (stripeCustomerId) {
      await supabaseAdmin
        .from("stripe_customer_map")
        .upsert({
          user_id: userId,
          stripe_customer_id: stripeCustomerId,
          stripe_checkout_session_id: session_id,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      logStep("Stripe customer mapping stored", { stripeCustomerId });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      email: customerEmail,
      is_new_user: !existingUser
    }), {
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
