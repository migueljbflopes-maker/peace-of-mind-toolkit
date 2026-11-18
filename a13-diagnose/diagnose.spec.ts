import { test, expect } from "@playwright/test";

// TEMPORARY (backlog A-13). The walk of "the pages a visitor reads before
// buying promise no frozen feature" as it was, recording every request.

interface Seen {
  url: string;
  method: string;
  type: string;
  start: number;
  end: number | null;
  outcome: string;
}

const ROUTES = ["/", "/pricing", "/tips", "/tools/supplies", "/dashboard", "/privacy", "/terms", "/riskfunnel"];
const isLocal = (url: string) => /^https?:\/\/(127\.0\.0\.1|localhost)[:/]/.test(url) || /^(data|blob):/.test(url);

test("which request keeps the network busy", async ({ page, context }) => {
  test.setTimeout(300_000);
  const t0 = Date.now();
  const seen = new Map<unknown, Seen>();
  context.on("request", (request) =>
    seen.set(request, {
      url: request.url().slice(0, 140),
      method: request.method(),
      type: request.resourceType(),
      start: Date.now() - t0,
      end: null,
      outcome: "PENDING",
    }),
  );
  context.on("requestfinished", (request) => {
    const entry = seen.get(request);
    if (entry) Object.assign(entry, { end: Date.now() - t0, outcome: "finished" });
  });
  context.on("requestfailed", (request) => {
    const entry = seen.get(request);
    if (entry) Object.assign(entry, { end: Date.now() - t0, outcome: `failed ${request.failure()?.errorText}` });
  });
  const sockets: string[] = [];
  page.on("websocket", (socket) => sockets.push(`${Date.now() - t0} ${socket.url().slice(0, 100)}`));

  const timedOut: string[] = [];
  for (const route of ROUTES) {
    const from = Date.now() - t0;
    await page.goto(route);
    await expect(page.locator("#root")).not.toBeEmpty();
    let idle = "idle";
    try {
      await page.waitForLoadState("networkidle", { timeout: 30_000 });
    } catch {
      idle = "TIMEOUT";
      timedOut.push(route);
    }
    const to = Date.now() - t0;
    const during = [...seen.values()].filter((entry) => entry.start >= from);
    const line = (entry: Seen) =>
      `    ${entry.start - from}..${entry.end === null ? "?" : entry.end - from} ${entry.outcome} ${entry.method} ${entry.type} ${entry.url}`;
    const report = [
      `A13 ${idle} ${route} after ${to - from} ms; requests ${during.length}, outside ${during.filter((e) => !isLocal(e.url)).length}, pending ${during.filter((e) => e.end === null).length}`,
      ...during.filter((entry) => !isLocal(entry.url) || entry.end === null || idle === "TIMEOUT").map(line),
    ];
    console.log(report.join("\n"));
  }
  console.log(`A13 frames at the end: ${page.frames().map((frame) => frame.url().slice(0, 100)).join(" | ")}`);
  console.log(`A13 websockets: ${sockets.join(" | ") || "none"}`);
  expect(timedOut).toEqual([]);
});
