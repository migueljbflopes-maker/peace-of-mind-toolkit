import http from "node:http";
import os from "node:os";
import type { AddressInfo } from "node:net";
import type { Page, Worker } from "@playwright/test";
import { test, expect } from "./fixtures";

// Backlog A-13: a page under test cannot reach anything but this machine.
//
// "Another machine" is played here by this machine's own network address
// (not 127.0.0.1): to the browser it is a host like any other, and a server
// listening on it can count what arrives. Nothing may arrive.

const OUTSIDE_ADDRESS = Object.values(os.networkInterfaces())
  .flat()
  .find((address) => address && address.family === "IPv4" && !address.internal)?.address;

let server: http.Server;
let arrived: string[];
let outside: string;

test.beforeEach(async () => {
  // Without a network interface there is no "outside" to reach, or to test.
  test.skip(!OUTSIDE_ADDRESS, "this machine has no network address other than 127.0.0.1");
  arrived = [];
  server = http.createServer((request, response) => {
    arrived.push(request.url ?? "");
    response.writeHead(200, { "access-control-allow-origin": "*", "content-type": "text/plain" });
    response.end("answered by the other machine");
  });
  await new Promise<void>((resolve) => server.listen(0, "0.0.0.0", resolve));
  outside = `http://${OUTSIDE_ADDRESS}:${(server.address() as AddressInfo).port}`;
});

test.afterEach(async () => {
  if (!server) return;
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

/** Runs `fetch` in the page or in the service worker and says how it ended. */
const fetchFrom = (from: Page | Worker, url: string) =>
  (from as Page).evaluate(
    (address) =>
      fetch(address).then(
        async (response) => `answered: ${await response.text()}`,
        () => "failed",
      ),
    url,
  );

test("a request to another machine is aborted and recorded, from a first tab and from a second", async ({
  page,
  context,
  blockedRequests,
}) => {
  await page.goto("/");
  expect(await fetchFrom(page, `${outside}/first-tab`)).toBe("failed");

  const second = await context.newPage();
  await second.goto("/pricing");
  expect(await fetchFrom(second, `${outside}/second-tab`)).toBe("failed");

  expect(arrived).toEqual([]);
  expect(blockedRequests).toContain(`${outside}/first-tab`);
  expect(blockedRequests).toContain(`${outside}/second-tab`);
});

test("a request made by the service worker itself is aborted and recorded", async ({
  page,
  context,
  blockedRequests,
}) => {
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  const worker = context.serviceWorkers()[0];
  expect(worker, "the app's service worker is running").toBeTruthy();

  expect(await fetchFrom(worker, `${outside}/service-worker`)).toBe("failed");

  expect(arrived).toEqual([]);
  expect(blockedRequests).toContain(`${outside}/service-worker`);
});

test("a spec can stand in for another machine with page.route: its answer wins and nothing is sent", async ({
  page,
  blockedRequests,
}) => {
  await page.route(`${outside}/stood-in-for`, (route) =>
    route.fulfill({ status: 200, headers: { "access-control-allow-origin": "*" }, body: "the test" }),
  );
  await page.goto("/");

  expect(await fetchFrom(page, `${outside}/stood-in-for`)).toBe("answered: the test");
  expect(await fetchFrom(page, `${outside}/not-stood-in-for`)).toBe("failed");

  expect(arrived).toEqual([]);
  expect(blockedRequests).not.toContain(`${outside}/stood-in-for`);
  expect(blockedRequests).toContain(`${outside}/not-stood-in-for`);
});

test("a browser context made behind the fixture's back cannot reach another machine either", async ({
  browser,
  baseURL,
}) => {
  // Nothing aborts or records here: this is the browser itself, which
  // playwright.config.ts starts with no way out (its `proxy` setting).
  const stray = await browser.newContext();
  try {
    const page = await stray.newPage();
    await page.goto(`${baseURL}/`);
    await expect(page.locator("h1").first()).toBeVisible();
    expect(await fetchFrom(page, `${outside}/stray-context`)).toBe("failed");
    expect(arrived).toEqual([]);
  } finally {
    await stray.close();
  }
});

test("the app's own pages: what they ask of other machines is recorded, and none of it is a hosted Supabase project", async ({
  page,
  blockedRequests,
}) => {
  const requested: string[] = [];
  page.context().on("request", (request) => requested.push(request.url()));

  for (const route of ["/", "/riskfunnel"]) {
    await page.goto(route);
    await expect(page.locator("#root")).not.toBeEmpty();
  }
  // The analytics row of each page, and Stripe.js on the funnel, have left.
  await expect.poll(() => requested.filter((url) => url.includes("/rest/v1/page_views")).length).toBe(2);
  await expect.poll(() => blockedRequests.some((url) => new URL(url).hostname === "js.stripe.com")).toBe(true);

  // The build under test is not made for the hosted project (playwright.config.ts).
  expect(requested.filter((url) => /supabase\.co(\/|:|$)/.test(new URL(url).host + "/"))).toEqual([]);
  for (const url of requested.filter((address) => /\/(rest|auth|functions)\/v1\//.test(address))) {
    expect(["127.0.0.1", "localhost"], url).toContain(new URL(url).hostname);
  }
});
