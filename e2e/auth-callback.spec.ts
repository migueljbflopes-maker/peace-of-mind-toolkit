import type { Page, Route } from "@playwright/test";
import { test, expect } from "./fixtures";

// Backlog A-08: following a magic link must never leave the visitor on
// "Signing you in..." for good.
//
// The link lands on /auth/callback with the tokens in the fragment. The
// Supabase client reads them itself and asks the auth server who they belong
// to (GET /auth/v1/user). When that answer took longer than the page took to
// mount, the page used to hand the same tokens to the client a second time,
// and the client locked itself up: see the A-08 paragraph of docs/backlog.md.
//
// No backend is needed to show it. The auth server and the database are
// answered here, in the shapes the real ones use, and the answer to "who is
// this" is held back for a second, as a phone on a poor connection would see.
// The same sign-up against the real local stack is in
// e2e/backend/signup-master-password.spec.ts.

const USER_ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const EMAIL = "magic-link@e2e.amiready.test";
const SLOW_ANSWER_MS = 1_000;
// The page gives up, with a message, after 10 seconds; arriving must be well
// inside that, even with the slow answer and the 0.8 s "Welcome!" pause.
const ARRIVES_WITHIN_MS = 6_000;
// Longer than any test: an auth server that does not answer.
const NEVER_MS = 120_000;

const BACKEND_PATH = /\/(auth|rest|functions|realtime|storage)\/v1\//;

const base64url = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");

/** An access token shaped like the ones the auth server issues (not signed by it). */
function accessToken(issuedAt: number) {
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    iss: "http://127.0.0.1:54321/auth/v1",
    sub: USER_ID,
    aud: "authenticated",
    exp: issuedAt + 3600,
    iat: issuedAt,
    email: EMAIL,
    phone: "",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { email: EMAIL, email_verified: true, phone_verified: false, sub: USER_ID },
    role: "authenticated",
    aal: "aal1",
    amr: [{ method: "otp", timestamp: issuedAt }],
    session_id: "0b0f9b7e-5d0c-4f43-9d5e-0e9f6f1a2b3c",
    is_anonymous: false,
  };
  return `${base64url(header)}.${base64url(payload)}.${Buffer.from("not-a-real-signature").toString("base64url")}`;
}

/** What GET /auth/v1/user answers for a user who has just confirmed by magic link. */
function userPayload(issuedAt: number) {
  const at = new Date(issuedAt * 1000).toISOString();
  return {
    id: USER_ID,
    aud: "authenticated",
    role: "authenticated",
    email: EMAIL,
    email_confirmed_at: at,
    phone: "",
    confirmation_sent_at: at,
    confirmed_at: at,
    last_sign_in_at: at,
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { email: EMAIL, email_verified: true, phone_verified: false, sub: USER_ID },
    identities: [
      {
        identity_id: "3f2b1c4d-8a6e-4b7f-9c0d-1e2f3a4b5c6d",
        id: USER_ID,
        user_id: USER_ID,
        identity_data: { email: EMAIL, email_verified: true, phone_verified: false, sub: USER_ID },
        provider: "email",
        last_sign_in_at: at,
        created_at: at,
        updated_at: at,
        email: EMAIL,
      },
    ],
    created_at: at,
    updated_at: at,
    is_anonymous: false,
  };
}

/** The address a magic link redirects to: the tokens are in the fragment. */
function callbackAddress(returnUrl: string, issuedAt: number) {
  const fragment = new URLSearchParams({
    access_token: accessToken(issuedAt),
    expires_at: String(issuedAt + 3600),
    expires_in: "3600",
    refresh_token: "k7q2m4x9w1zt",
    token_type: "bearer",
    type: "magiclink",
  });
  return `/auth/callback?return_url=${encodeURIComponent(returnUrl)}#${fragment}`;
}

interface Backend {
  /** Every request the page made to the backend, as "METHOD /path". */
  requests: string[];
  /** Requests this stand-in has no answer for. They are aborted, never passed on. */
  unanswered: string[];
  /** How long the auth server takes to say whose tokens these are. Change it at any time. */
  userAnswerDelayMs: number;
}

/**
 * Stands in for the auth server, the database and the edge functions, for a
 * user who has just been created and owns nothing. Nothing is passed on to a
 * real backend, hosted or local.
 */
