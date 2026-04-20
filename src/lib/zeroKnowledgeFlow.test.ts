/**
 * End-to-end zero-knowledge flow test.
 *
 * Mirrors the real journey a user takes through VaultKeyContext + backup.ts:
 *
 *   1. setup()              → create wrapped master key + recovery wrap
 *   2. encrypt section      → save EncryptedBlob into vaultStorage cache
 *   3. createBackup()       → wrap the bundle with the master key, push to "server"
 *   4. reset                → wipe local cache + in-memory key (simulate logout
 *                             on a new device, or "I forgot my password")
 *   5. recoverWithPhrase()  → unwrap master key with the 24-word phrase,
 *                             rewrap with a brand new password
 *   6. unlock with new pwd  → confirm the new password works
 *   7. restoreFromBackup()  → pull bundle, decrypt with recovered key,
 *                             write sections back to local cache
 *   8. decrypt section      → confirm the ORIGINAL plaintext comes back
 *
 * The Supabase client is mocked with in-memory tables so the test runs
 * fully offline — only IndexedDB (fake) and WebCrypto (node:crypto) are real.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// In-memory "database" — must be defined BEFORE the supabase mock.
// ─────────────────────────────────────────────────────────────────────────────

interface VaultKeyRow {
  user_id: string;
  encrypted_master_key: string;
  iv: string;
  salt: string;
  kdf_iterations: number;
  version: number;
  recovery_encrypted_master_key: string | null;
  recovery_iv: string | null;
  recovery_salt: string | null;
}

interface BackupRow {
  id: string;
  user_id: string;
  ciphertext_bundle: string;
  iv: string;
  salt: string;
  version: number;
  created_at: string;
}

const db = {
  user_vault_keys: [] as VaultKeyRow[],
  backups: [] as BackupRow[],
  vault_items: [] as Record<string, unknown>[],
  plan_items: [] as Record<string, unknown>[],
};

function resetDb() {
  db.user_vault_keys = [];
  db.backups = [];
  db.vault_items = [];
  db.plan_items = [];
}

// Minimal chainable query-builder mock that covers exactly what
// VaultKeyContext + backup.ts use.
function makeBuilder(table: keyof typeof db) {
  const ctx: {
    op: "select" | "insert" | "update" | "upsert" | null;
    payload: unknown;
    filters: Array<[string, unknown]>;
    order: { col: string; asc: boolean } | null;
    limitN: number | null;
  } = {
    op: null,
    payload: null,
    filters: [],
    order: null,
    limitN: null,
  };

  const applyFilters = (rows: Record<string, unknown>[]) =>
    rows.filter((r) => ctx.filters.every(([k, v]) => r[k] === v));

  const exec = () => {
    let rows = [...(db[table] as Record<string, unknown>[])];
    if (ctx.op === "select") {
      rows = applyFilters(rows);
      if (ctx.order) {
        const { col, asc } = ctx.order;
        rows.sort((a, b) => {
          const av = String(a[col] ?? "");
          const bv = String(b[col] ?? "");
          return asc ? av.localeCompare(bv) : bv.localeCompare(av);
        });
      }
      if (ctx.limitN != null) rows = rows.slice(0, ctx.limitN);
      return { data: rows, error: null };
    }
    if (ctx.op === "insert") {
      const items = Array.isArray(ctx.payload) ? ctx.payload : [ctx.payload];
      for (const item of items) {
        (db[table] as Record<string, unknown>[]).push({
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          ...(item as Record<string, unknown>),
        });
      }
      return { data: null, error: null };
    }
    if (ctx.op === "update") {
      for (const r of applyFilters(db[table] as Record<string, unknown>[])) {
        Object.assign(r, ctx.payload as Record<string, unknown>);
      }
      return { data: null, error: null };
    }
    if (ctx.op === "upsert") {
      // Not exercised in these tests but kept for completeness.
      return { data: null, error: null };
    }
    return { data: null, error: null };
  };

  const builder: Record<string, unknown> = {
    select(_cols?: string) {
      ctx.op = "select";
      return builder;
    },
    insert(payload: unknown) {
      ctx.op = "insert";
      ctx.payload = payload;
      return builder;
    },
    update(payload: unknown) {
      ctx.op = "update";
      ctx.payload = payload;
      return builder;
    },
    upsert(payload: unknown) {
      ctx.op = "upsert";
      ctx.payload = payload;
      return builder;
    },
    eq(col: string, val: unknown) {
      ctx.filters.push([col, val]);
      return builder;
    },
    order(col: string, opts: { ascending?: boolean }) {
      ctx.order = { col, asc: opts?.ascending ?? true };
      return builder;
    },
    limit(n: number) {
      ctx.limitN = n;
      return builder;
    },
    maybeSingle() {
      const { data, error } = exec();
      const arr = (data ?? []) as unknown[];
      return Promise.resolve({ data: arr[0] ?? null, error });
    },
    single() {
      const { data, error } = exec();
      const arr = (data ?? []) as unknown[];
      if (!arr[0]) return Promise.resolve({ data: null, error: { message: "no row" } });
      return Promise.resolve({ data: arr[0], error });
    },
    then(resolve: (v: { data: unknown; error: unknown }) => void) {
      resolve(exec());
    },
  };

  return builder;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => makeBuilder(table as keyof typeof db),
  },
}));

// Also block real network access for plansStore (it uses fetch through the same client mock).
// ─────────────────────────────────────────────────────────────────────────────
// Imports that depend on the mock MUST be after vi.mock above.
// ─────────────────────────────────────────────────────────────────────────────

import {
  createWrappedMasterKey,
  openWrappedMasterKey,
  encryptData,
  decryptData,
  generateRecoveryPhrase,
  wrapMasterKeyForRecovery,
  unwrapMasterKeyWithRecovery,
  rewrapMasterKey,
} from "@/utils/crypto";
import { supabase } from "@/integrations/supabase/client";
import {
  saveSectionBlob,
  getSectionBlob,
  clearVaultCache,
  getAllCachedSections,
} from "./vaultStorage";
import { createBackup, restoreFromBackup, type MasterCipher } from "./backup";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers that mirror what VaultKeyContext does internally, but standalone.
// ─────────────────────────────────────────────────────────────────────────────

const USER_ID = "00000000-0000-0000-0000-0000000000aa";

interface VaultKeyState {
  masterKey: CryptoKey;
}

async function setupAccount(masterPassword: string): Promise<{
  state: VaultKeyState;
  recoveryPhrase: string;
}> {
  const { wrapped, masterKey } = await createWrappedMasterKey(masterPassword);
  const recoveryPhrase = generateRecoveryPhrase();
  const recovery = await wrapMasterKeyForRecovery(masterKey, recoveryPhrase);

  const { error } = await supabase.from("user_vault_keys").insert({
    user_id: USER_ID,
    encrypted_master_key: wrapped.encrypted_master_key,
    iv: wrapped.iv,
    salt: wrapped.salt,
    kdf_iterations: wrapped.kdf_iterations,
    version: wrapped.version,
    recovery_encrypted_master_key: recovery.encrypted,
    recovery_iv: recovery.iv,
    recovery_salt: recovery.salt,
  });
  expect(error).toBeNull();

  return { state: { masterKey }, recoveryPhrase };
}

async function unlockAccount(masterPassword: string): Promise<VaultKeyState> {
  const { data } = await supabase
    .from("user_vault_keys")
    .select(
      "encrypted_master_key, iv, salt, kdf_iterations, version, recovery_encrypted_master_key, recovery_iv, recovery_salt"
    )
    .eq("user_id", USER_ID)
    .maybeSingle();

  if (!data) throw new Error("no key on server");
  const row = data as VaultKeyRow;
  const masterKey = await openWrappedMasterKey(
    {
      encrypted_master_key: row.encrypted_master_key,
      iv: row.iv,
      salt: row.salt,
      kdf_iterations: row.kdf_iterations,
      version: row.version,
    },
    masterPassword
  );
  return { masterKey };
}

async function recoverAccount(
  recoveryPhrase: string,
  newPassword: string
): Promise<VaultKeyState> {
  const { data } = await supabase
    .from("user_vault_keys")
    .select(
      "encrypted_master_key, iv, salt, kdf_iterations, version, recovery_encrypted_master_key, recovery_iv, recovery_salt"
    )
    .eq("user_id", USER_ID)
    .maybeSingle();

  const row = data as VaultKeyRow;
  expect(row.recovery_encrypted_master_key).toBeTruthy();

  const masterKey = await unwrapMasterKeyWithRecovery(
    {
      encrypted: row.recovery_encrypted_master_key!,
      iv: row.recovery_iv!,
      salt: row.recovery_salt!,
    },
    recoveryPhrase
  );

  const newWrapped = await rewrapMasterKey(masterKey, newPassword);
  const { error } = await supabase
    .from("user_vault_keys")
    .update({
      encrypted_master_key: newWrapped.encrypted_master_key,
      iv: newWrapped.iv,
      salt: newWrapped.salt,
      kdf_iterations: newWrapped.kdf_iterations,
      version: newWrapped.version,
    })
    .eq("user_id", USER_ID);
  expect(error).toBeNull();

  return { masterKey };
}

function makeCipher(state: VaultKeyState): MasterCipher {
  return {
    encrypt: (data) => encryptData(data, state.masterKey),
    decrypt: (blob) => decryptData(blob, state.masterKey),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("Zero-Knowledge end-to-end flow", () => {
  beforeEach(async () => {
    resetDb();
    await clearVaultCache();
  });

  it("setup → encrypt → backup → reset → recover with phrase → restore → decrypt", async () => {
    const ORIGINAL_PASSWORD = "first-password-is-long-enough-1";
    const NEW_PASSWORD = "fresh-password-after-recovery-2";
    const SECRET = {
      fullName: "Ada Lovelace",
      passportNumber: "GBR-12345678",
      notes: "Allergic to peanuts.",
    };

    // 1. Setup
    const { state: initial, recoveryPhrase } = await setupAccount(ORIGINAL_PASSWORD);
    expect(recoveryPhrase.split(/\s+/)).toHaveLength(24);
    expect(db.user_vault_keys).toHaveLength(1);

    // 2. Encrypt a section ("ids") and stash in local cache.
    const blob = await encryptData(SECRET, initial.masterKey);
    await saveSectionBlob("ids", blob);
    const cachedBefore = await getSectionBlob("ids");
    expect(cachedBefore).not.toBeNull();
    expect(cachedBefore!.ciphertext).toBe(blob.ciphertext);

    // 3. Create backup using the master cipher.
    const backupResult = await createBackup(USER_ID, makeCipher(initial));
    expect(backupResult.success).toBe(true);
    expect(db.backups).toHaveLength(1);
    // Server only sees ciphertext, never plaintext.
    const stored = db.backups[0];
    expect(stored.ciphertext_bundle).not.toContain("Ada Lovelace");
    expect(stored.ciphertext_bundle).not.toContain("GBR-12345678");

    // 4. Reset: wipe in-memory key + local cache (simulates new device / logout).
    await clearVaultCache();
    expect(await getAllCachedSections()).toHaveLength(0);

    // 5. Recover with the 24-word phrase + brand new password.
    //    The wrapped key on the server is rewritten in-place.
    const recovered = await recoverAccount(recoveryPhrase, NEW_PASSWORD);
    expect(recovered.masterKey).toBeDefined();

    // 5b. The new password unlocks; the old one no longer does.
    const reUnlocked = await unlockAccount(NEW_PASSWORD);
    expect(reUnlocked.masterKey).toBeDefined();
    await expect(unlockAccount(ORIGINAL_PASSWORD)).rejects.toBeDefined();

    // 6. Restore from backup with the recovered cipher.
    const restoreResult = await restoreFromBackup(USER_ID, makeCipher(recovered));
    expect(restoreResult.success).toBe(true);
    expect(restoreResult.restored?.vaultSections).toBe(1);

    // 7. The "ids" section is back in the local cache, ciphertext unchanged.
    const cachedAfter = await getSectionBlob("ids");
    expect(cachedAfter).not.toBeNull();
    expect(cachedAfter!.ciphertext).toBe(blob.ciphertext);
    expect(cachedAfter!.iv).toBe(blob.iv);

    // 8. Decrypt with the recovered Master Key — original plaintext returns intact.
    const roundTripped = await decryptData<typeof SECRET>(
      cachedAfter!,
      recovered.masterKey
    );
    expect(roundTripped).toEqual(SECRET);
  });

  it("recovery with wrong phrase fails (auth-tag mismatch)", async () => {
    await setupAccount("first-password-is-long-enough-1");
    const wrongPhrase = generateRecoveryPhrase(); // valid words, wrong key
    await expect(
      recoverAccount(wrongPhrase, "fresh-password-after-recovery-2")
    ).rejects.toBeDefined();
  });

  it("createBackup returns error when there is no local data", async () => {
    const { state } = await setupAccount("first-password-is-long-enough-1");
    const result = await createBackup(USER_ID, makeCipher(state));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/no data/i);
  });
});
