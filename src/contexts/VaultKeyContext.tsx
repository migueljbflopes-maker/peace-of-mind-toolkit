/**
 * VaultKeyContext
 *
 * Holds the unlocked Master Key (CryptoKey) in memory for the duration of the
 * authenticated session. Coordinates first-time setup (creating + wrapping a
 * fresh Master Key), unlock (deriving the KEK from the Master Password and
 * unwrapping the stored key), and recovery (using a 24-word BIP-39 phrase).
 *
 * SECURITY:
 *  - Master Key is a non-extractable CryptoKey, only present in memory.
 *  - Master Password & Recovery Phrase never persist anywhere.
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
  generateRecoveryPhrase,
  wrapMasterKeyForRecovery,
  unwrapMasterKeyWithRecovery,
  rewrapMasterKey,
  normaliseRecoveryPhrase,
  type EncryptedBlob,
  type WrappedMasterKey,
} from '@/utils/crypto';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type VaultKeyStatus =
  | 'loading'         // checking server for existing wrapped key
  | 'no-user'         // auth resolved but no user → caller should redirect to login
  | 'needs-setup'     // no key on server → first-time user
  | 'needs-unlock'    // key exists on server → ask password
  | 'unlocked'        // master key in memory, ready to encrypt/decrypt
  | 'error';

export interface SetupResult {
  ok: true;
  /** 24-word BIP-39 recovery phrase. ONLY returned here, never stored. */
  recoveryPhrase: string;
}

export interface SetupError {
  ok: false;
  error: string;
}

