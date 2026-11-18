import type { Page } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { test, expect, signInThroughUi, type TestUser } from "./fixtures";
import {
  FINISH_AND_ENTER,
  FINISH_AND_REPLACE,
  PASSWORD_WRAP_COLUMNS,
  RECOVERY_WRAP_COLUMNS,
  createButton,
  createTitle,
  downloadRecoveryKit,
  encryptedVaultItem,
  expectNeverSent,
  expectNoTraceOf,
  expectRecoveryRefused,
  fillNewMasterPassword,
  keyRowWithUnseenKit,
  newRecoveryKitTitle,
  openVault,
  passwordWrap,
  pick,
  recordRequests,
  recoveryKitTitle,
  recoveryWrap,
  saveRecoveryKit,
  storedAbout,
  submitRecovery,
  unlockTitle,
  unlockWith,
  unwrapMasterKey,
  vaultKeyRows,
} from "./vault-keys";

// Backlog F-10: the Recovery Kit.
//
// The rule these tests hold the app to: the server never has a recovery wrap
// for words the user was not given and did not confirm saving. So every step
// that makes new words (first master password, recovery, a new kit from the
// Backup page) writes nothing until the kit screen is finished, and until
// then the account is exactly as it was.
//
// The step right after creating a master password is also asserted in
// signup-master-password.spec.ts, as part of the sign-up journey.

// Every test here makes its own user and signs in as it.
test.use({ storageState: { cookies: [], origins: [] } });

const newPassword = (label: string) => `master-${Math.random().toString(36).slice(2, 10)}-${label}`;

const WRONG_WORDS = "These words do not open this account. Check them and try again.";
const backupHeading = (page: Page) =>
  page.getByRole("heading", { level: 1, name: "Encrypted Backup & Restore" });

/** A new premium user sets a master password at the vault and saves the kit. */
async function createMasterPassword(page: Page, user: TestUser, masterPassword: string): Promise<string[]> {
  await signInThroughUi(page, user);
  await page.goto("/premium/vault");
  await fillNewMasterPassword(page, masterPassword);
  await createButton(page).click();
  await expect(recoveryKitTitle(page)).toBeVisible();
  const words = await saveRecoveryKit(page);
  await expect(openVault(page)).toBeVisible();
  return words;
}

async function onlyRow(admin: SupabaseClient, userId: string) {
  const rows = await vaultKeyRows(admin, userId);
  expect(rows).toHaveLength(1);
  return rows[0];
}

/** Backup page → "Create a new Recovery Kit" → the master password again. */
async function askForNewKit(page: Page, masterPassword: string) {
  await page.getByRole("button", { name: "Create a new Recovery Kit" }).click();
  await expect(page.getByText("Confirm your Master Password", { exact: true })).toBeVisible();
  await page.locator("#renew-kit-master-password").fill(masterPassword);
  await page.getByRole("button", { name: "Show my new Recovery Kit" }).click();
}

// ── Leaving the step ────────────────────────────────────────────────────────

