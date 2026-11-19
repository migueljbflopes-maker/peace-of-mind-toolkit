import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { NO_BACKEND_SUPABASE_URL, buildEnvFor, hostedSupabaseIn } from "../e2e/build-env.ts";
import { isLocalUrl } from "./local-supabase.mjs";

// Backlog A-13: no browser test reaches outside this machine, and none can
// forget to. The guard itself is e2e/fixtures.ts (tested in the browser by
// e2e/stays-local.spec.ts); this file makes sure every spec is behind it.

const E2E = "e2e";
/** The one file that takes `test` from Playwright itself. */
const SHARED_FIXTURES = "e2e/fixtures.ts";

function filesUnder(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.posix.join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(file) : file.endsWith(".ts") ? [file] : [];
  });
}

const ALL = filesUnder(E2E);
const isBackend = (file) => file.startsWith("e2e/backend/");
const isSpec = (file) => /\.(spec|setup)\.ts$/.test(file);
const read = (file) => fs.readFileSync(file, "utf8");

/**
 * What a file takes from @playwright/test that exists at run time: the names
 * of its value imports, or "*" for any form that brings the whole module.
 */
export function runtimeImportsFromPlaywright(source) {
  const names = [];
  const from = `["']@playwright/test["']`;
  for (const match of source.matchAll(new RegExp(`import\\s+(type\\s+)?([^;'"]*?)\\s+from\\s+${from}`, "g"))) {
    if (match[1]) continue; // import type ...
    const clause = match[2].trim();
    const braces = /^\{([\s\S]*)\}$/.exec(clause);
    if (!braces) {
      names.push("*"); // default or namespace import, alone or with braces
      continue;
    }
    for (const part of braces[1].split(",").map((item) => item.trim()).filter(Boolean)) {
      if (!part.startsWith("type ")) names.push(part.split(/\s+as\s+/)[0]);
    }
  }
  if (new RegExp(`(require|import)\\s*\\(\\s*${from}`).test(source)) names.push("*");
  if (new RegExp(`export\\s+[^;'"]*\\s+from\\s+${from}`).test(source)) names.push("*");
  if (new RegExp(`import\\s+${from}`).test(source)) names.push("*");
  return names;
}

describe("how the guard reads a file's imports", () => {
  it("sees every way of taking `test` from Playwright", () => {
    for (const source of [
      'import { test, expect } from "@playwright/test";',
      "import { test as base } from '@playwright/test';",
      'import {\n  expect,\n  test,\n  type Page,\n} from "@playwright/test";',
      'import * as pw from "@playwright/test";',
      'import pw from "@playwright/test";',
      'import pw, { expect } from "@playwright/test";',
      'const { test } = require("@playwright/test");',
      'const pw = await import("@playwright/test");',
      'export { test } from "@playwright/test";',
      'export * from "@playwright/test";',
      'import { chromium } from "@playwright/test";',
    ]) {
      const names = runtimeImportsFromPlaywright(source);
      expect(names.filter((name) => name !== "expect"), source).not.toEqual([]);
    }
  });

  it("lets types and `expect` through", () => {
    for (const source of [
      'import type { Page, Route } from "@playwright/test";',
      'import { expect, type Page } from "@playwright/test";',
      'import { type BrowserContext } from "@playwright/test";',
      'import { test, expect } from "./fixtures";',
    ]) {
      expect(runtimeImportsFromPlaywright(source).filter((name) => name !== "expect"), source).toEqual([]);
    }
  });
});

