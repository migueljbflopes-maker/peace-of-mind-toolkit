-- ============================================
-- 1. CREATE user_devices TABLE
-- ============================================
CREATE TABLE public.user_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  device_id text NOT NULL,
  device_name text,
  platform text,
  last_seen_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (user_id, device_id)
);

ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "devices_select_own" ON public.user_devices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "devices_insert_own" ON public.user_devices
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "devices_update_own" ON public.user_devices
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "devices_delete_own" ON public.user_devices
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 2. CREATE sync_cursors TABLE
-- ============================================
CREATE TABLE public.sync_cursors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  device_id text NOT NULL,
  table_name text NOT NULL,
  last_synced_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE (user_id, device_id, table_name)
);

ALTER TABLE public.sync_cursors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cursors_select_own" ON public.sync_cursors
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "cursors_insert_own" ON public.sync_cursors
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cursors_update_own" ON public.sync_cursors
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cursors_delete_own" ON public.sync_cursors
  FOR DELETE USING (auth.uid() = user_id);

-- Add updated_at trigger for sync_cursors
CREATE TRIGGER update_sync_cursors_updated_at
  BEFORE UPDATE ON public.sync_cursors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 3. ADD MISSING DELETE POLICIES TO USER-SCOPED TABLES
-- ============================================

-- user_profiles: add DELETE
CREATE POLICY "profiles_delete_own" ON public.user_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- risk_assessments: add DELETE
CREATE POLICY "risk_delete_own" ON public.risk_assessments
  FOR DELETE USING (auth.uid() = user_id);

-- supplies_plans: add DELETE
CREATE POLICY "supplies_delete_own" ON public.supplies_plans
  FOR DELETE USING (auth.uid() = user_id);

-- plan_items: add DELETE
CREATE POLICY "plans_delete_own" ON public.plan_items
  FOR DELETE USING (auth.uid() = user_id);

-- alert_preferences: add DELETE
CREATE POLICY "alert_prefs_delete_own" ON public.alert_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- exports: add DELETE and UPDATE
CREATE POLICY "exports_delete_own" ON public.exports
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "exports_update_own" ON public.exports
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- onboarding_state: add DELETE
CREATE POLICY "onboarding_delete_own" ON public.onboarding_state
  FOR DELETE USING (auth.uid() = user_id);

-- ai_jobs: add DELETE
CREATE POLICY "ai_jobs_delete_own" ON public.ai_jobs
  FOR DELETE USING (auth.uid() = user_id);

-- vault_items: add DELETE
CREATE POLICY "vault_delete_own" ON public.vault_items
  FOR DELETE USING (auth.uid() = user_id);

-- backups: add UPDATE and DELETE
CREATE POLICY "backups_update_own" ON public.backups
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "backups_delete_own" ON public.backups
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 4. PREMIUM GATING HELPER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION public.is_premium(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.premium_entitlements
    WHERE user_id = _user_id
      AND is_premium = true
  )
$$;

-- ============================================
-- 5. ADD PREMIUM GATING TO vault_items
-- ============================================
DROP POLICY IF EXISTS "vault read own" ON public.vault_items;
DROP POLICY IF EXISTS "vault update own" ON public.vault_items;
DROP POLICY IF EXISTS "vault upsert own" ON public.vault_items;
DROP POLICY IF EXISTS "vault_delete_own" ON public.vault_items;

CREATE POLICY "vault_select_premium" ON public.vault_items
  FOR SELECT USING (auth.uid() = user_id AND public.is_premium(auth.uid()));

CREATE POLICY "vault_insert_premium" ON public.vault_items
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.is_premium(auth.uid()));

CREATE POLICY "vault_update_premium" ON public.vault_items
  FOR UPDATE USING (auth.uid() = user_id AND public.is_premium(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.is_premium(auth.uid()));

CREATE POLICY "vault_delete_premium" ON public.vault_items
  FOR DELETE USING (auth.uid() = user_id AND public.is_premium(auth.uid()));

-- ============================================
-- 6. ADD PREMIUM GATING TO backups
-- ============================================
DROP POLICY IF EXISTS "backups read own" ON public.backups;
DROP POLICY IF EXISTS "backups write own" ON public.backups;
DROP POLICY IF EXISTS "backups_update_own" ON public.backups;
DROP POLICY IF EXISTS "backups_delete_own" ON public.backups;

CREATE POLICY "backups_select_premium" ON public.backups
  FOR SELECT USING (auth.uid() = user_id AND public.is_premium(auth.uid()));

CREATE POLICY "backups_insert_premium" ON public.backups
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.is_premium(auth.uid()));

CREATE POLICY "backups_update_premium" ON public.backups
  FOR UPDATE USING (auth.uid() = user_id AND public.is_premium(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.is_premium(auth.uid()));

CREATE POLICY "backups_delete_premium" ON public.backups
  FOR DELETE USING (auth.uid() = user_id AND public.is_premium(auth.uid()));

-- ============================================
-- 7. ADD PREMIUM GATING TO plan_items (Plans A&B)
-- ============================================
DROP POLICY IF EXISTS "plans read own" ON public.plan_items;
DROP POLICY IF EXISTS "plans update own" ON public.plan_items;
DROP POLICY IF EXISTS "plans upsert own" ON public.plan_items;
DROP POLICY IF EXISTS "plans_delete_own" ON public.plan_items;

CREATE POLICY "plans_select_premium" ON public.plan_items
  FOR SELECT USING (auth.uid() = user_id AND public.is_premium(auth.uid()));

CREATE POLICY "plans_insert_premium" ON public.plan_items
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.is_premium(auth.uid()));

CREATE POLICY "plans_update_premium" ON public.plan_items
  FOR UPDATE USING (auth.uid() = user_id AND public.is_premium(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.is_premium(auth.uid()));

CREATE POLICY "plans_delete_premium" ON public.plan_items
  FOR DELETE USING (auth.uid() = user_id AND public.is_premium(auth.uid()));

-- ============================================
-- 8. ADD PREMIUM GATING TO exports
-- ============================================
DROP POLICY IF EXISTS "exports read own" ON public.exports;
DROP POLICY IF EXISTS "exports write own" ON public.exports;
DROP POLICY IF EXISTS "exports_delete_own" ON public.exports;
DROP POLICY IF EXISTS "exports_update_own" ON public.exports;

CREATE POLICY "exports_select_premium" ON public.exports
  FOR SELECT USING (auth.uid() = user_id AND public.is_premium(auth.uid()));

CREATE POLICY "exports_insert_premium" ON public.exports
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.is_premium(auth.uid()));

CREATE POLICY "exports_update_premium" ON public.exports
  FOR UPDATE USING (auth.uid() = user_id AND public.is_premium(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.is_premium(auth.uid()));

CREATE POLICY "exports_delete_premium" ON public.exports
  FOR DELETE USING (auth.uid() = user_id AND public.is_premium(auth.uid()));