test("reloading or leaving during the Recovery Kit step stores nothing: the user starts again and only the kit they finish works", async ({
  page,
  admin,
  createUser,
  pageErrors,
}) => {
  test.slow();
  const user = await createUser({ premium: true });
  const firstPassword = newPassword("First-Try");
  const secondPassword = newPassword("Second-Try");
  const finalPassword = newPassword("Kept-One");
  await signInThroughUi(page, user);
  await page.goto("/premium/vault");

  // First try: the words are downloaded, but the step is never finished.
  await fillNewMasterPassword(page, firstPassword);
  await createButton(page).click();
  await expect(recoveryKitTitle(page)).toBeVisible();
  const abandonedWords = await downloadRecoveryKit(page);
  expect(await vaultKeyRows(admin, user.id)).toEqual([]);

  await page.reload();
  // Not "unlock", and not the vault: the account has no master password,
  // and the app asks for one again instead of pretending a kit exists.
  await expect(createTitle(page)).toBeVisible();
  await expect(page.getByText("Step 1 of 2 — Next you will save the Recovery Kit.")).toBeVisible();
  await expect(recoveryKitTitle(page)).toHaveCount(0);
  await expect(unlockTitle(page)).toHaveCount(0);
  await expect(openVault(page)).toHaveCount(0);
  expect(await vaultKeyRows(admin, user.id)).toEqual([]);

  // Second try: the user walks off to another page at the kit step.
  await fillNewMasterPassword(page, secondPassword);
  await createButton(page).click();
  await expect(recoveryKitTitle(page)).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
  expect(await vaultKeyRows(admin, user.id)).toEqual([]);
  await page.goto("/premium/vault");
  await expect(createTitle(page)).toBeVisible();
  await expect(recoveryKitTitle(page)).toHaveCount(0);
  await expect(openVault(page)).toHaveCount(0);

  // Third try, finished.
  await fillNewMasterPassword(page, finalPassword);
  await createButton(page).click();
  await expect(recoveryKitTitle(page)).toBeVisible();
  const words = await saveRecoveryKit(page);
  await expect(openVault(page)).toBeVisible();
  expect(words).not.toEqual(abandonedWords);

  // One key, opened by the last password and the last kit, and by nothing
  // from the abandoned tries.
  const row = await onlyRow(admin, user.id);
  const masterKey = await unwrapMasterKey(finalPassword, passwordWrap(row));
  expect((await unwrapMasterKey(words.join(" "), recoveryWrap(row))).equals(masterKey)).toBe(true);
  await expect(unwrapMasterKey(abandonedWords.join(" "), recoveryWrap(row))).rejects.toThrow();
  await expect(unwrapMasterKey(firstPassword, passwordWrap(row))).rejects.toThrow();
  await expect(unwrapMasterKey(secondPassword, passwordWrap(row))).rejects.toThrow();

  // The app refuses the abandoned words too, and says so.
  await page.reload();
  await expect(unlockTitle(page)).toBeVisible();
  await submitRecovery(page, abandonedWords, newPassword("Not-Used"));
  await expectRecoveryRefused(page, WRONG_WORDS);
  await expect(newRecoveryKitTitle(page)).toHaveCount(0);
  expect(await vaultKeyRows(admin, user.id)).toEqual([row]);
  expect(pageErrors).toEqual([]);
});

test("when the key cannot be stored the Recovery Kit step says so, opens nothing, and a second try stores the same kit", async ({
  page,
  admin,
  createUser,
  pageErrors,
}) => {
  const user = await createUser({ premium: true });
  const masterPassword = newPassword("Bad-Line");
  await signInThroughUi(page, user);
  await page.goto("/premium/vault");
  await fillNewMasterPassword(page, masterPassword);
  await createButton(page).click();
  await expect(recoveryKitTitle(page)).toBeVisible();

  // The connection drops exactly when the kit is confirmed.
  let refused = 0;
  await page.route("**/rest/v1/user_vault_keys*", async (route) => {
    if (route.request().method() === "POST") {
      refused += 1;
      await route.abort("connectionfailed");
    } else {
      await route.fallback();
    }
  });
  const words = await saveRecoveryKit(page);
  await expect(page.getByRole("alert").filter({ hasText: "Could not save." })).toBeVisible();
  expect(refused).toBe(1);

  // Nothing opened, nothing claimed, nothing stored; the same words are still shown.
  await expect(recoveryKitTitle(page)).toBeVisible();
  await expect(openVault(page)).toHaveCount(0);
  await expect(page.getByText("Master Password created.", { exact: true })).toHaveCount(0);
  await expect(page.getByText(words[0], { exact: true }).first()).toBeVisible();
  expect(await vaultKeyRows(admin, user.id)).toEqual([]);

  // The connection is back: the same step finishes, with the kit already saved.
  await page.unroute("**/rest/v1/user_vault_keys*");
  await page.getByRole("button", { name: FINISH_AND_ENTER }).click();
  await expect(openVault(page)).toBeVisible();
  await expect(page.getByText("Master Password created.", { exact: true })).toBeVisible();

  const row = await onlyRow(admin, user.id);
  const masterKey = await unwrapMasterKey(words.join(" "), recoveryWrap(row));
  expect((await unwrapMasterKey(masterPassword, passwordWrap(row))).equals(masterKey)).toBe(true);
  expect(pageErrors).toEqual([]);
});

