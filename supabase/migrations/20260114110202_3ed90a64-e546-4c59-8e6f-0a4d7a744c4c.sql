-- Fix RLS policy: Change from RESTRICTIVE to PERMISSIVE
-- Drop existing restrictive policy
DROP POLICY IF EXISTS "entitlements_select_own" ON premium_entitlements;

-- Create new PERMISSIVE policy (default behavior)
CREATE POLICY "entitlements_select_own" 
ON premium_entitlements 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);