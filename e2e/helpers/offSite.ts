import { expect, type Page } from "@playwright/test";

// Backlog F-30: what a browser test needs to prove that a page never sends
// the visitor to another site. Used by e2e/return-url.spec.ts (signed out)
// and e2e/backend/return-url.spec.ts (signed in).

/** The site every hostile return address in these tests points at. */
export const OTHER_SITE = "example.com";

/**
 * Return addresses that have left, or could leave, the site. Each is written
 * as it appears after `return_url=` in the address bar.
 */
export const HOSTILE_RETURN_ADDRESSES = [
  // The two reproduced in the build by the verifier of F-11.
  `//${OTHER_SITE}`,
  `/\\${OTHER_SITE}`,
  // The same, percent-encoded as a link in a message would carry them.
  `%2F%2F${OTHER_SITE}`,
  `%2F%5C${OTHER_SITE}`,
  `%5C%2F${OTHER_SITE}`,
  // Still encoded after the one decode the app does.
  `%2F%252F${OTHER_SITE}`,
  `%2F%255C${OTHER_SITE}`,
  // Characters a browser deletes before it reads an address.
  `%2F%09%2F${OTHER_SITE}`,
  `%2F%0A%2F${OTHER_SITE}`,
  // Dot segments the router would remove, leaving //host.
  `%2F.%2F%2F${OTHER_SITE}`,
  `//user@${OTHER_SITE}`,
  `https://${OTHER_SITE}/`,
];

const isOtherSite = (url: string) => {
  try {
    const { hostname } = new URL(url);
    return hostname === OTHER_SITE || hostname.endsWith(`.${OTHER_SITE}`);
  } catch {
    return false;
  }
};

/**
 * Records every request and every navigation the page attempts to the other
 * site. Call before the first `goto`.
 *
 * With `abort`, such requests are also aborted here. The backend fixtures
 * already abort (and list in `blockedRequests`) everything that is not on this
 * machine, so backend tests leave it off and assert on that list as well.
 */
export async function watchForOtherSite(page: Page, { abort = false } = {}): Promise<string[]> {
  const attempts: string[] = [];
  page.on("request", (request) => {
    if (isOtherSite(request.url())) attempts.push(`request ${request.url()}`);
  });
  page.on("framenavigated", (frame) => {
    if (isOtherSite(frame.url())) attempts.push(`navigation ${frame.url()}`);
  });
  if (abort) {
    await page.route(
      (url) => isOtherSite(url.href),
      (route) => route.abort("blockedbyclient"),
    );
  }
  return attempts;
}

/** Every link on the page, resolved as the browser resolves it. */
export async function resolvedLinks(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLAnchorElement | HTMLAreaElement>("a[href], area[href]")).map(
      (link) => link.href,
    ),
  );
}

/** Links that lead away from the origin the page is on. */
export async function linksLeavingTheSite(page: Page): Promise<string[]> {
  const origin = new URL(page.url()).origin;
  return (await resolvedLinks(page)).filter((href) => {
    try {
      return new URL(href).origin !== origin;
    } catch {
      return true;
    }
  });
}

/** The page is on the app's own origin and no link on it leads to the other site. */
export async function expectStillOnSite(page: Page, appOrigin: string) {
  expect(new URL(page.url()).origin, `the page is at ${page.url()}`).toBe(appOrigin);
  expect(await page.evaluate(() => window.location.origin)).toBe(appOrigin);
  const links = await resolvedLinks(page);
  expect(links.length, "the page has links to check").toBeGreaterThan(0);
  expect(links.filter(isOtherSite)).toEqual([]);
}
