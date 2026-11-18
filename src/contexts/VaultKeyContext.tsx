/**
 * VaultKeyContext
 *
 * Holds the unlocked Master Key (CryptoKey) in memory for the duration of the
 * authenticated session. Coordinates first-time setup (creating + wrapping a
 * fresh Master Key), unlock (deriving the KEK from the Master Password and
 * unwrapping the stored key), and recovery (using a 24-word BIP-39 phrase).
 *
 * RECOVERY KIT RULE (backlog F-10):
 *  Every operation that produces new recovery words has two halves. `begin…`
 *  works out the new wraps in memory and hands the words to the screen;
 *  nothing is written. `commit()` writes, and the screen calls it only after
 *  the user has saved the words and confirmed it. So the server never holds a
 *  recovery wrap for words the user was not given: leaving, reloading or
 *  losing the connection during the kit step leaves the account exactly as it
 *  was before the step began.
 *
 * SECURITY:
 *  - Master Key is only present in memory.
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
  deriveKEK,
  unwrapKey,
  base64ToBytes,
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

export type VaultKeyErrorCode =
  | 'not-authenticated'   // no user, or the user changed since the step began
  | 'not-saved'           // the server did not confirm the write
  | 'already-set-up'      // another device created a master password meanwhile
  | 'wrong-password'
  | 'invalid-phrase'      // not 12+ words from the wordlist
  | 'wrong-phrase'        // well-formed words that do not open this account
  | 'no-recovery-kit'     // the account has no recovery wrap on the server
  | 'failed';

export interface VaultKeyFailure {
  ok: false;
  code: VaultKeyErrorCode;
  /** English description, for logs and as a fallback. Screens translate `code`. */
  error: string;
}

/**
 * New recovery words that exist only in memory, and the write that makes
 * them the account's Recovery Kit. Dropping this object (the screen that
 * holds it unmounts) discards the words and the write with them.
 */
export interface PendingRecoveryKit {
  ok: true;
  /** 24 words. Returned here only; never stored, never sent. */
  recoveryPhrase: string;
  /**
   * Writes the change to the server. Call it only once the user has saved
   * the words. Safe to call again after a failure.
   */
  commit: () => Promise<{ ok: true } | VaultKeyFailure>;
}

interface VaultKeyContextValue {
  status: VaultKeyStatus;
  errorMessage: string | null;
  /** True once the Master Key is in memory and ready. */
  isUnlocked: boolean;
  /**
   * First-time setup, first half. Generates a fresh Master Key and wraps it
   * with the password and with a fresh recovery phrase, all in memory.
   * `commit()` inserts the row and unlocks; until then the status stays
   * 'needs-setup' and the server holds nothing.
   */
  beginSetup: (masterPassword: string) => Promise<PendingRecoveryKit | VaultKeyFailure>;
  /** Returning user: decrypt the wrapped Master Key with this password. */
  unlock: (masterPassword: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  /**
   * Forgot-password flow, first half. Unwraps the Master Key with the
   * recovery phrase (so a wrong phrase is refused here), re-wraps it with the
   * new password and with a NEW recovery phrase, in memory. `commit()` writes
   * both wraps in one update and unlocks: the words just used stop working at
   * the same moment the new password starts working.
   */
  beginRecovery: (
    recoveryPhrase: string,
    newMasterPassword: string
  ) => Promise<PendingRecoveryKit | VaultKeyFailure>;
  /**
   * New Recovery Kit for an account that already has a master password.
   * Asks for the master password again: the key held in memory after an
   * unlock cannot be exported, and replacing the kit should take more than
   * an unlocked screen. `commit()` replaces the recovery columns; the old
   * words stop working.
   */
  beginRecoveryKitRenewal: (masterPassword: string) => Promise<PendingRecoveryKit | VaultKeyFailure>;
  /** Wipe the in-memory Master Key (does not delete server-side key). */
  lock: () => void;
  /** Encrypt arbitrary JSON-serialisable data with the unlocked Master Key. */
  encrypt: (data: unknown) => Promise<EncryptedBlob>;
  /** Decrypt an EncryptedBlob with the unlocked Master Key. */
  decrypt: <T = unknown>(blob: EncryptedBlob) => Promise<T>;
}

const fail = (code: VaultKeyErrorCode, error: string): VaultKeyFailure => ({ ok: false, code, error });

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

  // Who is signed in right now, for writes that were prepared earlier.
  const currentUserIdRef = useRef<string | null>(null);
  currentUserIdRef.current = user?.id ?? null;

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

  const userId = user?.id ?? null;

