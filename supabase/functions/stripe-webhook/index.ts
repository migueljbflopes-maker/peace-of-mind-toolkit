/**
 * Stripe Webhook Handler with Email Notifications
 * 
 * Sends emails via Resend:
 * - setup_intent.succeeded → Welcome email
 * - payment_intent.succeeded → Purchase receipt
 * - invoice.payment_succeeded → Purchase receipt
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FROM_EMAIL = 'Am I Ready? <noreply@am-i-ready.com>';
const PRODUCT_NAME = 'Personalized Resiliency Plan';

const logStep = (step: string, details?: unknown) => {
  console.log(`[STRIPE-WEBHOOK] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

// ============= Email Templates =============

function getWelcomeEmailHtml(claimCode?: string): string {
  const ctaUrl = claimCode ? `https://am-i-ready.com/claim?code=${claimCode}` : 'https://am-i-ready.com/login';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f6f9fc;padding:40px 20px"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden"><div style="padding:32px 48px;text-align:center"><h1 style="color:#1a1a1a;font-size:28px;margin:0">Welcome to Am I Ready?</h1></div><div style="padding:0 48px 32px"><p style="color:#525f7f;font-size:16px;line-height:26px">Thank you for joining! Your account is set up and you're ready to build your personalized emergency preparedness plan.</p><ul style="color:#525f7f;font-size:16px;line-height:26px"><li>Complete your Risk Assessment</li><li>Generate your Plan A & Plan B</li><li>Access the Red Folder</li><li>Store info in your encrypted Vault</li></ul><div style="text-align:center;margin:32px 0"><a href="${ctaUrl}" style="background:#2563eb;border-radius:8px;color:#fff;display:inline-block;font-size:16px;font-weight:600;padding:14px 32px;text-decoration:none">Get Started Now</a></div></div><div style="padding:24px 48px;border-top:1px solid #e6ebf1;text-align:center"><p style="color:#8898aa;font-size:13px;margin:0">Stay prepared, stay calm.<br>The Am I Ready? Team</p></div></div></body></html>`;
}

function getPurchaseReceiptHtml(amount: string, date: string, method?: string, txId?: string, claimCode?: string): string {
  const ctaUrl = claimCode ? `https://am-i-ready.com/claim?code=${claimCode}` : 'https://am-i-ready.com/login';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f6f9fc;padding:40px 20px"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden"><div style="padding:32px 48px;text-align:center;background:#16a34a"><h1 style="color:#fff;font-size:28px;margin:0">Payment Confirmed</h1><p style="color:#dcfce7;font-size:16px;margin:8px 0 0">Thank you for your purchase!</p></div><div style="padding:32px 48px"><h2 style="color:#1a1a1a;font-size:18px;margin:0 0 16px">Receipt</h2><hr style="border:none;border-top:1px solid #e6ebf1;margin:16px 0"><p style="margin:0"><strong style="color:#1a1a1a">${PRODUCT_NAME}</strong><br><span style="color:#8898aa;font-size:14px">Lifetime access to all premium features</span></p><p style="text-align:right;color:#16a34a;font-size:20px;font-weight:700;margin:16px 0 0">${amount}</p><hr style="border:none;border-top:1px solid #e6ebf1;margin:16px 0"><p style="color:#525f7f;font-size:14px;margin:8px 0"><strong>Date:</strong> ${date}</p>${method ? `<p style="color:#525f7f;font-size:14px;margin:8px 0"><strong>Payment:</strong> ${method}</p>` : ''}${txId ? `<p style="color:#525f7f;font-size:14px;margin:8px 0"><strong>Transaction:</strong> <code style="font-size:11px">${txId}</code></p>` : ''}</div><div style="padding:32px 48px;background:#f8fafc;text-align:center"><h3 style="color:#1a1a1a;font-size:18px;margin:0 0 8px">Access Your Plan</h3><p style="color:#525f7f;font-size:14px;margin:0 0 24px">Your Personalized Resiliency Plan is ready.</p><a href="${ctaUrl}" style="background:#2563eb;border-radius:8px;color:#fff;display:inline-block;font-size:16px;font-weight:600;padding:14px 32px;text-decoration:none">Access My Plan</a></div><div style="padding:24px 48px;text-align:center"><p style="color:#aab7c4;font-size:12px;margin:0">© ${new Date().getFullYear()} Am I Ready? All rights reserved.</p></div></div></body></html>`;
}

function getOnboardingReminderHtml(claimCode?: string): string {
  const ctaUrl = claimCode ? `https://am-i-ready.com/claim?code=${claimCode}` : 'https://am-i-ready.com/premium/onboarding';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f6f9fc;padding:40px 20px"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden"><div style="padding:32px 48px;text-align:center;background:#2563eb"><h1 style="color:#fff;font-size:28px;margin:0">Let's Finish Your Setup</h1><p style="color:#bfdbfe;font-size:16px;margin:8px 0 0">You're just a few steps away from peace of mind</p></div><div style="padding:32px 48px"><p style="color:#525f7f;font-size:16px;line-height:26px">Thanks for signing up! Complete your setup to get the most out of your plan:</p><div style="background:#f8fafc;border-radius:8px;padding:20px;margin:24px 0"><p style="margin:0 0 12px;color:#525f7f">○ Set up your Vault</p><p style="margin:0 0 12px;color:#525f7f">○ Complete Risk Assessment</p><p style="margin:0 0 12px;color:#525f7f">○ Generate Your Plans</p><p style="margin:0;color:#525f7f">○ Export Red Folder</p></div><div style="text-align:center;margin:32px 0"><a href="${ctaUrl}" style="background:#2563eb;border-radius:8px;color:#fff;display:inline-block;font-size:16px;font-weight:600;padding:14px 32px;text-decoration:none">Continue Setup</a></div></div><div style="margin:0 48px 32px;padding:16px 20px;background:#fef3c7;border-radius:8px;border-left:4px solid #f59e0b"><p style="color:#92400e;font-size:14px;margin:0"><strong>💡 Tip:</strong> Complete your Risk Assessment first – it personalizes everything else!</p></div><div style="padding:24px 48px;border-top:1px solid #e6ebf1;text-align:center"><p style="color:#aab7c4;font-size:12px;margin:0">© ${new Date().getFullYear()} Am I Ready? All rights reserved.</p></div></div></body></html>`;
}

// ============= Email Sending =============

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) { logStep('RESEND_API_KEY not configured'); return false; }
  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({ from: FROM_EMAIL, to: [to], subject, html });
    if (error) { logStep('Email failed', { error: error.message }); return false; }
    logStep('Email sent', { to, subject });
    return true;
  } catch (err) { logStep('Email error', { error: String(err) }); return false; }
}

// ============= Email Extraction (Apple Pay/Google Pay/Card) =============

async function extractEmail(stripe: Stripe, pi: Stripe.PaymentIntent): Promise<string | null> {
  // 1. Try charge billing_details (best for Apple/Google Pay)
  if (pi.latest_charge) {
    try {
      const chargeId = typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge.id;
      const charge = await stripe.charges.retrieve(chargeId);
      if (charge.billing_details?.email) return charge.billing_details.email.toLowerCase();
      if (charge.receipt_email) return charge.receipt_email.toLowerCase();
    } catch {}
  }
  // 2. Try customer
  if (pi.customer) {
    try {
      const custId = typeof pi.customer === 'string' ? pi.customer : pi.customer.id;
      const cust = await stripe.customers.retrieve(custId) as Stripe.Customer;
      if (cust && !cust.deleted && cust.email) return cust.email.toLowerCase();
    } catch {}
  }
  // 3. Metadata / receipt_email
  if (pi.metadata?.email) return pi.metadata.email.toLowerCase();
  if (pi.receipt_email) return pi.receipt_email.toLowerCase();
  return null;
}

async function extractInvoiceEmail(stripe: Stripe, inv: Stripe.Invoice): Promise<string | null> {
  if (inv.customer_email) return inv.customer_email.toLowerCase();
  if (inv.customer) {
    try {
      const custId = typeof inv.customer === 'string' ? inv.customer : inv.customer.id;
      const cust = await stripe.customers.retrieve(custId) as Stripe.Customer;
      if (cust && !cust.deleted && cust.email) return cust.email.toLowerCase();
    } catch {}
  }
  return null;
}

async function extractSetupEmail(stripe: Stripe, si: Stripe.SetupIntent): Promise<string | null> {
  if (si.metadata?.email) return si.metadata.email.toLowerCase();
  if (si.customer) {
    try {
      const custId = typeof si.customer === 'string' ? si.customer : si.customer.id;
      const cust = await stripe.customers.retrieve(custId) as Stripe.Customer;
      if (cust && !cust.deleted && cust.email) return cust.email.toLowerCase();
    } catch {}
  }
  return null;
}

async function getPaymentMethod(stripe: Stripe, chargeId: string): Promise<string> {
  try {
    const charge = await stripe.charges.retrieve(chargeId);
    const d = charge.payment_method_details;
    if (d?.card?.wallet?.type === 'apple_pay') return 'Apple Pay';
    if (d?.card?.wallet?.type === 'google_pay') return 'Google Pay';
    if (d?.type === 'card' && d.card) return `${(d.card.brand || 'Card').charAt(0).toUpperCase() + (d.card.brand || '').slice(1)} •••• ${d.card.last4 || '****'}`;
  } catch {}
  return 'Card';
}

const formatAmount = (cents: number, curr: string) => new Intl.NumberFormat('en-US', { style: 'currency', currency: curr.toUpperCase() }).format(cents / 100);
const formatDate = (ts: number) => new Date(ts * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

// ============= Webhook Handler =============

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeKey || !webhookSecret || !supabaseUrl || !serviceRoleKey) throw new Error("Missing env vars");

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    if (!signature) return new Response(JSON.stringify({ error: "Missing signature" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret, undefined, Stripe.createSubtleCryptoProvider());
    logStep("Event verified", { type: event.type });

    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    // Idempotency
    const { data: existing } = await supabase.from("stripe_events").select("event_id").eq("event_id", event.id).maybeSingle();
    if (existing) return new Response(JSON.stringify({ received: true, skipped: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    await supabase.from("stripe_events").insert({ event_id: event.id });

    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const email = await extractEmail(stripe, pi);
        const method = pi.latest_charge ? await getPaymentMethod(stripe, typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge.id) : undefined;

        if (pi.metadata?.purchase_type === "guest") {
          const { data: gp } = await supabase.from("guest_purchases").update({ status: "paid", paid_at: new Date().toISOString(), ...(email ? { payer_email: email } : {}) }).eq("payment_intent_id", pi.id).select('claim_code').maybeSingle();
          if (email) {
            await sendEmail(email, `Your Am I Ready? purchase receipt – ${formatAmount(pi.amount, pi.currency)}`, getPurchaseReceiptHtml(formatAmount(pi.amount, pi.currency), formatDate(pi.created), method, pi.id, gp?.claim_code));
            await sendEmail(email, 'Complete your emergency preparedness setup', getOnboardingReminderHtml(gp?.claim_code));
          }
        } else if (pi.metadata?.user_id) {
          await supabase.from("premium_entitlements").upsert({ user_id: pi.metadata.user_id, is_premium: true, granted_at: new Date().toISOString(), revoked_at: null, plan_name: PRODUCT_NAME, price_eur: 49 }, { onConflict: "user_id" });
          if (email) {
            await sendEmail(email, `Your Am I Ready? purchase receipt – ${formatAmount(pi.amount, pi.currency)}`, getPurchaseReceiptHtml(formatAmount(pi.amount, pi.currency), formatDate(pi.created), method, pi.id));
            await sendEmail(email, 'Complete your emergency preparedness setup', getOnboardingReminderHtml());
          }
        } else if (email) {
          await sendEmail(email, `Your Am I Ready? purchase receipt – ${formatAmount(pi.amount, pi.currency)}`, getPurchaseReceiptHtml(formatAmount(pi.amount, pi.currency), formatDate(pi.created), method, pi.id));
        }
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_status !== "paid") break;
        const userId = session.metadata?.user_id || session.client_reference_id;
        if (!userId) throw new Error("No user_id in session");
        await supabase.from("premium_entitlements").upsert({ user_id: userId, is_premium: true, granted_at: new Date().toISOString(), revoked_at: null, plan_name: PRODUCT_NAME, price_eur: 49 }, { onConflict: "user_id" });
        await supabase.from("stripe_customer_map").upsert({ user_id: userId, stripe_customer_id: session.customer as string, stripe_checkout_session_id: session.id, stripe_payment_intent_id: session.payment_intent as string, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
        break;
      }

      case "invoice.payment_succeeded": {
        const inv = event.data.object as Stripe.Invoice;
        const email = await extractInvoiceEmail(stripe, inv);
        if (email && inv.amount_paid > 0) {
          await sendEmail(email, `Your Am I Ready? purchase receipt – ${formatAmount(inv.amount_paid, inv.currency)}`, getPurchaseReceiptHtml(formatAmount(inv.amount_paid, inv.currency), formatDate(inv.created), undefined, inv.id));
        }
        if (inv.subscription) {
          const sub = await stripe.subscriptions.retrieve(inv.subscription as string);
          if (sub.metadata?.claim_code && sub.metadata?.purchase_type === "subscription_guest") {
            await supabase.from("guest_purchases").update({ status: "subscription_paid", paid_at: new Date().toISOString() }).eq("claim_code", sub.metadata.claim_code);
          }
        }
        break;
      }

      case "setup_intent.succeeded": {
        const si = event.data.object as Stripe.SetupIntent;
        const email = await extractSetupEmail(stripe, si);
        const claimCode = si.metadata?.claim_code;
        if (claimCode) await supabase.from("guest_purchases").update({ status: "setup_succeeded" }).eq("payment_intent_id", si.id);
        if (email) {
          await sendEmail(email, 'Welcome to Am I Ready? – Your journey starts now', getWelcomeEmailHtml(claimCode));
          await sendEmail(email, 'Complete your emergency preparedness setup', getOnboardingReminderHtml(claimCode));
        }
        break;
      }

      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        if (sub.metadata?.claim_code) await supabase.from("guest_purchases").update({ status: "subscription_active" }).eq("claim_code", sub.metadata.claim_code);
        break;
      }

      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        if (inv.subscription) {
          const sub = await stripe.subscriptions.retrieve(inv.subscription as string);
          if (sub.metadata?.claim_code) await supabase.from("guest_purchases").update({ status: "payment_failed" }).eq("claim_code", sub.metadata.claim_code);
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        if (sub.metadata?.claim_code) {
          let status = sub.status === "canceled" ? "subscription_canceled" : sub.status === "past_due" ? "subscription_past_due" : sub.cancel_at_period_end ? "subscription_ending" : "subscription_active";
          await supabase.from("guest_purchases").update({ status }).eq("claim_code", sub.metadata.claim_code);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        if (sub.metadata?.claim_code) await supabase.from("guest_purchases").update({ status: "subscription_canceled" }).eq("claim_code", sub.metadata.claim_code);
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const { data: map } = await supabase.from("stripe_customer_map").select("user_id").or(`stripe_customer_id.eq.${charge.customer},stripe_payment_intent_id.eq.${charge.payment_intent}`).maybeSingle();
        if (map) await supabase.from("premium_entitlements").update({ is_premium: false, revoked_at: new Date().toISOString() }).eq("user_id", map.user_id);
        break;
      }

      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        const charge = await stripe.charges.retrieve(dispute.charge as string);
        const { data: map } = await supabase.from("stripe_customer_map").select("user_id").eq("stripe_customer_id", charge.customer).maybeSingle();
        if (map) await supabase.from("premium_entitlements").update({ is_premium: false, revoked_at: new Date().toISOString() }).eq("user_id", map.user_id);
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    logStep("ERROR", { error: String(error) });
    return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
