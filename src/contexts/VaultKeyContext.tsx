/**
 * VaultKeyContext
 *
 * Holds the unlocked Master Key (CryptoKey) in memory for the duration of the
 * authenticated session. Coordinates first-time setup (creating + wrapping a
 * fresh Master Key) and unlock (deriving the KEK from the Master Password and
 * unwrapping the stored key).
 *
 * SECURITY:
 *  - Master Key is a non-extractable CryptoKey, only present in memory.
 *  - Master Password never persists anywhere (state, storage, network).
 *  - On signOut() the secureCleanup wipes IndexedDB; this context resets on
 *    user change so the in-memory key dies with the React tree as well.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  createWrappedMasterKey,
  openWrappedMasterKey,
  encryptData,
  decryptData,
  type EncryptedBlob,
  type WrappedMasterKey,
} from '@/utils/crypto';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type VaultKeyStatus =
  | 'loading'         // checking server for existing wrapped key
  | 'needs-setup'     // no key on server → first-time user
  | 'needs-unlock'    // key exists on server → ask password
  | 'unlocked'        // master key in memory, ready to encrypt/decrypt
  | 'error';

interface VaultKeyContextValue {
  status: VaultKeyStatus;
  errorMessage: string | null;
  /** True once the Master Key is in memory and ready. */
  isUnlocked: boolean;
  /** First-time setup: create + wrap a new Master Key with this password. */
  setup: (masterPassword: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  /** Returning user: decrypt the wrapped Master Key with this password. */
  unlock: (masterPassword: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  /** Wipe the in-memory Master Key (does not delete server-side key). */
  lock: () => void;
  /** Encrypt arbitrary JSON-serialisable data with the unlocked Master Key. */
  encrypt: (data: unknown) => Promise<EncryptedBlob>;
  /** Decrypt an EncryptedBlob with the unlocked Master Key. */
  decrypt: <T = unknown>(blob: EncryptedBlob) => Promise<T>;
}

const VaultKeyContext = createContext<VaultKeyContextValue | undefined>(undefined);

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export function VaultKeyProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();

  // Master Key lives in a ref so it never triggers re-renders of subscribers
  // that don't actually use it (only `status` should).
  const masterKeyRef = useRef<CryptoKey | null>(null);

  const [status, setStatus] = useState<VaultKeyStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const fetchWrappedKey = useCallback(
    async (userId: string): Promise<WrappedMasterKey | null> => {
      const { data, error } = await supabase
        .from('user_vault_keys')
        .select('encrypted_master_key, iv, salt, kdf_iterations, version')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('[VaultKey] fetch error:', error);
        throw new Error(error.message);
      }
      if (!data) return null;
      return {
        encrypted_master_key: data.encrypted_master_key,
        iv: data.iv,
        salt: data.salt,
        kdf_iterations: data.kdf_iterations ?? 250_000,
        version: data.version ?? 1,
      };
    },
    []
  );

  // ── Effect: when the user changes, decide whether we need setup or unlock ──

  useEffect(() => {
    if (authLoading) {
      setStatus('loading');
      return;
    }
    if (!user) {
      // Logged out: drop any in-memory key + reset status.
      masterKeyRef.current = null;
      setStatus('loading');
      setErrorMessage(null);
      return;
    }

    let cancelled = false;
    setStatus('loading');
    setErrorMessage(null);
    masterKeyRef.current = null;

    fetchWrappedKey(user.id)
      .then((wrapped) => {
        if (cancelled) return;
        setStatus(wrapped ? 'needs-unlock' : 'needs-setup');
      })
      .catch((e) => {
        if (cancelled) return;
        setErrorMessage(e instanceof Error ? e.message : 'Unknown error');
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, fetchWrappedKey]);

  // ── Setup (first time) ─────────────────────────────────────────────────────

  const setup = useCallback(
    async (
      masterPassword: string
    ): Promise<{ ok: true } | { ok: false; error: string }> => {
      if (!user) return { ok: false, error: 'Not authenticated' };
      try {
        const { wrapped, masterKey } = await createWrappedMasterKey(masterPassword);

        const { error } = await supabase.from('user_vault_keys').insert({
          user_id: user.id,
          encrypted_master_key: wrapped.encrypted_master_key,
          iv: wrapped.iv,
          salt: wrapped.salt,
          kdf_iterations: wrapped.kdf_iterations,
          version: wrapped.version,
        });

        if (error) {
          return { ok: false, error: error.message };
        }

        masterKeyRef.current = masterKey;
        setStatus('unlocked');
        return { ok: true };
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Setup failed';
        return { ok: false, error: msg };
      }
    },
    [user]
  );

  // ── Unlock (returning user) ────────────────────────────────────────────────

  const unlock = useCallback(
    async (
      masterPassword: string
    ): Promise<{ ok: true } | { ok: false; error: string }> => {
      if (!user) return { ok: false, error: 'Not authenticated' };
      try {
        const wrapped = await fetchWrappedKey(user.id);
        if (!wrapped) {
          // Race: server says no key. Bounce to setup.
          setStatus('needs-setup');
          return { ok: false, error: 'No key on server' };
        }

        // openWrappedMasterKey throws on wrong password (AES-GCM auth tag).
        const masterKey = await openWrappedMasterKey(wrapped, masterPassword);
        masterKeyRef.current = masterKey;
        setStatus('unlocked');
        return { ok: true };
      } catch {
        // Don't echo crypto error details; treat as wrong password.
        return { ok: false, error: 'Incorrect master password' };
      }
    },
    [user, fetchWrappedKey]
  );

  // ── Lock (wipe in-memory key) ──────────────────────────────────────────────

  const lock = useCallback(() => {
    masterKeyRef.current = null;
    setStatus('needs-unlock');
  }, []);

  // ── Crypto helpers exposed to consumers ────────────────────────────────────

  const encrypt = useCallback(async (data: unknown): Promise<EncryptedBlob> => {
    const key = masterKeyRef.current;
    if (!key) throw new Error('Vault is locked');
    return encryptData(data, key);
  }, []);

  const decrypt = useCallback(async <T = unknown>(blob: EncryptedBlob): Promise<T> => {
    const key = masterKeyRef.current;
    if (!key) throw new Error('Vault is locked');
    return decryptData<T>(blob, key);
  }, []);

  // ── Memoized value ─────────────────────────────────────────────────────────

  const value = useMemo<VaultKeyContextValue>(
    () => ({
      status,
      errorMessage,
      isUnlocked: status === 'unlocked',
      setup,
      unlock,
      lock,
      encrypt,
      decrypt,
    }),
    [status, errorMessage, setup, unlock, lock, encrypt, decrypt]
  );

  return <VaultKeyContext.Provider value={value}>{children}</VaultKeyContext.Provider>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useVaultKey(): VaultKeyContextValue {
  const ctx = useContext(VaultKeyContext);
  if (!ctx) {
    throw new Error('useVaultKey must be used within VaultKeyProvider');
  }
  return ctx;
}
