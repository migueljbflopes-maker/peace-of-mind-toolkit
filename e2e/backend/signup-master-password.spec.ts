import type { APIRequestContext, Page } from "@playwright/test";
import { findUserByEmail } from "../../scripts/seed-local.mjs";
import { test, expect, signInThroughUi } from "./fixtures";
import {
  type VaultKeyRow,
  bytes,
  createButton,
  expectNeverSent,
  expectNoTraceOf,
  fillNewMasterPassword,
  openVault,
  passwordWrap,
  recordRequests,
  recoveryKitTitle,
  recoveryWrap,
  saveRecoveryKit,
  storedAbout,
  unlockTitle,
  unlockWith,
  unwrapMasterKey,
  vaultKeyRows,
  wrappedKeyRow,
} from "./vault-keys";

// Backlog F-01: sign up, sign in, set the master password.
// (The Recovery Kit beyond the step after creation: recovery-kit.spec.ts.)
//
// The journey is walked as a new user on a phone walks it, through the real
// screens. The account is created through the sign-up form, never by the
// admin client: `admin` is used only to look at what was stored, to stand in
// for a purchase (F-07 tests buying), and to delete the user afterwards.

// Every test here starts signed out.
test.use({ storageState: { cookies: [], origins: [] } });

const MAILPIT = process.env.E2E_MAILPIT_URL ?? "http://127.0.0.1:54324";

const VAULT_KEY_COLUMNS = [
  "created_at",
  "encrypted_master_key",
  "iv",
  "kdf_iterations",
  "recovery_encrypted_master_key",
  "recovery_iv",
  "recovery_salt",
  "salt",
  "updated_at",
  "user_id",
  "version",
];

// ── Accounts made through the UI are deleted here ───────────────────────────

const signedUpEmails = new Set<string>();

function newEmail(prefix: string) {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `${prefix}-${unique}@e2e.amiready.test`;
  signedUpEmails.add(email);
  return email;
}

test.afterEach(async ({ admin }) => {
  for (const email of signedUpEmails) {
    const user = await findUserByEmail(admin, email);
    if (user) await admin.auth.admin.deleteUser(user.id);
  }
  signedUpEmails.clear();
});

// ── Steps a user takes ──────────────────────────────────────────────────────

async function signUpWithPassword(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByRole("tab", { name: "Password" }).click();
  // The form opens in "log in" mode; the link under it switches to sign-up.
  await page.getByRole("button", { name: "Sign up" }).click();

  const form = page.locator("form");
  await form.getByLabel("Email").fill(email);
  await form.getByLabel("Password", { exact: true }).fill(password);
  await form.getByLabel("Confirm password").fill(password);

  // The account cannot be created before the terms are accepted.
  const submit = form.getByRole("button", { name: "Sign up" });
  await expect(submit).toBeDisabled();
  await form.getByRole("checkbox", { name: /I agree to the/ }).click();
  await expect(submit).toBeEnabled();

  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/auth/v1/signup") && r.request().method() === "POST"),
    submit.click(),
  ]);
  expect(response.status(), `sign-up was refused: ${await response.text()}`).toBe(200);
}

async function expectSignedInOnDashboard(page: Page, email: string) {
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
  // The phone menu names the account that is signed in.
  await page.getByRole("button", { name: "Toggle menu" }).click();
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
  await page.getByRole("button", { name: "Toggle menu" }).click();
}

/** Dashboard → "Secure" → "Vault Setup": the way the app leads to the vault. */
async function tapVaultSetupOnDashboard(page: Page) {
  const secure = page.getByRole("button", { name: /^Secure/ });
  const step = page.getByRole("heading", { name: "Vault Setup" });
  await expect(secure).toBeVisible();
  if (!(await step.isVisible())) await secure.click();
  await step.click();
}

async function signOutFromPhoneMenu(page: Page) {
  await page.getByRole("button", { name: "Toggle menu" }).click();
  await page.getByRole("button", { name: "Log out" }).click();
}

