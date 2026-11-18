/**
 * MasterKeyGate: signed out, and while the session is being restored
 * (backlog F-11).
 *
 * The bug: for a signed-out visitor the gate rendered nothing and left the
 * redirect to a parent that does not exist, so /premium/vault and the four
 * routes like it were an empty white page.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

vi.mock("@/integrations/supabase/client", async () => (await import("@/test/fakeVaultKeysBackend")).supabaseClientModule);
vi.mock("@/hooks/useAuth", async () => (await import("@/test/fakeVaultKeysBackend")).useAuthModule);
// The real bars need the whole app around them; the browser tests look at them.
vi.mock("@/components/Navbar", () => ({ default: () => <nav aria-label="site navigation" /> }));
vi.mock("@/components/Footer", () => ({ default: () => <footer /> }));

import { backend, FIRST_USER_ID } from "@/test/fakeVaultKeysBackend";
import { LocaleProvider } from "@/i18n/useLocale";
import { VaultKeyProvider } from "@/contexts/VaultKeyContext";
import { MasterKeyGate } from "./MasterKeyGate";

const PROTECTED = "the protected page";
const SIGN_IN = "Log in / Create account";

function WhereAmI() {
  const location = useLocation();
  return <div data-testid="login-page">{location.pathname + location.search}</div>;
}

function tree() {
  return (
    <LocaleProvider>
      <VaultKeyProvider>
        <Routes>
          <Route
            path="/premium/plans/wizard"
            element={
              <MasterKeyGate>
                <div>{PROTECTED}</div>
              </MasterKeyGate>
            }
          />
          <Route path="/login" element={<WhereAmI />} />
        </Routes>
      </VaultKeyProvider>
    </LocaleProvider>
  );
}

function renderGate(at = "/premium/plans/wizard") {
  const result = render(<MemoryRouter initialEntries={[at]}>{tree()}</MemoryRouter>);
  return { ...result, again: () => result.rerender(<MemoryRouter initialEntries={[at]}>{tree()}</MemoryRouter>) };
}

function expectNoMasterPasswordScreen() {
  expect(screen.queryByText("Create your Master Password")).not.toBeInTheDocument();
  expect(screen.queryByText("Unlock the Vault")).not.toBeInTheDocument();
}

beforeEach(() => {
  backend.reset();
  localStorage.setItem("resilient_locale", "en");
});

describe("signed out", () => {
  it("shows the navigation and a way to sign in, and neither the page nor a master password screen", async () => {
    backend.user = null;
    renderGate();

    expect(await screen.findByRole("heading", { name: "Sign in to continue" })).toBeInTheDocument();
    expect(screen.getByText("This page is part of your account. Sign in to open it.")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "site navigation" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: SIGN_IN })).toBeInTheDocument();
    expect(screen.queryByText(PROTECTED)).not.toBeInTheDocument();
    expectNoMasterPasswordScreen();
  });

  it("sends the visitor to sign in with the address they asked for, query string included", async () => {
    backend.user = null;
    renderGate("/premium/plans/wizard?plan=B&from=pricing");

    fireEvent.click(await screen.findByRole("button", { name: SIGN_IN }));
    expect(screen.getByTestId("login-page")).toHaveTextContent(
      `/login?return_url=${encodeURIComponent("/premium/plans/wizard?plan=B&from=pricing")}`,
    );
  });

  it("says it in Portuguese", async () => {
    localStorage.setItem("resilient_locale", "pt");
    backend.user = null;
    renderGate();

    expect(await screen.findByRole("heading", { name: "Inicia sessão para continuar" })).toBeInTheDocument();
    expect(screen.getByText("Esta página faz parte da tua conta. Inicia sessão para a abrires.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Entrar / Criar conta" })).toBeInTheDocument();
  });
});

describe("while the session is being restored", () => {
  it("shows that it is loading, not the sign-in prompt, then the master password screen of a signed-in user", async () => {
    backend.authLoading = true;
    backend.user = null;
    const { again } = renderGate();

    expect(screen.getByRole("status", { name: "Loading..." })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: SIGN_IN })).not.toBeInTheDocument();
    expect(screen.queryByText(PROTECTED)).not.toBeInTheDocument();
    expectNoMasterPasswordScreen();

    // The session is restored: there was a user all along.
    backend.authLoading = false;
    backend.user = { id: FIRST_USER_ID, email: "user@example.test" };
    again();
    // Not for one render does a signed-in user see the sign-in prompt or the page.
    expect(screen.queryByRole("button", { name: SIGN_IN })).not.toBeInTheDocument();
    expect(screen.queryByText(PROTECTED)).not.toBeInTheDocument();

    await screen.findByText("Create your Master Password");
    expect(screen.queryByRole("button", { name: SIGN_IN })).not.toBeInTheDocument();
    expect(screen.queryByText(PROTECTED)).not.toBeInTheDocument();
  });

  it("then offers sign-in when there turns out to be no session", async () => {
    backend.authLoading = true;
    backend.user = null;
    const { again } = renderGate();
    expect(screen.getByRole("status", { name: "Loading..." })).toBeInTheDocument();

    backend.authLoading = false;
    again();
    expect(await screen.findByRole("button", { name: SIGN_IN })).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expectNoMasterPasswordScreen();
  });
});

describe("signing in while the gate is on screen", () => {
  it("goes from the sign-in prompt to the master password screen without rendering the page", async () => {
    backend.user = null;
    const { again } = renderGate();
    await screen.findByRole("button", { name: SIGN_IN });

    backend.user = { id: FIRST_USER_ID, email: "user@example.test" };
    again();
    expect(screen.queryByRole("button", { name: SIGN_IN })).not.toBeInTheDocument();
    expect(screen.queryByText(PROTECTED)).not.toBeInTheDocument();

    await screen.findByText("Create your Master Password");
    expect(screen.queryByText(PROTECTED)).not.toBeInTheDocument();
  });
});
