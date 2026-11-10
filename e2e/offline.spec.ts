import { test, expect, type Page } from "@playwright/test";

// Backlog B-01. The service worker precaches the app shell on the first
// visit, so the app opens with no network afterwards.

// First visit: load the app online and wait until the service worker is
// active, which means the precache is complete. It does not control this
// first page yet; it controls pages opened from then on.
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

  // What the page says about offline must be what the code does: until
  // backlog B-05 nothing is queued, an alert needs a connection.
  await expect(offlinePage.getByText(/queues messages/i)).toHaveCount(0);
  await expect(offlinePage.getByText(/Needs an internet connection|Precisa de ligação à internet/)).toBeVisible();
});

test("the sign-in callback route gets the shell offline, query string included", async ({
  page,
  context,
}) => {
  await firstVisit(page);
  await context.setOffline(true);
  const offlinePage = await context.newPage();
  await offlinePage.goto("/auth/callback?code=abc.def&next=/x.y");
  await expect(offlinePage.locator("#root")).not.toBeEmpty();
});

test("real files are served by the server, not answered with the app shell", async ({
  page,
  context,
}) => {
  await firstVisit(page);
  // A second tab is controlled by the service worker.
  const controlled = await context.newPage();
  await controlled.goto("/");
  expect(await controlled.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  for (const path of [
    "/robots.txt",
    "/og-image.png",
    "/.well-known/apple-developer-merchantid-domain-association",
  ]) {
    // The file without an extension starts a download instead of a page, so
    // look at the response to the navigation, not at the page.
    const [response] = await Promise.all([
      controlled.waitForResponse((r) => new URL(r.url()).pathname === path),
      controlled.goto(path).catch(() => null),
    ]);
    expect(response.fromServiceWorker(), path).toBe(false);
    expect(response.headers()["content-type"] ?? "", path).not.toContain("text/html");
  }

  const robots = await controlled.goto("/robots.txt");
  expect(await robots!.text()).toContain("User-agent");
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
