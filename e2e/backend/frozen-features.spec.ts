import { test, expect } from "./fixtures";
import { FROZEN_FUNCTIONS, FROZEN_ROUTES, FROZEN_TABLES } from "../../scripts/frozen-features.mjs";

// Backlog A-07, signed in. e2e/frozen-features.spec.ts covers a visitor; the
// dashboard of a signed-in premium user is where the expert chat card and its
// link used to be, and only a signed-in page reads the database.

test("the premium dashboard offers no frozen feature and reads none of their tables", async ({ page, stack, pageErrors }) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().startsWith(stack.url)) requests.push(new URL(request.url()).pathname);
  });

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Hold 3s to activate")).toBeVisible();
  await page.waitForLoadState("networkidle");

  await expect(page.getByText(/expert/i)).toHaveCount(0);
  const paths = await page
    .locator("a[href]")
    .evaluateAll((anchors) => anchors.map((anchor) => (anchor.getAttribute("href") ?? "").split(/[?#]/)[0]));
  expect(paths.length).toBeGreaterThan(3);
  expect(paths.filter((linked) => FROZEN_ROUTES.includes(linked))).toEqual([]);

  // The dashboard did talk to the stack, and not about a frozen feature.
  expect(requests.some((pathname) => pathname.startsWith("/rest/v1/premium_entitlements"))).toBe(true);
  const frozen = requests.filter(
    (pathname) =>
      FROZEN_TABLES.some((table) => pathname === `/rest/v1/${table}`) ||
      FROZEN_FUNCTIONS.some((name) => pathname === `/functions/v1/${name}`),
  );
  expect(frozen).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("signed in, a frozen route still answers with the not-found page", async ({ page }) => {
  for (const route of FROZEN_ROUTES) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1, name: "404" })).toBeVisible();
  }
});
