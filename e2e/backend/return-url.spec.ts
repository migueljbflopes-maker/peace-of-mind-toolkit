import type { APIRequestContext, Frame, Page } from "@playwright/test";
import { test, expect, type TestUser } from "./fixtures";
import { unlockTitle, wrappedKeyRow } from "./vault-keys";
import {
  HOSTILE_RETURN_ADDRESSES,
  OTHER_SITE,
  expectStillOnSite,
  watchForOtherSite,
} from "../helpers/offSite";

// Backlog F-30: the return address after sign-in cannot leave the site, and
// an address on the site survives sign-in whole. The half that needs a
// session; the signed-out half is in e2e/return-url.spec.ts.
//
// For a signed-in visitor /login and /auth/callback navigate to the return
// address by themselves, so a link to the real site was enough to land a user
// on another one.

const MAILPIT = process.env.E2E_MAILPIT_URL ?? "http://127.0.0.1:54324";

// A route behind the sign-in card, with an encoded slash in its own query.
const ROUTE_WITH_ENCODED_SLASH = "/premium/plans/wizard?next=%2Fx&plan=B";

const endsWith = (route: string) => new RegExp(`${route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);
const signInCardButton = (page: Page) => page.getByRole("button", { name: "Log in / Create account" });
const dashboard = (page: Page) => page.getByRole("heading", { level: 1, name: "Dashboard" });
const toOtherSite = (urls: string[]) => urls.filter((url) => new URL(url).hostname.endsWith(OTHER_SITE));

async function signInWithPasswordHere(page: Page, user: Pick<TestUser, "email" | "password">) {
  await page.getByRole("tab", { name: "Password" }).click();
  await page.locator("#password-email").fill(user.email);
  await page.locator("#password").fill(user.password);
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/auth/v1/token") && r.request().method() === "POST"),
    page.locator("form").filter({ has: page.locator("#password") }).locator('button[type="submit"]').click(),
  ]);
  expect(response.status(), `sign-in was refused: ${await response.text()}`).toBe(200);
}

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

// ── Signed in (the seeded user's saved session) ─────────────────────────────

test.describe("signed in", () => {
  for (const address of HOSTILE_RETURN_ADDRESSES) {
    test(`/login?return_url=${address} goes to the dashboard, never off the site`, async ({
      page,
      baseURL,
      blockedRequests,
      pageErrors,
    }) => {
      const appOrigin = new URL(baseURL!).origin;
      const attempts = await watchForOtherSite(page);

      await page.goto(`/login?return_url=${address}`);

      // The sign-in page sends a signed-in visitor on by itself: to the
      // default, because the address was refused.
      await expect(page).toHaveURL(/\/dashboard$/);
      await expect(dashboard(page)).toBeVisible();
      await expectStillOnSite(page, appOrigin);
      expect(attempts).toEqual([]);
      expect(toOtherSite(blockedRequests)).toEqual([]);
      expect(pageErrors).toEqual([]);
    });

    test(`/auth/callback?return_url=${address} goes to the dashboard, never off the site`, async ({
      page,
      baseURL,
      blockedRequests,
      pageErrors,
    }) => {
      const appOrigin = new URL(baseURL!).origin;
      const attempts = await watchForOtherSite(page);

      // The callback with a session already there: it navigates to the return
      // address after "Welcome!".
      await page.goto(`/auth/callback?return_url=${address}`);

      await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
      await expect(dashboard(page)).toBeVisible();
      await expectStillOnSite(page, appOrigin);
      expect(attempts).toEqual([]);
      expect(toOtherSite(blockedRequests)).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  }

  test("the loop guard: a return address that is the sign-in page or the callback ends on the dashboard", async ({
    page,
    pageErrors,
  }) => {
    test.setTimeout(120_000);
    const loops = [
      "/login",
      "/login?return_url=/login",
      encodeURIComponent("/login?return_url=/login?return_url=/premium/vault"),
      "/auth/callback",
      encodeURIComponent("/auth/callback?return_url=/login"),
      "/LOGIN",
      "/%256Cogin",
      "/premium/../login",
    ];
    for (const address of loops) {
      await test.step(`/login?return_url=${address}`, async () => {
        const visited: string[] = [];
        const record = (frame: Frame) => {
          if (frame === page.mainFrame()) visited.push(new URL(frame.url()).pathname);
        };
        page.on("framenavigated", record);
        await page.goto(`/login?return_url=${address}`);
        await expect(page).toHaveURL(/\/dashboard$/);
        await expect(dashboard(page)).toBeVisible();
        page.off("framenavigated", record);
        // One visit to the sign-in page, then the dashboard: no going round.
        expect(visited.filter((path) => /^\/(login|auth)/i.test(path))).toHaveLength(1);
      });
      await test.step(`/auth/callback?return_url=${address}`, async () => {
        await page.goto(`/auth/callback?return_url=${address}`);
        await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
        await expect(dashboard(page)).toBeVisible();
      });
    }
    expect(pageErrors).toEqual([]);
  });

  test("an address on the site with an encoded slash in its query is where /login and the callback lead", async ({
    page,
    pageErrors,
  }) => {
    await page.goto(`/login?return_url=${encodeURIComponent(ROUTE_WITH_ENCODED_SLASH)}`);
    await expect(page).toHaveURL(endsWith(ROUTE_WITH_ENCODED_SLASH));

    await page.goto(`/auth/callback?return_url=${encodeURIComponent(ROUTE_WITH_ENCODED_SLASH)}`);
    await expect(page).toHaveURL(endsWith(ROUTE_WITH_ENCODED_SLASH), { timeout: 15_000 });
    expect(pageErrors).toEqual([]);
  });
});

// ── Signed out, then signing in ─────────────────────────────────────────────

test.describe("signing in", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const address of [`//${OTHER_SITE}`, `/\\${OTHER_SITE}`, `%2F%5C${OTHER_SITE}`, `%2F%09%2F${OTHER_SITE}`]) {
    test(`signing in on /login?return_url=${address} lands on the dashboard, never off the site`, async ({
      page,
      baseURL,
      createUser,
      blockedRequests,
      pageErrors,
    }) => {
      const appOrigin = new URL(baseURL!).origin;
      const user = await createUser();
      const attempts = await watchForOtherSite(page);

      await page.goto(`/login?return_url=${address}`);
      await expect(page.getByRole("link", { name: "Back to where I was" })).toHaveCount(0);
      await expectStillOnSite(page, appOrigin);

      await signInWithPasswordHere(page, user);

      await expect(page).toHaveURL(/\/dashboard$/);
      await expect(dashboard(page)).toBeVisible();
      await expectStillOnSite(page, appOrigin);
      expect(attempts).toEqual([]);
      expect(toOtherSite(blockedRequests)).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  }

  test("signing in from an address whose query holds an encoded slash returns to it", async ({
    page,
    admin,
    createUser,
    pageErrors,
  }) => {
    const user = await createUser({ premium: true });
    const inserted = await admin
      .from("user_vault_keys")
      .insert(await wrappedKeyRow(user.id, "master-Return-Address-30"));
    expect(inserted.error).toBeNull();

    await page.goto(ROUTE_WITH_ENCODED_SLASH);
    await signInCardButton(page).click();
    await expect(page).toHaveURL(endsWith(`/login?return_url=${encodeURIComponent(ROUTE_WITH_ENCODED_SLASH)}`));

    await signInWithPasswordHere(page, user);

    // Back on the address that was asked for, encoded slash and all, and
    // signed in: the gate asks for the master password instead of sign-in.
    await expect(page).toHaveURL(endsWith(ROUTE_WITH_ENCODED_SLASH));
    await expect(unlockTitle(page)).toBeVisible();
    await expect(signInCardButton(page)).toHaveCount(0);
    expect(new URL(page.url()).searchParams.get("next")).toBe("/x");
    expect(pageErrors).toEqual([]);
  });

  test("signing in on a sign-in page that names itself as the return address ends on the dashboard", async ({
    page,
    createUser,
    pageErrors,
  }) => {
    const user = await createUser();
    await page.goto(`/login?return_url=${encodeURIComponent("/login?return_url=/login?return_url=/premium/vault")}`);
    await expect(page.getByRole("link", { name: "Back to where I was" })).toHaveCount(0);

    await signInWithPasswordHere(page, user);

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(dashboard(page)).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test("a magic link asked for from a page returns to that page, query string and all", async ({
    page,
    admin,
    request,
    createUser,
    baseURL,
    pageErrors,
  }) => {
    const user = await createUser({ premium: true });
    const inserted = await admin
      .from("user_vault_keys")
      .insert(await wrappedKeyRow(user.id, "master-Return-Address-30"));
    expect(inserted.error).toBeNull();

    // From the page's own sign-in card to the sign-in page, which opens on
    // the Magic Link tab.
    await page.goto(ROUTE_WITH_ENCODED_SLASH);
    await signInCardButton(page).click();
    await expect(page).toHaveURL(endsWith(`/login?return_url=${encodeURIComponent(ROUTE_WITH_ENCODED_SLASH)}`));
    await expect(page.getByRole("tab", { name: "Magic Link" })).toHaveAttribute("aria-selected", "true");
    await page.getByLabel("Email").fill(user.email);
    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/auth/v1/otp") && r.request().method() === "POST"),
      page.getByRole("button", { name: "Send magic link" }).click(),
    ]);
    expect(response.status(), `the magic link request was refused: ${await response.text()}`).toBe(200);
    await expect(page.getByText("Check your inbox", { exact: true })).toBeVisible();

    // The mail (in Mailpit, nowhere else). Its link comes back through the
    // callback on this site, carrying the address that was asked for.
    const link = await latestMailLink(request, user.email);
    const redirectTo = new URL(new URL(link).searchParams.get("redirect_to") ?? "");
    expect(redirectTo.origin).toBe(new URL(baseURL!).origin);
    expect(redirectTo.pathname).toBe("/auth/callback");
    expect(redirectTo.searchParams.get("return_url")).toBe(ROUTE_WITH_ENCODED_SLASH);

    await page.goto(link);

    // Through /auth/callback and back to the page, signed in.
    await expect(page).toHaveURL(endsWith(ROUTE_WITH_ENCODED_SLASH), { timeout: 20_000 });
    await expect(unlockTitle(page)).toBeVisible();
    await expect(signInCardButton(page)).toHaveCount(0);
    expect(new URL(page.url()).searchParams.get("next")).toBe("/x");
    expect(pageErrors).toEqual([]);
  });
});
