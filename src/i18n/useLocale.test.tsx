/**
 * LocaleProvider must not block the auth client (backlog A-08).
 *
 * supabase-js awaits every onAuthStateChange listener while it holds its auth
 * lock, and every database call first asks for the session, which waits for
 * that lock. A listener that awaits a database call therefore never returns,
 * and the sign-in that called it (setSession, signInWithPassword, ...) never
 * resolves: the visitor stays on "Signing you in..." for good.
 *
 * The client here is the real supabase-js client, with the real lock; only
 * the network is replaced.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const net = vi.hoisted(() => ({
  userId: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  profileLocale: "pt" as string | null,
  requests: [] as string[],
}));

vi.mock("@/integrations/supabase/client", async () => {
  const { createClient, processLock } = await import("@supabase/supabase-js");
  const memory = new Map<string, string>();
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

  const fetchStandIn = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    net.requests.push(`${init?.method ?? "GET"} ${url.pathname}`);
    if (url.pathname === "/auth/v1/user") {
      return json(200, { id: net.userId, aud: "authenticated", role: "authenticated", email: "user@example.test" });
    }
    if (url.pathname === "/rest/v1/user_profiles") {
      if (net.profileLocale === null) {
        return json(406, { code: "PGRST116", message: "Cannot coerce the result to a single JSON object" });
      }
      return json(200, { locale: net.profileLocale });
    }
    return json(404, { message: `no stand-in for ${url.pathname}` });
  };

  return {
    supabase: createClient("http://backend.test", "publishable-key", {
      auth: {
        lock: processLock,
        autoRefreshToken: false,
        persistSession: true,
        detectSessionInUrl: false,
        storage: {
          getItem: (key: string) => memory.get(key) ?? null,
          setItem: (key: string, value: string) => void memory.set(key, value),
          removeItem: (key: string) => void memory.delete(key),
        },
      },
      global: { fetch: fetchStandIn as typeof fetch },
    }),
  };
});

import { supabase } from "@/integrations/supabase/client";
import { LocaleProvider, useLocale } from "./useLocale";

const base64url = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");

function tokens() {
  const now = Math.floor(Date.now() / 1000);
  const payload = { sub: net.userId, aud: "authenticated", role: "authenticated", iat: now, exp: now + 3600 };
  return {
    access_token: `${base64url({ alg: "HS256", typ: "JWT" })}.${base64url(payload)}.c2lnbmF0dXJl`,
    refresh_token: "k7q2m4x9w1zt",
  };
}

function ShowLocale() {
  return <p data-testid="locale">{useLocale().locale}</p>;
}

/** Resolves to "never settled" if the promise is still pending after the wait. */
function settledWithin<T>(promise: Promise<T>, ms: number): Promise<T | "never settled"> {
  return Promise.race([promise, new Promise<"never settled">((resolve) => setTimeout(() => resolve("never settled"), ms))]);
}

describe("LocaleProvider and the auth client", () => {
  beforeEach(async () => {
    await supabase.auth.signOut({ scope: "local" });
    localStorage.clear();
    localStorage.setItem("resilient_locale", "en");
    net.profileLocale = "pt";
    net.requests.length = 0;
  });

  it("a sign-in completes while LocaleProvider is listening, and the language saved in the profile is applied after it", async () => {
    render(
      <LocaleProvider>
        <ShowLocale />
      </LocaleProvider>,
    );
    expect(screen.getByTestId("locale")).toHaveTextContent("en");

    const result = await settledWithin(supabase.auth.setSession(tokens()), 2_000);

    expect(result, "setSession never resolved: a listener is blocking the auth client").not.toBe("never settled");
    if (result === "never settled") return;
    expect(result.error).toBeNull();
    expect(result.data.session?.user.id).toBe(net.userId);

    // The listener's work still happens, after the auth client is free again.
    await waitFor(() => expect(screen.getByTestId("locale")).toHaveTextContent("pt"));
    expect(localStorage.getItem("resilient_locale")).toBe("pt");
    expect(net.requests).toContain("GET /rest/v1/user_profiles");
  });

  it("a user with no profile row yet keeps the language of the device", async () => {
    net.profileLocale = null;
    render(
      <LocaleProvider>
        <ShowLocale />
      </LocaleProvider>,
    );

    const result = await settledWithin(supabase.auth.setSession(tokens()), 2_000);
    expect(result).not.toBe("never settled");

    await waitFor(() => expect(net.requests).toContain("GET /rest/v1/user_profiles"));
    expect(screen.getByTestId("locale")).toHaveTextContent("en");
    expect(localStorage.getItem("resilient_locale")).toBe("en");
  });

  it("the profile is not asked for after LocaleProvider has gone", async () => {
    const view = render(
      <LocaleProvider>
        <ShowLocale />
      </LocaleProvider>,
    );
    view.unmount();

    const result = await settledWithin(supabase.auth.setSession(tokens()), 2_000);
    expect(result).not.toBe("never settled");
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(net.requests).not.toContain("GET /rest/v1/user_profiles");
  });
});
