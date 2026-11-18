import fs from "node:fs";
import type { Page } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BIP39_WORDLIST } from "../../src/utils/bip39Wordlist";
import { expect } from "./fixtures";

// Shared by the tests of the master password and the Recovery Kit (backlog
// F-01, F-10): what the server holds, the app's key scheme redone outside
// the app, and the steps a user takes on those screens.

// ── What the server holds ───────────────────────────────────────────────────

export type VaultKeyRow = Record<string, string | number | null>;

export async function vaultKeyRows(admin: SupabaseClient, userId: string): Promise<VaultKeyRow[]> {
  const { data, error } = await admin.from("user_vault_keys").select("*").eq("user_id", userId);
  expect(error).toBeNull();
  return data ?? [];
}

/** The six columns that hold the two wraps of the master key. */
export const PASSWORD_WRAP_COLUMNS = ["encrypted_master_key", "iv", "salt"] as const;
export const RECOVERY_WRAP_COLUMNS = ["recovery_encrypted_master_key", "recovery_iv", "recovery_salt"] as const;

export const pick = (row: VaultKeyRow, columns: readonly string[]) =>
  Object.fromEntries(columns.map((column) => [column, row[column]]));

export const bytes = (b64: string | number | null) => Buffer.from(String(b64), "base64");

export interface Wrapped {
  blob: string;
  iv: string;
  salt: string;
  iterations: number;
}

export const passwordWrap = (row: VaultKeyRow): Wrapped => ({
  blob: String(row.encrypted_master_key),
  iv: String(row.iv),
  salt: String(row.salt),
  iterations: Number(row.kdf_iterations),
});

export const recoveryWrap = (row: VaultKeyRow): Wrapped => ({
  blob: String(row.recovery_encrypted_master_key),
  iv: String(row.recovery_iv),
  salt: String(row.recovery_salt),
  iterations: 250_000,
});

// ── The scheme of src/utils/crypto.ts, redone outside the app ───────────────

async function kekFor(secret: string, salt: Uint8Array, iterations: number, usage: "encrypt" | "decrypt") {
  const subtle = globalThis.crypto.subtle;
  const base = await subtle.importKey("raw", new TextEncoder().encode(secret), "PBKDF2", false, ["deriveKey"]);
  return subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    [usage],
  );
}

/**
 * PBKDF2-SHA256 turns a secret and a salt into a key, and AES-GCM under that
 * key wraps the 256-bit master key. Returns the master key, or throws when
 * the secret is not the one the blob was wrapped with.
 */
export async function unwrapMasterKey(secret: string, wrapped: Wrapped): Promise<Buffer> {
  const kek = await kekFor(secret, bytes(wrapped.salt), wrapped.iterations, "decrypt");
  return Buffer.from(
    await globalThis.crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes(wrapped.iv) }, kek, bytes(wrapped.blob)),
  );
}

async function wrapMasterKey(secret: string, masterKey: Uint8Array) {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const kek = await kekFor(secret, salt, 250_000, "encrypt");
  const blob = await globalThis.crypto.subtle.encrypt({ name: "AES-GCM", iv }, kek, masterKey);
  return {
    blob: Buffer.from(blob).toString("base64"),
    iv: Buffer.from(iv).toString("base64"),
    salt: Buffer.from(salt).toString("base64"),
  };
}

/** A user_vault_keys row for a master password, made the way the app makes it. */
export async function wrappedKeyRow(userId: string, masterPassword: string) {
  const masterKey = globalThis.crypto.getRandomValues(new Uint8Array(32));
  const wrapped = await wrapMasterKey(masterPassword, masterKey);
  return {
    user_id: userId,
    encrypted_master_key: wrapped.blob,
    iv: wrapped.iv,
    salt: wrapped.salt,
    kdf_iterations: 250_000,
    version: 1,
  };
}

/**
 * The row of an account that set its master password BEFORE backlog F-10 was
 * fixed: the app wrapped the key with 24 words too, stored that wrap, and
 * threw the words away without showing them. Nobody holds these words.
 */
export async function keyRowWithUnseenKit(userId: string, masterPassword: string) {
  const masterKey = globalThis.crypto.getRandomValues(new Uint8Array(32));
  const byPassword = await wrapMasterKey(masterPassword, masterKey);
  const picks = globalThis.crypto.getRandomValues(new Uint16Array(24));
  const unseenWords = [...picks].map((n) => BIP39_WORDLIST[n & 0x07ff]).join(" ");
  const byWords = await wrapMasterKey(unseenWords, masterKey);
  return {
    user_id: userId,
    encrypted_master_key: byPassword.blob,
    iv: byPassword.iv,
    salt: byPassword.salt,
    kdf_iterations: 250_000,
    version: 1,
    recovery_encrypted_master_key: byWords.blob,
    recovery_iv: byWords.iv,
    recovery_salt: byWords.salt,
  };
}

/**
 * One vault section encrypted the way the app encrypts it (encryptData in
 * src/utils/crypto.ts, stored by useVaultSync): AES-GCM under the master key,
 * a fresh 96-bit IV, the JSON of the section. Ready to insert in vault_items.
 */
export async function encryptedVaultItem(userId: string, section: string, data: unknown, masterKey: Buffer) {
  const subtle = globalThis.crypto.subtle;
  const key = await subtle.importKey("raw", masterKey, "AES-GCM", false, ["encrypt"]);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(data)));
  return {
    user_id: userId,
    section,
    ciphertext: Buffer.from(ciphertext).toString("base64"),
    iv: Buffer.from(iv).toString("base64"),
    salt: "",
    version: 1,
    updated_at: new Date().toISOString(),
  };
}