async function latestMailLink(request: APIRequestContext, to: string): Promise<string> {
  let link = "";
  await expect
    .poll(
      async () => {
        const search = await request.get(`${MAILPIT}/api/v1/search`, { params: { query: `to:"${to}"` } });
        if (!search.ok()) return `Mailpit answered ${search.status()}`;
        const id = (await search.json()).messages?.[0]?.ID;
        if (!id) return "no mail yet";
        const message = await (await request.get(`${MAILPIT}/api/v1/message/${id}`)).json();
        const found = /https?:\/\/[^\s"'<>)]+\/auth\/v1\/verify[^\s"'<>)]*/.exec(`${message.HTML}\n${message.Text}`);
        link = found ? found[0].replace(/&amp;/g, "&") : "";
        return link ? "link" : "mail without a sign-in link";
      },
      { message: `a sign-in mail for ${to} in Mailpit (${MAILPIT})`, timeout: 15_000 },
    )
    .toBe("link");
  return link;
}

// ── The journey ─────────────────────────────────────────────────────────────

test("a new user signs up, sets a master password, signs out, signs in again and unlocks with it", async ({
  page,
  admin,
  pageErrors,
}) => {
  test.slow();
  const email = newEmail("signup");
  const accountPassword = `acct-${Math.random().toString(36).slice(2, 10)}-pw`;
  const masterPassword = `master-${Math.random().toString(36).slice(2, 10)}-Horse-Staple`;

  // "Password never leaves your device": nothing the page sends may carry it,
  // nor the words of the Recovery Kit.
  const sent = recordRequests(page);

  let userId = "";

  await test.step("creates an account with email and password and lands signed in", async () => {
    await signUpWithPassword(page, email, accountPassword);
    await expectSignedInOnDashboard(page, email);

    const user = await findUserByEmail(admin, email);
    expect(user, "the account exists on the server").toBeTruthy();
    userId = user!.id;
    // Signing up does not ask for, or create, a master password.
    expect(await vaultKeyRows(admin, userId)).toEqual([]);
  });

  await test.step("a new account has bought nothing: the vault step leads to the price", async () => {
    await expect(page.getByText("Premium Feature").first()).toBeVisible();
    await tapVaultSetupOnDashboard(page);
    await expect(page).toHaveURL(/\/pricing\?return_url=%2Fpremium%2Fvault$/);
    await page.goBack();
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
  });

  await test.step("after a purchase (stood in for here) the vault asks for a new master password", async () => {
    const granted = await admin
      .from("premium_entitlements")
      .upsert({ user_id: userId, is_premium: true }, { onConflict: "user_id" });
    expect(granted.error).toBeNull();
    await page.reload();
    await expect(page.getByText("Hold 3s to activate")).toBeVisible();

    await tapVaultSetupOnDashboard(page);
    await expect(page).toHaveURL(/\/premium\/vault$/);
    await expect(page.getByText("Create your Master Password", { exact: true })).toBeVisible();
    await expect(page.getByText("Step 1 of 2 — Next you will save the Recovery Kit.")).toBeVisible();
    await expect(openVault(page)).toHaveCount(0);
  });

  await test.step("a short or mistyped master password cannot be submitted", async () => {
    await page.getByPlaceholder("Minimum 12 characters").fill("short");
    await expect(page.getByText("Minimum 12 characters.", { exact: true })).toBeVisible();
    await page.getByPlaceholder("Minimum 12 characters").fill(masterPassword);
    await page.getByLabel("Confirm Master Password").fill(`${masterPassword}x`);
    await page.getByRole("checkbox", { name: /I understand that if I lose both/ }).check();
    await expect(page.getByText("Passwords do not match.", { exact: true })).toBeVisible();
    await expect(createButton(page)).toBeDisabled();
    expect(await vaultKeyRows(admin, userId)).toEqual([]);
  });

  let recoveryWords: string[] = [];
  let storedRow: VaultKeyRow = {};

  await test.step("sets the master password, saves the Recovery Kit and enters the vault", async () => {
    await fillNewMasterPassword(page, masterPassword);
    await createButton(page).click();

    // Step 2 of 2, as promised: the Recovery Kit, before anything else.
    await expect(recoveryKitTitle(page)).toBeVisible();
    await expect(openVault(page)).toHaveCount(0);
    // Until the kit is saved nothing is stored, and the app does not say
    // the master password was created.
    await expect(page.getByText("Master Password created.", { exact: true })).toHaveCount(0);
    expect(await vaultKeyRows(admin, userId)).toEqual([]);

    recoveryWords = await saveRecoveryKit(page);
    await expect(page.getByText("Master Password created.", { exact: true })).toBeVisible();
    await expect(openVault(page)).toBeVisible();
  });

  await test.step("the server holds one wrapped key and nothing that reveals the master password", async () => {
    const rows = await vaultKeyRows(admin, userId);
    expect(rows).toHaveLength(1);
    storedRow = rows[0];

    // No column beyond the ones the wrapped-key scheme needs.
    expect(Object.keys(storedRow).sort()).toEqual(VAULT_KEY_COLUMNS);
    expect(storedRow.user_id).toBe(userId);
    expect(storedRow.kdf_iterations).toBe(250_000);
    // 256-bit key + 128-bit AES-GCM tag, 96-bit IV, 128-bit salt; twice.
    expect(bytes(storedRow.encrypted_master_key)).toHaveLength(48);
    expect(bytes(storedRow.iv)).toHaveLength(12);
    expect(bytes(storedRow.salt)).toHaveLength(16);
    expect(bytes(storedRow.recovery_encrypted_master_key)).toHaveLength(48);
    expect(bytes(storedRow.recovery_iv)).toHaveLength(12);
    expect(bytes(storedRow.recovery_salt)).toHaveLength(16);
    expect(storedRow.recovery_salt).not.toBe(storedRow.salt);
    expect(storedRow.recovery_encrypted_master_key).not.toBe(storedRow.encrypted_master_key);

    // Neither secret is readable in the key row, the profile, the vault or
    // the auth user.
    expect(recoveryWords).toHaveLength(24);
    const stored = await storedAbout(admin, userId);
    expectNoTraceOf(masterPassword, stored);
    expectNoTraceOf(recoveryWords.join(" "), stored);

    // The key column really is wrapped by the master password: only the right
    // password opens it, and the Recovery Kit opens the same key.
    const byPassword = passwordWrap(storedRow);
    const masterKey = await unwrapMasterKey(masterPassword, byPassword);
    expect(masterKey).toHaveLength(32);
    await expect(unwrapMasterKey(`${masterPassword}x`, byPassword)).rejects.toThrow();
    await expect(unwrapMasterKey(accountPassword, byPassword)).rejects.toThrow();
    await expect(unwrapMasterKey("", byPassword)).rejects.toThrow();
    const byKit = await unwrapMasterKey(recoveryWords.join(" "), recoveryWrap(storedRow));
    expect(byKit.equals(masterKey)).toBe(true);
    // The kit is its own secret: the master password does not open its wrap.
    await expect(unwrapMasterKey(masterPassword, recoveryWrap(storedRow))).rejects.toThrow();
    expectNoTraceOf(masterKey.toString("base64"), storedRow);
  });

  await test.step("signs out: the session is gone and the back button shows nothing protected", async () => {
    await signOutFromPhoneMenu(page);
    await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/$/);
    await page.getByRole("button", { name: "Toggle menu" }).click();
    await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
    await expect(page.getByText(email, { exact: true })).toHaveCount(0);

    const left = await page.evaluate(async () => ({
      authTokens: Object.keys(localStorage).filter((key) => key.startsWith("sb-") && key.endsWith("-auth-token")),
      databases: (await indexedDB.databases()).map((db) => db.name),
    }));
    expect(left.authTokens).toEqual([]);
    expect(left.databases).not.toContain("resilient_vault");

    await page.goBack();
    await expect(page).toHaveURL(/\/login\?return_url=/);
    await expect(openVault(page)).toHaveCount(0);
    await expect(unlockTitle(page)).toHaveCount(0);
    await expect(page.getByText("Hold 3s to activate")).toHaveCount(0);
  });

  await test.step("signs in again and unlocks the vault with the same master password", async () => {
    await signInThroughUi(page, { email, password: accountPassword });
    await expect(page.getByText("Welcome back!", { exact: true })).toBeVisible();
    await expect(page.getByText("Hold 3s to activate")).toBeVisible();

    await tapVaultSetupOnDashboard(page);
    await expect(page).toHaveURL(/\/premium\/vault$/);
    // Asked to unlock, not to create a second master password.
    await expect(unlockTitle(page)).toBeVisible();
    await expect(page.getByText("Create your Master Password")).toHaveCount(0);
    await expect(openVault(page)).toHaveCount(0);

    await unlockWith(page, masterPassword);
    await expect(openVault(page)).toBeVisible();
    await expect(unlockTitle(page)).toHaveCount(0);
  });

  await test.step("signing in and unlocking left the stored key exactly as it was", async () => {
    expect(await vaultKeyRows(admin, userId)).toEqual([storedRow]);
  });

  expectNeverSent(sent, masterPassword, "the master password");
  expectNeverSent(sent, recoveryWords.join(" "), "the Recovery Kit");
  expect(pageErrors).toEqual([]);
});

