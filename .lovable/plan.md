
# Complete Stripe Apple Pay Checkout Code Extraction

## Overview
This document contains all the code from RiskFunnel1 needed to implement a Stripe checkout flow with Apple Pay/Google Pay support in a new project.

---

## 1. Frontend: Main Checkout Logic (RiskFunnel1.tsx)

### Required Imports and Setup
```typescript
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { loadStripe } from "@stripe/stripe-js";

// Initialize Stripe
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

// Your subscription price ID from Stripe Dashboard
const SUBSCRIPTION_PRICE_ID = "price_1Sp2vlGudTqpziaHp7oKKuyY";
```

### Express Pay State and Types
```typescript
type ExpressPaySupport = {
  ready: boolean;
  method: "apple_pay" | "google_pay" | null;
};

// Inside component:
const [checkoutLoading, setCheckoutLoading] = useState(false);
const [expressPay, setExpressPay] = useState<ExpressPaySupport>({
  ready: false,
  method: null,
});

// Refs for Apple Pay (required - cannot do async before show())
const paymentRequestRef = useRef<any>(null);
const guestSessionIdRef = useRef<string | null>(null);
const localeRef = useRef(locale);
const navigateRef = useRef(navigate);
```

### Guest Session ID Helper
```typescript
const getOrCreateGuestSessionId = () => {
  if (guestSessionIdRef.current) return guestSessionIdRef.current;
  const key = "resilient_guest_session_id";
  const existing = localStorage.getItem(key);
  const id = existing || crypto.randomUUID();
  if (!existing) localStorage.setItem(key, id);
  guestSessionIdRef.current = id;
  return id;
};
```

### Express Pay Detection and Setup (useEffect)
```typescript
useEffect(() => {
  let cancelled = false;

  (async () => {
    console.log("[Checkout] === EXPRESS PAY DETECTION START ===");
    console.log("[Checkout] Current domain:", window.location.hostname);

    if (!stripePromise) {
      console.log("[Checkout] ❌ Stripe not initialized");
      if (!cancelled) setExpressPay({ ready: true, method: null });
      return;
    }

    const stripe = await stripePromise;
    if (!stripe) {
      console.log("[Checkout] ❌ Stripe.js failed to load");
      if (!cancelled) setExpressPay({ ready: true, method: null });
      return;
    }

    // Create PaymentRequest for Apple/Google Pay detection
    // Amount is 0 for SetupIntent (subscription) flow
    const pr = stripe.paymentRequest({
      country: "PT", // Your country
      currency: "eur",
      total: { label: "Your Product Name", amount: 0 },
      requestPayerName: true,
      requestPayerEmail: true,
    });

    // Handle cancel
    pr.on("cancel", () => {
      console.log("[Checkout] Express Pay: user cancelled");
      setCheckoutLoading(false);
    });

    // Handle payment method received
    pr.on("paymentmethod", async (ev: any) => {
      console.log("[Checkout] Express Pay: paymentmethod received");

      try {
        // 1. Create SetupIntent for subscription
        const { data: siRes, error: siErr } = await supabase.functions.invoke(
          "create-subscription-setup",
          { body: { guestSessionId: getOrCreateGuestSessionId() } }
        );
        if (siErr) throw siErr;

        const clientSecret = siRes?.clientSecret;
        if (!clientSecret) throw new Error("Missing SetupIntent clientSecret");

        // 2. Confirm SetupIntent with payment method
        const { error: confirmError, setupIntent } = await stripe.confirmCardSetup(
          clientSecret,
          { payment_method: ev.paymentMethod.id },
          { handleActions: false }
        );

        if (confirmError) {
          console.error("[Checkout] confirm error:", confirmError);
          ev.complete("fail");
          toast.error("Setup failed");
          setCheckoutLoading(false);
          return;
        }

        // 3. Handle requires_action if needed
        if (setupIntent?.status === "requires_action") {
          const { error: actionError } = await stripe.confirmCardSetup(clientSecret);
          if (actionError) {
            ev.complete("fail");
            toast.error("Setup failed");
            setCheckoutLoading(false);
            return;
          }
        }

        // 4. Complete subscription creation on backend
        const { data: subRes, error: subErr } = await supabase.functions.invoke(
          "complete-subscription-setup",
          {
            body: {
              setupIntentId: siRes?.setupIntentId,
              payerEmail: ev.payerEmail,
              payerName: ev.payerName,
            },
          }
        );

        if (subErr) {
          ev.complete("fail");
          toast.error("Subscription creation failed");
          setCheckoutLoading(false);
          return;
        }

        ev.complete("success");
        
        // Store claim code and redirect
        if (siRes?.claimCode) {
          localStorage.setItem('claim_code_last', siRes.claimCode);
        }
        window.location.href = `/purchase-success?claim_code=${siRes?.claimCode}&source=express`;
        
      } catch (err) {
        console.error("[Checkout] paymentmethod handler failed:", err);
        try { ev.complete("fail"); } catch {}
        toast.error("Payment failed");
        setCheckoutLoading(false);
      }
    });

    paymentRequestRef.current = pr;

    // Check if Apple/Google Pay is available
    const canPay = await pr.canMakePayment();
    console.log("[Checkout] canMakePayment:", canPay);

    const method = canPay?.applePay ? "apple_pay" : canPay?.googlePay ? "google_pay" : null;
    if (!cancelled) setExpressPay({ ready: true, method });

  })().catch((err) => {
    console.error("[Checkout] Express Pay detection error:", err);
    if (!cancelled) setExpressPay({ ready: true, method: null });
  });

  return () => { cancelled = true; };
}, []);
```

