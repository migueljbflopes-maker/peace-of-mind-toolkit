import { execFileSync } from "node:child_process";
import type { APIRequestContext, Page } from "@playwright/test";
import { test, expect } from "./fixtures";
import { unlockTitle, wrappedKeyRow } from "./vault-keys";

// Backlog A-12: a sign-in link that can no longer be used is reported as
// such, at once, with the way to a new one. Here against the real local auth
// server, which is what decides how such a link comes back: the address it
// redirects to is printed ("[A-12]") and asserted on. Every other failure of
// the callback page, and both languages, are in e2e/auth-callback.spec.ts,
// where the auth server is answered by the test.

const MAILPIT = process.env.E2E_MAILPIT_URL ?? "http://127.0.0.1:54324";

// A route behind the sign-in card, with an encoded slash in its own query.
const GATED_ROUTE = "/premium/plans/wizard?next=%2Fx&plan=B";
const GATED_ROUTE_ENCODED = encodeURIComponent(GATED_ROUTE);

const EXPIRED_TITLE = "This sign-in link has expired";
const EXPIRED_DESCRIPTION =
  "A sign-in link works once and for a limited time. This one has expired or was already used. Ask for a new one and we will email it to you.";
const SERVER_TEXT = /Email link is invalid|invalid JWT|access_denied|otp_expired/i;
// "At once": far from the page's ten-second timeout.
const AT_ONCE_MS = 3_000;

