-- ============================================
-- 1. CREATE stripe_events TABLE (idempotency)
-- ============================================
CREATE TABLE public.stripe_events (
  event_id text PRIMARY KEY,
  processed_at timestamp with time zone DEFAULT now()
);

-- Enable RLS but no policies = only service_role can access
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. ADD MISSING COLUMNS TO premium_entitlements
-- ============================================
ALTER TABLE public.premium_entitlements 
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text,
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
ADD COLUMN IF NOT EXISTS granted_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS revoked_at timestamp with time zone;