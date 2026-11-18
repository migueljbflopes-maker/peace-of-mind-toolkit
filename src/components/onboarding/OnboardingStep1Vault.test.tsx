/**
 * Onboarding step 1 creates a master password outside the vault gate. It
 * follows the same Recovery Kit rule (backlog F-10): the key is stored when
 * the user confirms having saved the words, and not before.
 * (Its weaker form and kit screen are backlog F-15.)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", async () => (await import("@/test/fakeVaultKeysBackend")).supabaseClientModule);
vi.mock("@/hooks/useAuth", async () => (await import("@/test/fakeVaultKeysBackend")).useAuthModule);

import { backend } from "@/test/fakeVaultKeysBackend";
import { LocaleProvider } from "@/i18n/useLocale";
import { translations } from "@/i18n/translations";
import { VaultKeyProvider } from "@/contexts/VaultKeyContext";
import OnboardingStep1Vault from "./OnboardingStep1Vault";

const PASSWORD = "an-onboarding-master-password";
const KIT_TITLE = "Save your Recovery Phrase";

function renderStep(onNext = vi.fn()) {
  const view = render(
    <LocaleProvider>
      <VaultKeyProvider>
        <OnboardingStep1Vault onNext={onNext} />
      </VaultKeyProvider>
    </LocaleProvider>,
  );
  return { ...view, onNext };
}

async function choosePassword(container: HTMLElement) {
  await waitFor(() => expect(container.querySelector("#confirmPassword")).not.toBeNull());
  fireEvent.change(container.querySelector("#password")!, { target: { value: PASSWORD } });
  fireEvent.change(container.querySelector("#confirmPassword")!, { target: { value: PASSWORD } });
  fireEvent.submit(container.querySelector("form")!);
  await screen.findByText(KIT_TITLE);
}

beforeEach(() => {
  backend.reset();
  localStorage.setItem("resilient_locale", "en");
});

describe("onboarding step 1", () => {
  it("stores the key only when the recovery phrase is confirmed, and moves on only then", async () => {
    const { container, onNext } = renderStep();
    await choosePassword(container);

    // The words are on screen; nothing is stored and the step has not moved on.
    expect(backend.rows).toEqual([]);
    expect(backend.writes).toEqual([]);
    expect(onNext).not.toHaveBeenCalled();
    expect(screen.getByText(/Your Master Password is not saved until you finish this step\./)).toBeInTheDocument();

    const proceed = screen.getByRole("button", { name: /Continue/ });
    expect(proceed).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /I have saved my Recovery Phrase/ }));
    expect(backend.rows).toEqual([]);
    fireEvent.click(proceed);

    await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1));
    expect(backend.rows).toHaveLength(1);
    expect(backend.rows[0].recovery_encrypted_master_key).toBeTruthy();
  });

  it("leaving before the phrase is confirmed stores nothing", async () => {
    const first = renderStep();
    await choosePassword(first.container);
    first.unmount();

    const second = renderStep();
    await waitFor(() => expect(second.container.querySelector("#confirmPassword")).not.toBeNull());
    expect(screen.queryByText(KIT_TITLE)).not.toBeInTheDocument();
    expect(backend.rows).toEqual([]);
    expect(second.onNext).not.toHaveBeenCalled();
  });

  it("a failed save says so, does not move on, and can be tried again", async () => {
    const { container, onNext } = renderStep();
    await choosePassword(container);
    fireEvent.click(screen.getByRole("checkbox", { name: /I have saved my Recovery Phrase/ }));

    backend.failNextWrite = { message: "Failed to fetch" };
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    await screen.findByText(translations.en.recoveryKit.errorNotSaved);
    expect(onNext).not.toHaveBeenCalled();
    expect(backend.rows).toEqual([]);
    expect(screen.getByText(KIT_TITLE)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
    await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1));
    expect(backend.rows).toHaveLength(1);
  });

  it("drops the words when another account signs in", async () => {
    const { container, rerender, onNext } = renderStep();
    await choosePassword(container);

    backend.user = { id: "00000000-0000-0000-0000-0000000000f2" };
    rerender(
      <LocaleProvider>
        <VaultKeyProvider>
          <OnboardingStep1Vault onNext={onNext} />
        </VaultKeyProvider>
      </LocaleProvider>,
    );
    await waitFor(() => expect(screen.queryByText(KIT_TITLE)).not.toBeInTheDocument());
    expect(backend.rows).toEqual([]);
  });

  it("tells the truth about a forgotten master password: the kit is the way back", () => {
    for (const language of ["en", "pt"] as const) {
      const warning = translations[language].vault.setup.warning;
      expect(warning).toContain("Recovery Kit");
      expect(warning).not.toMatch(/passphrase|frase-passe/);
    }
  });
});
