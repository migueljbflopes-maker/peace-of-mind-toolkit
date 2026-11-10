// Backlog A-06. Everything the test harness knows about the local Supabase
// stack (`supabase start`) lives here, so the rule "tests never touch the
// hosted project" is written, and unit-tested, in one place.

import { execFileSync } from "node:child_process";

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

/** True only for an http(s) URL whose host is this machine. */
export function isLocalUrl(value) {
  let url;
  try {
    url = new URL(String(value));
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  return LOCAL_HOSTS.has(url.hostname);
}

/**
 * Throws unless the URL points at this machine. Every script and fixture that
 * writes to a database calls this first: the hosted project is production.
 */
export function assertLocalUrl(value, what = "Supabase URL") {
  if (!isLocalUrl(value)) {
    throw new Error(
      `Refusing to continue: ${what} is "${value}", which is not a local address ` +
        `(127.0.0.1, localhost or ::1). The test harness only ever runs against ` +
        `the local stack started by \`supabase start\`.`,
    );
  }
  return String(value);
}

/** Parses the KEY="value" lines printed by `supabase status -o env`. */
export function parseStatusEnv(text) {
  const out = {};
  for (const line of String(text).split(/\r?\n/)) {
    const match = /^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match) continue;
    let value = match[2];
    if (/^".*"$/.test(value) || /^'.*'$/.test(value)) value = value.slice(1, -1);
    out[match[1]] = value;
  }
  return out;
}

/**
 * Turns the status of the local stack into the environment the build and the
 * tests need. Throws when a value is missing or the API is not local.
 */
export function stackEnv(status) {
  const apiUrl = status.API_URL;
  // The JWT keys are preferred: the edge function gateway (verify_jwt) and
  // every supabase-js version accept them.
  const anonKey = status.ANON_KEY || status.PUBLISHABLE_KEY;
  const serviceRoleKey = status.SERVICE_ROLE_KEY || status.SECRET_KEY;
  const missing = Object.entries({ API_URL: apiUrl, ANON_KEY: anonKey, SERVICE_ROLE_KEY: serviceRoleKey })
    .filter(([, value]) => !value)
    .map(([name]) => name);
  if (missing.length) {
    throw new Error(
      `\`supabase status -o env\` did not report ${missing.join(", ")}. ` +
        `Is the local stack running? Start it with \`npm run supabase:start\`.`,
    );
  }
  assertLocalUrl(apiUrl, "API_URL reported by `supabase status`");
  if (status.DB_URL) assertLocalUrl(status.DB_URL.replace(/^postgres(ql)?:/, "http:"), "DB_URL");

  return {
    // Read by Vite at build time. A variable already in the environment wins
    // over the committed .env, which points at the hosted project.
    VITE_SUPABASE_URL: apiUrl,
    VITE_SUPABASE_PUBLISHABLE_KEY: anonKey,
    VITE_SUPABASE_PROJECT_ID: "local",
    // The committed .env carries the live Stripe key. Tests never use it.
    VITE_STRIPE_PUBLISHABLE_KEY: "pk_test_e2e_dummy_not_a_real_key",
    // Read by playwright.config.ts and the fixtures in e2e/backend.
    E2E_BACKEND: "1",
    E2E_SUPABASE_URL: apiUrl,
    E2E_SUPABASE_ANON_KEY: anonKey,
    E2E_SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
    ...(status.DB_URL ? { E2E_SUPABASE_DB_URL: status.DB_URL } : {}),
  };
}

/** Asks the Supabase CLI for the running local stack. */
export function readLocalStack() {
  let text;
  try {
    text = execFileSync("supabase", ["status", "-o", "env"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    throw new Error(
      "Could not read the local Supabase stack (`supabase status -o env` failed). " +
        "It needs the Supabase CLI and Docker; start the stack with `npm run supabase:start`.\n" +
        (error.stderr || error.message),
    );
  }
  const status = parseStatusEnv(text);
  console.log(`[local-supabase] supabase status reports: ${Object.keys(status).sort().join(", ")}`);
  return stackEnv(status);
}

/**
 * What the fixtures use: the stack described by the E2E_* variables, checked
 * again so that a hand-set variable cannot aim a test at a hosted project.
 */
export function stackFromEnv(env = process.env) {
  const url = env.E2E_SUPABASE_URL;
  const anonKey = env.E2E_SUPABASE_ANON_KEY;
  const serviceRoleKey = env.E2E_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceRoleKey) {
    throw new Error(
      "E2E_SUPABASE_URL, E2E_SUPABASE_ANON_KEY and E2E_SUPABASE_SERVICE_ROLE_KEY must be set. " +
        "Run the command through `node scripts/with-local-supabase.mjs`, which reads them from the local stack.",
    );
  }
  assertLocalUrl(url, "E2E_SUPABASE_URL");
  return { url, anonKey, serviceRoleKey, dbUrl: env.E2E_SUPABASE_DB_URL };
}