// ── The Recovery Kit step ───────────────────────────────────────────────────

test("after creating a master password the Recovery Kit must be saved before the vault opens", async ({
  page,
  admin,
  createUser,
  pageErrors,
}) => {
  const user = await createUser({ premium: true });
  const masterPassword = `master-${Math.random().toString(36).slice(2, 10)}-Kit-Check`;
  await signInThroughUi(page, user);
  await page.goto("/premium/vault");

  await fillNewMasterPassword(page, masterPassword);
  await createButton(page).click();

  // The screen before this one promised it: "Step 1 of 2 — Next you will
  // save the Recovery Kit." It is the only way back in if the password is lost.
  await expect(recoveryKitTitle(page)).toBeVisible();
  await expect(page.getByText("We cannot show these words again.", { exact: false })).toBeVisible();
  await expect(openVault(page)).toHaveCount(0);
  // The screen says what leaving now means, and it is true: nothing is stored yet.
  await expect(page.getByText("Your Master Password is not saved until you finish this step.", { exact: false })).toBeVisible();
  expect(await vaultKeyRows(admin, user.id)).toEqual([]);

  const words = await saveRecoveryKit(page);
  await expect(openVault(page)).toBeVisible();

  // The words handed to the user open the key the server holds, and are not on the server.
  const [row] = await vaultKeyRows(admin, user.id);
  expectNoTraceOf(words.join(" "), row);
  const masterKey = await unwrapMasterKey(words.join(" "), recoveryWrap(row));
  expect(masterKey).toHaveLength(32);
  // The same key the master password opens.
  expect((await unwrapMasterKey(masterPassword, passwordWrap(row))).equals(masterKey)).toBe(true);
  expect(pageErrors).toEqual([]);
});