// ── A secret must not be readable anywhere it should not be ─────────────────

/** Every way a secret could sit readable in a stored row or a request. */
function formsOf(secret: string): string[] {
  const raw = Buffer.from(secret, "utf8");
  const forms = [secret, raw.toString("base64"), raw.toString("base64url"), raw.toString("hex")];
  if (secret.includes(" ")) {
    // 24 words can also travel joined some other way.
    const words = secret.split(" ");
    forms.push(words.join("+"), words.join("%20"), words.join(","), words.join('","'), words.join("\\n"), words.join(""));
  }
  return forms.map((form) => form.toLowerCase());
}

export function expectNoTraceOf(secret: string, stored: unknown) {
  const haystack = JSON.stringify(stored).toLowerCase();
  for (const form of formsOf(secret)) {
    expect(haystack).not.toContain(form);
  }
}

/** Everything the server stores about a user that a secret could leak into. */
export async function storedAbout(admin: SupabaseClient, userId: string) {
  const [keys, profile, items, authUser] = await Promise.all([
    admin.from("user_vault_keys").select("*").eq("user_id", userId),
    admin.from("user_profiles").select("*").eq("user_id", userId),
    admin.from("vault_items").select("*").eq("user_id", userId),
    admin.auth.admin.getUserById(userId),
  ]);
  for (const result of [keys, profile, items, authUser]) expect(result.error).toBeNull();
  return { keys: keys.data, profile: profile.data, items: items.data, authUser: authUser.data.user };
}

export interface SentRequest {
  method: string;
  url: string;
  body: string;
}

/** Records every request the page makes from now on, with its body. */
export function recordRequests(page: Page): SentRequest[] {
  const sent: SentRequest[] = [];
  page.on("request", (request) => {
    sent.push({ method: request.method(), url: request.url(), body: request.postData() ?? "" });
  });
  return sent;
}

/** No recorded request carried the secret, in its URL or its body, in any form. */
export function expectNeverSent(sent: SentRequest[], secret: string, what: string) {
  const forms = formsOf(secret);
  const carrying = sent.filter((request) => {
    const haystack = `${request.url}\n${request.body}`.toLowerCase();
    return forms.some((form) => haystack.includes(form));
  });
  expect(
    carrying.map((request) => `${request.method} ${request.url}`),
    `${what} left the device`,
  ).toEqual([]);
}

// ── Steps a user takes ──────────────────────────────────────────────────────

export async function fillNewMasterPassword(page: Page, masterPassword: string) {
  await page.getByPlaceholder("Minimum 12 characters").fill(masterPassword);
  await page.getByLabel("Confirm Master Password").fill(masterPassword);
  await page.getByRole("checkbox", { name: /I understand that if I lose both/ }).check();
}

export const createTitle = (page: Page) => page.getByText("Create your Master Password", { exact: true });
export const createButton = (page: Page) => page.getByRole("button", { name: "Create and generate Recovery Kit" });
export const unlockTitle = (page: Page) => page.getByText("Unlock the Vault", { exact: true });
export const recoveryKitTitle = (page: Page) => page.getByText("Save your Recovery Kit", { exact: true });
export const newRecoveryKitTitle = (page: Page) => page.getByText("Save your new Recovery Kit", { exact: true });
/** The first screen of the vault for a premium user with nothing saved yet. */
export const openVault = (page: Page) => page.getByText("Step 1 of 7", { exact: true });

export const FINISH_AND_ENTER = "Finish and enter the Vault";
export const FINISH_AND_REPLACE = "Finish and replace my Recovery Kit";

export async function unlockWith(page: Page, masterPassword: string) {
  await page.getByPlaceholder("Master Password").fill(masterPassword);
  await page.getByRole("button", { name: "Unlock", exact: true }).click();
}

/** Downloads the kit shown on screen and returns its 24 words. */
export async function downloadRecoveryKit(page: Page): Promise<string[]> {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /^Download/ }).click(),
  ]);
  const kit = fs.readFileSync(await download.path(), "utf8");
  const words = [...kit.matchAll(/^\d{2}\.\s+([a-z]+)$/gm)].map((m) => m[1]);
  expect(words).toHaveLength(24);
  return words;
}

/** Saves the Recovery Kit as the screen demands and returns the 24 words. */
export async function saveRecoveryKit(page: Page, finishLabel = FINISH_AND_ENTER): Promise<string[]> {
  const finish = page.getByRole("button", { name: finishLabel });
  const confirm = page.getByRole("checkbox", { name: /I confirm I have saved the recovery phrase/ });
  // Neither the tick box nor the way on works before the kit is saved.
  await expect(finish).toBeDisabled();
  await expect(confirm).toBeDisabled();

  const words = await downloadRecoveryKit(page);

  await expect(finish).toBeDisabled();
  await confirm.check();
  await finish.click();
  return words;
}

/** "Forgot?" on the unlock screen: the words of a kit and a new master password. */
export async function submitRecovery(page: Page, words: string[], newMasterPassword: string) {
  if (!(await page.getByText("Recover with Recovery Kit", { exact: true }).isVisible())) {
    await page.getByRole("button", { name: "Forgot?" }).click();
  }
  await expect(page.getByText("Recover with Recovery Kit", { exact: true })).toBeVisible();
  await page.getByLabel("Recovery phrase (24 words)").fill(words.join(" "));
  await page.getByPlaceholder("Minimum 12 characters").fill(newMasterPassword);
  await page.getByLabel("Confirm new password").fill(newMasterPassword);
  await page.getByRole("button", { name: "Recover and set new password" }).click();
}
