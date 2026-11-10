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
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const { activation_id } = body;

    if (!activation_id) {
      return new Response(JSON.stringify({ error: "activation_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch activation and verify ownership
    const { data: activation, error: fetchError } = await supabase
      .from("panic_activations")
      .select("*")
      .eq("id", activation_id)
      .eq("user_id", userId)
      .single();

    if (fetchError || !activation) {
      return new Response(JSON.stringify({ error: "Activation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if still pending
    if (activation.status !== "pending") {
      return new Response(JSON.stringify({ 
        activation_id,
        status: activation.status,
        message: "Already processed"
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update to confirmed
    const { error: updateError } = await supabase
      .from("panic_activations")
      .update({
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
      })
      .eq("id", activation_id);

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(JSON.stringify({ error: "Failed to confirm" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Panic activation confirmed: ${activation_id} (test: ${activation.is_test})`);

    // For test activations, we're done - don't send real notifications
    if (activation.is_test) {
      // Mark as completed immediately for tests
      await supabase
        .from("panic_activations")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", activation_id);

      return new Response(JSON.stringify({
        activation_id,
        status: "completed",
        is_test: true,
        notifications_sent: 0,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch user's contacts for the scenario
    const { data: scenario } = await supabase
      .from("panic_scenarios")
      .select("share_config")
      .eq("user_id", userId)
      .eq("scenario_type", activation.scenario_type)
      .single();

    // Get contact IDs from scenario config, or all contacts if not specified
    let contactIds: string[] = [];
    const shareConfig = scenario?.share_config as { contact_ids?: string[] } | null;
    if (shareConfig?.contact_ids && shareConfig.contact_ids.length > 0) {
      contactIds = shareConfig.contact_ids;
    }

    // Fetch contacts
    let contactsQuery = supabase
      .from("panic_contacts")
      .select("*")
      .eq("user_id", userId);
    
    if (contactIds.length > 0) {
      contactsQuery = contactsQuery.in("id", contactIds);
    }

    const { data: contacts } = await contactsQuery;

    if (!contacts || contacts.length === 0) {
      console.log("No contacts configured for user:", userId);
      return new Response(JSON.stringify({
        activation_id,
        status: "confirmed",
        notifications_sent: 0,
        warning: "No contacts configured",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create notification records for each contact
    const notifications = contacts.map(contact => ({
      activation_id,
      contact_id: contact.id,
      channel: contact.email ? "email" : "sms",
      status: "pending",
    }));

    const { error: notifError } = await supabase
      .from("panic_notifications")
      .insert(notifications);

    if (notifError) {
      console.error("Notification insert error:", notifError);
    }

    // TODO: In future, call panic-notify to actually send emails/SMS
    // For now, we just create the notification records
    console.log(`Created ${notifications.length} notification records for activation ${activation_id}`);

    return new Response(JSON.stringify({
      activation_id,
      status: "confirmed",
      notifications_pending: notifications.length,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Panic confirm error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
