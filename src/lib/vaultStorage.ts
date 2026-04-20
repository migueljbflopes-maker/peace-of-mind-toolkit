/**
 * Local encrypted cache for vault data using IndexedDB
 *
 * SECURITY:
 * - Only encrypted payloads are stored
 * - Enables offline-first access
 * - Syncs with Supabase when online
 *
 * STORAGE SHAPE
 * The on-disk shape keeps `saltB64` for back-compat with the legacy
 * passphrase-derived ciphers. With the Master Key (zero-knowledge) flow
 * the salt is unused per-section (the Master Key carries no per-row salt),
 * so callers using `saveSectionBlob` write `saltB64: ''`.
 *
 * Two parallel APIs are exported:
 * - `saveSectionToCache` / `getCachedSection` → legacy `EncryptedPayload`
 * - `saveSectionBlob`   / `getSectionBlob`     → new `EncryptedBlob`
 *
 * Both read/write the same IndexedDB rows.
 */

import { EncryptedPayload } from './crypto';
import type { EncryptedBlob } from '@/utils/crypto';

const DB_NAME = 'resilient_vault';
const DB_VERSION = 1;
const STORE_NAME = 'vault_sections';

export interface VaultSectionCache {
  section: string;
  ciphertextB64: string;
  ivB64: string;
  saltB64: string;
  version: number;
  updatedAt: string;
  syncedAt: string | null;
}

// Open IndexedDB database
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'section' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };
  });
}

// Get cached section data
export async function getCachedSection(section: string): Promise<VaultSectionCache | null> {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(section);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

// Get all cached sections
export async function getAllCachedSections(): Promise<VaultSectionCache[]> {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

// Save section to local cache (legacy EncryptedPayload shape)
export async function saveSectionToCache(
  section: string,
  payload: EncryptedPayload,
  syncedAt: string | null = null
): Promise<void> {
  const db = await openDatabase();
  
  const cache: VaultSectionCache = {
    section,
    ciphertextB64: payload.ciphertextB64,
    ivB64: payload.ivB64,
    saltB64: payload.saltB64,
    version: payload.version,
    updatedAt: new Date().toISOString(),
    syncedAt,
  };
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(cache);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// EncryptedBlob-native API (Master Key / Zero-Knowledge flow)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Save a section encrypted with the Master Key.
 * Writes the same IndexedDB row shape with `saltB64: ''` (no per-row salt).
 */
export async function saveSectionBlob(
  section: string,
  blob: EncryptedBlob,
  syncedAt: string | null = null
): Promise<void> {
  const db = await openDatabase();

  const cache: VaultSectionCache = {
    section,
    ciphertextB64: blob.ciphertext,
    ivB64: blob.iv,
    saltB64: '',
    version: blob.version,
    updatedAt: new Date().toISOString(),
    syncedAt,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(cache);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Read a section as an EncryptedBlob (Master Key flow).
 * Returns null if the section is missing.
 */
export async function getSectionBlob(section: string): Promise<EncryptedBlob | null> {
  const cached = await getCachedSection(section);
  if (!cached) return null;
  return {
    ciphertext: cached.ciphertextB64,
    iv: cached.ivB64,
    version: cached.version,
  };
}

// Mark section as synced
export async function markSectionSynced(section: string): Promise<void> {
  const cached = await getCachedSection(section);
  if (!cached) return;
  
  const db = await openDatabase();
  cached.syncedAt = new Date().toISOString();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(cached);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Delete section from cache
export async function deleteSectionFromCache(section: string): Promise<void> {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(section);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Clear all cached data (for logout or reset)
export async function clearVaultCache(): Promise<void> {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Check if there are unsynced changes
export async function hasUnsyncedChanges(): Promise<boolean> {
  const sections = await getAllCachedSections();
  return sections.some(s => !s.syncedAt || new Date(s.updatedAt) > new Date(s.syncedAt));
}

// Get unsynced sections
export async function getUnsyncedSections(): Promise<VaultSectionCache[]> {
  const sections = await getAllCachedSections();
  return sections.filter(s => !s.syncedAt || new Date(s.updatedAt) > new Date(s.syncedAt));
}
