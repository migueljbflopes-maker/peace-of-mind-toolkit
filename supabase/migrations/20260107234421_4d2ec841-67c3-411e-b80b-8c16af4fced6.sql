-- Ensure RLS is enabled
ALTER TABLE public.stripe_customer_map ENABLE ROW LEVEL SECURITY;

-- Add explicit deny-all policies for public/authenticated roles
CREATE POLICY "deny_select" ON public.stripe_customer_map
  FOR SELECT
  TO public, authenticated
  USING (false);

CREATE POLICY "deny_insert" ON public.stripe_customer_map
  FOR INSERT
  TO public, authenticated
  WITH CHECK (false);

CREATE POLICY "deny_update" ON public.stripe_customer_map
  FOR UPDATE
  TO public, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "deny_delete" ON public.stripe_customer_map
  FOR DELETE
  TO public, authenticated
  USING (false);