import { describe, expect, it } from "vitest";
import { DEFAULT_RETURN_PATH, safeReturnPath } from "./returnUrl";

// Backlog F-30: the address a visitor is sent to after sign-in comes from the
// query string, so anyone can write it. It must be a path on this site.

const ORIGIN = "https://app.example.test";
const safe = (value: string | null | undefined) => safeReturnPath(value, ORIGIN);

/** What each consumer actually receives: the value after one query-string decode. */
const fromAddress = (search: string) => new URLSearchParams(search).get("return_url");

describe("safeReturnPath refuses anything that could leave the site", () => {
  const refused: Array<[string, string]> = [
    ["protocol-relative //host", "//example.com"],
    ["protocol-relative with a path", "//example.com/premium/vault"],
    ["slash backslash /\\host", "/\\example.com"],
    ["backslash slash \\/host", "\\/example.com"],
    ["two backslashes", "\\\\example.com"],
    ["a backslash later in the path", "/premium\\vault"],
    ["a backslash in the query", "/premium/vault?x=\\\\example.com"],
    ["encoded slash /%2Fhost", "/%2Fexample.com"],
    ["encoded slash, lower case", "/%2fexample.com"],
    ["encoded backslash /%5Chost", "/%5Cexample.com"],
    ["encoded backslash, lower case", "/%5cexample.com"],
    ["both slashes encoded", "%2F%2Fexample.com"],
    ["double-encoded slash", "/%252Fexample.com"],
    ["double-encoded backslash", "/%255Cexample.com"],
    ["triple-encoded slash", "/%25252Fexample.com"],
    ["encoded more times than is ever legitimate", "/%2525252525252Fexample.com"],
    ["an encoded backslash later in the path", "/premium%5Cvault"],
    ["dot segment that resolves to //host", "/.//example.com"],
    ["parent segment that resolves to //host", "/x/..//example.com"],
    ["encoded dot segment that resolves to //host", "/%2E//example.com"],
    ["javascript:", "javascript:alert(1)"],
    ["javascript: in mixed case", "JaVaScRiPt:alert(1)"],
    ["javascript: after a slash-less path", "x/javascript:alert(1)"],
    ["data:", "data:text/html,<script>alert(1)</script>"],
    ["absolute http", "http://example.com"],
    ["absolute https", "https://example.com/premium/vault"],
    ["absolute https to this very origin", `${ORIGIN}/premium/vault`],
    ["scheme without slashes", "https:example.com"],
    ["protocol-relative with a user", "//user@example.com"],
    ["protocol-relative with user and password", "//user:secret@example.com/x"],
    ["credentials after one slash and a backslash", "/\\user@example.com"],
    ["tab between the slashes", "/\t/example.com"],
    ["newline between the slashes", "/\n/example.com"],
    ["carriage return between the slashes", "/\r/example.com"],
    ["tab before the slashes", "\t//example.com"],
    ["null between the slashes", "/\0/example.com"],
    ["tab inside javascript:", "java\tscript:alert(1)"],
    ["newline inside javascript:", "java\nscript:alert(1)"],
    ["null before javascript:", "\0javascript:alert(1)"],
    ["a tab later in the path", "/premium/\tvault"],
    ["a newline in the query", "/premium/vault?x=1\n2"],
    ["DEL", "/premium\x7f/vault"],
    ["encoded tab between the slashes", "/%09/example.com"],
    ["encoded newline between the slashes", "/%0A/example.com"],
    ["encoded null", "/%00/example.com"],
    ["double-encoded tab between the slashes", "/%2509/example.com"],
    ["a space before the slashes", " //example.com"],
    ["a space before a path", " /premium/vault"],
    ["a relative path", "premium/vault"],
    ["a query only", "?x=1"],
    ["a hash only", "#x"],
    ["a broken percent sequence in the path", "/premium/%E0%A4%A"],
    ["a lone percent sign in the path", "/100%"],
  ];

  for (const [name, value] of refused) {
    it(`${name}: ${JSON.stringify(value)}`, () => {
      expect(safe(value)).toBe(DEFAULT_RETURN_PATH);
    });
  }

  it("the default is /dashboard", () => {
    expect(DEFAULT_RETURN_PATH).toBe("/dashboard");
  });

  it("an empty or missing value gives the default", () => {
    expect(safe("")).toBe("/dashboard");
    expect(safe(null)).toBe("/dashboard");
    expect(safe(undefined)).toBe("/dashboard");
  });

  it("whatever is passed, the result resolves to this origin and starts with one slash", () => {
    for (const [, value] of refused) {
      const result = safe(value);
      expect(new URL(result, ORIGIN).origin).toBe(ORIGIN);
      expect(result).toMatch(/^\/(?![/\\])/);
    }
  });

  it("refuses the reproduced addresses as the sign-in page receives them", () => {
    expect(safe(fromAddress("?return_url=//example.com"))).toBe("/dashboard");
    expect(safe(fromAddress("?return_url=/\\example.com"))).toBe("/dashboard");
    expect(safe(fromAddress("?return_url=%2F%2Fexample.com"))).toBe("/dashboard");
    expect(safe(fromAddress("?return_url=%2F%5Cexample.com"))).toBe("/dashboard");
    // Encoded once more: after the one decode a consumer does, still encoded.
    expect(safe(fromAddress("?return_url=%252F%252Fexample.com"))).toBe("/dashboard");
    expect(safe(fromAddress("?return_url=%2F%255Cexample.com"))).toBe("/dashboard");
    expect(safe(fromAddress("?return_url=%2F%09%2Fexample.com"))).toBe("/dashboard");
  });

  it("uses the page's own origin when none is given", () => {
    expect(safeReturnPath("//example.com")).toBe("/dashboard");
    expect(safeReturnPath("/\\example.com")).toBe("/dashboard");
    expect(safeReturnPath(`${window.location.origin}/premium/vault`)).toBe("/dashboard");
    expect(safeReturnPath("/premium/vault")).toBe("/premium/vault");
  });
});

