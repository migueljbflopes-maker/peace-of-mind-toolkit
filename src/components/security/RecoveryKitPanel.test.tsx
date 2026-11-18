/**
 * RecoveryKitPanel: what it says and offers when a save cannot be confirmed
 * (backlog F-10, verifier's finding).
 *
 * When the answer to the write is lost, the write may have gone through. For
 * a new kit that means the OLD words may already be dead. The panel must then
 * neither say "your current kit keeps working" nor offer "cancel and keep my
 * current kit".
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", async () => (await import("@/test/fakeVaultKeysBackend")).supabaseClientModule);

import { LocaleProvider } from "@/i18n/useLocale";
import { translations } from "@/i18n/translations";
import type { VaultKeyFailure } from "@/contexts/VaultKeyContext";
import { RecoveryKitPanel } from "./RecoveryKitPanel";

const en = translations.en.recoveryKit;
const WORDS = Array.from({ length: 24 }, (_, i) => `word${i}`).join(" ");

type Outcome = { ok: true } | VaultKeyFailure;
const failure = (code: VaultKeyFailure["code"]): VaultKeyFailure => ({ ok: false, code, error: code });

function renderPanel(mode: "setup" | "recovery" | "renewal", outcomes: Outcome[], onCancel?: () => void) {
  const onConfirm = vi.fn(async () => outcomes.shift() ?? { ok: true as const });
  render(
    <LocaleProvider>
      <RecoveryKitPanel recoveryPhrase={WORDS} mode={mode} onConfirm={onConfirm} onCancel={onCancel} isPt={false} />
    </LocaleProvider>,
  );
  return onConfirm;
}

async function saveAndPress(finishLabel: string) {
  fireEvent.click(screen.getByRole("button", { name: "Copy" }));
  const confirm = screen.getByRole("checkbox", { name: /I confirm I have saved the recovery phrase/ });
  await waitFor(() => expect(confirm).toBeEnabled());
  fireEvent.click(confirm);
  fireEvent.click(screen.getByRole("button", { name: finishLabel }));
}

beforeEach(() => {
  localStorage.setItem("resilient_locale", "en");
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: async () => {} },
  });
});

describe("a new kit whose save cannot be confirmed", () => {
  it("claims neither outcome, withdraws 'keep my current kit', and lets the user try again", async () => {
    const onCancel = vi.fn();
    const onConfirm = renderPanel("renewal", [failure("outcome-unknown"), { ok: true }], onCancel);
    expect(screen.getByTestId("recovery-kit-pending-note")).toHaveTextContent(
      "Your current Recovery Kit keeps working until you finish this step.",
    );
    expect(screen.getByRole("button", { name: en.cancelRenewal })).toBeInTheDocument();

    await saveAndPress(en.finishRenewal);

    const alert = await screen.findByTestId("recovery-kit-failure");
    expect(alert).toHaveTextContent(en.outcomeUnknown);
    expect(alert).toHaveTextContent("may or may not have gone through");
    expect(alert).toHaveTextContent("Keep the words on this screen AND any Recovery Kit and Master Password you had before");
    // Nothing on screen says the old kit still works, or that this one failed.
    expect(screen.queryByTestId("recovery-kit-pending-note")).not.toBeInTheDocument();
    expect(screen.queryByText(/keeps working/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Could not save/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: en.cancelRenewal })).not.toBeInTheDocument();
    // The words are still there, and so is the way to settle it.
    expect(screen.getByText("word0")).toBeInTheDocument();
    const finish = screen.getByRole("button", { name: en.finishRenewal });
    expect(finish).toBeEnabled();

    fireEvent.click(finish);
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(2));
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("when the save is known to have failed, says so and still offers to keep the current kit", async () => {
    renderPanel("renewal", [failure("not-saved")], () => {});
    await saveAndPress(en.finishRenewal);

    expect(await screen.findByTestId("recovery-kit-failure")).toHaveTextContent(en.errorNotSaved);
    expect(screen.getByTestId("recovery-kit-pending-note")).toHaveTextContent("keeps working");
    expect(screen.getByRole("button", { name: en.cancelRenewal })).toBeInTheDocument();
  });
});

describe("a recovery whose save cannot be confirmed", () => {
  it("no longer says that nothing changes and the entered words still work", async () => {
    renderPanel("recovery", [failure("outcome-unknown")]);
    expect(screen.getByTestId("recovery-kit-pending-note")).toHaveTextContent("the words you just entered still work");

    await saveAndPress("Finish and enter the Vault");

    expect(await screen.findByTestId("recovery-kit-failure")).toHaveTextContent(en.outcomeUnknown);
    expect(screen.queryByTestId("recovery-kit-pending-note")).not.toBeInTheDocument();
    expect(screen.queryByText(/nothing changes/)).not.toBeInTheDocument();
    expect(screen.queryByText(/still work/)).not.toBeInTheDocument();
  });
});

describe("what the step says before anything is pressed", () => {
  it("ties 'nothing is kept' to leaving before the finish button, in each mode and both languages", () => {
    for (const language of ["en", "pt"] as const) {
      const k = translations[language].recoveryKit;
      const button = language === "en" ? "finish button" : "botão de concluir";
      for (const note of [k.pendingSetup, k.pendingRecovery, k.pendingRenewal]) {
        expect(note).toContain(button);
      }
      // The unknown state names both things to keep and forbids leaving.
      expect(k.outcomeUnknown).toMatch(language === "en" ? /may or may not/ : /pode ter ficado guardado ou não/);
      expect(k.outcomeUnknown).toMatch(language === "en" ? /Do not leave or reload/ : /Não saia nem recarregue/);
    }
  });
});
