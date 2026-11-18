/**
 * Send Scheduled Emails
 * 
 * Processes the scheduled_emails queue and sends emails that are due.
 * Called hourly by pg_cron.
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

// Import email templates from shared folder
import { getOnboardingReminderHtml } from "../_shared/templates/onboarding-reminder.ts";

// ============= Types =============

interface ScheduledEmail {
  id: string;
  email: string;
  template_type: string;
  template_data: {
    claimCode?: string;
  } | null;
  send_at: string;
  status: string;
}

// ============= Email Sending =============

const FROM_EMAIL = "Am I Ready? <noreply@am-i-ready.com>";

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  
  if (!resendKey) {
    console.log(`[SCHEDULED] Would send to ${to}: ${subject}`);
    return true; // Consider it "sent" for dev purposes
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[SCHEDULED] Resend error: ${err}`);
      return false;
    }

    console.log(`[SCHEDULED] Email sent to ${to}: ${subject}`);
    return true;
  } catch (error) {
    console.error(`[SCHEDULED] Send error:`, error);
    return false;
  }
}

// ============= Template Rendering =============

function renderTemplate(templateType: string, data: ScheduledEmail['template_data']): { subject: string; html: string } | null {
  switch (templateType) {
    case "onboarding_reminder":
      return {
        subject: "Complete your emergency preparedness setup",
        html: getOnboardingReminderHtml(data?.claimCode),
      };
    
    // Add more templates here as needed
    default:
      console.error(`[SCHEDULED] Unknown template: ${templateType}`);
      return null;
  }
}

// ============= Main Handler =============

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Fetch pending emails that are due
    const now = new Date().toISOString();
    const { data: emails, error: fetchError } = await supabase
      .from("scheduled_emails")
      .select("*")
      .eq("status", "pending")
      .lte("send_at", now)
      .limit(50);

    if (fetchError) {
      throw new Error(`Fetch error: ${fetchError.message}`);
    }

    if (!emails || emails.length === 0) {
      console.log("[SCHEDULED] No pending emails to send");
      return new Response(
        JSON.stringify({ processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[SCHEDULED] Processing ${emails.length} pending emails`);

    let sent = 0;
    let failed = 0;

    for (const item of emails as ScheduledEmail[]) {
      const template = renderTemplate(item.template_type, item.template_data);
      
      if (!template) {
        await supabase
          .from("scheduled_emails")
          .update({ 
            status: "failed", 
            error: `Unknown template: ${item.template_type}` 
          })
          .eq("id", item.id);
        failed++;
        continue;
      }

      const success = await sendEmail(item.email, template.subject, template.html);

      if (success) {
        await supabase
          .from("scheduled_emails")
          .update({ 
            status: "sent", 
            sent_at: new Date().toISOString() 
          })
          .eq("id", item.id);
        sent++;
      } else {
        await supabase
          .from("scheduled_emails")
          .update({ 
            status: "failed", 
            error: "Send failed" 
          })
          .eq("id", item.id);
        failed++;
      }
    }

    console.log(`[SCHEDULED] Complete: ${sent} sent, ${failed} failed`);

    return new Response(
      JSON.stringify({ processed: emails.length, sent, failed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[SCHEDULED] Error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