describe("safeReturnPath keeps a path on this site exactly as it was given", () => {
  const kept: Array<[string, string]> = [
    ["a normal path", "/premium/vault"],
    ["the default itself", "/dashboard"],
    ["the root", "/"],
    ["a path with a query", "/premium/plans/wizard?plan=B&from=pricing"],
    ["a path with a query and a hash", "/tips?tip=water-storage#step-2"],
    ["a path with a hash", "/premium/red-folder#print"],
    ["an encoded slash in the query", "/premium/plans/wizard?next=%2Fx"],
    ["an encoded slash in the query, lower case", "/premium/plans/wizard?next=%2fx"],
    ["a double-encoded slash in the query", "/premium/plans/wizard?next=%252Fx"],
    ["an encoded backslash in the query", "/premium/plans/wizard?next=%5Cx"],
    ["an encoded address in the query", "/premium/plans/wizard?next=%2F%2Fexample.com"],
    ["an address in the query", "/library?source=https://example.com/a"],
    ["two slashes in the hash", "/library#//example.com"],
    ["an encoded slash inside the path", "/library/a%2Fb"],
    ["an encoded space in the path", "/library/first%20aid"],
    ["an encoded accent in the path", "/library/%C3%A1gua"],
    ["a colon in the path", "/library/a:b"],
    ["a route that only begins like the sign-in page", "/login-help"],
    ["a route that only begins like /auth", "/authors"],
  ];

  for (const [name, value] of kept) {
    it(`${name}: ${JSON.stringify(value)}`, () => {
      expect(safe(value)).toBe(value);
      expect(new URL(safe(value), ORIGIN).origin).toBe(ORIGIN);
    });
  }

  it("survives the trip through /login and the magic-link callback unchanged", () => {
    const route = "/premium/plans/wizard?next=%2Fx&plan=B";
    // LoginGateCard and Navbar: /login?return_url=<encoded once>.
    const atLogin = safe(fromAddress(`?return_url=${encodeURIComponent(route)}`));
    expect(atLogin).toBe(route);
    // AuthContext.signInWithMagicLink: /auth/callback?return_url=<encoded once>.
    const atCallback = safe(fromAddress(`?return_url=${encodeURIComponent(atLogin)}`));
    expect(atCallback).toBe(route);
  });
});

describe("safeReturnPath stops a sign-in loop", () => {
  const loops: Array<[string, string]> = [
    ["the sign-in page", "/login"],
    ["the sign-in page with a slash", "/login/"],
    ["the sign-in page with its own return address", "/login?return_url=/login"],
    ["a nested chain of sign-in pages", "/login?return_url=%2Flogin%3Freturn_url%3D%252Fdashboard"],
    ["the callback", "/auth/callback"],
    ["the callback with a return address", "/auth/callback?return_url=%2Fpremium%2Fvault"],
    ["anything under /auth", "/auth"],
    ["upper case (routes match without regard to case)", "/LOGIN"],
    ["mixed case callback", "/Auth/Callback"],
    ["an encoded letter", "/%6Cogin"],
    ["a double-encoded letter", "/%256Cogin"],
    ["a dot segment", "/./login"],
    ["a parent segment", "/premium/../login?return_url=/login"],
    ["an encoded dot segment", "/%2e/auth/callback"],
  ];

  for (const [name, value] of loops) {
    it(`${name}: ${JSON.stringify(value)}`, () => {
      expect(safe(value)).toBe("/dashboard");
    });
  }

  it("as the sign-in page receives it", () => {
    expect(safe(fromAddress("?return_url=/login?return_url=/login"))).toBe("/dashboard");
    expect(safe(fromAddress(`?return_url=${encodeURIComponent("/login?return_url=/premium/vault")}`))).toBe(
      "/dashboard",
    );
    expect(safe(fromAddress("?return_url=%2Fauth%2Fcallback"))).toBe("/dashboard");
  });
});
