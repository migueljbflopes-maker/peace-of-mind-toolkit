import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { startAppServer, type AppServer } from "./helpers/appServer";

// Backlog B-01, updates. A new version is downloaded in the background and
// waits. It must never reload a running app (that would lose the vault key in
// memory, unsaved input, or a panic activation in its cancel window). It is
// applied at app start, and only when no other tab of the app is open.

// Each test gets its own server, so its deploy does not affect the others.
let app: AppServer;
test.beforeEach(async () => {
  app = await startAppServer();
});
test.afterEach(async () => {
  await app.close();
});

/** Opens the app in a new tab and waits until a service worker is active. */
async function openApp(context: BrowserContext, url: string): Promise<Page> {
  const page = await context.newPage();
  await page.goto(url);
  await expect(page.locator("h1").first()).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  return page;
}

/** An app that has been used before: this tab is controlled by the service worker. */
async function openInstalledApp(context: BrowserContext, url: string): Promise<Page> {
  const page = await openApp(context, url);
  await page.reload();
  await expect(page.locator("h1").first()).toBeVisible();
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  return page;
}

/** "1" for the first build, "2" once the page was loaded from the deployed one. */
const version = (page: Page) =>
  page.evaluate(() => document.documentElement.dataset.deploy ?? "1");

const hasWaitingUpdate = (page: Page) =>
  page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting);

/** Deploys a new version and has this tab download it; it is then waiting. */
async function deployAndDownload(app: AppServer, page: Page) {
  app.deploy();
  await page.evaluate(async () => {
    await (await navigator.serviceWorker.getRegistration())!.update();
  });
  await expect.poll(() => hasWaitingUpdate(page), { timeout: 15_000 }).toBe(true);
}

/** State that only exists in the running page: a reload would lose it. */
const markRunning = (page: Page) =>
  page.evaluate(() => {
    (window as unknown as { __running?: boolean }).__running = true;
  });
const stillRunning = (page: Page) =>
  page.evaluate(() => (window as unknown as { __running?: boolean }).__running === true);

async function setVisibility(page: Page, state: "hidden" | "visible") {
  await page.evaluate((value) => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => value });
    Object.defineProperty(document, "hidden", { configurable: true, get: () => value === "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  }, state);
}

test("a waiting update does not reload the running app, visible or hidden", async ({ context }) => {
  const page = await openInstalledApp(context, app.url + "/");
  await markRunning(page);

  await deployAndDownload(app, page);
  await page.waitForTimeout(1000);
  expect(await stillRunning(page)).toBe(true);

  // The phone locks, or the user switches to another app, then comes back.
  await setVisibility(page, "hidden");
  await page.waitForTimeout(2000);
  expect(await stillRunning(page)).toBe(true);
  await setVisibility(page, "visible");
  await page.waitForTimeout(1000);

  expect(await stillRunning(page)).toBe(true);
  expect(await version(page)).toBe("1");
  expect(await hasWaitingUpdate(page)).toBe(true);
});

test("the next launch as the only tab runs the new version", async ({ context }) => {
  const page = await openInstalledApp(context, app.url + "/");
  await deployAndDownload(app, page);
  expect(await version(page)).toBe("1");

  // Launching again in the same, only tab. A browser on its own keeps the old
  // version here, because the old page is still alive while the new one loads.
  await context.setOffline(true); // the new version is already on the device
  await page.reload();
  await expect.poll(() => version(page), { timeout: 10_000 }).toBe("2");
  await expect(page.locator("h1").first()).toBeVisible();
  expect(await hasWaitingUpdate(page)).toBe(false);
});

test("with two tabs open nothing is reloaded, and a new tab does not activate the update", async ({
  context,
}) => {
  const first = await openInstalledApp(context, app.url + "/panic");
  const second = await openInstalledApp(context, app.url + "/pricing");
  await markRunning(first);
  await markRunning(second);

  await deployAndDownload(app, first);
  // One tab goes to the background; the other stays in front of the user.
  await setVisibility(second, "hidden");
  await second.waitForTimeout(2000);
  expect(await stillRunning(first)).toBe(true);
  expect(await stillRunning(second)).toBe(true);

  // A third tab starts while the update is waiting. It is not the only tab,
  // so it must start on the current version and leave the update waiting.
  const third = await openApp(context, app.url + "/");
  await third.waitForTimeout(2000);

  expect(await version(third)).toBe("1");
  expect(await hasWaitingUpdate(third)).toBe(true);
  expect(await stillRunning(first)).toBe(true);
  expect(await stillRunning(second)).toBe(true);
  expect(await version(first)).toBe("1");
  expect(await version(second)).toBe("1");
});

test("after every tab is closed, reopening the app runs the new version", async ({ context }) => {
  const first = await openInstalledApp(context, app.url + "/");
  const second = await openInstalledApp(context, app.url + "/panic");
  await deployAndDownload(app, first);

  await first.close();
  await second.close();

  const reopened = await context.newPage();
  await reopened.goto(app.url + "/");
  await expect.poll(() => version(reopened), { timeout: 10_000 }).toBe("2");
  await expect(reopened.locator("h1").first()).toBeVisible();
  expect(await hasWaitingUpdate(reopened)).toBe(false);
});

test("without the Web Locks API the app never applies an update itself", async ({ context }) => {
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "locks", { configurable: true, get: () => undefined });
  });
  const page = await openInstalledApp(context, app.url + "/");
  await deployAndDownload(app, page);

  // It cannot know whether it is the only tab, so it must not activate.
  await page.reload();
  await expect(page.locator("h1").first()).toBeVisible();
  await page.waitForTimeout(2000);
  expect(await version(page)).toBe("1");
  expect(await hasWaitingUpdate(page)).toBe(true);

  // The browser's own rule still applies: all tabs closed, then reopened.
  await page.close();
  await expect(async () => {
    const reopened = await context.newPage();
    await reopened.goto(app.url + "/");
    const current = await version(reopened);
    await reopened.close();
    expect(current).toBe("2");
  }).toPass({ timeout: 15_000 });
});
