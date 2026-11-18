import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CLAIM-GUEST-PURCHASE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Validate environment
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl) throw new Error("SUPABASE_URL not configured");
    if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");
    if (!anonKey) throw new Error("SUPABASE_ANON_KEY not configured");

    // Get auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ ok: false, reason: "UNAUTHORIZED" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user with anon key client
    const anonClient = createClient(supabaseUrl, anonKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await anonClient.auth.getUser(token);

    if (authError || !userData.user) {
      logStep("Auth failed", { error: authError?.message });
      return new Response(JSON.stringify({ ok: false, reason: "UNAUTHORIZED" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = userData.user;
    const userEmail = user.email?.toLowerCase();
    logStep("User authenticated", { userId: user.id, email: userEmail });

    if (!userEmail) {
      return new Response(JSON.stringify({ ok: false, reason: "NO_USER_EMAIL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse input
    const { claimCode } = await req.json();
    if (!claimCode) {
      return new Response(JSON.stringify({ ok: false, reason: "MISSING_CLAIM_CODE" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    logStep("Input validated", { claimCode });

    // Use service role for DB operations
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Fetch guest purchase
    const { data: purchase, error: fetchError } = await supabase
      .from("guest_purchases")
      .select("*")
      .eq("claim_code", claimCode)
      .maybeSingle();

    if (fetchError) {
      logStep("ERROR fetching purchase", { error: fetchError.message });
      throw new Error("Failed to fetch purchase");
    }

    if (!purchase) {
      logStep("Purchase not found", { claimCode });
      return new Response(JSON.stringify({ ok: false, reason: "CLAIM_NOT_FOUND" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Purchase found", { status: purchase.status, payerEmail: purchase.payer_email });

    // Validate status
    if (purchase.status !== "paid") {
      logStep("Invalid status", { status: purchase.status });
      return new Response(JSON.stringify({ ok: false, reason: "NOT_PAID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Already claimed?
    if (purchase.status === "claimed" || purchase.user_id) {
      logStep("Already claimed", { userId: purchase.user_id });
      return new Response(JSON.stringify({ ok: false, reason: "ALREADY_CLAIMED" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate email match
    const payerEmail = purchase.payer_email?.toLowerCase();
    if (!payerEmail) {
      logStep("No payer email on purchase");
      return new Response(JSON.stringify({ ok: false, reason: "NO_PAYER_EMAIL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payerEmail !== userEmail) {
      logStep("Email mismatch", { payerEmail, userEmail });
      return new Response(JSON.stringify({ ok: false, reason: "EMAIL_MISMATCH" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update guest purchase to claimed
    const { error: claimError } = await supabase
      .from("guest_purchases")
      .update({
        status: "claimed",
        claimed_at: new Date().toISOString(),
        user_id: user.id,
      })
      .eq("claim_code", claimCode);

    if (claimError) {
      logStep("ERROR claiming purchase", { error: claimError.message });
      throw new Error("Failed to claim purchase");
    }
    logStep("Purchase claimed");

    // Upsert premium entitlement
    const { error: premiumError } = await supabase
      .from("premium_entitlements")
      .upsert({
        user_id: user.id,
        is_premium: true,
        granted_at: new Date().toISOString(),
        revoked_at: null,
        plan_name: "Personalized Resiliency Plan",
        price_eur: 49,
      }, {
        onConflict: "user_id",
      });

    if (premiumError) {
      logStep("ERROR granting premium", { error: premiumError.message });
      throw new Error("Failed to grant premium");
    }
    logStep("Premium granted", { userId: user.id });

    return new Response(JSON.stringify({ ok: true }), {
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
