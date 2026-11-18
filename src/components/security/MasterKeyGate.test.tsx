/**
 * MasterKeyGate + MasterPasswordScreen: the Recovery Kit step (backlog F-10).
 *
 * The bug: the gate rendered the protected page the moment the key was
 * stored, which unmounted the screen that was about to show the Recovery Kit.
 * These tests walk the screens and hold that nothing protected renders, and
 * nothing is stored, until the kit has been saved and confirmed.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", async () => (await import("@/test/fakeVaultKeysBackend")).supabaseClientModule);
vi.mock("@/hooks/useAuth", async () => (await import("@/test/fakeVaultKeysBackend")).useAuthModule);

import { backend, FIRST_USER_ID } from "@/test/fakeVaultKeysBackend";
import { LocaleProvider } from "@/i18n/useLocale";
import { VaultKeyProvider } from "@/contexts/VaultKeyContext";
import { createWrappedMasterKey, generateRecoveryPhrase, wrapMasterKeyForRecovery } from "@/utils/crypto";
import { MasterKeyGate } from "./MasterKeyGate";

const PROTECTED = "the protected page";
const PASSWORD = "a-long-master-password";

function renderGate() {
  return render(
    <LocaleProvider>
      <VaultKeyProvider>
        <MasterKeyGate>
          <div>{PROTECTED}</div>
        </MasterKeyGate>
      </VaultKeyProvider>
    </LocaleProvider>,
  );
}

let clipboard = "";

beforeEach(() => {
  backend.reset();
  localStorage.setItem("resilient_locale", "en");
  clipboard = "";
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: async (text: string) => {
        clipboard = text;
      },
    },
  });
});

/** Copies the kit, ticks the confirmation and presses the way on. */
async function saveKitAndFinish(finishLabel: string) {
  const finish = screen.getByRole("button", { name: finishLabel });
  const confirm = screen.getByRole("checkbox", { name: /I confirm I have saved the recovery phrase/ });
  expect(finish).toBeDisabled();
  expect(confirm).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Copy" }));
  await waitFor(() => expect(confirm).toBeEnabled());
  expect(finish).toBeDisabled();
  fireEvent.click(confirm);
  fireEvent.click(finish);
  return clipboard;
}

