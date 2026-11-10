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

  // Accept both GET (for email links) and POST
  const url = new URL(req.url);
  let token: string | null = null;

  if (req.method === "GET") {
    token = url.searchParams.get("token");
  } else if (req.method === "POST") {
    try {
      const body = await req.json();
      token = body.token;
    } catch {
      token = null;
    }
  }

  if (!token) {
    // Return a nice HTML page for browser access
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head><title>Check-in Error</title></head>
        <body style="font-family: system-ui; padding: 40px; text-align: center;">
          <h1>❌ Invalid Check-in Link</h1>
          <p>This check-in link is missing the required token.</p>
        </body>
      </html>
    `, {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find the reminder by token
    const { data: reminder, error: findError } = await supabase
      .from("checkin_reminders")
      .select("*, checkin_sessions(*)")
      .eq("token", token)
      .single();

    if (findError || !reminder) {
      console.log(`Token not found: ${token}`);
      return new Response(`
        <!DOCTYPE html>
        <html>
          <head><title>Check-in Not Found</title></head>
          <body style="font-family: system-ui; padding: 40px; text-align: center;">
            <h1>❌ Check-in Not Found</h1>
            <p>This check-in link was not found. It may have already been used or expired.</p>
          </body>
        </html>
      `, {
        status: 404,
        headers: { "Content-Type": "text/html" },
      });
    }

    // Check if already responded
    if (reminder.status === "responded") {
      return new Response(`
        <!DOCTYPE html>
        <html>
          <head><title>Already Checked In</title></head>
          <body style="font-family: system-ui; padding: 40px; text-align: center;">
            <h1>✅ Already Checked In</h1>
            <p>You've already responded to this check-in. You're all set!</p>
          </body>
        </html>
      `, {
        status: 200,
        headers: { "Content-Type": "text/html" },
      });
    }

    // Check if expired
    if (new Date(reminder.expires_at) < new Date()) {
      return new Response(`
        <!DOCTYPE html>
        <html>
          <head><title>Check-in Expired</title></head>
          <body style="font-family: system-ui; padding: 40px; text-align: center;">
            <h1>⏰ Check-in Expired</h1>
            <p>This check-in link has expired. Please wait for the next check-in reminder.</p>
          </body>
        </html>
      `, {
        status: 410,
        headers: { "Content-Type": "text/html" },
      });
    }

    // Mark as responded
    const { error: updateError } = await supabase
      .from("checkin_reminders")
      .update({ 
        status: "responded", 
        responded_at: new Date().toISOString() 
      })
      .eq("id", reminder.id);

    if (updateError) {
      throw updateError;
    }

    // Reset the session's missed count and set next check-in time
    const session = reminder.checkin_sessions;
    if (session && session.status === "active") {
      const nextDue = new Date();
      nextDue.setHours(nextDue.getHours() + session.interval_hours);

      await supabase
        .from("checkin_sessions")
        .update({ 
          missed_count: 0,
          next_checkin_due: nextDue.toISOString()
        })
        .eq("id", session.id);
    }

    console.log(`Check-in responded for reminder ${reminder.id}, session ${reminder.session_id}`);

    // Return success page
    const appUrl = Deno.env.get("APP_URL") || "https://app.example.com";
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Check-in Successful</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: system-ui; padding: 40px; text-align: center; background: #f8fafc;">
          <div style="max-width: 400px; margin: 0 auto; background: white; padding: 40px; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h1 style="color: #22c55e; font-size: 48px; margin: 0;">✓</h1>
            <h2 style="margin: 16px 0;">You're Safe!</h2>
            <p style="color: #64748b;">Thanks for checking in. Your emergency contacts won't be notified.</p>
            <p style="color: #94a3b8; font-size: 14px; margin-top: 24px;">
              Your next check-in is scheduled based on your settings.
            </p>
            <a href="${appUrl}/panic/setup" style="display: inline-block; margin-top: 24px; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px;">
              Open App
            </a>
          </div>
        </body>
      </html>
    `, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });

  } catch (error) {
    console.error("Error in checkin-respond:", error);
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head><title>Error</title></head>
        <body style="font-family: system-ui; padding: 40px; text-align: center;">
          <h1>❌ Something went wrong</h1>
          <p>Please try again later or contact support.</p>
        </body>
      </html>
    `, {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });
  }
});
