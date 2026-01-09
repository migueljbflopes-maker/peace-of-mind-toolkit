import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SET-GUEST-EMAIL] ${step}${detailsStr}`);
};

// Simple email validation
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Validate environment
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl) throw new Error("SUPABASE_URL not configured");
    if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");

    // Parse input
    const { claimCode, email } = await req.json();
    if (!claimCode) throw new Error("claimCode is required");
    if (!email) throw new Error("email is required");
    if (!isValidEmail(email)) throw new Error("Invalid email format");

    logStep("Input validated", { claimCode, email });

    // Initialize Supabase with service role
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Update payer_email only if status is 'created' or 'paid'
    const { data: purchase, error: fetchError } = await supabase
      .from("guest_purchases")
      .select("id, status, payer_email")
      .eq("claim_code", claimCode)
      .maybeSingle();

    if (fetchError) {
      logStep("ERROR fetching purchase", { error: fetchError.message });
      throw new Error("Failed to fetch purchase");
    }

    if (!purchase) {
      logStep("Purchase not found", { claimCode });
      return new Response(JSON.stringify({ ok: false, reason: "NOT_FOUND" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["created", "paid"].includes(purchase.status)) {
      logStep("Invalid status for email update", { status: purchase.status });
      return new Response(JSON.stringify({ ok: false, reason: "INVALID_STATUS" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update payer_email
    const { error: updateError } = await supabase
      .from("guest_purchases")
      .update({ payer_email: email.toLowerCase() })
      .eq("claim_code", claimCode);

    if (updateError) {
      logStep("ERROR updating email", { error: updateError.message });
      throw new Error("Failed to update email");
    }

    logStep("Email updated successfully", { claimCode, email });

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