async function standInBackend(page: Page, issuedAt: number, userAnswerDelayMs: number): Promise<Backend> {
  const backend: Backend = { requests: [], unanswered: [], userAnswerDelayMs };
  const cors = {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "*",
    "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
    "access-control-expose-headers": "content-range",
  };
  const json = (route: Route, status: number, body: unknown) =>
    route.fulfill({ status, headers: cors, contentType: "application/json", body: JSON.stringify(body) });

  await page.route(
    (url) => BACKEND_PATH.test(url.pathname),
    async (route) => {
      const request = route.request();
      const method = request.method();
      const { pathname } = new URL(request.url());
      const path = pathname.slice(pathname.search(BACKEND_PATH));
      if (method === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
      backend.requests.push(`${method} ${path}`);

      if (path === "/auth/v1/user" && method === "GET") {
        await new Promise((resolve) => setTimeout(resolve, backend.userAnswerDelayMs));
        // The page may have been reloaded, or the test may be over, by now.
        return json(route, 200, userPayload(issuedAt)).catch(() => {});
      }

      if (path.startsWith("/rest/v1/")) {
        if (method === "GET" || method === "HEAD") {
          // No rows yet. Asked for exactly one row, PostgREST answers 406.
          if ((request.headers()["accept"] ?? "").includes("application/vnd.pgrst.object+json")) {
            return json(route, 406, {
              code: "PGRST116",
              details: "The result contains 0 rows",
              hint: null,
              message: "Cannot coerce the result to a single JSON object",
            });
          }
          return json(route, 200, []);
        }
        // Writes without "return=representation" are answered with no body.
        if ((request.headers()["prefer"] ?? "").includes("return=representation")) return json(route, 201, []);
        return route.fulfill({ status: 201, headers: cors });
      }

      backend.unanswered.push(`${method} ${path}`);
      return route.abort("failed");
    },
  );
  return backend;
}

async function expectSignedInOnDashboard(page: Page) {
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // Signed in: the phone menu names the account.
  await page.getByRole("button", { name: "Toggle menu" }).click();
  await expect(page.getByText(EMAIL, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Toggle menu" }).click();
}

test("a magic link followed on a slow connection signs the visitor in and takes them to the page they asked for", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  const issuedAt = Math.floor(Date.now() / 1000);
  const backend = await standInBackend(page, issuedAt, SLOW_ANSWER_MS);

  await page.goto(callbackAddress("/dashboard", issuedAt));

  // Leaves the callback page, for the address the link carried.
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: ARRIVES_WITHIN_MS });
  await expect(page.getByText("Signing you in...")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
  await expectSignedInOnDashboard(page);
  await page.getByRole("button", { name: "Toggle menu" }).click();
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();

  // The tokens were checked with the auth server once: by the client, and
  // not a second time by the page.
  expect(backend.requests.filter((request) => request === "GET /auth/v1/user")).toHaveLength(1);
  expect(backend.unanswered).toEqual([]);
  expect(pageErrors).toEqual([]);
});

// When the auth server does not answer at all, the page says so and offers
// two ways forward. The texts are in src/i18n/translations.ts; one way is
// taken with the phone in English, the other with the phone in Portuguese.
const TIMEOUT_TEXTS = {
  "en-US": {
    title: "We could not sign you in",
    description: /^Signing in is taking too long\. Your connection may be slow or down\./,
    retry: "Try again",
    signIn: "Go to sign-in",
  },
  "pt-PT": {
    title: "Não conseguimos iniciar a tua sessão",
    description: /^Entrar está a demorar demasiado\. A tua ligação pode estar lenta ou em baixo\./,
    retry: "Tentar outra vez",
    signIn: "Ir para o início de sessão",
  },
};

/** Follows a magic link the auth server never answers, up to the message. */
async function waitForTheTimeoutMessage(page: Page, texts: (typeof TIMEOUT_TEXTS)["en-US"]) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const backend = await standInBackend(page, issuedAt, NEVER_MS);

  await page.goto(callbackAddress("/dashboard", issuedAt));
  await expect(page.getByText("Signing you in...")).toBeVisible();

  // The page gives up after ten seconds.
  const alert = page.getByRole("alert").filter({ hasText: texts.title });
  await expect(alert).toBeVisible({ timeout: 13_000 });
  await expect(page.getByText("Signing you in...")).toHaveCount(0);
  await expect(alert.getByText(texts.description)).toBeVisible();
  await expect(alert.getByRole("button", { name: texts.retry })).toBeVisible();
  await expect(alert.getByRole("button", { name: texts.signIn })).toBeVisible();
  await expect(page).toHaveURL(/\/auth\/callback\?return_url=%2Fdashboard#access_token=/);
  return { alert, backend };
}

test.describe("with the phone in English", () => {
  test.use({ locale: "en-US" });

  test("a magic link the auth server never answers ends in a message, and trying again signs the visitor in", async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    const texts = TIMEOUT_TEXTS["en-US"];
    const { alert, backend } = await waitForTheTimeoutMessage(page, texts);

    // The connection is back. "Try again" follows the same link again.
    backend.userAnswerDelayMs = 0;
    await alert.getByRole("button", { name: texts.retry }).click();
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: ARRIVES_WITHIN_MS });
    await expectSignedInOnDashboard(page);

    expect(backend.unanswered).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});

test.describe("with the phone in Portuguese", () => {
  test.use({ locale: "pt-PT" });

  test("a magic link the auth server never answers ends in a message, and the visitor can go to the sign-in page", async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    const texts = TIMEOUT_TEXTS["pt-PT"];
    const { alert, backend } = await waitForTheTimeoutMessage(page, texts);

    await alert.getByRole("button", { name: texts.signIn }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("alert").filter({ hasText: texts.title })).toHaveCount(0);

    expect(backend.unanswered).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
