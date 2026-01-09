-- Create guest_purchases table for tracking guest payments before claim
CREATE TABLE public.guest_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_intent_id TEXT UNIQUE NOT NULL,
  claim_code TEXT UNIQUE NOT NULL,
  guest_session_id TEXT NOT NULL,
  payer_email TEXT NULL,
  status TEXT NOT NULL DEFAULT 'created',
  amount_cents INTEGER NOT NULL DEFAULT 4900,
  currency TEXT NOT NULL DEFAULT 'eur',
  source TEXT NOT NULL DEFAULT 'riskfunnel',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  user_id UUID NULL REFERENCES auth.users(id)
);

-- Indexes for performance
CREATE INDEX idx_guest_purchases_claim_code ON public.guest_purchases(claim_code);
CREATE INDEX idx_guest_purchases_status ON public.guest_purchases(status);

-- Enable RLS but deny all public access (service role only via edge functions)
ALTER TABLE public.guest_purchases ENABLE ROW LEVEL SECURITY;

-- Add check constraint for status values
ALTER TABLE public.guest_purchases 
  ADD CONSTRAINT guest_purchases_status_check 
  CHECK (status IN ('created', 'paid', 'claimed'));