import { test, expect } from "@playwright/test";

// Backlog B-01. There is no service worker yet, so the app cannot open
// without a network. This test documents the target behaviour and is
// expected to fail until B-01 lands; remove test.fail() in that change.
test("app opens with no network after a first visit", async ({ page, context }) => {
  test.fail(true, "B-01: no service worker yet");

  await page.goto("/");
  await expect(page.locator("h1").first()).toBeVisible();
  await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return;
    await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
  });

  // A fresh tab proves the shell is served from cache, not left over in memory.
  await context.setOffline(true);
  const offlinePage = await context.newPage();
  await offlinePage.goto("/");
  await expect(offlinePage.locator("h1").first()).toBeVisible({ timeout: 5000 });
});