// ── Unlocking ───────────────────────────────────────────────────────────────

test("a wrong master password is refused with a clear message and the right one still works", async ({
  page,
  admin,
  createUser,
  pageErrors,
}) => {
  // Arranged directly: a premium account that already has a master password.
  // (Setting one through the screens is the journey above.)
  const user = await createUser({ premium: true });
  const masterPassword = `master-${Math.random().toString(36).slice(2, 10)}-Right-One`;
  const inserted = await admin.from("user_vault_keys").insert(await wrappedKeyRow(user.id, masterPassword));
  expect(inserted.error).toBeNull();
  const [before] = await vaultKeyRows(admin, user.id);

  await signInThroughUi(page, user);
  await page.goto("/premium/vault");
  await expect(unlockTitle(page)).toBeVisible();

  // Wrong, three times: each is refused in words, and nothing opens.
  for (const wrong of [`${masterPassword}x`, masterPassword.toUpperCase(), user.password]) {
    await unlockWith(page, wrong);
    await expect(page.getByText("Incorrect master password.", { exact: true }).last()).toBeVisible();
    await expect(unlockTitle(page)).toBeVisible();
    await expect(openVault(page)).toHaveCount(0);
    await expect(page.getByText("Encrypted Vault")).toHaveCount(0);
    // The field is emptied for the next try.
    await expect(page.getByPlaceholder("Master Password")).toHaveValue("");
  }
  // An empty field cannot be submitted at all.
  await expect(page.getByRole("button", { name: "Unlock", exact: true })).toBeDisabled();

  // No lockout: the right password opens the vault straight afterwards.
  await unlockWith(page, masterPassword);
  await expect(openVault(page)).toBeVisible();
  await expect(unlockTitle(page)).toHaveCount(0);

  // The key lives in memory only. The unlock screen says "for this session";
  // a reload ends it: locked again, and the same password opens it again.
  await page.reload();
  await expect(unlockTitle(page)).toBeVisible();
  await expect(page.getByText("Enter your Master Password to decrypt your data for this session.")).toBeVisible();
  await expect(openVault(page)).toHaveCount(0);
  await unlockWith(page, masterPassword);
  await expect(openVault(page)).toBeVisible();

  // Failed and successful unlocks wrote nothing to the key row.
  expect(await vaultKeyRows(admin, user.id)).toEqual([before]);
  expect(pageErrors).toEqual([]);
});

