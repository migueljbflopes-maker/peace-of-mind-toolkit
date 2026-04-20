/**
 * Secure cleanup on sign-out.
 * Wipes all client-side storage that could contain sensitive data:
 *  - IndexedDB databases (vault, plans, etc.)
 *  - In-memory keys (vault session)
 *  - localStorage entries that touch user-identifying data
 * 
 * No sensitive data should survive a sign-out.
 */

// All IndexedDB databases this app creates.
// Keep in sync as new IDB stores are added.
const KNOWN_IDB_DATABASES = [
  'resilient_vault',     // VaultStorage
  'resilient_plans_v2',  // planWizard2Store
];

// localStorage prefixes/keys that may contain user-scoped data.
const SENSITIVE_LOCAL_STORAGE_KEYS = [
  'resilient_entitlements',
  'resilient_dev_premium',
  'resilient_vault_storage_mode',
  'resilient_vault_unlock_hint',
];

// localStorage prefix patterns to wipe (e.g. drafts, wizard state).
const SENSITIVE_LOCAL_STORAGE_PREFIXES = [
  'resilient_draft_',
  'plan_wizard2_',
  'risk_wizard_',
  'panic_setup_',
];

/** Delete a single IndexedDB database. */
function deleteIndexedDB(name: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.deleteDatabase(name);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();   // swallow — best-effort
      req.onblocked = () => resolve(); // swallow — best-effort
    } catch {
      resolve();
    }
  });
}

/** Wipe known IndexedDB databases. */
export async function clearAllIndexedDB(): Promise<void> {
  await Promise.all(KNOWN_IDB_DATABASES.map(deleteIndexedDB));
}

/** Wipe sensitive localStorage entries (exact keys + prefix matches). */
export function clearSensitiveLocalStorage(): void {
  try {
    SENSITIVE_LOCAL_STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));

    // Sweep prefix matches
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (SENSITIVE_LOCAL_STORAGE_PREFIXES.some((p) => key.startsWith(p))) {
        toRemove.push(key);
      }
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* noop */
  }
}

/** Lock the vault session (zeroes in-memory key & passphrase). */
async function lockVaultSession(): Promise<void> {
  try {
    const { lockVault } = await import('./vaultSession');
    lockVault();
  } catch {
    /* noop */
  }
}

/**
 * Full secure cleanup. Call from signOut BEFORE redirecting.
 * Order: in-memory first, then disk-based stores.
 */
export async function performSecureCleanup(): Promise<void> {
  await lockVaultSession();
  clearSensitiveLocalStorage();
  await clearAllIndexedDB();
}