// ── "Forgot?" ───────────────────────────────────────────────────────────────

test("a forgotten master password: the kit's words set a new one, saved vault data is still readable, and the used words are replaced", async ({
  page,
  admin,
  createUser,
  pageErrors,
}) => {
  test.slow();
  const user = await createUser({ premium: true });
  const forgottenPassword = newPassword("Forgotten");
  const replacementPassword = newPassword("Replacement");
  const sent = recordRequests(page);

  const words = await createMasterPassword(page, user, forgottenPassword);
  const before = await onlyRow(admin, user.id);
  const masterKey = await unwrapMasterKey(words.join(" "), recoveryWrap(before));

  // Vault data saved before the password was forgotten. Saving through the
  // vault screens is backlog F-02; here the row is arranged as the app writes
  // it: the section's JSON under AES-GCM with this account's master key.
  const fullName = `Marta Recovery ${Math.random().toString(36).slice(2, 8)}`;
  const ids = { fullName, dob: "", nationalId: "", address: "", notes: "", copiesMade: false, storedInOnePlace: false };
  const arranged = await admin.from("vault_items").insert(await encryptedVaultItem(user.id, "ids", ids, masterKey));
  expect(arranged.error).toBeNull();

  // A new visit: locked, and the password is gone from memory.
  await page.reload();
  await expect(unlockTitle(page)).toBeVisible();
  await page.getByRole("button", { name: "Forgot?" }).click();
  await expect(page.getByText("Recover with Recovery Kit", { exact: true })).toBeVisible();
  // The screen is honest about accounts that never got a kit, and about what happens next.
  await expect(page.getByTestId("recovery-never-shown-note")).toContainText("If you were never shown 24 words");
  await expect(page.getByText("Next you will save a new Recovery Kit.", { exact: false })).toBeVisible();

  // The right words in the wrong order are not the kit.
  await submitRecovery(page, [...words].reverse(), replacementPassword);
  await expectRecoveryRefused(page, WRONG_WORDS);
  await expect(newRecoveryKitTitle(page)).toHaveCount(0);
  expect(await vaultKeyRows(admin, user.id)).toEqual([before]);

  // The kit's words are accepted. A new kit is shown; nothing has changed yet.
  await submitRecovery(page, words, replacementPassword);
  await expect(newRecoveryKitTitle(page)).toBeVisible();
  await expect(
    page.getByText("Your new Master Password is not active until you finish this step.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByText("Account recovered.", { exact: false })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Lock Vault" })).toHaveCount(0);
  expect(await vaultKeyRows(admin, user.id)).toEqual([before]);

  const newWords = await saveRecoveryKit(page);
  await expect(page.getByText("Account recovered.", { exact: false }).first()).toBeVisible();
  expect(newWords).not.toEqual(words);

  // In the vault, the data saved before is read back.
  await expect(page.getByRole("button", { name: "Lock Vault" })).toBeVisible();
  await page.getByRole("button", { name: "Edit", exact: true }).first().click();
  await expect(page.locator("#fullName")).toHaveValue(fullName);
  await page.keyboard.press("Escape");

  // Both wraps were replaced, in one go, around the same key.
  const after = await onlyRow(admin, user.id);
  for (const column of [...PASSWORD_WRAP_COLUMNS, ...RECOVERY_WRAP_COLUMNS]) {
    expect(after[column], column).not.toBe(before[column]);
  }
  expect((await unwrapMasterKey(replacementPassword, passwordWrap(after))).equals(masterKey)).toBe(true);
  expect((await unwrapMasterKey(newWords.join(" "), recoveryWrap(after))).equals(masterKey)).toBe(true);
  await expect(unwrapMasterKey(forgottenPassword, passwordWrap(after))).rejects.toThrow();
  await expect(unwrapMasterKey(words.join(" "), recoveryWrap(after))).rejects.toThrow();

  // Next visit: the old password is refused, the old words are refused, the new password opens the vault.
  await page.reload();
  await expect(unlockTitle(page)).toBeVisible();
  await submitRecovery(page, words, newPassword("Not-Used"));
  await expectRecoveryRefused(page, WRONG_WORDS);
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await unlockWith(page, forgottenPassword);
  await expect(page.getByText("Incorrect master password.", { exact: true }).last()).toBeVisible();
  await expect(unlockTitle(page)).toBeVisible();
  await expect(page.getByRole("button", { name: "Lock Vault" })).toHaveCount(0);
  expect(await vaultKeyRows(admin, user.id)).toEqual([after]);
  await unlockWith(page, replacementPassword);
  await expect(page.getByRole("button", { name: "Lock Vault" })).toBeVisible();
  await page.getByRole("button", { name: "Edit", exact: true }).first().click();
  await expect(page.locator("#fullName")).toHaveValue(fullName);

  // No secret reached the server, stored or in transit, in any form.
  const stored = await storedAbout(admin, user.id);
  for (const [secret, what] of [
    [words.join(" "), "the first Recovery Kit"],
    [newWords.join(" "), "the new Recovery Kit"],
    [forgottenPassword, "the forgotten master password"],
    [replacementPassword, "the new master password"],
    [fullName, "the vault data"],
  ]) {
    expectNoTraceOf(secret, stored);
    expectNeverSent(sent, secret, what);
  }
  expect(pageErrors).toEqual([]);
});

