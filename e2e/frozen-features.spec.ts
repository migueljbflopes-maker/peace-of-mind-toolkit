import fs from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures";
import { FROZEN_FUNCTIONS, FROZEN_ROUTES, FROZEN_STRINGS } from "../scripts/frozen-features.mjs";

// Backlog A-07. The features the owner froze in A-03 are not in the build:
// their addresses answer with the not-found page, nothing links to them, and
// the app no longer promises them. The lists are in
// scripts/frozen-features.mjs; scripts/frozen-features.test.mjs checks the
// sources.

/** Every script the build serves. */
function bundle(): string {
  const assets = path.resolve(process.cwd(), "dist/assets");
  return fs
    .readdirSync(assets)
    .filter((file) => file.endsWith(".js"))
    .map((file) => fs.readFileSync(path.join(assets, file), "utf8"))
    .join("\n");
}

test.describe("a frozen route answers with the not-found page", () => {
  for (const route of FROZEN_ROUTES) {
    test(route, async ({ page }) => {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1, name: "404" })).toBeVisible();
      await expect(page.getByText("Page not found")).toBeVisible();
      // Not a redirect to somewhere else: the address asked for is the one refused.
      expect(new URL(page.url()).pathname).toBe(route);
    });
  }

  test("a route that is kept does not", async ({ page }) => {
    for (const route of ["/library", "/tips", "/riskfunnel", "/pricing"]) {
      await page.goto(route);
      await expect(page.locator("#root")).not.toBeEmpty();
      await expect(page.getByText("Page not found")).toHaveCount(0);
    }
  });
});

test("the build names no frozen route, function or AI gateway", () => {
  const scripts = bundle();
  // The app's own route table is in the build, so the check can find a path.
  expect(scripts).toContain('"/panic/setup"');
  expect(scripts).toContain("panic-trigger");

  const found: string[] = [];
  for (const route of FROZEN_ROUTES) {
    if (new RegExp(`["'\`]${route}(?![\\w-])`).test(scripts)) found.push(route);
  }
  for (const name of [...FROZEN_FUNCTIONS, ...FROZEN_STRINGS]) {
    if (scripts.includes(name)) found.push(name);
  }
  expect(found).toEqual([]);
});

/** The paths of every link on the page as it is now. */
async function linkPaths(page: Page): Promise<string[]> {
  const hrefs = await page.locator("a[href]").evaluateAll((anchors) =>
    anchors.map((anchor) => (anchor as HTMLAnchorElement).getAttribute("href") ?? ""),
  );
  return hrefs.filter((href) => href.startsWith("/")).map((href) => href.split(/[?#]/)[0]);
}

const PAGES_WITH_NAVIGATION = ["/", "/pricing", "/tips", "/library", "/tools/supplies", "/tools/risk", "/dashboard", "/panic"];

test("navigation, landing page and dashboard link to no frozen route", async ({ page }) => {
  const frozen: string[] = [];
  let linksSeen = 0;

  for (const route of PAGES_WITH_NAVIGATION) {
    await page.goto(route);
    await expect(page.locator("#root")).not.toBeEmpty();

    // The phone menu, with both of its groups open.
    const menu = page.getByRole("button", { name: "Toggle menu" });
    if (await menu.count()) {
      await menu.click();
      await page.getByRole("button", { name: "Features" }).click();
      await page.getByRole("button", { name: /Be Prepared|Preparação/ }).click();
      await expect(page.getByRole("link", { name: /Risk Calculator|Calculadora de Risco/ }).first()).toBeVisible();
    }

    const paths = await linkPaths(page);
    linksSeen += paths.length;
    for (const linked of paths) {
      if (FROZEN_ROUTES.includes(linked)) frozen.push(`${route} links to ${linked}`);
    }
  }

  expect(linksSeen).toBeGreaterThan(20);
  expect(frozen).toEqual([]);
});

// What the app said about the frozen features, in the places a visitor reads
// before buying. Each line was on one of these pages before A-07.
const FROZEN_CLAIMS =
  /weekly briefing|consult(ar)? (experts|especialistas)|share your plan automatically|ask a security expert|real-time risk alerts|alertas de risco em tempo real|insights,? and alerts|insights e alertas|amazon|affiliate (link|tag)|GDACS|ReliefWeb|USGS/i;

test("the pages a visitor reads before buying promise no frozen feature", async ({ page }) => {
  let read = 0;
  for (const route of ["/", "/pricing", "/tips", "/tools/supplies", "/dashboard", "/privacy", "/terms", "/riskfunnel"]) {
    await page.goto(route);
    await expect(page.locator("#root")).not.toBeEmpty();
    await page.waitForLoadState("networkidle");
    const text = await page.locator("body").innerText();
    read += text.length;
    expect(text.match(FROZEN_CLAIMS)?.[0], `on ${route}`).toBeUndefined();
  }
  expect(read).toBeGreaterThan(2000);
});

test("the build, in both languages, promises no frozen feature", () => {
  // Texts behind a click or a sign-in (paywall cards, the offer after the
  // risk check, the Portuguese strings) are in the scripts all the same.
  const scripts = bundle();
  expect(scripts).toContain("Hold 3s to activate");
  const claims = scripts.match(new RegExp(FROZEN_CLAIMS.source, "gi")) ?? [];
  expect([...new Set(claims.map((claim) => claim.toLowerCase()))]).toEqual([]);
});
