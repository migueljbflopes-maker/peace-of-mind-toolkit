/**
 * Zero-Knowledge Cryptographic Engine
 * 
 * Implements the "Wrapped Master Key" pattern (Bitwarden-style):
 *  - Master Password → KEK (Key Encryption Key) via PBKDF2
 *  - KEK wraps a random 256-bit Master Key (AES-GCM)
 *  - Master Key encrypts all user data (Vault sections, Plans, etc.)
 *  - Server only ever stores wrapped keys + ciphertext blobs
 *  - Multi-device: same Master Password derives same KEK → unwraps the same Master Key
 * 
 * Built exclusively on the WebCrypto API. No third-party dependencies.
 * 
 * SECURITY INVARIANTS
 *  - Master Password never leaves the device
 *  - KEK is derived on-demand, kept in memory only briefly
 *  - Master Key is non-extractable (CryptoKey), held in memory only while session is unlocked
 *  - All randomness via crypto.getRandomValues
 */

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const PBKDF2_ITERATIONS = 250_000;
export const PBKDF2_HASH = 'SHA-256';
export const SALT_LENGTH = 16;   // 128 bits
export const IV_LENGTH = 12;     // 96 bits — AES-GCM standard
export const KEY_LENGTH = 256;   // bits
export const CRYPTO_VERSION = 1;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Encrypted blob with all metadata needed for decryption. */
export interface EncryptedBlob {
  /** Base64-encoded ciphertext (includes AES-GCM auth tag). */
  ciphertext: string;
  /** Base64-encoded IV (12 bytes). */
  iv: string;
  /** Cipher version for forward compatibility. */
  version: number;
}