// ── A new kit from inside the app ───────────────────────────────────────────

test("an account from before the fix, which never saw its kit, creates one on the Backup page, forgets the password and gets back in with it", async ({
  page,
  admin,
  createUser,
  pageErrors,
}) => {
  test.slow();
  // Arranged directly: the row the old app left behind. Its recovery wrap is
  // for words that were thrown away unseen.
  const user = await createUser({ premium: true });
  const masterPassword = newPassword("Before-Fix");
  const inserted = await admin.from("user_vault_keys").insert(await keyRowWithUnseenKit(user.id, masterPassword));
  expect(inserted.error).toBeNull();
  const before = await onlyRow(admin, user.id);
  const masterKey = await unwrapMasterKey(masterPassword, passwordWrap(before));
  const sent = recordRequests(page);

  await signInThroughUi(page, user);
  await page.goto("/premium/backup");
  await unlockWith(page, masterPassword);
  await expect(backupHeading(page)).toBeVisible();
  // The page says who needs this.
  await expect(page.getByText("were never shown one", { exact: false })).toBeVisible();

  // An unlocked screen is not enough: the master password is asked again.
  await askForNewKit(page, `${masterPassword}x`);
  await expect(page.getByRole("dialog").getByText("Incorrect master password.", { exact: true })).toBeVisible();
  await expect(newRecoveryKitTitle(page)).toHaveCount(0);
  expect(await vaultKeyRows(admin, user.id)).toEqual([before]);
  await page.keyboard.press("Escape");

  await askForNewKit(page, masterPassword);
  await expect(newRecoveryKitTitle(page)).toBeVisible();
  await expect(
    page.getByText("Your current Recovery Kit keeps working until you finish this step.", { exact: false }),
  ).toBeVisible();
  expect(await vaultKeyRows(admin, user.id)).toEqual([before]);

  const words = await saveRecoveryKit(page, FINISH_AND_REPLACE);
  await expect(page.getByText("New Recovery Kit active. The old words no longer work.").first()).toBeVisible();
  await expect(backupHeading(page)).toBeVisible();

  // Only the recovery wrap changed, and the new words open the same key.
  const withKit = await onlyRow(admin, user.id);
  expect(pick(withKit, PASSWORD_WRAP_COLUMNS)).toEqual(pick(before, PASSWORD_WRAP_COLUMNS));
  for (const column of RECOVERY_WRAP_COLUMNS) expect(withKit[column], column).not.toBe(before[column]);
  expect((await unwrapMasterKey(words.join(" "), recoveryWrap(withKit))).equals(masterKey)).toBe(true);

  // The password is forgotten. "Forgot?" and the kit get the user back in.
  const replacementPassword = newPassword("After-Forgot");
  await page.reload();
  await expect(unlockTitle(page)).toBeVisible();
  await submitRecovery(page, words, replacementPassword);
  await expect(newRecoveryKitTitle(page)).toBeVisible();
  expect(await vaultKeyRows(admin, user.id)).toEqual([withKit]);
  const newWords = await saveRecoveryKit(page);
  await expect(backupHeading(page)).toBeVisible();

  const after = await onlyRow(admin, user.id);
  expect((await unwrapMasterKey(replacementPassword, passwordWrap(after))).equals(masterKey)).toBe(true);
  expect((await unwrapMasterKey(newWords.join(" "), recoveryWrap(after))).equals(masterKey)).toBe(true);
  await expect(unwrapMasterKey(masterPassword, passwordWrap(after))).rejects.toThrow();
  await expect(unwrapMasterKey(words.join(" "), recoveryWrap(after))).rejects.toThrow();

  const stored = await storedAbout(admin, user.id);
  for (const [secret, what] of [
    [words.join(" "), "the Recovery Kit made on the Backup page"],
    [newWords.join(" "), "the Recovery Kit made by the recovery"],
    [masterPassword, "the first master password"],
    [replacementPassword, "the new master password"],
  ]) {
    expectNoTraceOf(secret, stored);
    expectNeverSent(sent, secret, what);
  }
  expect(pageErrors).toEqual([]);
});

