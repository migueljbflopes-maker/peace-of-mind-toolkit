import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check premium status
    const { data: entitlement } = await supabase
      .from("premium_entitlements")
      .select("is_premium")
      .eq("user_id", user.id)
      .single();

    if (!entitlement?.is_premium) {
      return new Response(JSON.stringify({ error: "Premium required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { scenario_type, interval_hours = 24 } = body;

    if (!scenario_type) {
      return new Response(JSON.stringify({ error: "scenario_type required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if there's already an active session for this user/scenario
    const { data: existingSession } = await supabase
      .from("checkin_sessions")
      .select("id")
      .eq("user_id", user.id)
      .eq("scenario_type", scenario_type)
      .eq("status", "active")
      .single();

    if (existingSession) {
      return new Response(JSON.stringify({ 
        error: "Active session already exists",
        session_id: existingSession.id 
      }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate next check-in due time
    const nextDue = new Date();
    nextDue.setHours(nextDue.getHours() + interval_hours);

    // Create new check-in session
    const { data: session, error: insertError } = await supabase
      .from("checkin_sessions")
      .insert({
        user_id: user.id,
        scenario_type,
        interval_hours,
        next_checkin_due: nextDue.toISOString(),
        status: "active",
        missed_count: 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating session:", insertError);
      throw insertError;
    }

    console.log(`Check-in session started for user ${user.id}, scenario ${scenario_type}, interval ${interval_hours}h`);

    return new Response(JSON.stringify({
      success: true,
      session_id: session.id,
      next_checkin_due: session.next_checkin_due,
      interval_hours: session.interval_hours,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error in checkin-start:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