const endsWith = (route: string) => new RegExp(`${route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);
const signInCardButton = (page: Page) => page.getByRole("button", { name: "Log in / Create account" });

/** The newest sign-in mail for an address, as the local auth server left it in Mailpit. */
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

/** Records where the auth server sends the browser each time a sign-in link is followed. */
function recordVerifyRedirects(page: Page): string[] {
  const redirects: string[] = [];
  page.on("response", (response) => {
    if (!response.url().includes("/auth/v1/verify")) return;
    redirects.push(`${response.status()} ${response.headers()["location"] ?? "(no location)"}`);
    if (response.status() < 300 || response.status() > 399) {
      // DIAGNOSTIC (A-12): what answers here when it is not a redirect.
      const request = response.request();
      response
        .text()
        .catch((error) => `(no body: ${error})`)
        .then((body) =>
          console.log(
            `[A-12 diag] ${request.method()} ${response.url()} -> ${response.status()} ` +
              `fromSW=${response.fromServiceWorker()} nav=${request.isNavigationRequest()} ` +
              `type=${request.resourceType()} headers=${JSON.stringify(response.headers())} body=${body.slice(0, 600)}`,
          ),
        );
    }
  });
  return redirects;
}

/** The redirect of a refused link, with the parts of it that say why. */
function refusal(redirect: string) {
  const location = new URL(redirect.replace(/^\d+ /, ""));
  const fragment = new URLSearchParams(location.hash.slice(1));
  return {
    status: Number(redirect.split(" ")[0]),
    path: location.pathname,
    returnUrl: location.searchParams.get("return_url"),
    inQuery: location.searchParams.get("error_code"),
    inFragment: fragment.get("error_code"),
    hasTokens: fragment.has("access_token") || location.searchParams.has("access_token"),
  };
}

/** Runs one statement on the local database as its owner. Local stack only. */
function sqlOnLocalDatabase(statement: string) {
  const dbUrl = process.env.E2E_SUPABASE_DB_URL ?? "";
  const host = dbUrl ? new URL(dbUrl.replace(/^postgres(ql)?:/, "http:")).hostname : "";
  if (!["127.0.0.1", "localhost", "[::1]"].includes(host)) {
    throw new Error(`Refusing to run SQL: the database "${host}" is not on this machine.`);
  }
  try {
    return execFileSync("psql", [dbUrl, "-v", "ON_ERROR_STOP=1", "-At", "-c", statement], { encoding: "utf8" });
  } catch (psqlError) {
    // No psql on this machine: the database container has one.
    const container = execFileSync("docker", ["ps", "--filter", "name=supabase_db_", "--format", "{{.Names}}"], {
      encoding: "utf8",
    })
      .trim()
      .split("\n")[0];
    if (!container) throw psqlError;
    return execFileSync(
      "docker",
      ["exec", container, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-At", "-c", statement],
      { encoding: "utf8" },
    );
  }
}

/** The expired-link message, at once, with nothing of the server's and the address cleaned. */
async function expectExpiredLinkMessage(page: Page, returnQuery: string) {
  const alert = page.getByRole("alert").filter({ hasText: EXPIRED_TITLE });
  await expect(alert).toBeVisible({ timeout: AT_ONCE_MS });
  await expect(alert.getByText(EXPIRED_DESCRIPTION, { exact: true })).toBeVisible();
  await expect(page.getByText("Signing you in...")).toHaveCount(0);
  await expect(page.getByText("We could not sign you in")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(SERVER_TEXT);
  await expect(alert.getByRole("button")).toHaveText(["Get a new link"]);
  const shown = new URL(page.url());
  expect(shown.pathname + shown.search + shown.hash).toBe(`/auth/callback${returnQuery}`);
  return alert;
}

test.describe("signed out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("a sign-in link opened a second time is reported as expired, and a new link is asked for from the same return address", async ({
    page,
    admin,
    request,
    createUser,
    pageErrors,
  }) => {
    const user = await createUser({ premium: true });
    const inserted = await admin.from("user_vault_keys").insert(await wrappedKeyRow(user.id, "master-Callback-12"));
    expect(inserted.error).toBeNull();
    const redirects = recordVerifyRedirects(page);

    // A magic link asked for from a gated page.
    await page.goto(GATED_ROUTE);
    await signInCardButton(page).click();
    await expect(page).toHaveURL(endsWith(`/login?return_url=${GATED_ROUTE_ENCODED}`));
    await page.getByLabel("Email").fill(user.email);
    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/auth/v1/otp") && r.request().method() === "POST"),
      page.getByRole("button", { name: "Send magic link" }).click(),
    ]);
    expect(response.status(), `the magic link request was refused: ${await response.text()}`).toBe(200);
    const link = await latestMailLink(request, user.email);

    // Used once: signed in, on the page that was asked for.
    await page.goto(link);
    await expect(page).toHaveURL(endsWith(GATED_ROUTE), { timeout: 20_000 });
    await expect(unlockTitle(page)).toBeVisible();
    expect(redirects).toHaveLength(1);
    expect(refusal(redirects[0])).toMatchObject({ inQuery: null, inFragment: null, hasTokens: true });

    // Signed out again on this phone (the mail is still in the inbox).
    await page.evaluate(() => {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith("sb-") && key.endsWith("-auth-token")) localStorage.removeItem(key);
      }
    });

    // The SAME link, opened again.
    await page.goto(link);
    expect(redirects).toHaveLength(2);
    console.log(`[A-12] a sign-in link used twice: the auth server answers ${redirects[1]}`);
    await page.waitForTimeout(1_500);
    console.log(`[A-12 diag] page at ${page.url()} shows ${JSON.stringify((await page.locator("body").innerText()).slice(0, 400))}`);
    const second = refusal(redirects[1]);
    expect(second.path).toBe("/auth/callback");
    expect(second.returnUrl).toBe(GATED_ROUTE);
    expect(second.hasTokens).toBe(false);
    expect(second.inFragment ?? second.inQuery, "the auth server names the reason").toBe("otp_expired");

    const alert = await expectExpiredLinkMessage(page, `?return_url=${GATED_ROUTE_ENCODED}`);

    // "Get a new link": the sign-in page, on the form that sends one, still
    // knowing where the visitor was going.
    await alert.getByRole("button", { name: "Get a new link" }).click();
    await expect(page).toHaveURL(endsWith(`/login?return_url=${GATED_ROUTE_ENCODED}`));
    expect(new URL(page.url()).searchParams.get("return_url")).toBe(GATED_ROUTE);
    await expect(page.getByRole("tab", { name: "Magic Link" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("button", { name: "Send magic link" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to where I was" })).toHaveAttribute("href", GATED_ROUTE);
    expect(pageErrors).toEqual([]);
  });

  test("a sign-in link followed after its time has passed is reported as expired", async ({
    page,
    admin,
    createUser,
    baseURL,
    pageErrors,
  }) => {
    const user = await createUser();
    const redirects = recordVerifyRedirects(page);

    // The link the auth server would mail, made without the mail.
    const generated = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: user.email,
      options: { redirectTo: `${baseURL}/auth/callback?return_url=${GATED_ROUTE_ENCODED}` },
    });
    expect(generated.error).toBeNull();
    const link = generated.data.properties!.action_link;

    // Waiting out the hour a link lives is not practical: the time it was
    // sent at is moved two days back instead, in the auth server's own table.
    expect(user.id).toMatch(/^[0-9a-f-]{36}$/);
    const updated = sqlOnLocalDatabase(
      `update auth.users set recovery_sent_at = now() - interval '2 days', ` +
        `confirmation_sent_at = now() - interval '2 days' where id = '${user.id}' returning id`,
    );
    expect(updated).toContain(user.id);
    sqlOnLocalDatabase(
      `do $$ begin if to_regclass('auth.one_time_tokens') is not null then ` +
        `update auth.one_time_tokens set created_at = now() - interval '2 days', updated_at = now() - interval '2 days' ` +
        `where user_id = '${user.id}'; end if; end $$`,
    );

    await page.goto(link);
    expect(redirects).toHaveLength(1);
    console.log(`[A-12] a sign-in link past its expiry: the auth server answers ${redirects[0]}`);
    const answer = refusal(redirects[0]);
    expect(answer.path).toBe("/auth/callback");
    expect(answer.hasTokens).toBe(false);
    expect(answer.inFragment ?? answer.inQuery, "the auth server names the reason").toBe("otp_expired");

    await expectExpiredLinkMessage(page, `?return_url=${GATED_ROUTE_ENCODED}`);
    expect(pageErrors).toEqual([]);
  });
});

test("already signed in, a used link leaves the visitor signed in as before, on the return address, and says the link was not used", async ({
  page,
  admin,
  request,
  createUser,
  premiumUser,
  baseURL,
  pageErrors,
}) => {
  // A link for ANOTHER account, already used (followed here outside the browser).
  const other = await createUser();
  const generated = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: other.email,
    options: { redirectTo: `${baseURL}/auth/callback?return_url=%2Fdashboard` },
  });
  expect(generated.error).toBeNull();
  const link = generated.data.properties!.action_link;
  const first = await request.get(link, { maxRedirects: 0 });
  expect(first.headers()["location"] ?? "", "the first use of the link signs in").toContain("access_token=");

  const redirects = recordVerifyRedirects(page);
  await page.goto(link);
  expect(redirects).toHaveLength(1);
  expect(refusal(redirects[0]).hasTokens).toBe(false);

  // Still the seeded user, on the return address, told what happened.
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("That sign-in link was not used", { exact: true })).toBeVisible();
  await expect(
    page.getByText(
      `It had expired, was already used, or could not be checked. You are still signed in as ${premiumUser.email}.`,
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.locator("body")).not.toContainText(SERVER_TEXT);
  await expect(page.getByText(EXPIRED_TITLE)).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});
