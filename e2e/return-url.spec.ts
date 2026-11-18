import { test, expect, type Page } from "@playwright/test";
import {
  HOSTILE_RETURN_ADDRESSES,
  expectStillOnSite,
  linksLeavingTheSite,
  watchForOtherSite,
} from "./helpers/offSite";

// Backlog F-30: the return address of the sign-in page cannot leave the site.
// Signed out, so no backend is needed: nobody signs in here. The signed-in
// half (where the page navigates by itself) and the return after a real
// sign-in are in e2e/backend/return-url.spec.ts.

const backLink = (page: Page) => page.getByRole("link", { name: "Back to where I was" });
const signInForm = (page: Page) => page.getByRole("button", { name: "Send magic link" });

for (const address of HOSTILE_RETURN_ADDRESSES) {
  test(`signed out, /login?return_url=${address} offers no link and no navigation off the site`, async ({
    page,
    baseURL,
  }) => {
    const appOrigin = new URL(baseURL!).origin;
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const attempts = await watchForOtherSite(page, { abort: true });

    // What the sign-in page links to with no return address at all.
    await page.goto("/login");
    await expect(signInForm(page)).toBeVisible();
    const usualLinksAway = await linksLeavingTheSite(page);

    await page.goto(`/login?return_url=${address}`);
    await expect(signInForm(page)).toBeVisible();

    // The address was refused: there is no way "back" to it, and the page
    // links to nothing it does not link to on a plain /login.
    await expect(backLink(page)).toHaveCount(0);
    await expectStillOnSite(page, appOrigin);
    expect(await linksLeavingTheSite(page)).toEqual(usualLinksAway);

    // Nothing happens later either (the signed-in redirect runs in an effect).
    await page.waitForTimeout(1_000);
    await expectStillOnSite(page, appOrigin);
    expect(new URL(page.url()).pathname).toBe("/login");
    expect(attempts).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test("signed out, a return address with an encoded slash in its query is kept whole", async ({ page }) => {
  const route = "/premium/plans/wizard?next=%2Fx&plan=B";

  // From the page itself: its sign-in card remembers the address.
  await page.goto(route);
  await page.getByRole("button", { name: "Log in / Create account" }).click();
  await expect(page).toHaveURL(new RegExp(`/login\\?return_url=${escapeRegExp(encodeURIComponent(route))}$`));
  await expect(backLink(page)).toHaveAttribute("href", route);

  // And the way back leads to it, not to the dashboard.
  await backLink(page).click();
  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(route)}$`));
  await expect(page.getByRole("heading", { name: "Sign in to continue" })).toBeVisible();
});

const LOOPS = [
  "/login",
  "/login?return_url=/login",
  encodeURIComponent("/login?return_url=/login?return_url=/premium/vault"),
  "/auth/callback",
  encodeURIComponent("/auth/callback?return_url=/login"),
  "/LOGIN",
  "/%256Cogin",
  "/premium/../login",
];

for (const address of LOOPS) {
  test(`signed out, /login?return_url=${address} does not offer the sign-in page as the way back`, async ({
    page,
  }) => {
    await page.goto(`/login?return_url=${address}`);
    await expect(signInForm(page)).toBeVisible();
    await expect(backLink(page)).toHaveCount(0);
    for (const href of await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLAnchorElement>("main a[href]")).map((a) => new URL(a.href).pathname),
    )) {
      expect(href).not.toMatch(/^\/(login|auth)(\/|$)/i);
    }
  });
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
