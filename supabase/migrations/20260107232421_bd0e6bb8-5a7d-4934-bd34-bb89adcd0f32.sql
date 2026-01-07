-- Ensure RLS is enabled on premium_entitlements
ALTER TABLE public.premium_entitlements ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to start clean
DROP POLICY IF EXISTS "entitlements read own" ON public.premium_entitlements;
DROP POLICY IF EXISTS "entitlements_select_own" ON public.premium_entitlements;
DROP POLICY IF EXISTS "entitlements_insert" ON public.premium_entitlements;
DROP POLICY IF EXISTS "entitlements_update" ON public.premium_entitlements;
DROP POLICY IF EXISTS "entitlements_delete" ON public.premium_entitlements;

-- Create ONLY a SELECT policy - users can read their own entitlement
CREATE POLICY "entitlements_select_own" ON public.premium_entitlements
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- NO INSERT/UPDATE/DELETE policies for authenticated users
-- Only service_role (backend/edge functions) can modify this table
-- This is enforced by RLS being enabled with no write policies