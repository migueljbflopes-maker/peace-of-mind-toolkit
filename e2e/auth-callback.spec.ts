import { test, expect, type Page, type Route } from "@playwright/test";

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
    // The spinner text was English in the code for every visitor until A-12.
    loading: "Signing you in...",
    title: "We could not sign you in",
    description: /^Signing in is taking too long\. Your connection may be slow or down\./,
    retry: "Try again",
    signIn: "Go to sign-in",
  },
  "pt-PT": {
    loading: "A iniciar a tua sessão...",
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
  await expect(page.getByText(texts.loading)).toBeVisible();

  // The page gives up after ten seconds.
  const alert = page.getByRole("alert").filter({ hasText: texts.title });
  await expect(alert).toBeVisible({ timeout: 13_000 });
  await expect(page.getByText(texts.loading)).toHaveCount(0);
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

// ── Backlog A-12: every failure is reported as what it is, at once ──────────
//
// A link that expired or was already used, an address this app does not use,
// and the page opened on its own each end in their own message, in the
// visitor's language, within about a second: not in ten seconds of spinner
// and a message that blames the connection. The auth server's own text is
// never shown, the tokens or the error are taken out of the address bar, and
// the way forward keeps the return address the link carried if it is safe.
// The same against the real local auth server (a link used twice, a link
// past its expiry) is in e2e/backend/auth-callback.spec.ts.

// A route behind sign-in, with an encoded slash in its own query (as in F-30).
const GATED_ROUTE = "/premium/plans/wizard?next=%2Fx&plan=B";
const GATED_ROUTE_ENCODED = encodeURIComponent(GATED_ROUTE);
// "About a second", with room for a loaded machine; far from the 10 s timeout.
const AT_ONCE_MS = 2_500;
const SERVER_TEXT = /Email link is invalid|invalid JWT|token is expired|access_denied|otp_expired|bad_jwt/i;
const EXPIRED_ERROR =
  "error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired";

const FAILURE_TEXTS = {
  "en-US": {
    loading: "Signing you in...",
    newLink: "Get a new link",
    signIn: "Go to sign-in",
    retry: "Try again",
    expired: {
      title: "This sign-in link has expired",
      description:
        "A sign-in link works once and for a limited time. This one has expired or was already used. Ask for a new one and we will email it to you.",
    },
    unsupported: {
      title: "This link cannot sign you in",
      description: "This is not a kind of sign-in link AmIReady uses. Go to sign-in and ask for a new link.",
    },
    empty: {
      title: "There is no sign-in link here",
      description:
        "This page finishes signing you in when you open the link in our email. Opened on its own, it has nothing to do. Go to sign-in to get a link.",
    },
  },
  "pt-PT": {
    loading: "A iniciar a tua sessão...",
    newLink: "Pedir um novo link",
    signIn: "Ir para o início de sessão",
    retry: "Tentar outra vez",
    expired: {
      title: "Este link de início de sessão expirou",
      description:
        "Um link de início de sessão funciona uma só vez e por tempo limitado. Este expirou ou já foi usado. Pede um novo e enviamos-to por email.",
    },
    unsupported: {
      title: "Este link não pode iniciar a tua sessão",
      description:
        "Não é um tipo de link de início de sessão que o AmIReady use. Vai para o início de sessão e pede um novo link.",
    },
    empty: {
      title: "Não há aqui nenhum link de início de sessão",
      description:
        "Esta página termina o início de sessão quando abres o link do nosso email. Aberta sozinha, não tem nada para fazer. Vai para o início de sessão para receberes um link.",
    },
  },
} as const;

type Language = keyof typeof FAILURE_TEXTS;
type FailureKind = "expired" | "unsupported" | "empty";

/** The auth server refuses the token of the link, as it does for one that expired. */
async function refuseTheToken(page: Page, status: number) {
  const body =
    status === 400
      ? { code: 400, error_code: "validation_failed", msg: "invalid JWT: unable to parse or verify signature" }
      : {
          code: status,
          error_code: "bad_jwt",
          msg: "invalid JWT: unable to parse or verify signature, token has invalid claims: token is expired",
        };
  // Registered after the stand-in, so it answers first.
  await page.route(
    (url) => url.pathname.endsWith("/auth/v1/user"),
    (route) =>
      route.request().method() === "OPTIONS"
        ? route.fallback()
        : route.fulfill({
            status,
            headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*" },
            contentType: "application/json",
            body: JSON.stringify(body),
          }),
  );
}

interface FailureCase {
  name: string;
  kind: FailureKind;
  /** The address, given the return address as it is written after `return_url=`. */
  address: (returnUrl: string, issuedAt: number) => string;
  refusedWith?: number;
}

const withReturn = (returnUrl: string, rest: string) => `/auth/callback?return_url=${returnUrl}${rest}`;
const tokensAddress = (returnUrl: string, issuedAt: number) =>
  callbackAddress("/x", issuedAt).replace("return_url=%2Fx", `return_url=${returnUrl}`);

const FAILURE_CASES: FailureCase[] = [
  { name: "a link whose token the auth server refuses with 401", kind: "expired", address: tokensAddress, refusedWith: 401 },
  { name: "a link whose token the auth server refuses with 403", kind: "expired", address: tokensAddress, refusedWith: 403 },
  { name: "a link whose token the auth server refuses with 400", kind: "expired", address: tokensAddress, refusedWith: 400 },
  { name: "an expired-link error in the fragment", kind: "expired", address: (r) => withReturn(r, `#${EXPIRED_ERROR}`) },
  { name: "an expired-link error in the query", kind: "expired", address: (r) => withReturn(r, `&${EXPIRED_ERROR}`) },
  {
    name: "an expired-link error in the query and the fragment",
    kind: "expired",
    address: (r) => withReturn(r, `&${EXPIRED_ERROR}#${EXPIRED_ERROR}`),
  },
  {
    name: "a code address (a form this app does not use)",
    kind: "unsupported",
    address: (r) => withReturn(r, "&code=4f8b1c2d-pkce-code"),
  },
  { name: "the page opened on its own, signed out", kind: "empty", address: (r) => withReturn(r, "") },
];

/** Opens the address and expects the message of that kind, at once, and nothing of the server's. */
async function expectFailureMessage(page: Page, language: Language, failure: FailureCase, returnUrl: string) {
  const texts = FAILURE_TEXTS[language];
  const issuedAt = Math.floor(Date.now() / 1000);
  const backend = await standInBackend(page, issuedAt, 0);
  if (failure.refusedWith) await refuseTheToken(page, failure.refusedWith);

  await page.goto(failure.address(returnUrl, issuedAt));

  const alert = page.getByRole("alert").filter({ hasText: texts[failure.kind].title });
  await expect(alert).toBeVisible({ timeout: AT_ONCE_MS });
  await expect(alert.getByText(texts[failure.kind].description, { exact: true })).toBeVisible();
  await expect(page.getByText(texts.loading)).toHaveCount(0);
  // Not the message that blames the connection, and nothing the server wrote.
  await expect(page.getByText(TIMEOUT_TEXTS[language].title)).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(SERVER_TEXT);

  // One way forward. "Try again" would reload into the same failure.
  const forward = failure.kind === "expired" ? texts.newLink : texts.signIn;
  await expect(alert.getByRole("button")).toHaveText([forward]);
  return { alert, backend, forward };
}

for (const language of ["en-US", "pt-PT"] as const) {
  test.describe(`a link that cannot sign the visitor in, with the phone in ${language}`, () => {
    test.use({ locale: language });

    for (const failure of FAILURE_CASES) {
      test(`${failure.name} is reported as what it is, at once, and the way forward keeps the return address`, async ({
        page,
      }) => {
        const pageErrors: string[] = [];
        page.on("pageerror", (error) => pageErrors.push(error.message));

        const { alert, backend, forward } = await expectFailureMessage(page, language, failure, GATED_ROUTE_ENCODED);

        // Neither the tokens nor the error stay in the address bar.
        const shown = new URL(page.url());
        expect(shown.pathname + shown.search + shown.hash).toBe(`/auth/callback?return_url=${GATED_ROUTE_ENCODED}`);

        // The message stays: no second outcome, no timeout message later.
        await page.waitForTimeout(1_000);
        await expect(alert).toBeVisible();

        await alert.getByRole("button", { name: forward }).click();
        await expect(page).toHaveURL(/\/login\?/);
        const signIn = new URL(page.url());
        expect(signIn.pathname + signIn.search + signIn.hash).toBe(`/login?return_url=${GATED_ROUTE_ENCODED}`);
        expect(signIn.searchParams.get("return_url")).toBe(GATED_ROUTE);
        await expect(
          page.getByRole("alert").filter({ hasText: FAILURE_TEXTS[language][failure.kind].title }),
        ).toHaveCount(0);
        // The sign-in page, on the form that sends a new link.
        await expect(page.locator("input[type=email]").first()).toBeVisible();

        expect(backend.unanswered).toEqual([]);
        expect(pageErrors).toEqual([]);
      });
    }
  });
}

test.describe("a link that cannot sign the visitor in, with a return address that leaves the site", () => {
  test.use({ locale: "en-US" });

  for (const failure of FAILURE_CASES) {
    for (const hostile of ["//example.com", "%2F%5Cexample.com", "https://example.com/"]) {
      test(`${failure.name}: return_url=${hostile} is not carried forward`, async ({ page, baseURL }) => {
        const offSite: string[] = [];
        page.on("request", (request) => {
          if (new URL(request.url()).hostname.endsWith("example.com")) offSite.push(request.url());
        });
        await page.route(
          (url) => url.hostname.endsWith("example.com"),
          (route) => route.abort("blockedbyclient"),
        );

        const { alert, forward } = await expectFailureMessage(page, "en-US", failure, hostile);

        const shown = new URL(page.url());
        expect(shown.origin).toBe(new URL(baseURL!).origin);
        expect(shown.pathname + shown.search + shown.hash).toBe("/auth/callback");

        await alert.getByRole("button", { name: forward }).click();
        await expect(page).toHaveURL(/\/login$/);
        expect(new URL(page.url()).origin).toBe(new URL(baseURL!).origin);
        expect(offSite).toEqual([]);
      });
    }
  }
});

test.describe("with the phone in English: the auth server cannot be reached", () => {
  test.use({ locale: "en-US" });

  test("a link followed with no connection gets the connection message at once, keeps the link, and trying again signs in", async ({
    page,
  }) => {
    const texts = TIMEOUT_TEXTS["en-US"];
    const issuedAt = Math.floor(Date.now() / 1000);
    const backend = await standInBackend(page, issuedAt, 0);
    let down = true;
    await page.route(
      (url) => url.pathname.endsWith("/auth/v1/user"),
      (route) => (down ? route.abort("internetdisconnected") : route.fallback()),
    );

    await page.goto(callbackAddress("/dashboard", issuedAt));

    // Known as soon as the request fails: not after the ten-second timeout.
    const alert = page.getByRole("alert").filter({ hasText: texts.title });
    await expect(alert).toBeVisible({ timeout: AT_ONCE_MS });
    await expect(alert.getByText(texts.description)).toBeVisible();
    await expect(page.getByText(FAILURE_TEXTS["en-US"].expired.title)).toHaveCount(0);
    await expect(alert.getByRole("button")).toHaveText([texts.retry, texts.signIn]);
    // The link may still be good: it stays in the address for "Try again".
    await expect(page).toHaveURL(/\/auth\/callback\?return_url=%2Fdashboard#access_token=/);

    down = false;
    await alert.getByRole("button", { name: texts.retry }).click();
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: ARRIVES_WITHIN_MS });
    await expectSignedInOnDashboard(page);
    expect(backend.unanswered).toEqual([]);
  });

  test("the timeout message's way to sign-in keeps the return address", async ({ page }) => {
    test.setTimeout(45_000);
    const texts = TIMEOUT_TEXTS["en-US"];
    const issuedAt = Math.floor(Date.now() / 1000);
    await standInBackend(page, issuedAt, NEVER_MS);

    await page.goto(tokensAddress(GATED_ROUTE_ENCODED, issuedAt));
    const alert = page.getByRole("alert").filter({ hasText: texts.title });
    await expect(alert).toBeVisible({ timeout: 13_000 });

    await alert.getByRole("button", { name: texts.signIn }).click();
    await expect(page).toHaveURL(/\/login\?/);
    const signIn = new URL(page.url());
    expect(signIn.pathname + signIn.search + signIn.hash).toBe(`/login?return_url=${GATED_ROUTE_ENCODED}`);
  });
});

test.describe("already signed in, with the phone in English", () => {
  test.use({ locale: "en-US" });

  test("an expired link leaves the visitor signed in, takes them to the return address and says the link was not used", async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    const issuedAt = Math.floor(Date.now() / 1000);
    const backend = await standInBackend(page, issuedAt, 0);

    // Signed in by a good link first.
    await page.goto(callbackAddress("/dashboard", issuedAt));
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: ARRIVES_WITHIN_MS });
    await expectSignedInOnDashboard(page);

    // Then an old link is opened.
    await page.goto(`/auth/callback?return_url=%2Fdashboard#${EXPIRED_ERROR}`);
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: ARRIVES_WITHIN_MS });
    await expect(page.getByText("That sign-in link was not used", { exact: true })).toBeVisible();
    await expect(
      page.getByText(
        `It had expired, was already used, or could not be checked. You are still signed in as ${EMAIL}.`,
        { exact: true },
      ),
    ).toBeVisible();
    await expect(page.locator("body")).not.toContainText(SERVER_TEXT);
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();

    expect(backend.unanswered).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