  useEffect(() => {
    if (authLoading) {
      setStatus('loading');
      return;
    }
    if (!userId) {
      masterKeyRef.current = null;
      setStatus('no-user');
      setErrorMessage(null);
      return;
    }

    let cancelled = false;
    setStatus('loading');
    setErrorMessage(null);
    masterKeyRef.current = null;

    fetchWrappedRow(userId)
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
  }, [userId, authLoading, fetchWrappedRow]);

  // ── Setup (first time) ─────────────────────────────────────────────────────

  const beginSetup = useCallback(
    async (masterPassword: string): Promise<PendingRecoveryKit | VaultKeyFailure> => {
      if (!userId) return fail('not-authenticated', 'Not authenticated');
      try {
        // 1. Create + wrap with password
        const { wrapped, masterKey } = await createWrappedMasterKey(masterPassword);

        // 2. Generate a fresh recovery phrase and wrap the SAME master key with it.
        //    This way the user can recover using either the password OR the phrase,
        //    and any data encrypted with the master key remains decryptable in both
        //    paths.
        const recoveryPhrase = generateRecoveryPhrase();
        const recovery = await wrapMasterKeyForRecovery(masterKey, recoveryPhrase);

        // 3. Nothing is stored yet. The row is inserted when the user confirms
        //    the kit, so a key never exists on the server without its words
        //    having been handed over.
        const commit = async (): Promise<{ ok: true } | VaultKeyFailure> => {
          if (currentUserIdRef.current !== userId) {
            return fail('not-authenticated', 'Not authenticated');
          }
          const opened = () => {
            masterKeyRef.current = masterKey;
            setStatus('unlocked');
            return { ok: true as const };
          };
          try {
            const { error } = await supabase.from('user_vault_keys').insert({
              user_id: userId,
              encrypted_master_key: wrapped.encrypted_master_key,
              iv: wrapped.iv,
              salt: wrapped.salt,
              kdf_iterations: wrapped.kdf_iterations,
              version: wrapped.version,
              recovery_encrypted_master_key: recovery.encrypted,
              recovery_iv: recovery.iv,
              recovery_salt: recovery.salt,
            });
            if (!error) return opened();

            if (error.code === '23505') {
              // A row already exists. Either an earlier attempt of this same
              // commit reached the server and its answer was lost, or another
              // device created a master password in the meantime.
              const existing = await fetchWrappedRow(userId);
              if (
                existing &&
                existing.encrypted_master_key === wrapped.encrypted_master_key &&
                existing.recovery_encrypted_master_key === recovery.encrypted
              ) {
                return opened();
              }
              setStatus('needs-unlock');
              return fail('already-set-up', 'A master password already exists for this account');
            }
            return fail('not-saved', error.message);
          } catch (e) {
            return fail('not-saved', e instanceof Error ? e.message : 'Could not save');
          }
        };

        return { ok: true, recoveryPhrase, commit };
      } catch (e) {
        return fail('failed', e instanceof Error ? e.message : 'Setup failed');
      }
    },
    [userId, fetchWrappedRow]
  );

  // ── Unlock (returning user) ────────────────────────────────────────────────

