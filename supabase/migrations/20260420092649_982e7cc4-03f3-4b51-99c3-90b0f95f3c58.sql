-- Zero-Knowledge Master Key storage
-- Stores wrapped (encrypted) master keys. Server never sees plaintext.
CREATE TABLE IF NOT EXISTS public.user_vault_keys (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_master_key TEXT NOT NULL,
  iv TEXT NOT NULL,
  salt TEXT NOT NULL,
  kdf_iterations INTEGER NOT NULL DEFAULT 250000,
  recovery_encrypted_master_key TEXT,
  recovery_iv TEXT,
  recovery_salt TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_vault_keys ENABLE ROW LEVEL SECURITY;

-- Policies: only owner can read/write own key
CREATE POLICY "vault_keys_select_own"
ON public.user_vault_keys
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "vault_keys_insert_own"
ON public.user_vault_keys
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "vault_keys_update_own"
ON public.user_vault_keys
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Intentionally NO DELETE policy: prevent accidental key loss.
-- Account deletion cascades via auth.users FK.

-- Auto-update updated_at on changes
CREATE TRIGGER update_user_vault_keys_updated_at
BEFORE UPDATE ON public.user_vault_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();