### Checkout Handler
```typescript
const handleCheckout = async () => {
  setCheckoutLoading(true);

  try {
    const stripe = stripePromise ? await stripePromise : null;

    // Try Express Pay first (Apple Pay / Google Pay)
    // IMPORTANT: show() must be called immediately from user gesture
    if (stripe && expressPay.ready && expressPay.method && paymentRequestRef.current) {
      console.log("[Checkout] Using Express Pay:", expressPay.method);
      try {
        paymentRequestRef.current.show();
        return; // Success/fail handled by event listeners
      } catch (err) {
        console.warn("[Checkout] Express Pay show() failed, using fallback:", err);
      }
    }

    // Fallback: Stripe Checkout Session
    console.log("[Checkout] Using Stripe Checkout Session");
    const guestSessionId = getOrCreateGuestSessionId();

    const { data: res, error } = await supabase.functions.invoke(
      "create-subscription-checkout",
      {
        body: {
          source: "your-funnel-name",
          guestSessionId,
          priceId: SUBSCRIPTION_PRICE_ID,
        },
      }
    );

    if (error) throw error;
    if (!res?.url) throw new Error("No checkout URL received");

    window.location.href = res.url;

  } catch (e) {
    console.error("[Checkout] error:", e);
    toast.error("Error opening checkout");
    setCheckoutLoading(false);
  }
};
```

---

## 2. Edge Function: create-subscription-setup

Creates a SetupIntent for Express Pay (Apple/Google Pay).