interface VaultKeyContextValue {
  status: VaultKeyStatus;
  errorMessage: string | null;
  /** True once the Master Key is in memory and ready. */
  isUnlocked: boolean;
  /**
   * First-time setup. Generates a fresh Master Key, wraps it with both the
   * password (KEK) AND a freshly-generated recovery phrase, then persists both.
   * Returns the recovery phrase so the UI can force a backup step.
   */
  setup: (masterPassword: string) => Promise<SetupResult | SetupError>;
  /** Returning user: decrypt the wrapped Master Key with this password. */
  unlock: (masterPassword: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  /**
   * Forgot-password flow: unwrap the Master Key with the recovery phrase,
   * then re-wrap with the new password and update the row. The recovery
   * wrap is left in place (still works with the same phrase).
   */
  recoverWithPhrase: (
    recoveryPhrase: string,
    newMasterPassword: string
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  /** Wipe the in-memory Master Key (does not delete server-side key). */
  lock: () => void;
  /** Encrypt arbitrary JSON-serialisable data with the unlocked Master Key. */
  encrypt: (data: unknown) => Promise<EncryptedBlob>;
  /** Decrypt an EncryptedBlob with the unlocked Master Key. */
  decrypt: <T = unknown>(blob: EncryptedBlob) => Promise<T>;
}

const VaultKeyContext = createContext<VaultKeyContextValue | undefined>(undefined);

// Internal shape of the row in user_vault_keys (with recovery columns).
interface FullWrappedRow extends WrappedMasterKey {
  recovery_encrypted_master_key: string | null;
  recovery_iv: string | null;
  recovery_salt: string | null;
}

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

  const fetchWrappedRow = useCallback(
    async (userId: string): Promise<FullWrappedRow | null> => {
      const { data, error } = await supabase
        .from('user_vault_keys')
        .select(
          'encrypted_master_key, iv, salt, kdf_iterations, version, recovery_encrypted_master_key, recovery_iv, recovery_salt'
        )
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
        recovery_encrypted_master_key: data.recovery_encrypted_master_key,
        recovery_iv: data.recovery_iv,
        recovery_salt: data.recovery_salt,
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
      masterKeyRef.current = null;
      setStatus('loading');
      setErrorMessage(null);
      return;
    }

    let cancelled = false;
    setStatus('loading');
    setErrorMessage(null);
    masterKeyRef.current = null;

    fetchWrappedRow(user.id)
      .then((row) => {
        if (cancelled) return;
        setStatus(row ? 'needs-unlock' : 'needs-setup');
      })
      .catch((e) => {
        if (cancelled) return;
        setErrorMessage(e instanceof Error ? e.message : 'Unknown error');
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, fetchWrappedRow]);

  // ── Setup (first time) ─────────────────────────────────────────────────────

  const setup = useCallback(
    async (masterPassword: string): Promise<SetupResult | SetupError> => {
      if (!user) return { ok: false, error: 'Not authenticated' };
      try {
        // 1. Create + wrap with password
        const { wrapped, masterKey } = await createWrappedMasterKey(masterPassword);

        // 2. Generate a fresh recovery phrase and wrap the SAME master key with it.
        //    This way the user can recover using either the password OR the phrase,
        //    and any data encrypted with the master key remains decryptable in both
        //    paths.
        const recoveryPhrase = generateRecoveryPhrase();
        const recovery = await wrapMasterKeyForRecovery(masterKey, recoveryPhrase);

        const { error } = await supabase.from('user_vault_keys').insert({
          user_id: user.id,
          encrypted_master_key: wrapped.encrypted_master_key,
          iv: wrapped.iv,
          salt: wrapped.salt,
          kdf_iterations: wrapped.kdf_iterations,
          version: wrapped.version,
          recovery_encrypted_master_key: recovery.encrypted,
          recovery_iv: recovery.iv,
          recovery_salt: recovery.salt,
        });

        if (error) {
          return { ok: false, error: error.message };
        }

        masterKeyRef.current = masterKey;
        setStatus('unlocked');
        return { ok: true, recoveryPhrase };
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
        const wrapped = await fetchWrappedRow(user.id);
        if (!wrapped) {
          setStatus('needs-setup');
          return { ok: false, error: 'No key on server' };
        }

        const masterKey = await openWrappedMasterKey(wrapped, masterPassword);
        masterKeyRef.current = masterKey;
        setStatus('unlocked');
        return { ok: true };
      } catch {
        return { ok: false, error: 'Incorrect master password' };
      }
    },
    [user, fetchWrappedRow]
  );

  // ── Recovery (forgot password) ─────────────────────────────────────────────

  const recoverWithPhrase = useCallback(
    async (
      recoveryPhrase: string,
      newMasterPassword: string
    ): Promise<{ ok: true } | { ok: false; error: string }> => {
      if (!user) return { ok: false, error: 'Not authenticated' };

      // Validate phrase locally before any network call.
      let normalised: string;
      try {
        normalised = normaliseRecoveryPhrase(recoveryPhrase);
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : 'Invalid recovery phrase',
        };
      }

      try {
        const row = await fetchWrappedRow(user.id);
        if (
          !row ||
          !row.recovery_encrypted_master_key ||
          !row.recovery_iv ||
          !row.recovery_salt
        ) {
          return {
            ok: false,
            error: 'No recovery key on file. Recovery is unavailable for this account.',
          };
        }

        // Unwrap with the recovery phrase
        const masterKey = await unwrapMasterKeyWithRecovery(
          {
            encrypted: row.recovery_encrypted_master_key,
            iv: row.recovery_iv,
            salt: row.recovery_salt,
          },
          normalised
        );

        // Re-wrap with the brand new password (same Master Key — data stays
        // decryptable). Recovery wrap is intentionally left untouched.
        const newWrapped = await rewrapMasterKey(masterKey, newMasterPassword);

        const { error } = await supabase
          .from('user_vault_keys')
          .update({
            encrypted_master_key: newWrapped.encrypted_master_key,
            iv: newWrapped.iv,
            salt: newWrapped.salt,
            kdf_iterations: newWrapped.kdf_iterations,
            version: newWrapped.version,
          })
          .eq('user_id', user.id);

        if (error) {
          return { ok: false, error: error.message };
        }

        masterKeyRef.current = masterKey;
        setStatus('unlocked');
        return { ok: true };
      } catch {
        return { ok: false, error: 'Incorrect recovery phrase' };
      }
    },
    [user, fetchWrappedRow]
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
      recoverWithPhrase,
      lock,
      encrypt,
      decrypt,
    }),
    [status, errorMessage, setup, unlock, recoverWithPhrase, lock, encrypt, decrypt]
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
