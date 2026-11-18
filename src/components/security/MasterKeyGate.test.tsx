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
