-- Fix the premium_entitlements RLS policy - it was RESTRICTIVE instead of PERMISSIVE
-- Drop the restrictive policy
DROP POLICY IF EXISTS "entitlements_select_own" ON public.premium_entitlements;

-- Create a proper PERMISSIVE policy (default behavior)
CREATE POLICY "entitlements_select_own" 
ON public.premium_entitlements 
FOR SELECT 
USING (auth.uid() = user_id);