  const unlock = useCallback(
    async (
      masterPassword: string
    ): Promise<{ ok: true } | { ok: false; error: string }> => {
      if (!userId) return { ok: false, error: 'Not authenticated' };
      try {
        const wrapped = await fetchWrappedRow(userId);
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
    [userId, fetchWrappedRow]
  );

  // ── Recovery (forgot password) ─────────────────────────────────────────────

  const beginRecovery = useCallback(
    async (
      recoveryPhrase: string,
      newMasterPassword: string
    ): Promise<PendingRecoveryKit | VaultKeyFailure> => {
      if (!userId) return fail('not-authenticated', 'Not authenticated');

      // Validate phrase locally before any network call.
      let normalised: string;
      try {
        normalised = normaliseRecoveryPhrase(recoveryPhrase);
      } catch (e) {
        return fail('invalid-phrase', e instanceof Error ? e.message : 'Invalid recovery phrase');
      }

      let row: FullWrappedRow | null;
      try {
        row = await fetchWrappedRow(userId);
      } catch (e) {
        return fail('failed', e instanceof Error ? e.message : 'Could not read the key');
      }
      if (
        !row ||
        !row.recovery_encrypted_master_key ||
        !row.recovery_iv ||
        !row.recovery_salt
      ) {
        return fail('no-recovery-kit', 'No recovery key on file. Recovery is unavailable for this account.');
      }

      let masterKey: CryptoKey;
      try {
        // Unwrap with the recovery phrase
        masterKey = await unwrapMasterKeyWithRecovery(
          {
            encrypted: row.recovery_encrypted_master_key,
            iv: row.recovery_iv,
            salt: row.recovery_salt,
          },
          normalised
        );
      } catch {
        return fail('wrong-phrase', 'Incorrect recovery phrase');
      }

      try {
        // Re-wrap with the brand new password (same Master Key — data stays
        // decryptable), and with brand new recovery words: the ones just
        // typed have left their safe place and are retired.
        const newWrapped = await rewrapMasterKey(masterKey, newMasterPassword);
        const newPhrase = generateRecoveryPhrase();
        const newRecovery = await wrapMasterKeyForRecovery(masterKey, newPhrase);

        const commit = async (): Promise<{ ok: true } | VaultKeyFailure> => {
          if (currentUserIdRef.current !== userId) {
            return fail('not-authenticated', 'Not authenticated');
          }
          try {
            // One update: the new password and the new words become valid
            // together, or neither does.
            const { data, error } = await supabase
              .from('user_vault_keys')
              .update({
                encrypted_master_key: newWrapped.encrypted_master_key,
                iv: newWrapped.iv,
                salt: newWrapped.salt,
                kdf_iterations: newWrapped.kdf_iterations,
                version: newWrapped.version,
                recovery_encrypted_master_key: newRecovery.encrypted,
                recovery_iv: newRecovery.iv,
                recovery_salt: newRecovery.salt,
              })
              .eq('user_id', userId)
              .select('user_id');

            if (error) return fail('not-saved', error.message);
            if (!data || data.length !== 1) return fail('not-saved', 'No key row was updated');

            masterKeyRef.current = masterKey;
            setStatus('unlocked');
            return { ok: true };
          } catch (e) {
            return fail('not-saved', e instanceof Error ? e.message : 'Could not save');
          }
        };

        return { ok: true, recoveryPhrase: newPhrase, commit };
      } catch (e) {
        return fail('failed', e instanceof Error ? e.message : 'Recovery failed');
      }
    },
    [userId, fetchWrappedRow]
  );

  // ── New Recovery Kit (the account already has a master password) ───────────

  const beginRecoveryKitRenewal = useCallback(
    async (masterPassword: string): Promise<PendingRecoveryKit | VaultKeyFailure> => {
      if (!userId) return fail('not-authenticated', 'Not authenticated');

      let row: FullWrappedRow | null;
      try {
        row = await fetchWrappedRow(userId);
      } catch (e) {
        return fail('failed', e instanceof Error ? e.message : 'Could not read the key');
      }
      if (!row) return fail('failed', 'No key on server');

      // The key in memory after an unlock is not extractable, so it cannot be
      // wrapped again. Open the stored wrap with the password into a copy
      // that can; the copy lives only inside this pending kit.
      let masterKey: CryptoKey;
      try {
        const kek = await deriveKEK(masterPassword, base64ToBytes(row.salt), row.kdf_iterations);
        masterKey = await unwrapKey(
          base64ToBytes(row.encrypted_master_key),
          base64ToBytes(row.iv),
          kek,
          true
        );
      } catch {
        return fail('wrong-password', 'Incorrect master password');
      }

      try {
        const recoveryPhrase = generateRecoveryPhrase();
        const recovery = await wrapMasterKeyForRecovery(masterKey, recoveryPhrase);

        const commit = async (): Promise<{ ok: true } | VaultKeyFailure> => {
          if (currentUserIdRef.current !== userId) {
            return fail('not-authenticated', 'Not authenticated');
          }
          try {
            const { data, error } = await supabase
              .from('user_vault_keys')
              .update({
                recovery_encrypted_master_key: recovery.encrypted,
                recovery_iv: recovery.iv,
                recovery_salt: recovery.salt,
              })
              .eq('user_id', userId)
              .select('user_id');

            if (error) return fail('not-saved', error.message);
            if (!data || data.length !== 1) return fail('not-saved', 'No key row was updated');
            return { ok: true };
          } catch (e) {
            return fail('not-saved', e instanceof Error ? e.message : 'Could not save');
          }
        };

        return { ok: true, recoveryPhrase, commit };
      } catch (e) {
        return fail('failed', e instanceof Error ? e.message : 'Could not create a new kit');
      }
    },
    [userId, fetchWrappedRow]
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
      beginSetup,
      unlock,
      beginRecovery,
      beginRecoveryKitRenewal,
      lock,
      encrypt,
      decrypt,
    }),
    [status, errorMessage, beginSetup, unlock, beginRecovery, beginRecoveryKitRenewal, lock, encrypt, decrypt]
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
