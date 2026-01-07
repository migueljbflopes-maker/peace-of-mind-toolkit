/**
 * Client-side encryption module using WebCrypto API
 * AES-GCM encryption with PBKDF2 key derivation
 * 
 * SECURITY: All encryption happens client-side. 
 * Supabase only stores ciphertext - never plaintext.
 */

const PBKDF2_ITERATIONS = 250000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const CURRENT_VERSION = 1;

// Base64 encoding/decoding helpers
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Generate cryptographically secure random salt (16 bytes)
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

// Generate cryptographically secure random IV (12 bytes for AES-GCM)
export function generateIv(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

// Derive encryption key from passphrase using PBKDF2
export async function deriveKey(
  passphrase: string, 
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passphraseBuffer = encoder.encode(passphrase);
  const passphraseKey = await crypto.subtle.importKey(
    'raw',
    passphraseBuffer as BufferSource,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passphraseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export interface EncryptedPayload {
  ciphertextB64: string;
  ivB64: string;
  saltB64: string;
  version: number;
}

// Encrypt JSON data with passphrase
export async function encryptJSON(
  data: unknown, 
  passphrase: string
): Promise<EncryptedPayload> {
  const salt = generateSalt();
  const iv = generateIv();
  const key = await deriveKey(passphrase, salt);

  const encoder = new TextEncoder();
  const plaintext = encoder.encode(JSON.stringify(data));

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    plaintext as BufferSource
  );

  return {
    ciphertextB64: uint8ArrayToBase64(new Uint8Array(ciphertext)),
    ivB64: uint8ArrayToBase64(iv),
    saltB64: uint8ArrayToBase64(salt),
    version: CURRENT_VERSION,
  };
}

// Decrypt JSON data with passphrase
export async function decryptJSON<T = unknown>(
  payload: EncryptedPayload, 
  passphrase: string
): Promise<T> {
  const salt = base64ToUint8Array(payload.saltB64);
  const iv = base64ToUint8Array(payload.ivB64);
  const ciphertext = base64ToUint8Array(payload.ciphertextB64);

  const key = await deriveKey(passphrase, salt);

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    ciphertext as BufferSource
  );

  const decoder = new TextDecoder();
  return JSON.parse(decoder.decode(plaintext)) as T;
}

// Re-encrypt data with new passphrase (for passphrase change)
export async function reEncryptJSON(
  payload: EncryptedPayload,
  oldPassphrase: string,
  newPassphrase: string
): Promise<EncryptedPayload> {
  const data = await decryptJSON(payload, oldPassphrase);
  return encryptJSON(data, newPassphrase);
}
