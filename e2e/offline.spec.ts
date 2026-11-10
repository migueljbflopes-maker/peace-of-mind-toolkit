import { test, expect, type Page } from "@playwright/test";

// Backlog B-01. The service worker precaches the app shell on the first
// visit, so the app opens with no network afterwards.

// First visit: load the app online and wait until the service worker has
// installed (precache complete) and controls the page.
async function firstVisit(page: Page) {
  await page.goto("/");
  await expect(page.locator("h1").first()).toBeVisible();
  await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return;
    await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((resolve) => setTimeout(resolve, 10_000)),
    ]);
  });
}

test("app opens with no network after a first visit", async ({ page, context }) => {
  await firstVisit(page);

  // A fresh tab proves the shell is served from cache, not left over in memory.
  await context.setOffline(true);
  const offlinePage = await context.newPage();
  await offlinePage.goto("/");
  await expect(offlinePage.locator("h1").first()).toBeVisible({ timeout: 5000 });
});

test("a route other than / opens with no network after a first visit to /", async ({
  page,
  context,
}) => {
  await firstVisit(page);

  // /panic is a client-side route in a lazily loaded chunk that the first
  // visit never requested: both the shell and the chunk must come from cache.
  await context.setOffline(true);
  const offlinePage = await context.newPage();
  const errors: string[] = [];
  offlinePage.on("pageerror", (e) => errors.push(e.message));
  await offlinePage.goto("/panic");
  await expect(offlinePage.locator("#root")).not.toBeEmpty();
  await expect(offlinePage.locator("h1").first()).toBeVisible({ timeout: 5000 });
  expect(errors).toEqual([]);
});

test("the service worker caches only this origin's static files", async ({ page }) => {
  await firstVisit(page);
  // Use the app a little so any runtime caching rule would have had a chance.
  await page.goto("/pricing");
  await expect(page.locator("#root")).not.toBeEmpty();

  const cached = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const request of await cache.keys()) urls.push(request.url);
    }
    return { origin: location.origin, urls };
  });

  // Something was precached, and nothing from Supabase, Stripe or any other
  // origin was stored. Data offline is B-03, not the service worker's job.
  expect(cached.urls.length).toBeGreaterThan(0);
  expect(cached.urls.filter((url) => new URL(url).origin !== cached.origin)).toEqual([]);
  expect(cached.urls.filter((url) => /supabase|stripe|\/functions\/|\/rest\//i.test(url))).toEqual([]);
});