// ── Signed out ──────────────────────────────────────────────────────────────

test("signed out, the vault address offers a way to sign in instead of an empty page", async ({
  page,
  pageErrors,
}) => {
  test.fail(true, "Backlog F-11: signed out, the routes behind the master password gate render an empty page.");
  await page.goto("/premium/vault");
  // Either the vault's own sign-in card or the sign-in page.
  await expect(page.getByRole("button", { name: /Log in \/ Create account|Send magic link/ })).toBeVisible();
  await expect(openVault(page)).toHaveCount(0);
  await expect(unlockTitle(page)).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});

// ── Magic link ──────────────────────────────────────────────────────────────

test("a new user signs up with a magic link from the email and lands signed in", async ({
  page,
  admin,
  request,
  pageErrors,
}) => {
  const email = newEmail("magic");

  // The sign-in page opens on the Magic Link tab: it is the default way in.
  await page.goto("/login");
  await expect(page.getByRole("tab", { name: "Magic Link" })).toHaveAttribute("aria-selected", "true");
  await page.getByLabel("Email").fill(email);
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/auth/v1/otp") && r.request().method() === "POST"),
    page.getByRole("button", { name: "Send magic link" }).click(),
  ]);
  expect(response.status(), `the magic link request was refused: ${await response.text()}`).toBe(200);

  await expect(page.getByText("Check your inbox", { exact: true })).toBeVisible();
  await expect(page.getByText(email, { exact: true })).toBeVisible();

  // The mail the local auth server "sent" (it lands in Mailpit, nowhere else).
  const link = await latestMailLink(request, email);
  await page.goto(link);

  await expect(page).toHaveURL(/\/dashboard$/);
  await expectSignedInOnDashboard(page, email);

  const user = await findUserByEmail(admin, email);
  expect(user?.email_confirmed_at, "the address is confirmed by following the link").toBeTruthy();
  // No master password yet: it is first asked for at the vault.
  expect(await vaultKeyRows(admin, user!.id)).toEqual([]);
  expect(pageErrors).toEqual([]);
});
