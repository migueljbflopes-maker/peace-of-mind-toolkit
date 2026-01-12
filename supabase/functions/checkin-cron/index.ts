import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to generate a secure token
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

// Helper to send email via Resend (gracefully handles missing API key)
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  
  if (!resendApiKey) {
    console.log(`[EMAIL SKIPPED - NO RESEND_API_KEY] To: ${to}, Subject: ${subject}`);
    console.log(`Email content preview: ${html.substring(0, 200)}...`);
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Safety Check <checkin@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Failed to send email to ${to}:`, error);
      return false;
    }

    console.log(`Email sent successfully to ${to}`);
    return true;
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error);
    return false;
  }
}

// Send emergency notification to contacts
async function sendEmergencyNotification(
  supabase: any,
  userId: string,
  scenarioType: string
): Promise<void> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  
  // Get user's contacts
  const { data: contacts } = await supabase
    .from("panic_contacts")
    .select("*")
    .eq("user_id", userId);

  if (!contacts || contacts.length === 0) {
    console.log(`No contacts found for user ${userId}`);
    return;
  }

  // Get user email from auth
  const { data: { user } } = await supabase.auth.admin.getUserById(userId);
  const userName = user?.email?.split("@")[0] || "Someone";

  for (const contact of contacts as Array<{ email?: string; name: string }>) {
    if (!contact.email) continue;

    const subject = `🚨 EMERGENCY: ${userName} hasn't checked in`;
    const html = `
      <!DOCTYPE html>
      <html>
        <head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body style="font-family: system-ui; padding: 20px; max-width: 600px; margin: 0 auto;">
          <div style="background: #fef2f2; border: 2px solid #ef4444; border-radius: 12px; padding: 24px; text-align: center;">
            <h1 style="color: #dc2626; margin: 0 0 16px;">🚨 Emergency Alert</h1>
            <p style="font-size: 18px; color: #1f2937; margin: 0 0 16px;">
              <strong>${userName}</strong> has not responded to 3 consecutive safety check-ins.
            </p>
            <p style="color: #6b7280; margin: 0 0 24px;">
              Scenario: <strong>${scenarioType}</strong>
            </p>
            <p style="color: #1f2937; margin: 0 0 8px;">
              You are receiving this because you were listed as an emergency contact.
            </p>
            <p style="color: #6b7280; font-size: 14px; margin: 24px 0 0;">
              Please try to reach them or contact local emergency services if you believe they may be in danger.
            </p>
          </div>
        </body>
      </html>
    `;

    if (!resendApiKey) {
      console.log(`[EMERGENCY EMAIL SKIPPED - NO RESEND_API_KEY] To: ${contact.email}`);
      console.log(`Would notify ${contact.name} about ${userName}'s missed check-ins`);
    } else {
      await sendEmail(contact.email, subject, html);
    }
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("Check-in cron job started at", new Date().toISOString());

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const appUrl = Deno.env.get("APP_URL") || "https://app.example.com";

    // Find all active sessions where check-in is overdue
    const now = new Date().toISOString();
    const { data: overdueSessions, error: queryError } = await supabase
      .from("checkin_sessions")
      .select("*")
      .eq("status", "active")
      .lt("next_checkin_due", now);

    if (queryError) {
      console.error("Error querying sessions:", queryError);
      throw queryError;
    }

    console.log(`Found ${overdueSessions?.length || 0} overdue sessions`);

    for (const session of overdueSessions || []) {
      // Increment missed count
      const newMissedCount = session.missed_count + 1;

      console.log(`Processing session ${session.id}: missed_count ${session.missed_count} -> ${newMissedCount}`);

      if (newMissedCount >= 3) {
        // TRIGGER EMERGENCY: 3 missed check-ins
        console.log(`🚨 EMERGENCY TRIGGERED for session ${session.id}, user ${session.user_id}`);

        // Update session status to triggered
        await supabase
          .from("checkin_sessions")
          .update({ 
            status: "triggered",
            missed_count: newMissedCount 
          })
          .eq("id", session.id);

        // Create a panic activation record
        await supabase
          .from("panic_activations")
          .insert({
            user_id: session.user_id,
            scenario_type: session.scenario_type,
            status: "confirmed",
            is_test: false,
            confirmed_at: now,
            shared_data: { trigger: "dead_mans_switch", missed_checkins: newMissedCount },
          });

        // Send emergency notifications to contacts
        await sendEmergencyNotification(supabase, session.user_id, session.scenario_type);

      } else {
        // Send check-in reminder email
        const { data: { user } } = await supabase.auth.admin.getUserById(session.user_id);
        
        if (user?.email) {
          // Create reminder record with token
          const token = generateToken();
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + session.interval_hours);

          await supabase
            .from("checkin_reminders")
            .insert({
              session_id: session.id,
              user_id: session.user_id,
              reminder_number: newMissedCount,
              token,
              expires_at: expiresAt.toISOString(),
              status: "pending",
            });

          // Send reminder email
          const checkInUrl = `${supabaseUrl}/functions/v1/checkin-respond?token=${token}`;
          const remainingCheckins = 3 - newMissedCount;
          
          const subject = newMissedCount === 1 
            ? "🔔 Safety Check-in Required"
            : `⚠️ Urgent: ${remainingCheckins} check-in${remainingCheckins > 1 ? 's' : ''} remaining`;

          const html = `
            <!DOCTYPE html>
            <html>
              <head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
              <body style="font-family: system-ui; padding: 20px; max-width: 600px; margin: 0 auto;">
                <div style="background: ${newMissedCount >= 2 ? '#fef3c7' : '#f0f9ff'}; border: 2px solid ${newMissedCount >= 2 ? '#f59e0b' : '#3b82f6'}; border-radius: 12px; padding: 24px; text-align: center;">
                  <h1 style="color: ${newMissedCount >= 2 ? '#d97706' : '#1d4ed8'}; margin: 0 0 16px;">
                    ${newMissedCount >= 2 ? '⚠️' : '🔔'} Safety Check-in
                  </h1>
                  <p style="font-size: 18px; color: #1f2937; margin: 0 0 24px;">
                    ${newMissedCount === 1 
                      ? "It's time for your scheduled safety check-in." 
                      : `This is reminder ${newMissedCount} of 3. If you don't respond, your emergency contacts will be notified.`
                    }
                  </p>
                  <a href="${checkInUrl}" style="display: inline-block; padding: 16px 32px; background: #22c55e; color: white; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold;">
                    ✓ I'm OK - Check In Now
                  </a>
                  <p style="color: #6b7280; font-size: 14px; margin: 24px 0 0;">
                    ${newMissedCount < 2 
                      ? `If you don't respond, you'll receive ${3 - newMissedCount} more reminder(s).`
                      : "⚠️ This is your final warning before emergency contacts are notified."
                    }
                  </p>
                </div>
                <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 16px;">
                  To stop receiving these reminders, <a href="${appUrl}/panic/setup">update your settings</a>.
                </p>
              </body>
            </html>
          `;

          await sendEmail(user.email, subject, html);
        }

        // Update session with new missed count and next due time
        const nextDue = new Date();
        nextDue.setHours(nextDue.getHours() + session.interval_hours);

        await supabase
          .from("checkin_sessions")
          .update({ 
            missed_count: newMissedCount,
            next_checkin_due: nextDue.toISOString()
          })
          .eq("id", session.id);
      }
    }

    console.log("Check-in cron job completed");

    return new Response(JSON.stringify({
      success: true,
      processed: overdueSessions?.length || 0,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error in checkin-cron:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
