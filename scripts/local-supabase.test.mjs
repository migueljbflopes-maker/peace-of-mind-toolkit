import { describe, expect, it } from "vitest";
import { assertLocalUrl, isLocalUrl, parseStatusEnv, stackEnv, stackFromEnv } from "./local-supabase.mjs";

const HOSTED = "https://abcdefghijklmnopqrst.supabase.co";

describe("isLocalUrl", () => {
  it.each(["http://127.0.0.1:54321", "http://localhost:54321", "http://[::1]:54321", "https://localhost"])(
    "accepts %s",
    (url) => expect(isLocalUrl(url)).toBe(true),
  );

  it.each([
    HOSTED,
    "http://127.0.0.1.example.com",
    "http://localhost.example.com:54321",
    "http://example.com/?x=127.0.0.1",
    "http://user@example.com:54321/127.0.0.1",
    "http://127.0.0.1@example.com",
    "http://192.168.1.10:54321",
    "http://0.0.0.0:54321",
    "ftp://127.0.0.1",
    "127.0.0.1:54321",
    "",
    undefined,
  ])("rejects %s", (url) => expect(isLocalUrl(url)).toBe(false));
});

describe("assertLocalUrl", () => {
  it("throws for the hosted project and names the value", () => {
    expect(() => assertLocalUrl(HOSTED)).toThrow(/Refusing to continue.*supabase\.co/);
  });
  it("returns a local URL unchanged", () => {
    expect(assertLocalUrl("http://127.0.0.1:54321")).toBe("http://127.0.0.1:54321");
  });
});

describe("parseStatusEnv", () => {
  it("reads quoted and unquoted values and ignores other lines", () => {
    const parsed = parseStatusEnv(
      ['API_URL="http://127.0.0.1:54321"', "ANON_KEY=abc.def", "Stopped services: [x]", "", "  DB_URL='postgresql://a@127.0.0.1:54322/postgres'"].join("\n"),
    );
    expect(parsed).toEqual({
      API_URL: "http://127.0.0.1:54321",
      ANON_KEY: "abc.def",
      DB_URL: "postgresql://a@127.0.0.1:54322/postgres",
    });
  });
});

describe("stackEnv", () => {
  const status = {
    API_URL: "http://127.0.0.1:54321",
    ANON_KEY: "anon",
    SERVICE_ROLE_KEY: "service",
    DB_URL: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  };

  it("points the build and the tests at the local stack", () => {
    const env = stackEnv(status);
    expect(env.VITE_SUPABASE_URL).toBe("http://127.0.0.1:54321");
    expect(env.VITE_SUPABASE_PUBLISHABLE_KEY).toBe("anon");
    expect(env.E2E_BACKEND).toBe("1");
    expect(env.E2E_SUPABASE_SERVICE_ROLE_KEY).toBe("service");
    expect(env.VITE_STRIPE_PUBLISHABLE_KEY).toMatch(/^pk_test_/);
  });

  it("falls back to the new key names", () => {
    const env = stackEnv({ API_URL: status.API_URL, PUBLISHABLE_KEY: "pub", SECRET_KEY: "sec" });
    expect(env.VITE_SUPABASE_PUBLISHABLE_KEY).toBe("pub");
    expect(env.E2E_SUPABASE_SERVICE_ROLE_KEY).toBe("sec");
  });

  it("refuses a stack that is not local", () => {
    expect(() => stackEnv({ ...status, API_URL: HOSTED })).toThrow(/Refusing to continue/);
    expect(() => stackEnv({ ...status, DB_URL: "postgresql://postgres:x@db.abcdefghijklmnopqrst.supabase.co:5432/postgres" })).toThrow(
      /Refusing to continue/,
    );
  });

  it("says what is missing when the stack is not running", () => {
    expect(() => stackEnv({})).toThrow(/API_URL, ANON_KEY, SERVICE_ROLE_KEY/);
  });
});

describe("stackFromEnv", () => {
  it("refuses a hosted URL set by hand", () => {
    expect(() =>
      stackFromEnv({ E2E_SUPABASE_URL: HOSTED, E2E_SUPABASE_ANON_KEY: "a", E2E_SUPABASE_SERVICE_ROLE_KEY: "s" }),
    ).toThrow(/Refusing to continue/);
  });
  it("requires all three values", () => {
    expect(() => stackFromEnv({ E2E_SUPABASE_URL: "http://127.0.0.1:54321" })).toThrow(/must be set/);
  });
});
