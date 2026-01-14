/**
 * Email Utilities
 * 
 * Core email sending and extraction helpers for the Stripe webhook.
 * Handles Apple Pay, Google Pay, and standard card payments.
 * Includes deduplication logic for welcome emails.
 */

import { Resend } from "https://esm.sh/resend@4.0.0";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// ============= Constants =============

export const FROM_EMAIL = 'Am I Ready? <noreply@am-i-ready.com>';
export const PRODUCT_NAME = 'Personalized Resiliency Plan';

// ============= Logging =============

export const logStep = (step: string, details?: unknown) => {
  console.log(`[STRIPE-WEBHOOK] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

// ============= Email Sending =============

/**
 * Send an email via Resend
 * @param to - Recipient email address
 * @param subject - Email subject line
 * @param html - Complete HTML email content
 * @returns true if sent successfully, false otherwise
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  
  if (!apiKey) {
    logStep('RESEND_API_KEY not configured');
    return false;
  }
  
  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html
    });
    
    if (error) {
      logStep('Email failed', { error: error.message });
      return false;
    }
    
    logStep('Email sent', { to, subject });
    return true;
  } catch (err) {
    logStep('Email error', { error: String(err) });
    return false;
  }
}

// ============= Welcome Email with Deduplication =============

/**
 * Send welcome email with deduplication check
 * Prevents duplicate welcome emails to the same address
 * 
 * @param supabase - Supabase client (service role)
 * @param email - Recipient email address
 * @param getEmailHtml - Function to generate email HTML (allows different templates)
 * @param source - Source of the email (for tracking)
 * @param stripeEventId - Optional Stripe event ID
 * @returns true if sent, false if skipped or failed
 */
export async function sendWelcomeWithDedup(
  supabase: SupabaseClient,
  email: string,
  getEmailHtml: () => string,
  source: string,
  stripeEventId?: string
): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();
  
  // Check if welcome email already sent to this address
  const { data: existing } = await supabase
    .from('emails_sent')
    .select('id')
    .eq('email', normalizedEmail)
    .eq('template_type', 'welcome')
    .maybeSingle();
  
  if (existing) {
    logStep('Welcome email already sent, skipping', { email: normalizedEmail });
    return false;
  }
  
  // Send the email
  const sent = await sendEmail(
    normalizedEmail,
    'Welcome to Am I Ready? – Your journey starts now',
    getEmailHtml()
  );
  
  if (sent) {
    // Record in database to prevent future duplicates
    await supabase
      .from('emails_sent')
      .insert({
        email: normalizedEmail,
        template_type: 'welcome',
        source,
        stripe_event_id: stripeEventId
      });
    logStep('Welcome email recorded', { email: normalizedEmail, source });
  }
  
  return sent;
}

// ============= Email Extraction =============

/**
 * Extract email from a PaymentIntent (handles Apple Pay, Google Pay, cards)
 * Priority: charge.billing_details → charge.receipt_email → customer → metadata → receipt_email
 */
export async function extractEmail(stripe: Stripe, pi: Stripe.PaymentIntent): Promise<string | null> {
  // 1. Try charge billing_details (best for Apple/Google Pay)
  if (pi.latest_charge) {
    try {
      const chargeId = typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge.id;
      const charge = await stripe.charges.retrieve(chargeId);
      if (charge.billing_details?.email) {
        return charge.billing_details.email.toLowerCase();
      }
      if (charge.receipt_email) {
        return charge.receipt_email.toLowerCase();
      }
    } catch {
      // Continue to next method
    }
  }
  
  // 2. Try customer
  if (pi.customer) {
    try {
      const custId = typeof pi.customer === 'string' ? pi.customer : pi.customer.id;
      const cust = await stripe.customers.retrieve(custId) as Stripe.Customer;
      if (cust && !cust.deleted && cust.email) {
        return cust.email.toLowerCase();
      }
    } catch {
      // Continue to next method
    }
  }
  
  // 3. Metadata / receipt_email
  if (pi.metadata?.email) {
    return pi.metadata.email.toLowerCase();
  }
  if (pi.receipt_email) {
    return pi.receipt_email.toLowerCase();
  }
  
  return null;
}

/**
 * Extract email from an Invoice
 * Priority: customer_email → customer object
 */
export async function extractInvoiceEmail(stripe: Stripe, inv: Stripe.Invoice): Promise<string | null> {
  if (inv.customer_email) {
    return inv.customer_email.toLowerCase();
  }
  
  if (inv.customer) {
    try {
      const custId = typeof inv.customer === 'string' ? inv.customer : inv.customer.id;
      const cust = await stripe.customers.retrieve(custId) as Stripe.Customer;
      if (cust && !cust.deleted && cust.email) {
        return cust.email.toLowerCase();
      }
    } catch {
      // Customer retrieval failed
    }
  }
  
  return null;
}

/**
 * Extract email from a SetupIntent
 * Priority: metadata.email → customer object
 */
export async function extractSetupEmail(stripe: Stripe, si: Stripe.SetupIntent): Promise<string | null> {
  if (si.metadata?.email) {
    return si.metadata.email.toLowerCase();
  }
  
  if (si.customer) {
    try {
      const custId = typeof si.customer === 'string' ? si.customer : si.customer.id;
      const cust = await stripe.customers.retrieve(custId) as Stripe.Customer;
      if (cust && !cust.deleted && cust.email) {
        return cust.email.toLowerCase();
      }
    } catch {
      // Customer retrieval failed
    }
  }
  
  return null;
}

/**
 * Extract email from a Checkout Session
 * Priority: customer_details.email → customer_email → customer object
 */
export async function extractCheckoutEmail(stripe: Stripe, session: Stripe.Checkout.Session): Promise<string | null> {
  // 1. Try customer_details (most common for guest checkout)
  if (session.customer_details?.email) {
    return session.customer_details.email.toLowerCase();
  }
  
  // 2. Try customer_email
  if (session.customer_email) {
    return session.customer_email.toLowerCase();
  }
  
  // 3. Try customer object
  if (session.customer) {
    try {
      const custId = typeof session.customer === 'string' ? session.customer : session.customer.id;
      const cust = await stripe.customers.retrieve(custId) as Stripe.Customer;
      if (cust && !cust.deleted && cust.email) {
        return cust.email.toLowerCase();
      }
    } catch {
      // Customer retrieval failed
    }
  }
  
  return null;
}

// ============= Payment Method Detection =============

/**
 * Get human-readable payment method from a charge
 * Detects: Apple Pay, Google Pay, or card brand with last 4 digits
 */
export async function getPaymentMethod(stripe: Stripe, chargeId: string): Promise<string> {
  try {
    const charge = await stripe.charges.retrieve(chargeId);
    const d = charge.payment_method_details;
    
    // Check for wallet payments first
    if (d?.card?.wallet?.type === 'apple_pay') {
      return 'Apple Pay';
    }
    if (d?.card?.wallet?.type === 'google_pay') {
      return 'Google Pay';
    }
    
    // Standard card payment
    if (d?.type === 'card' && d.card) {
      const brand = d.card.brand || 'Card';
      const brandCapitalized = brand.charAt(0).toUpperCase() + brand.slice(1);
      const last4 = d.card.last4 || '****';
      return `${brandCapitalized} •••• ${last4}`;
    }
  } catch {
    // Charge retrieval failed
  }
  
  return 'Card';
}

// ============= Formatting Utilities =============

/**
 * Format cents amount to currency string
 * @param cents - Amount in minor units (e.g., 4900 for €49.00)
 * @param currency - ISO currency code (e.g., 'eur', 'usd')
 */
export const formatAmount = (cents: number, currency: string): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase()
  }).format(cents / 100);
};

/**
 * Format Unix timestamp to readable date
 * @param timestamp - Unix timestamp in seconds
 */
export const formatDate = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};
