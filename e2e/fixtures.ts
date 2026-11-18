import { test as base, expect, type BrowserContext } from "@playwright/test";

// Backlog A-13: no browser test reaches outside this machine.
//
// Every spec imports `test` and `expect` from this file (specs in e2e/backend
// from e2e/backend/fixtures.ts, which extends it), never from
// @playwright/test: scripts/e2e-stays-local.test.mjs fails the unit tests
// otherwise. That is what puts the guard below in front of every test without
// a spec having to ask for it.
//
// The guard is on the browser context, so it covers every tab of a test and
// the requests the service worker makes itself. A spec that needs an answer
// from another host stands in for it with `page.route(...)` or
// `context.route(...)`: a route a spec adds is asked before this one.
//
// Behind it, playwright.config.ts starts the browser with no way out at all
// (its `proxy` setting), which also covers a context a spec might make by
// itself. e2e/stays-local.spec.ts tests both.

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

/** True for an address on any machine but this one. */
export function isOutsideThisMachine(url: URL): boolean {
  return /^(https?|wss?):$/.test(url.protocol) && !LOCAL_HOSTS.has(url.hostname);
}

/**
 * Aborts every request of the context that would leave this machine, and
 * returns the list they are recorded in, in the order they were attempted.
 */
export async function blockOutsideRequests(context: BrowserContext): Promise<string[]> {
  const blocked: string[] = [];
  await context.route(isOutsideThisMachine, async (route) => {
    blocked.push(route.request().url());
    await route.abort("blockedbyclient");
  });
  await context.routeWebSocket(isOutsideThisMachine, async (socket) => {
    blocked.push(socket.url());
    await socket.close({ code: 1008, reason: "blocked by the test harness" });
  });
  return blocked;
}

export interface NetworkFixtures {
  /**
   * Requests the pages of this test tried to make to anything but this
   * machine. They were aborted, so a browser test cannot reach Stripe, Google,
   * an image host or a hosted Supabase project. A test that needs such a
   * response stands in for the host with `page.route(...)`, which takes
   * precedence over this guard (and is then not listed here). The list is
   * attached to the test in the report as "blocked-requests".
   */
  blockedRequests: string[];
}

export const test = base.extend<NetworkFixtures>({
  blockedRequests: [
    async ({ context }, provide, testInfo) => {
      const blocked = await blockOutsideRequests(context);
      await provide(blocked);
      if (blocked.length) {
        await testInfo.attach("blocked-requests", { body: blocked.join("\n"), contentType: "text/plain" });
      }
    },
    { auto: true },
  ],
});

export { expect };
