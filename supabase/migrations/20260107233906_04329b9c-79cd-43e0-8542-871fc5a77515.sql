-- ============================================
-- A) LOCK DOWN premium_entitlements
-- ============================================

-- Drop existing policies and recreate with only SELECT
DROP POLICY IF EXISTS "entitlements_select_own" ON public.premium_entitlements;
DROP POLICY IF EXISTS "entitlements read own" ON public.premium_entitlements;

-- Only SELECT allowed - users read their own row only
CREATE POLICY "entitlements_select_own" ON public.premium_entitlements
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Remove Stripe ID columns from premium_entitlements (move to private table)
ALTER TABLE public.premium_entitlements 
DROP COLUMN IF EXISTS stripe_customer_id,
DROP COLUMN IF EXISTS stripe_checkout_session_id,
DROP COLUMN IF EXISTS stripe_payment_intent_id;

-- ============================================
-- B) CREATE PRIVATE TABLE FOR STRIPE IDs
-- ============================================

CREATE TABLE public.stripe_customer_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  stripe_customer_id text,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS with NO policies = service role only
ALTER TABLE public.stripe_customer_map ENABLE ROW LEVEL SECURITY;

-- Add updated_at trigger
CREATE TRIGGER update_stripe_customer_map_updated_at
  BEFORE UPDATE ON public.stripe_customer_map
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();