describe("creating a master password behind the gate", () => {
  it("shows the Recovery Kit, and neither stores the key nor renders the page until it is confirmed", async () => {
    renderGate();
    await screen.findByText("Create your Master Password");
    expect(screen.getByText("Step 1 of 2 — Next you will save the Recovery Kit.")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Minimum 12 characters"), { target: { value: PASSWORD } });
    fireEvent.change(screen.getByLabelText("Confirm Master Password"), { target: { value: PASSWORD } });
    fireEvent.click(screen.getByRole("checkbox", { name: /I understand that if I lose both/ }));
    fireEvent.click(screen.getByRole("button", { name: "Create and generate Recovery Kit" }));

    await screen.findByText("Save your Recovery Kit");
    expect(screen.getByTestId("recovery-kit-pending-note")).toHaveTextContent(
      "Your Master Password is not saved until you finish this step.",
    );
    expect(screen.queryByText(PROTECTED)).not.toBeInTheDocument();
    expect(backend.rows).toEqual([]);

    const words = await saveKitAndFinish("Finish and enter the Vault");
    await screen.findByText(PROTECTED);
    expect(words.split(" ")).toHaveLength(24);
    expect(screen.queryByText("Save your Recovery Kit")).not.toBeInTheDocument();
    expect(backend.rows).toHaveLength(1);
    expect(JSON.stringify(backend.rows)).not.toContain(words);
  });

  it("starts again from the create form when the screen is left before the kit is confirmed", async () => {
    const first = renderGate();
    await screen.findByText("Create your Master Password");
    fireEvent.change(screen.getByPlaceholderText("Minimum 12 characters"), { target: { value: PASSWORD } });
    fireEvent.change(screen.getByLabelText("Confirm Master Password"), { target: { value: PASSWORD } });
    fireEvent.click(screen.getByRole("checkbox", { name: /I understand that if I lose both/ }));
    fireEvent.click(screen.getByRole("button", { name: "Create and generate Recovery Kit" }));
    await screen.findByText("Save your Recovery Kit");
    first.unmount();

    renderGate();
    await screen.findByText("Create your Master Password");
    expect(screen.queryByText("Save your Recovery Kit")).not.toBeInTheDocument();
    expect(screen.queryByText("Unlock the Vault")).not.toBeInTheDocument();
    expect(screen.queryByText(PROTECTED)).not.toBeInTheDocument();
    expect(backend.rows).toEqual([]);
  });

  it("keeps the kit on screen and the page closed when the key cannot be stored", async () => {
    renderGate();
    await screen.findByText("Create your Master Password");
    fireEvent.change(screen.getByPlaceholderText("Minimum 12 characters"), { target: { value: PASSWORD } });
    fireEvent.change(screen.getByLabelText("Confirm Master Password"), { target: { value: PASSWORD } });
    fireEvent.click(screen.getByRole("checkbox", { name: /I understand that if I lose both/ }));
    fireEvent.click(screen.getByRole("button", { name: "Create and generate Recovery Kit" }));
    await screen.findByText("Save your Recovery Kit");

    backend.failNextWrite = { message: "Failed to fetch" };
    const words = await saveKitAndFinish("Finish and enter the Vault");
    await screen.findByText(/Could not save\./);
    expect(screen.queryByText(PROTECTED)).not.toBeInTheDocument();
    expect(screen.getByText("Save your Recovery Kit")).toBeInTheDocument();
    expect(screen.getByText(words.split(" ")[0], { selector: "span" })).toBeInTheDocument();
    expect(backend.rows).toEqual([]);

    fireEvent.click(screen.getByRole("button", { name: "Finish and enter the Vault" }));
    await screen.findByText(PROTECTED);
    expect(backend.rows).toHaveLength(1);
  });
});

async function createAndReachKit() {
  await screen.findByText("Create your Master Password");
  fireEvent.change(screen.getByPlaceholderText("Minimum 12 characters"), { target: { value: PASSWORD } });
  fireEvent.change(screen.getByLabelText("Confirm Master Password"), { target: { value: PASSWORD } });
  fireEvent.click(screen.getByRole("checkbox", { name: /I understand that if I lose both/ }));
  fireEvent.click(screen.getByRole("button", { name: "Create and generate Recovery Kit" }));
  await screen.findByText("Save your Recovery Kit");
}

describe("another device creates the master password first", () => {
  it("drops the kit and keeps telling the user it is void, on the unlock screen, until they are in", async () => {
    renderGate();
    await createAndReachKit();

    // Meanwhile, elsewhere: a master password for the same account.
    const elsewhere = await createWrappedMasterKey("the-password-set-elsewhere");
    backend.rows.push({ user_id: FIRST_USER_ID, ...elsewhere.wrapped });
    const before = backend.snapshot();

    const voidWords = await saveKitAndFinish("Finish and enter the Vault");
    await screen.findByText("Unlock the Vault");
    const notice = screen.getByTestId("void-kit-notice");
    expect(notice).toHaveTextContent("was NOT saved and its words will never work");
    expect(notice).toHaveTextContent("delete it");
    // The void words are gone from the screen, and nothing was written.
    expect(screen.queryByText("Save your Recovery Kit")).not.toBeInTheDocument();
    expect(screen.queryByText(voidWords.split(" ")[0], { selector: "span" })).not.toBeInTheDocument();
    expect(screen.queryByText(PROTECTED)).not.toBeInTheDocument();
    expect(backend.rows).toEqual(before);

    // It is not a message that passes: a wrong password later, it is still there.
    fireEvent.change(screen.getByPlaceholderText("Master Password"), { target: { value: "not-the-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Unlock" }));
    await waitFor(() => expect(screen.getByPlaceholderText("Master Password")).toHaveValue(""));
    expect(screen.getByTestId("void-kit-notice")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Master Password"), { target: { value: "the-password-set-elsewhere" } });
    fireEvent.click(screen.getByRole("button", { name: "Unlock" }));
    await screen.findByText(PROTECTED);
  });
});

describe("a save that cannot be confirmed, behind the gate", () => {
  it("creating: says the outcome is unknown, keeps the page closed, and a second press settles it", async () => {
    renderGate();
    await createAndReachKit();

    backend.failNextWrite = { message: "Failed to fetch", applyAnyway: true };
    backend.failReads = 1;
    await saveKitAndFinish("Finish and enter the Vault");

    const alert = await screen.findByTestId("recovery-kit-failure");
    expect(alert).toHaveTextContent("may or may not have gone through");
    expect(screen.queryByTestId("recovery-kit-pending-note")).not.toBeInTheDocument();
    expect(screen.queryByText(/nothing is kept/)).not.toBeInTheDocument();
    expect(screen.queryByText(PROTECTED)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Finish and enter the Vault" }));
    await screen.findByText(PROTECTED);
    expect(backend.rows).toHaveLength(1);
  });

  it("recovering: the update landed and the answer was lost, so the vault opens and nothing says 'not saved'", async () => {
    const { wrapped, masterKey } = await createWrappedMasterKey("the-forgotten-password");
    const phrase = generateRecoveryPhrase();
    const recovery = await wrapMasterKeyForRecovery(masterKey, phrase);
    backend.rows.push({
      user_id: FIRST_USER_ID,
      ...wrapped,
      recovery_encrypted_master_key: recovery.encrypted,
      recovery_iv: recovery.iv,
      recovery_salt: recovery.salt,
    });
    const before = backend.snapshot();

    renderGate();
    await screen.findByText("Unlock the Vault");
    fireEvent.click(screen.getByRole("button", { name: "Forgot?" }));
    fireEvent.change(screen.getByLabelText("Recovery phrase (24 words)"), { target: { value: phrase } });
    fireEvent.change(screen.getByPlaceholderText("Minimum 12 characters"), { target: { value: PASSWORD } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: PASSWORD } });
    fireEvent.click(screen.getByRole("button", { name: "Recover and set new password" }));
    await screen.findByText("Save your new Recovery Kit");

    backend.failNextWrite = { message: "Failed to fetch", applyAnyway: true };
    await saveKitAndFinish("Finish and enter the Vault");
    await screen.findByText(PROTECTED);
    expect(screen.queryByText(/Could not save/)).not.toBeInTheDocument();
    expect(backend.rows[0].recovery_encrypted_master_key).not.toBe(before[0].recovery_encrypted_master_key);
  });

  it("recovering: nothing can be read back, so it stops saying the entered words still work", async () => {
    const { wrapped, masterKey } = await createWrappedMasterKey("the-forgotten-password");
    const phrase = generateRecoveryPhrase();
    const recovery = await wrapMasterKeyForRecovery(masterKey, phrase);
    backend.rows.push({
      user_id: FIRST_USER_ID,
      ...wrapped,
      recovery_encrypted_master_key: recovery.encrypted,
      recovery_iv: recovery.iv,
      recovery_salt: recovery.salt,
    });

    renderGate();
    await screen.findByText("Unlock the Vault");
    fireEvent.click(screen.getByRole("button", { name: "Forgot?" }));
    fireEvent.change(screen.getByLabelText("Recovery phrase (24 words)"), { target: { value: phrase } });
    fireEvent.change(screen.getByPlaceholderText("Minimum 12 characters"), { target: { value: PASSWORD } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: PASSWORD } });
    fireEvent.click(screen.getByRole("button", { name: "Recover and set new password" }));
    await screen.findByText("Save your new Recovery Kit");
    expect(screen.getByTestId("recovery-kit-pending-note")).toHaveTextContent("the words you just entered still work");

    backend.failNextWrite = { message: "Failed to fetch", applyAnyway: true };
    backend.failReads = 1;
    await saveKitAndFinish("Finish and enter the Vault");

    expect(await screen.findByTestId("recovery-kit-failure")).toHaveTextContent("may or may not have gone through");
    expect(screen.queryByText(/still work/)).not.toBeInTheDocument();
    expect(screen.queryByText(/nothing changes/)).not.toBeInTheDocument();
    expect(screen.queryByText(PROTECTED)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Finish and enter the Vault" }));
    await screen.findByText(PROTECTED);
  });
});

describe("recovering behind the gate", () => {
  it("asks for the kit's words, then makes a new kit be saved before the page renders or anything changes", async () => {
    const { wrapped, masterKey } = await createWrappedMasterKey("the-forgotten-password");
    const phrase = generateRecoveryPhrase();
    const recovery = await wrapMasterKeyForRecovery(masterKey, phrase);
    backend.rows.push({
      user_id: FIRST_USER_ID,
      ...wrapped,
      recovery_encrypted_master_key: recovery.encrypted,
      recovery_iv: recovery.iv,
      recovery_salt: recovery.salt,
    });
    const before = backend.snapshot();

    renderGate();
    await screen.findByText("Unlock the Vault");
    fireEvent.click(screen.getByRole("button", { name: "Forgot?" }));
    expect(screen.getByTestId("recovery-never-shown-note")).toHaveTextContent("If you were never shown 24 words");

    // Words that are not the kit: refused in the form itself, where the
    // message stays, and nothing changes.
    const notTheKit = phrase.split(" ").reverse().join(" ");
    fireEvent.change(screen.getByLabelText("Recovery phrase (24 words)"), { target: { value: notTheKit } });
    fireEvent.change(screen.getByPlaceholderText("Minimum 12 characters"), { target: { value: PASSWORD } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: PASSWORD } });
    fireEvent.click(screen.getByRole("button", { name: "Recover and set new password" }));
    await screen.findByText("These words do not open this account. Check them and try again.");
    expect(screen.queryByText("Save your new Recovery Kit")).not.toBeInTheDocument();
    expect(screen.queryByText(PROTECTED)).not.toBeInTheDocument();
    expect(backend.rows).toEqual(before);

    fireEvent.change(screen.getByLabelText("Recovery phrase (24 words)"), { target: { value: phrase } });
    fireEvent.click(screen.getByRole("button", { name: "Recover and set new password" }));

    await screen.findByText("Save your new Recovery Kit");
    expect(screen.getByTestId("recovery-kit-pending-note")).toHaveTextContent(
      "Your new Master Password is not active until you finish this step.",
    );
    expect(screen.queryByText(PROTECTED)).not.toBeInTheDocument();
    expect(backend.rows).toEqual(before);

    const newWords = await saveKitAndFinish("Finish and enter the Vault");
    await screen.findByText(PROTECTED);
    expect(newWords).not.toBe(phrase);
    expect(backend.rows[0].encrypted_master_key).not.toBe(before[0].encrypted_master_key);
    expect(backend.rows[0].recovery_encrypted_master_key).not.toBe(before[0].recovery_encrypted_master_key);
  });
});
