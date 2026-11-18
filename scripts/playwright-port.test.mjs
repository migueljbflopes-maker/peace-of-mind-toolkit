import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { portFor } from "../e2e/port.ts";

describe("the port the app under test is served on (A-09)", () => {
  it("differs between checkouts outside CI, and is stable for one checkout", () => {
    const a = portFor("/home/me/project", {});
    const b = portFor("/home/me/project/.claude/worktrees/agent-1", {});
    const c = portFor("/home/me/project/.claude/worktrees/agent-2", {});
    expect(new Set([a, b, c]).size).toBe(3);
    expect(portFor("/home/me/project", {})).toBe(a);
    for (const port of [a, b, c]) {
      expect(port).toBeGreaterThanOrEqual(4200);
      expect(port).toBeLessThan(5000);
    }
  });

  it("stays on 4173 in CI and for the backend run, which the local stack is configured for", () => {
    expect(portFor("/anywhere", { CI: "true" })).toBe(4173);
    expect(portFor("/anywhere", { E2E_BACKEND: "1" })).toBe(4173);
    expect(fs.readFileSync("e2e/backend/functions.env", "utf8")).toContain("APP_URL=http://127.0.0.1:4173");
  });

  it("can be set by hand, and refuses a value that is not a usable port", () => {
    expect(portFor("/anywhere", { E2E_PORT: "5123", CI: "true" })).toBe(5123);
    expect(() => portFor("/anywhere", { E2E_PORT: "80" })).toThrow(/E2E_PORT/);
    expect(() => portFor("/anywhere", { E2E_PORT: "abc" })).toThrow(/E2E_PORT/);
  });

  it("never reuses a server that is already answering", () => {
    const config = fs.readFileSync("playwright.config.ts", "utf8");
    expect(config).toMatch(/reuseExistingServer:\s*false/);
    expect(config).not.toMatch(/reuseExistingServer:\s*(true|!)/);
  });
});