test("a new Recovery Kit from the Backup page replaces the old one only when it is finished: then the old words are refused and the new ones work", async ({
  page,
  admin,
  createUser,
  pageErrors,
}) => {
  test.slow();
  const user = await createUser({ premium: true });
  const masterPassword = newPassword("Renewal");
  const sent = recordRequests(page);
  const oldWords = await createMasterPassword(page, user, masterPassword);
  const before = await onlyRow(admin, user.id);
  const masterKey = await unwrapMasterKey(masterPassword, passwordWrap(before));

  await page.goto("/premium/backup");
  await unlockWith(page, masterPassword);
  await expect(backupHeading(page)).toBeVisible();

  // Started and cancelled: the old kit is still the kit.
  await askForNewKit(page, masterPassword);
  await expect(newRecoveryKitTitle(page)).toBeVisible();
  await page.getByRole("button", { name: "Cancel and keep my current kit" }).click();
  await expect(backupHeading(page)).toBeVisible();
  await expect(newRecoveryKitTitle(page)).toHaveCount(0);
  expect(await vaultKeyRows(admin, user.id)).toEqual([before]);

  // Started, words downloaded, page reloaded before finishing: still the old kit.
  await askForNewKit(page, masterPassword);
  await expect(newRecoveryKitTitle(page)).toBeVisible();
  const abandonedWords = await downloadRecoveryKit(page);
  await page.reload();
  await expect(unlockTitle(page)).toBeVisible();
  expect(await vaultKeyRows(admin, user.id)).toEqual([before]);
  await expect(unwrapMasterKey(abandonedWords.join(" "), recoveryWrap(before))).rejects.toThrow();
  expect((await unwrapMasterKey(oldWords.join(" "), recoveryWrap(before))).equals(masterKey)).toBe(true);

  // Finished.
  await unlockWith(page, masterPassword);
  await expect(backupHeading(page)).toBeVisible();
  await askForNewKit(page, masterPassword);
  await expect(newRecoveryKitTitle(page)).toBeVisible();
  const newWords = await saveRecoveryKit(page, FINISH_AND_REPLACE);
  await expect(page.getByText("New Recovery Kit active. The old words no longer work.").first()).toBeVisible();
  await expect(backupHeading(page)).toBeVisible();

  const after = await onlyRow(admin, user.id);
  expect(pick(after, PASSWORD_WRAP_COLUMNS)).toEqual(pick(before, PASSWORD_WRAP_COLUMNS));
  for (const column of RECOVERY_WRAP_COLUMNS) expect(after[column], column).not.toBe(before[column]);
  expect((await unwrapMasterKey(newWords.join(" "), recoveryWrap(after))).equals(masterKey)).toBe(true);
  await expect(unwrapMasterKey(oldWords.join(" "), recoveryWrap(after))).rejects.toThrow();
  await expect(unwrapMasterKey(abandonedWords.join(" "), recoveryWrap(after))).rejects.toThrow();
  // The master password still opens the vault: the kit is all that changed.
  expect((await unwrapMasterKey(masterPassword, passwordWrap(after))).equals(masterKey)).toBe(true);

  // Through the app: the old words and the abandoned ones are refused, the new ones work.
  const replacementPassword = newPassword("After-Renewal");
  await page.reload();
  await expect(unlockTitle(page)).toBeVisible();
  for (const refusedWords of [oldWords, abandonedWords]) {
    await submitRecovery(page, refusedWords, replacementPassword);
    await expectRecoveryRefused(page, WRONG_WORDS);
    await expect(newRecoveryKitTitle(page)).toHaveCount(0);
    await expect(page.getByText("Recover with Recovery Kit", { exact: true })).toBeVisible();
  }
  expect(await vaultKeyRows(admin, user.id)).toEqual([after]);

  await submitRecovery(page, newWords, replacementPassword);
  await expect(newRecoveryKitTitle(page)).toBeVisible();
  const lastWords = await saveRecoveryKit(page);
  await expect(backupHeading(page)).toBeVisible();
  const recovered = await onlyRow(admin, user.id);
  expect((await unwrapMasterKey(replacementPassword, passwordWrap(recovered))).equals(masterKey)).toBe(true);
  expect((await unwrapMasterKey(lastWords.join(" "), recoveryWrap(recovered))).equals(masterKey)).toBe(true);

  const stored = await storedAbout(admin, user.id);
  for (const [secret, what] of [
    [oldWords.join(" "), "the first Recovery Kit"],
    [abandonedWords.join(" "), "the abandoned Recovery Kit"],
    [newWords.join(" "), "the new Recovery Kit"],
    [lastWords.join(" "), "the Recovery Kit made by the recovery"],
    [masterPassword, "the master password"],
    [replacementPassword, "the new master password"],
  ]) {
    expectNoTraceOf(secret, stored);
    expectNeverSent(sent, secret, what);
  }
  expect(pageErrors).toEqual([]);
});

