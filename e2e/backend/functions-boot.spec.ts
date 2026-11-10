import fs from "node:fs";
import path from "node:path";
import { test, expect } from "./fixtures";

// Backlog F-08: every edge function boots on the local runtime, as written.
//
// A function whose imports do not resolve never reaches its handler: the
// runtime answers for it with a 5xx. Each handler answers the CORS preflight
// before it does anything else, so OPTIONS is a request with no side effects
// that only a booted function can answer. The answer is recognised by the
// function's own Access-Control-Allow-Headers value, read from its source,
// so a preflight answered by the gateway in front would not pass.
//
// The list comes from the directory: a new function is covered without
// touching this file.

const FUNCTIONS_DIR = path.resolve(process.cwd(), "supabase/functions");

const functionNames = fs
  .readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
  .filter((entry) => fs.existsSync(path.join(FUNCTIONS_DIR, entry.name, "index.ts")))
  .map((entry) => entry.name)
  .sort();

/** The Access-Control-Allow-Headers value the function's handler sends. */
function allowHeadersInSource(name: string): string {
  const source = fs.readFileSync(path.join(FUNCTIONS_DIR, name, "index.ts"), "utf8");
  const match = /["']Access-Control-Allow-Headers["']\s*:\s*["']([^"']+)["']/.exec(source);
  if (!match) {
    throw new Error(
      `${name}/index.ts declares no Access-Control-Allow-Headers: this test cannot recognise its answer.`,
    );
  }
  return match[1];
}

test("the list of functions is read from supabase/functions", () => {
  expect(functionNames.length).toBeGreaterThan(0);
  expect(functionNames).toContain("panic-trigger");
  expect(functionNames).not.toContain("_shared");
});

test.describe("every edge function boots", () => {
  // The first call to a function fetches its imports and compiles it.
  test.setTimeout(180_000);

  for (const name of functionNames) {
    test(`${name} answers a preflight itself`, async ({ request, stack }) => {
      const response = await request.fetch(`${stack.url}/functions/v1/${name}`, {
        method: "OPTIONS",
        timeout: 150_000,
      });
      const body = await response.text();
      expect(response.status(), `${name} answered ${response.status()}: ${body.slice(0, 500)}`).toBe(200);
      expect(response.headers()["access-control-allow-headers"]).toBe(allowHeadersInSource(name));
    });
  }
});