describe("every browser test is behind the guard of e2e/fixtures.ts (A-13)", () => {
  it("finds the specs", () => {
    expect(ALL).toContain(SHARED_FIXTURES);
    expect(ALL.filter((file) => isSpec(file) && !isBackend(file)).length).toBeGreaterThanOrEqual(9);
    expect(ALL.filter((file) => isSpec(file) && isBackend(file)).length).toBeGreaterThanOrEqual(9);
  });

  it.each(ALL.filter((file) => file !== SHARED_FIXTURES))(
    "%s takes nothing from @playwright/test but types and `expect`",
    (file) => {
      expect(runtimeImportsFromPlaywright(read(file)).filter((name) => name !== "expect")).toEqual([]);
    },
  );

  it.each(ALL.filter((file) => isSpec(file) && !isBackend(file)))("%s imports `test` from ./fixtures", (file) => {
    expect(read(file)).toMatch(/import\s*\{[^}]*\btest\b[^}]*\}\s*from\s*["']\.\/fixtures["']/);
  });

  it.each(ALL.filter((file) => isSpec(file) && isBackend(file)))(
    "%s imports `test` from the backend fixtures",
    (file) => {
      expect(read(file)).toMatch(/import\s*\{[^}]*\btest\b[^}]*\}\s*from\s*["']\.\/fixtures["']/);
    },
  );

  it("the backend fixtures extend the shared ones and keep no guard of their own", () => {
    const source = read("e2e/backend/fixtures.ts");
    expect(source).toMatch(/import\s*\{[^}]*\btest as base\b[^}]*\}\s*from\s*["']\.\.\/fixtures["']/);
    expect(source).toContain("base.extend<");
    expect(source).not.toContain("blockedRequests:");
  });

  // Ways around the guard that an import check does not see. They are not
  // needed by any test without a backend; e2e/stays-local.spec.ts makes its
  // own context on purpose, to test the net under the guard.
  const WAYS_AROUND = [
    [/\.newContext\s*\(/, "a browser context of its own", ["e2e/stays-local.spec.ts"]],
    [/\blaunch(PersistentContext|Server)?\s*\(/, "a browser of its own", []],
    [/\bunrouteAll\s*\(/, "unrouteAll(), which removes the guard", []],
    [/\.request\s*\.\s*(get|post|put|patch|delete|head|fetch)\s*\(/, "a request sent by Playwright, not by the page", []],
    [/\(\s*\{[^}]*\b(request|playwright)\b[^}]*\}\s*(,[^)]*)?\)\s*=>/, "the `request` or `playwright` fixture", []],
    [/\bserviceWorkers\s*:/, "the serviceWorkers option", []],
    [/\bproxy\s*:/, "a proxy of its own", []],
  ];

  it.each(ALL.filter((file) => !isBackend(file) && file !== SHARED_FIXTURES))(
    "%s does not go around the guard",
    (file) => {
      const source = read(file);
      const found = WAYS_AROUND.filter(([pattern, , allowedIn]) => pattern.test(source) && !allowedIn.includes(file)).map(
        ([, what]) => what,
      );
      expect(found).toEqual([]);
    },
  );

  it("the guard is automatic, on the context, and covers WebSockets", () => {
    const source = read(SHARED_FIXTURES);
    expect(source).toMatch(/blockedRequests:\s*\[[\s\S]*\{\s*auto:\s*true\s*\}/);
    expect(source).toContain("context.route(isOutsideThisMachine");
    expect(source).toContain("context.routeWebSocket(isOutsideThisMachine");
  });

  it("the browser itself is started with no way out but this machine", () => {
    const config = read("playwright.config.ts");
    expect(config).toContain('proxy: { server: "http://127.0.0.1:9", bypass: "127.0.0.1,localhost,[::1]" }');
    // In `use` at the top, so for every project; no project sets its own.
    expect(config.match(/\bproxy\s*:/g)).toHaveLength(1);
    expect(config.indexOf("proxy:")).toBeLessThan(config.indexOf("projects:"));
  });
});

describe("the build under test does not know the hosted project (A-13)", () => {
  const HOSTED = "https://abcdefghijklmnopqrst.supabase.co";

  it("without a backend the build is made for an address on this machine, with dummy keys", () => {
    const env = buildEnvFor({});
    expect(env.VITE_SUPABASE_URL).toBe(NO_BACKEND_SUPABASE_URL);
    expect(isLocalUrl(env.VITE_SUPABASE_URL)).toBe(true);
    expect(env.VITE_SUPABASE_PUBLISHABLE_KEY).toMatch(/not-a-real-key/);
    expect(env.VITE_STRIPE_PUBLISHABLE_KEY).toMatch(/^pk_test_/);
    // Whatever the shell says, including a hosted address.
    expect(buildEnvFor({ VITE_SUPABASE_URL: HOSTED, CI: "true" }).VITE_SUPABASE_URL).toBe(NO_BACKEND_SUPABASE_URL);
  });

  it("the committed .env is what this replaces: every variable it sets is set", () => {
    const committed = [...read(".env").matchAll(/^([A-Z0-9_]+)=/gm)].map((match) => match[1]);
    expect(committed).toContain("VITE_SUPABASE_URL");
    expect(Object.keys(buildEnvFor({})).sort()).toEqual(committed.sort());
  });

  it("the backend run keeps the values of the local stack", () => {
    expect(buildEnvFor({ E2E_BACKEND: "1", VITE_SUPABASE_URL: "http://127.0.0.1:54321" })).toEqual({});
  });

  it("the web server of the browser tests is started with that environment", () => {
    expect(read("playwright.config.ts")).toContain("env: buildEnvFor(process.env),");
  });

  it("a hosted address in the build is found, whatever its form", () => {
    expect(hostedSupabaseIn(`x="${HOSTED}";`)).toEqual([HOSTED]);
    expect(hostedSupabaseIn('fetch("https://my-project.supabase.co/rest/v1/page_views")')).toEqual([
      "https://my-project.supabase.co",
    ]);
    expect(hostedSupabaseIn('"wss://abcdefghijklmnopqrst.supabase.co/realtime/v1"')).toHaveLength(1);
    expect(hostedSupabaseIn('"https://db.abcdefghijklmnopqrst.supabase.co"')).toHaveLength(1);
    expect(hostedSupabaseIn('id="abcdefghijklmnopqrst"', "abcdefghijklmnopqrst")).toEqual(["abcdefghijklmnopqrst"]);
  });

  it("the local address, and Supabase's own website, are not mistaken for one", () => {
    expect(hostedSupabaseIn(`"${NO_BACKEND_SUPABASE_URL}" "https://supabase.com/docs" "https://supabase.community"`)).toEqual([]);
    expect(hostedSupabaseIn('id="local"', "abcdefghijklmnopqrst")).toEqual([]);
  });

  it("the check runs before any browser test, with or without the backend project", () => {
    const setup = read("e2e/global-setup.ts");
    expect(setup).toContain("hostedSupabaseIn(bundle, hostedRef)");
    // Before the branch that tells the two kinds of run apart.
    expect(setup.indexOf("hostedSupabaseIn(bundle")).toBeLessThan(setup.indexOf("if (!backend)"));
  });
});