// ── The answer to a write is lost ───────────────────────────────────────────

test("when the answer to a new kit is lost, the app never says the old kit still works: it checks, and if it cannot check it says so", async ({
  page,
  admin,
  createUser,
  pageErrors,
}) => {
  test.slow();
  const user = await createUser({ premium: true });
  const masterPassword = newPassword("Lost-Answer");
  const oldWords = await createMasterPassword(page, user, masterPassword);
  const before = await onlyRow(admin, user.id);
  const masterKey = await unwrapMasterKey(masterPassword, passwordWrap(before));

  await page.goto("/premium/backup");
  await unlockWith(page, masterPassword);
  await expect(backupHeading(page)).toBeVisible();
  await askForNewKit(page, masterPassword);
  await expect(newRecoveryKitTitle(page)).toBeVisible();

  // The update reaches the server and is applied; only its answer is lost.
  // And for now the row cannot be read back either.
  let readsFail = true;
  let applied = 0;
  await page.route("**/rest/v1/user_vault_keys*", async (route) => {
    const method = route.request().method();
    if (method === "PATCH") {
      await route.fetch();
      applied += 1;
      await route.abort("connectionfailed");
    } else if (method === "GET" && readsFail) {
      await route.abort("connectionfailed");
    } else {
      await route.fallback();
    }
  });

  const newWords = await saveRecoveryKit(page, FINISH_AND_REPLACE);
  const failure = page.getByTestId("recovery-kit-failure");
  await expect(failure).toContainText("may or may not have gone through");
  await expect(failure).toContainText("Keep the words on this screen AND any Recovery Kit and Master Password you had before");
  expect(applied).toBe(1);

  // On the server the new kit IS the kit, and the old words are dead. So the
  // screen must not say the old kit keeps working, nor offer to keep it, nor
  // call this a failed save.
  const after = await onlyRow(admin, user.id);
  expect((await unwrapMasterKey(newWords.join(" "), recoveryWrap(after))).equals(masterKey)).toBe(true);
  await expect(unwrapMasterKey(oldWords.join(" "), recoveryWrap(after))).rejects.toThrow();
  await expect(page.getByTestId("recovery-kit-pending-note")).toHaveCount(0);
  await expect(page.getByText("keeps working", { exact: false })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Cancel and keep my current kit" })).toHaveCount(0);
  await expect(page.getByText("Could not save.", { exact: false })).toHaveCount(0);
  await expect(page.getByText("New Recovery Kit active.", { exact: false })).toHaveCount(0);
  // The words are still on screen for the user to keep.
  await expect(page.getByText(newWords[0], { exact: true }).first()).toBeVisible();

  // The connection is back: pressing again settles it, with the same words.
  await page.unroute("**/rest/v1/user_vault_keys*");
  await page.getByRole("button", { name: FINISH_AND_REPLACE }).click();
  await expect(page.getByText("New Recovery Kit active. The old words no longer work.").first()).toBeVisible();
  await expect(backupHeading(page)).toBeVisible();
  const settled = await onlyRow(admin, user.id);
  expect((await unwrapMasterKey(newWords.join(" "), recoveryWrap(settled))).equals(masterKey)).toBe(true);

  // Again, with the answer lost but the row readable: the app looks, finds
  // its own kit stored, and says so at once.
  await askForNewKit(page, masterPassword);
  await expect(newRecoveryKitTitle(page)).toBeVisible();
  readsFail = false;
  await page.route("**/rest/v1/user_vault_keys*", async (route) => {
    if (route.request().method() === "PATCH") {
      await route.fetch();
      await route.abort("connectionfailed");
    } else {
      await route.fallback();
    }
  });
  const lastWords = await saveRecoveryKit(page, FINISH_AND_REPLACE);
  await expect(page.getByText("New Recovery Kit active. The old words no longer work.").first()).toBeVisible();
  await expect(backupHeading(page)).toBeVisible();
  await expect(page.getByText("Could not save.", { exact: false })).toHaveCount(0);
  await page.unroute("**/rest/v1/user_vault_keys*");

  const last = await onlyRow(admin, user.id);
  expect((await unwrapMasterKey(lastWords.join(" "), recoveryWrap(last))).equals(masterKey)).toBe(true);
  await expect(unwrapMasterKey(newWords.join(" "), recoveryWrap(last))).rejects.toThrow();
  expect(pick(last, PASSWORD_WRAP_COLUMNS)).toEqual(pick(before, PASSWORD_WRAP_COLUMNS));
  expect(pageErrors).toEqual([]);
});
