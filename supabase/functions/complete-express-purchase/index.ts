import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[COMPLETE-EXPRESS-PURCHASE] ${step}${detailsStr}`);
};

// ============= Welcome Email Template =============

const BASE_URL = "https://am-i-ready.com";
const BILLING_PORTAL_URL = "https://billing.stripe.com/p/login/dRm8wP1JE5SPfSUf6s5Ne00";
const FROM_EMAIL = 'Am I Ready? <noreply@am-i-ready.com>';

function getWelcomeEmailHtml(magicLinkUrl?: string): string {
  // Use magic link if available, otherwise fallback to login page
  const ctaUrl = magicLinkUrl || `${BASE_URL}/login`;
  const ctaText = magicLinkUrl ? 'Access My Account' : 'Start My Plan';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to AM-I-READY.com</title>
</head>

<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f6f9fc; padding: 40px 20px; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">

    <!-- Header -->
    <div style="padding: 32px 48px; text-align: center;">
      <h1 style="color: #1a1a1a; font-size: 28px; font-weight: 700; margin: 0;">
        Welcome to AM-I-READY.com!
      </h1>
    </div>

    <!-- Body -->
    <div style="padding: 0 48px 32px;">
      <p style="color: #525f7f; font-size: 16px; line-height: 26px; margin-bottom: 20px;">
        You've taken the first step toward being prepared, organized, and confident — congratulations!
      </p>

      <p style="color: #525f7f; font-size: 16px; line-height: 26px; margin-bottom: 24px;">
        With your one-time payment of <strong>€49</strong>, you now have lifetime access to all the tools you need to build and activate your personal protection plan.
      </p>

      <!-- Feature List -->
      <ul style="color: #525f7f; font-size: 16px; line-height: 26px; padding-left: 22px; margin-bottom: 28px;">
        <li>Assess your readiness and identify gaps</li>
        <li>Create simple, actionable plans for any situation</li>
        <li>Secure important information in a private, encrypted vault</li>
        <li>Activate your plan instantly when it matters most</li>
      </ul>

      <!-- CTA -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${ctaUrl}"
           style="background-color: #2563eb; border-radius: 8px; color: #ffffff; display: inline-block; font-size: 16px; font-weight: 600; padding: 14px 32px; text-decoration: none;">
          ${ctaText}
        </a>
      </div>

      ${magicLinkUrl ? `
      <p style="color: #8898aa; font-size: 13px; text-align: center; margin-top: 16px;">
        This link expires in 24 hours. If it doesn't work, you can request a new one at <a href="${BASE_URL}/login" style="color:#2563eb;">am-i-ready.com/login</a>
      </p>
      ` : ''}

      <!-- Billing Portal -->
      <div style="margin-top: 32px; text-align: center;">
        <p style="color: #8898aa; font-size: 14px; margin-bottom: 8px;">
          Need to manage your billing or payment details?
        </p>
        <a href="${BILLING_PORTAL_URL}"
           style="color: #2563eb; font-size: 14px; text-decoration: underline;">
          Open Billing Portal
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding: 24px 48px; border-top: 1px solid #e6ebf1; text-align: center;">
      <p style="color: #8898aa; font-size: 13px; margin-bottom: 8px;">
        Thank you for trusting AM-I-READY.com — your plan, your control, your confidence.
      </p>
      <p style="color: #8898aa; font-size: 13px; margin: 0;">
        Need help? Contact us at
        <a href="mailto:support@am-i-ready.com" style="color:#2563eb;">
          support@am-i-ready.com
        </a>
      </p>
    </div>

  </div>
</body>
</html>`;
}