/** Wrapped master key — what gets stored in `user_vault_keys` table. */
export interface WrappedMasterKey {
  encrypted_master_key: string; // base64
  iv: string;                   // base64
  salt: string;                 // base64 (PBKDF2 salt)
  kdf_iterations: number;
  version: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Base64 helpers
// ─────────────────────────────────────────────────────────────────────────────

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ─────────────────────────────────────────────────────────────────────────────
// Random generation
// ─────────────────────────────────────────────────────────────────────────────

export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

export function generateIv(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

// ─────────────────────────────────────────────────────────────────────────────
// Master Key generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a fresh, cryptographically random 256-bit Master Key.
 * The key is `extractable: true` so we can wrap it with the KEK.
 * Once wrapped, the wrapped key is stored; the in-memory CryptoKey
 * lives only as long as the unlocked session.
 */
export async function generateMasterKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: KEY_LENGTH },
    true, // extractable — required for wrapping
    ['encrypt', 'decrypt']
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// KEK derivation (PBKDF2)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Derive a Key Encryption Key from the user's Master Password.
 * The KEK is used solely to wrap/unwrap the Master Key — never to encrypt data.
 */
export async function deriveKEK(
  masterPassword: string,
  salt: Uint8Array,
  iterations: number = PBKDF2_ITERATIONS
): Promise<CryptoKey> {
  const passwordBytes = new TextEncoder().encode(masterPassword);

  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordBytes as BufferSource,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations,
      hash: PBKDF2_HASH,
    },
    baseKey,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false, // KEK never needs to be extracted
    ['wrapKey', 'unwrapKey']
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Wrap / Unwrap Master Key
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wrap (encrypt) the Master Key with the KEK.
 * Output is safe to store on the server — server cannot decrypt it.
 */
export async function wrapKey(
  masterKey: CryptoKey,
  kek: CryptoKey
): Promise<{ wrapped: Uint8Array; iv: Uint8Array }> {
  const iv = generateIv();
  const wrapped = await crypto.subtle.wrapKey(
    'raw',
    masterKey,
    kek,
    { name: 'AES-GCM', iv: iv as BufferSource }
  );
  return { wrapped: new Uint8Array(wrapped), iv };
}

/**
 * Unwrap (decrypt) the Master Key using the KEK.
 * Throws on wrong password (AES-GCM auth tag mismatch).
 */
export async function unwrapKey(
  wrapped: Uint8Array,
  iv: Uint8Array,
  kek: CryptoKey
): Promise<CryptoKey> {
  return crypto.subtle.unwrapKey(
    'raw',
    wrapped as BufferSource,
    kek,
    { name: 'AES-GCM', iv: iv as BufferSource },
    { name: 'AES-GCM', length: KEY_LENGTH },
    false, // unwrapped Master Key is non-extractable in memory
    ['encrypt', 'decrypt']
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// High-level: build / open a wrapped key for storage
// ─────────────────────────────────────────────────────────────────────────────

/**
 * First-time setup: takes a Master Password, returns the wrapped Master Key
 * payload ready to insert into `user_vault_keys`, plus the in-memory Master Key
 * for immediate use this session.
 */
export async function createWrappedMasterKey(
  masterPassword: string
): Promise<{ wrapped: WrappedMasterKey; masterKey: CryptoKey }> {
  const masterKey = await generateMasterKey();
  const salt = generateSalt();
  const kek = await deriveKEK(masterPassword, salt);
  const { wrapped, iv } = await wrapKey(masterKey, kek);

  return {
    masterKey,
    wrapped: {
      encrypted_master_key: bytesToBase64(wrapped),
      iv: bytesToBase64(iv),
      salt: bytesToBase64(salt),
      kdf_iterations: PBKDF2_ITERATIONS,
      version: CRYPTO_VERSION,
    },
  };
}

/**
 * Unlock: given the stored wrapped key payload + the user's Master Password,
 * derive the KEK and unwrap the Master Key.
 * Throws if the password is wrong.
 */
export async function openWrappedMasterKey(
  wrapped: WrappedMasterKey,
  masterPassword: string
): Promise<CryptoKey> {
  const salt = base64ToBytes(wrapped.salt);
  const iv = base64ToBytes(wrapped.iv);
  const wrappedBytes = base64ToBytes(wrapped.encrypted_master_key);

  const kek = await deriveKEK(masterPassword, salt, wrapped.kdf_iterations);
  return unwrapKey(wrappedBytes, iv, kek);
}

/**
 * Re-wrap an existing Master Key with a new password (for password changes).
 * The Master Key itself never changes — only the wrapping changes — so all
 * existing encrypted data remains decryptable.
 */
export async function rewrapMasterKey(
  masterKey: CryptoKey,
  newMasterPassword: string
): Promise<WrappedMasterKey> {
  const salt = generateSalt();
  const kek = await deriveKEK(newMasterPassword, salt);
  const { wrapped, iv } = await wrapKey(masterKey, kek);

  return {
    encrypted_master_key: bytesToBase64(wrapped),
    iv: bytesToBase64(iv),
    salt: bytesToBase64(salt),
    kdf_iterations: PBKDF2_ITERATIONS,
    version: CRYPTO_VERSION,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic data encryption with the Master Key
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Encrypt arbitrary JSON-serialisable data with the Master Key.
 * A fresh IV is generated per call — never reuse IVs with AES-GCM.
 */
export async function encryptData(
  data: unknown,
  masterKey: CryptoKey
): Promise<EncryptedBlob> {
  const iv = generateIv();
  const plaintext = new TextEncoder().encode(JSON.stringify(data));

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    masterKey,
    plaintext as BufferSource
  );

  return {
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    iv: bytesToBase64(iv),
    version: CRYPTO_VERSION,
  };
}

/**
 * Decrypt an EncryptedBlob with the Master Key.
 * Throws on auth failure (tampered ciphertext or wrong key).
 */
export async function decryptData<T = unknown>(
  blob: EncryptedBlob,
  masterKey: CryptoKey
): Promise<T> {
  const iv = base64ToBytes(blob.iv);
  const ciphertext = base64ToBytes(blob.ciphertext);

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    masterKey,
    ciphertext as BufferSource
  );

  return JSON.parse(new TextDecoder().decode(plaintext)) as T;
}

// ─────────────────────────────────────────────────────────────────────────────
// Recovery Kit (BIP-39: 24 words = 256 bits of entropy)
// ─────────────────────────────────────────────────────────────────────────────

import { BIP39_WORDLIST, BIP39_WORDLIST_SIZE } from './bip39Wordlist';

export const RECOVERY_WORD_COUNT = 24;

/**
 * Generate a 24-word recovery phrase from the BIP-39 English wordlist.
 * Uses crypto.getRandomValues for high entropy. NOT a true BIP-39 mnemonic
 * (no checksum) — just a memorable, high-entropy passphrase used to wrap the
 * Master Key. This is intentional: we use it as input to PBKDF2, not to derive
 * a deterministic seed.
 *
 * Entropy: 24 words × log2(2048) = 24 × 11 = 264 bits.
 */
export function generateRecoveryPhrase(wordCount: number = RECOVERY_WORD_COUNT): string {
  if (wordCount < 12 || wordCount > 48) {
    throw new Error(`wordCount must be between 12 and 48, got ${wordCount}`);
  }
  // Use a Uint16Array for unbiased index sampling — we mask to 11 bits (0-2047)
  // which exactly fits the wordlist size, so no rejection-sampling needed.
  const buf = new Uint16Array(wordCount);
  crypto.getRandomValues(buf);
  const words: string[] = new Array(wordCount);
  for (let i = 0; i < wordCount; i++) {
    const idx = buf[i] & 0x07ff; // 11 bits = 0..2047
    words[i] = BIP39_WORDLIST[idx];
  }
  return words.join(' ');
}

/**
 * Normalise a user-typed recovery phrase before using it as a passphrase:
 *  - lowercase
 *  - collapse all whitespace runs to a single space
 *  - trim
 * Validates that every token is in the BIP-39 wordlist; throws otherwise.
 */
export function normaliseRecoveryPhrase(input: string): string {
  const tokens = input.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length < 12) {
    throw new Error(`Recovery phrase too short: expected ≥12 words, got ${tokens.length}`);
  }
  const set = new Set(BIP39_WORDLIST);
  for (const w of tokens) {
    if (!set.has(w)) {
      throw new Error(`Word not in BIP-39 wordlist: "${w}"`);
    }
  }
  return tokens.join(' ');
}

/** Total number of words in the underlying wordlist (2048). */
export const RECOVERY_WORDLIST_SIZE = BIP39_WORDLIST_SIZE;

/**
 * Wrap the Master Key with a recovery phrase. Stored alongside the
 * password-wrapped key so a user who has only their Recovery Kit can still
 * unlock the same Master Key (and therefore decrypt all existing data).
 */
export async function wrapMasterKeyForRecovery(
  masterKey: CryptoKey,
  recoveryPhrase: string
): Promise<{ encrypted: string; iv: string; salt: string }> {
  const salt = generateSalt();
  const kek = await deriveKEK(recoveryPhrase, salt);
  const { wrapped, iv } = await wrapKey(masterKey, kek);

  return {
    encrypted: bytesToBase64(wrapped),
    iv: bytesToBase64(iv),
    salt: bytesToBase64(salt),
  };
}

/**
 * Recover the Master Key from the recovery-wrapped payload + the user's
 * Recovery Phrase. Throws on wrong phrase (AES-GCM auth tag mismatch).
 */
export async function unwrapMasterKeyWithRecovery(
  recovery: { encrypted: string; iv: string; salt: string },
  recoveryPhrase: string
): Promise<CryptoKey> {
  const salt = base64ToBytes(recovery.salt);
  const iv = base64ToBytes(recovery.iv);
  const wrappedBytes = base64ToBytes(recovery.encrypted);

  const kek = await deriveKEK(recoveryPhrase, salt);
  return unwrapKey(wrappedBytes, iv, kek);
}

/**
 * @deprecated kept for backwards-compatibility with earlier callers.
 * Prefer `generateRecoveryPhrase()` which returns a real 24-word BIP-39 phrase.
 */
export function generateRecoveryPassphrase(wordCount: number = RECOVERY_WORD_COUNT): string {
  return generateRecoveryPhrase(wordCount);
}

