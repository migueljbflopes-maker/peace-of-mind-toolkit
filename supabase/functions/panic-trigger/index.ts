import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData.user) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

    // Check premium status
    const { data: premiumData } = await supabase
      .from("premium_entitlements")
      .select("is_premium")
      .eq("user_id", userId)
      .single();

    if (!premiumData?.is_premium) {
      return new Response(JSON.stringify({ error: "Premium required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limiting: max 3 real activations per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentActivations } = await supabase
      .from("panic_activations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_test", false)
      .gte("activated_at", oneHourAgo);

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const { scenario_type, is_test = false, location_snapshot, shared_data } = body;

    if (!scenario_type) {
      return new Response(JSON.stringify({ error: "scenario_type required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Apply rate limit only for real activations
    if (!is_test && (recentActivations || 0) >= 3) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Max 3 activations per hour." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create activation with pending status
    const { data: activation, error: insertError } = await supabase
      .from("panic_activations")
      .insert({
        user_id: userId,
        scenario_type,
        status: "pending",
        is_test,
        location_snapshot,
        shared_data,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to create activation" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Panic activation created: ${activation.id} (test: ${is_test})`);

    return new Response(JSON.stringify({
      activation_id: activation.id,
      status: "pending",
      cancel_window_seconds: 5,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Panic trigger error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