// ============= Main Handler =============

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
    const { claimCode } = await req.json();
    if (!claimCode) {
      throw new Error("claimCode is required");
    }

    logStep("Claim code received", { claimCode });

    // Validate environment variables
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const appUrl = Deno.env.get("APP_URL");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not configured");
    if (!supabaseUrl) throw new Error("SUPABASE_URL is not configured");
    if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
    if (!appUrl) throw new Error("APP_URL is not configured");

    // Initialize Stripe (for potential future use)
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Initialize Supabase with service role for admin operations
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    // Look up the guest purchase by claim code
    const { data: purchase, error: purchaseError } = await supabaseAdmin
      .from("guest_purchases")
      .select("*")
      .eq("claim_code", claimCode)
      .maybeSingle();

    if (purchaseError) {
      throw new Error(`Failed to lookup purchase: ${purchaseError.message}`);
    }

    if (!purchase) {
      throw new Error("Purchase not found for this claim code");
    }

    logStep("Purchase found", { 
      status: purchase.status, 
      payerEmail: purchase.payer_email,
      paymentIntentId: purchase.payment_intent_id 
    });

    // Check if already claimed
    if (purchase.claimed_at) {
      logStep("Already claimed, returning existing info");
      return new Response(JSON.stringify({ 
        success: true, 
        email: purchase.payer_email,
        is_new_user: false,
        already_claimed: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get customer email - with retry logic for race condition with webhook
    let customerEmail = purchase.payer_email;
    let emailRetryAttempts = 0;
    const maxEmailRetries = 5;

    // If no email yet, wait and retry (webhook might still be processing)
    while (!customerEmail && emailRetryAttempts < maxEmailRetries) {
      emailRetryAttempts++;
      logStep(`Email not available, retry ${emailRetryAttempts}/${maxEmailRetries}`);
      
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      
      const { data: refreshedPurchase } = await supabaseAdmin
        .from("guest_purchases")
        .select("payer_email")
        .eq("claim_code", claimCode)
        .maybeSingle();
      
      customerEmail = refreshedPurchase?.payer_email;
    }

    // If still no email, try to get from Stripe PaymentIntent
    if (!customerEmail && purchase.payment_intent_id) {
      try {
        // Check if it's a payment intent or checkout session
        if (purchase.payment_intent_id.startsWith('pi_')) {
          const pi = await stripe.paymentIntents.retrieve(purchase.payment_intent_id);
          customerEmail = pi.receipt_email || pi.metadata?.email;
          
          // Try to get from charges if not in PI directly
          if (!customerEmail) {
            const charges = await stripe.charges.list({ payment_intent: purchase.payment_intent_id, limit: 1 });
            if (charges.data.length > 0) {
              customerEmail = charges.data[0].billing_details?.email || charges.data[0].receipt_email;
            }
          }
        } else if (purchase.payment_intent_id.startsWith('cs_')) {
          // It's a checkout session ID
          const session = await stripe.checkout.sessions.retrieve(purchase.payment_intent_id);
          customerEmail = session.customer_details?.email;
        } else if (purchase.payment_intent_id.startsWith('seti_')) {
          // It's a SetupIntent
          const si = await stripe.setupIntents.retrieve(purchase.payment_intent_id);
          customerEmail = si.metadata?.email;
        }
        
        logStep("Email retrieved from Stripe", { customerEmail });
      } catch (stripeErr) {
        logStep("Warning: Could not retrieve email from Stripe", { error: String(stripeErr) });
      }
    }

    if (!customerEmail) {
      throw new Error("Customer email not available - payment may still be processing");
    }

    const normalizedEmail = customerEmail.toLowerCase().trim();
    logStep("Processing for email", { email: normalizedEmail });

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === normalizedEmail);

    let userId: string;
    let isNewUser = false;

    if (existingUser) {
      // User already exists
      userId = existingUser.id;
      logStep("Existing user found", { userId });
    } else {
      // Create new user account
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        email_confirm: true, // Auto-confirm the email
      });

      if (createError) {
        throw new Error(`Failed to create user: ${createError.message}`);
      }

      userId = newUser.user.id;
      isNewUser = true;
      logStep("New user created", { userId });
    }

    // Generate magic link for the user to access their account
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: normalizedEmail,
      options: {
        redirectTo: `${appUrl}/dashboard?welcome=true`
      }
    });

    if (linkError) {
      logStep("Warning: Failed to generate magic link", { error: linkError.message });
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

    // Update guest_purchases to mark as claimed
    const { error: updateError } = await supabaseAdmin
      .from("guest_purchases")
      .update({
        status: 'claimed',
        claimed_at: new Date().toISOString(),
        user_id: userId,
        payer_email: normalizedEmail, // Ensure email is stored
      })
      .eq("claim_code", claimCode);

    if (updateError) {
      logStep("Warning: Failed to update guest_purchases", { error: updateError.message });
    } else {
      logStep("Guest purchase marked as claimed");
    }

    // ============= Send Welcome Email with Deduplication =============
    
    // Check if welcome email already sent to this address
    const { data: existingEmail } = await supabaseAdmin
      .from('emails_sent')
      .select('id')
      .eq('email', normalizedEmail)
      .eq('template_type', 'welcome')
      .maybeSingle();

    // Get the magic link URL to include in the welcome email
    const magicLinkUrl = linkData?.properties?.action_link;
    logStep("Magic link for email", { hasUrl: !!magicLinkUrl });

    if (!existingEmail && resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        const { error: emailError } = await resend.emails.send({
          from: FROM_EMAIL,
          to: [normalizedEmail],
          subject: 'Welcome to Am I Ready? – Your journey starts now',
          html: getWelcomeEmailHtml(magicLinkUrl)
        });

        if (emailError) {
          logStep("Warning: Failed to send welcome email", { error: emailError.message });
        } else {
          // Record in database to prevent future duplicates
          await supabaseAdmin
            .from('emails_sent')
            .insert({
              email: normalizedEmail,
              template_type: 'welcome',
              source: 'complete_express_purchase'
            });
          logStep("Welcome email sent and recorded", { email: normalizedEmail });
        }
      } catch (emailErr) {
        logStep("Warning: Email send error", { error: String(emailErr) });
      }
    } else if (existingEmail) {
      logStep("Welcome email already sent, skipping", { email: normalizedEmail });
    } else {
      logStep("RESEND_API_KEY not configured, skipping welcome email");
    }

    return new Response(JSON.stringify({ 
      success: true, 
      email: normalizedEmail,
      is_new_user: isNewUser
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
