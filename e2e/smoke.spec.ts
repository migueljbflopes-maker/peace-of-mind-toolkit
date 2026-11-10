import { test, expect } from "@playwright/test";

test("landing page renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1").first()).toBeVisible();
});

test("panic page is reachable and does not crash when signed out", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/panic");
  await expect(page.locator("#root")).not.toBeEmpty();
  expect(errors).toEqual([]);
});