```typescript
// supabase/functions/create-subscription-setup/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateClaimCode(): string {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
    if (!supabaseUrl) throw new Error("SUPABASE_URL not configured");
    if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");

    const { guestSessionId } = await req.json();
    if (!guestSessionId) throw new Error("guestSessionId is required");

    const claimCode = generateClaimCode();
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Create SetupIntent for collecting payment method
    const setupIntent = await stripe.setupIntents.create({
      payment_method_types: ['card'],
      usage: 'off_session',
      metadata: {
        purchase_type: "subscription_guest",
        claim_code: claimCode,
        guest_session_id: guestSessionId,
        source: "your-source",
        price_id: "price_YOUR_PRICE_ID",
      },
    });

    // Record in database
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    await supabase.from("guest_purchases").insert({
      payment_intent_id: setupIntent.id,
      claim_code: claimCode,
      guest_session_id: guestSessionId,
      status: "setup_pending",
      amount_cents: 4900,
      currency: "eur",
      source: "your-source",
    });

    return new Response(JSON.stringify({
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id,
      claimCode,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

---

## 3. Edge Function: complete-subscription-setup

Completes the subscription after Express Pay confirmation.

```typescript
// supabase/functions/complete-subscription-setup/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const { setupIntentId, payerEmail, payerName } = await req.json();
    if (!setupIntentId) throw new Error("setupIntentId is required");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Retrieve the SetupIntent
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
    
    if (setupIntent.status !== 'succeeded') {
      throw new Error(`SetupIntent not successful: ${setupIntent.status}`);
    }
    if (!setupIntent.payment_method) {
      throw new Error("No payment method attached");
    }

    const claimCode = setupIntent.metadata?.claim_code;
    const priceId = setupIntent.metadata?.price_id || "price_YOUR_DEFAULT_PRICE";

    // Get email from params or payment method
    let customerEmail = payerEmail;
    if (!customerEmail) {
      const pm = await stripe.paymentMethods.retrieve(setupIntent.payment_method as string);
      customerEmail = pm.billing_details?.email;
    }
    if (!customerEmail) throw new Error("Email required");

    // Find or create customer
    let customerId: string;
    const customers = await stripe.customers.list({ email: customerEmail, limit: 1 });
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      try {
        await stripe.paymentMethods.attach(setupIntent.payment_method as string, {
          customer: customerId,
        });
      } catch {}
    } else {
      const customer = await stripe.customers.create({
        email: customerEmail,
        name: payerName || undefined,
        payment_method: setupIntent.payment_method as string,
        invoice_settings: {
          default_payment_method: setupIntent.payment_method as string,
        },
      });
      customerId = customer.id;
    }

    // Set default payment method
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: setupIntent.payment_method as string,
      },
    });

    // Create subscription with trial
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      trial_period_days: 1,
      cancel_at_period_end: true,
      payment_behavior: 'default_incomplete',
      payment_settings: {
        payment_method_types: ['card'],
        save_default_payment_method: 'on_subscription',
      },
      metadata: { claim_code: claimCode },
    });

    // Update database
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    await supabase.from("guest_purchases").update({
      status: "subscription_created",
      paid_at: new Date().toISOString(),
      payer_email: customerEmail.toLowerCase(),
    }).eq("payment_intent_id", setupIntentId);

    return new Response(JSON.stringify({
      success: true,
      subscriptionId: subscription.id,
      claimCode,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

---

## 4. Edge Function: create-subscription-checkout

Fallback: Creates a Stripe Checkout Session for standard card flow.

```typescript
// supabase/functions/create-subscription-checkout/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateClaimCode(): string {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const appUrl = Deno.env.get("APP_URL");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
    if (!appUrl) throw new Error("APP_URL not configured");

    const { guestSessionId, priceId, source } = await req.json();
    if (!guestSessionId) throw new Error("guestSessionId required");
    if (!priceId) throw new Error("priceId required");

    const claimCode = generateClaimCode();
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 1,
        metadata: {
          claim_code: claimCode,
          guest_session_id: guestSessionId,
          source: source || "checkout",
        },
      },
      metadata: {
        claim_code: claimCode,
        guest_session_id: guestSessionId,
      },
      success_url: `${appUrl}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/checkout?canceled=true`,
    });

    // Record in database
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    await supabase.from("guest_purchases").insert({
      payment_intent_id: session.id,
      claim_code: claimCode,
      guest_session_id: guestSessionId,
      status: "checkout_pending",
      amount_cents: 4900,
      currency: "eur",
      source: source || "checkout",
    });

    return new Response(JSON.stringify({ url: session.url, claimCode }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

---

## 5. Offer Modal Component (RiskOfferModal.tsx)

The modal that displays the offer with countdown timer and checkout button.

```typescript
// src/components/RiskOfferModal.tsx

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Shield, Clock, CheckCircle2, Info, Timer, Lock, Loader2, Sparkles } from "lucide-react";

type RiskOfferModalProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  city?: string;
  onCheckout: () => Promise<void> | void;
  loading?: boolean;
  minutes?: number;
  priceNow?: number;
  priceWas?: number;
  ctaText?: { en: string; pt: string };
  offerBadge?: { en: string; pt: string };
  pricingVariant?: 'standard' | 'trial';
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function RiskOfferModal({
  open, onOpenChange, city, onCheckout, loading = false,
  minutes = 5, priceNow = 49, priceWas = 120,
  ctaText, offerBadge, pricingVariant = 'standard',
}: RiskOfferModalProps) {
  const initialSeconds = useMemo(() => minutes * 60, [minutes]);
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    if (!open) return;
    setSecondsLeft(initialSeconds);
  }, [open, initialSeconds]);

  useEffect(() => {
    if (!open || secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [open, secondsLeft]);

  const mm = Math.floor(secondsLeft / 60);
  const ss = secondsLeft % 60;
  const isUrgent = secondsLeft <= 60;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        {/* Urgency timer bar */}
        <div className={cn(
          "px-4 py-2.5 flex items-center justify-between",
          isUrgent ? "bg-gradient-to-r from-red-500 to-orange-500" 
                  : "bg-gradient-to-r from-amber-500 to-orange-500"
        )}>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-white" />
            <span className="text-white text-sm font-medium">
              Discount expires in{" "}
              <span className="font-mono font-bold">{pad2(mm)}:{pad2(ss)}</span>
            </span>
          </div>
        </div>

        <div className="px-5 py-6">
          {/* Icon and headline */}
          <div className="text-center mb-5">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
              <Shield className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-xl font-semibold">Your personalized plan is ready</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Built for {city || "your area"}. Instant access after payment.
            </p>
          </div>

          {/* Pricing */}
          <div className="text-center mb-5">
            {pricingVariant === 'trial' ? (
              <>
                <p className="text-lg font-semibold">Free access for 24 hours</p>
                <p className="text-xs text-muted-foreground mt-1">
                  then €{priceNow}/month. Cancel anytime.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                One-time <span className="line-through">€{priceWas}</span>{" "}
                <span className="text-2xl font-bold text-foreground">€{priceNow}</span>
              </p>
            )}
          </div>

          {/* CTA Button */}
          <Button
            onClick={onCheckout}
            disabled={loading || secondsLeft === 0}
            size="lg"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Preparing payment...
              </>
            ) : (
              ctaText?.en || 'START NOW'
            )}
          </Button>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-3">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>Secure payment</span>
            <span>•</span>
            <span>Instant access</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 6. Database Schema

```sql
CREATE TABLE guest_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_intent_id TEXT NOT NULL,
  claim_code TEXT NOT NULL,
  guest_session_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'created',
  amount_cents INTEGER NOT NULL DEFAULT 4900,
  currency TEXT NOT NULL DEFAULT 'eur',
  source TEXT NOT NULL DEFAULT 'checkout',
  payer_email TEXT,
  user_id UUID,
  paid_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT status_check CHECK (status IN (
    'created', 'paid', 'claimed', 'checkout_pending', 
    'setup_pending', 'setup_succeeded', 'subscription_created'
  ))
);

-- Enable RLS but keep service-role only
ALTER TABLE guest_purchases ENABLE ROW LEVEL SECURITY;
```

---

## 7. Required Environment Variables

### Frontend (.env)
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
```

### Edge Functions (Supabase Secrets)
```
STRIPE_SECRET_KEY=sk_live_xxx
APP_URL=https://your-app.com
SUPABASE_URL=auto-provided
SUPABASE_SERVICE_ROLE_KEY=auto-provided
```

---

## 8. Apple Pay Domain Verification

1. Download the domain verification file from Stripe Dashboard
2. Place it at: `public/.well-known/apple-developer-merchantid-domain-association`
3. Register your domain in Stripe Dashboard → Settings → Payment methods → Apple Pay

---

## 9. NPM Dependencies

```json
{
  "@stripe/stripe-js": "^8.6.1"
}
```

---

## Key Points

1. **Express Pay (Apple/Google Pay)** uses SetupIntent + Subscription creation flow
2. **Standard Checkout** uses Stripe Checkout Sessions as fallback
3. **PaymentRequest.show()** MUST be called synchronously from user gesture (no awaits before)
4. **Guest session ID** tracks anonymous users across pages
5. **Claim code** allows users to claim their purchase after creating an account
